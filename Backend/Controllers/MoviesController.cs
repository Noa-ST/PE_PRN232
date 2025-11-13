using Backend.Data;
using Backend.Dtos;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.Runtime;

namespace Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MoviesController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IConfiguration _config;
        private readonly IAmazonS3? _s3;
        private readonly string? _s3Bucket;
        private readonly string? _s3PublicBase;
        private const int MaxPageSize = 50;

        public MoviesController(AppDbContext context, IWebHostEnvironment env, IConfiguration config)
        {
            _context = context;
            _env = env;
            _config = config;
            var endpoint = _config["S3_ENDPOINT"];
            var bucket = _config["S3_BUCKET"];
            var access = _config["S3_ACCESS_KEY"];
            var secret = _config["S3_SECRET_KEY"];
            var publicBase = _config["S3_PUBLIC_BASE_URL"];
            if (!string.IsNullOrWhiteSpace(endpoint) && !string.IsNullOrWhiteSpace(bucket) && !string.IsNullOrWhiteSpace(access) && !string.IsNullOrWhiteSpace(secret))
            {
                var creds = new BasicAWSCredentials(access!, secret!);
                var cfg = new AmazonS3Config { ServiceURL = endpoint, ForcePathStyle = true };
                _s3 = new AmazonS3Client(creds, cfg);
                _s3Bucket = bucket;
                _s3PublicBase = string.IsNullOrWhiteSpace(publicBase) ? (endpoint.TrimEnd('/') + "/" + bucket) : publicBase;
            }
        }

        [HttpGet]
        public async Task<ActionResult<IEnumerable<MovieDto>>> GetMovies(
            [FromQuery] string? search,
            [FromQuery] string? genre,
            [FromQuery] string? sort,
            [FromQuery] string? order,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 9,
            CancellationToken ct = default)
        {
            var query = _context.Movies.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(p => EF.Functions.ILike(p.Title, $"%{search.Trim()}%"));
            }
            if (!string.IsNullOrWhiteSpace(genre))
            {
                query = query.Where(p => p.Genre != null && EF.Functions.ILike(p.Genre, $"%{genre.Trim()}%"));
            }

            if (string.Equals(sort, "title", StringComparison.OrdinalIgnoreCase))
            {
                query = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase) ? query.OrderByDescending(p => p.Title) : query.OrderBy(p => p.Title);
            }
            else if (string.Equals(sort, "rating", StringComparison.OrdinalIgnoreCase))
            {
                query = string.Equals(order, "desc", StringComparison.OrdinalIgnoreCase) ? query.OrderByDescending(p => p.Rating) : query.OrderBy(p => p.Rating);
            }
            else
            {
                query = query.OrderByDescending(p => p.CreatedAt);
            }

            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 9;
            if (pageSize > MaxPageSize) pageSize = MaxPageSize;

            var total = await query.CountAsync(ct);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new MovieDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Genre = p.Genre,
                    Rating = p.Rating,
                    PosterImageUrl = p.PosterImageUrl,
                    Description = p.Description,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                })
                .ToListAsync(ct);

            Response.Headers["X-Total-Count"] = total.ToString();
            return Ok(items);
        }

        [HttpGet("{id:int}")]
        public async Task<ActionResult<MovieDto>> GetMovie(int id, CancellationToken ct = default)
        {
            var p = await _context.Movies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (p == null) return NotFound();

            return Ok(new MovieDto
            {
                Id = p.Id,
                Title = p.Title,
                Genre = p.Genre,
                Rating = p.Rating,
                PosterImageUrl = p.PosterImageUrl,
                Description = p.Description,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            });
        }

        [HttpPost]
        public async Task<ActionResult<MovieDto>> CreateMovie([FromBody] MovieCreateDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title là bắt buộc.");
            if (dto.Rating.HasValue && (dto.Rating < 1 || dto.Rating > 5)) return BadRequest("Rating phải từ 1 đến 5.");

            var now = DateTime.UtcNow;
            var movie = new Movie
            {
                Title = dto.Title.Trim(),
                Genre = string.IsNullOrWhiteSpace(dto.Genre) ? null : dto.Genre,
                Rating = dto.Rating,
                PosterImageUrl = string.IsNullOrWhiteSpace(dto.PosterImageUrl) ? null : dto.PosterImageUrl,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Movies.Add(movie);
            await _context.SaveChangesAsync(ct);

            var result = new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Genre = movie.Genre,
                Rating = movie.Rating,
                PosterImageUrl = movie.PosterImageUrl,
                Description = movie.Description,
                CreatedAt = movie.CreatedAt,
                UpdatedAt = movie.UpdatedAt
            };

            return CreatedAtAction(nameof(GetMovie), new { id = movie.Id }, result);
        }

        [HttpPost("upload")]
        public async Task<ActionResult<MovieDto>> CreateMovieWithImage([FromForm] string title, [FromForm] string? genre, [FromForm] int? rating, [FromForm] string? description, [FromForm] IFormFile? image, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(title)) return BadRequest("Title là bắt buộc.");
            if (rating.HasValue && (rating < 1 || rating > 5)) return BadRequest("Rating phải từ 1 đến 5.");

            string? posterUrl = null;
            if (image != null && image.Length > 0)
            {
                if (image.Length > 5 * 1024 * 1024) return BadRequest("Dung lượng ảnh tối đa 5MB.");
                var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
                var permitted = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
                if (!permitted.Contains(ext)) return BadRequest("Định dạng ảnh không hợp lệ.");

                var fileName = Guid.NewGuid().ToString("N") + ext;
                if (_s3 != null && _s3Bucket != null && _s3PublicBase != null)
                {
                    var put = new PutObjectRequest
                    {
                        BucketName = _s3Bucket,
                        Key = fileName,
                        InputStream = image.OpenReadStream(),
                        ContentType = image.ContentType ?? "application/octet-stream",
                        CannedACL = S3CannedACL.PublicRead
                    };
                    await _s3.PutObjectAsync(put, ct);
                    posterUrl = _s3PublicBase.TrimEnd('/') + "/" + fileName;
                }
                else
                {
                    var imagesDir = _config["IMAGES_DIR"];
                    if (string.IsNullOrWhiteSpace(imagesDir)) imagesDir = Path.Combine(_env.ContentRootPath, "images");
                    Directory.CreateDirectory(imagesDir);
                    var filePath = Path.Combine(imagesDir, fileName);
                    using (var stream = System.IO.File.Create(filePath))
                    {
                        await image.CopyToAsync(stream, ct);
                    }
                    posterUrl = "/images/" + fileName;
                }
            }

            var now = DateTime.UtcNow;
            var movie = new Movie
            {
                Title = title.Trim(),
                Genre = string.IsNullOrWhiteSpace(genre) ? null : genre,
                Rating = rating,
                PosterImageUrl = posterUrl,
                Description = string.IsNullOrWhiteSpace(description) ? null : description,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Movies.Add(movie);
            await _context.SaveChangesAsync(ct);

            var result = new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Genre = movie.Genre,
                Rating = movie.Rating,
                PosterImageUrl = movie.PosterImageUrl,
                Description = movie.Description,
                CreatedAt = movie.CreatedAt,
                UpdatedAt = movie.UpdatedAt
            };

            return CreatedAtAction(nameof(GetMovie), new { id = movie.Id }, result);
        }

        [HttpPut("{id:int}")]
        public async Task<ActionResult<MovieDto>> UpdateMovie(int id, [FromBody] MovieUpdateDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title là bắt buộc.");
            if (dto.Rating.HasValue && (dto.Rating < 1 || dto.Rating > 5)) return BadRequest("Rating phải từ 1 đến 5.");
            var movie = await _context.Movies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (movie == null) return NotFound();

            movie.Title = dto.Title.Trim();
            movie.Genre = string.IsNullOrWhiteSpace(dto.Genre) ? movie.Genre : dto.Genre;
            movie.Rating = dto.Rating ?? movie.Rating;
            movie.PosterImageUrl = dto.PosterImageUrl ?? movie.PosterImageUrl;
            movie.Description = string.IsNullOrWhiteSpace(dto.Description) ? movie.Description : dto.Description;
            movie.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            var result = new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Genre = movie.Genre,
                Rating = movie.Rating,
                PosterImageUrl = movie.PosterImageUrl,
                Description = movie.Description,
                CreatedAt = movie.CreatedAt,
                UpdatedAt = movie.UpdatedAt
            };

            return Ok(result);
        }

        [HttpPut("{id:int}/image")]
        public async Task<ActionResult<MovieDto>> UpdateMovieImage(int id, [FromForm] IFormFile image, CancellationToken ct = default)
        {
            var movie = await _context.Movies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (movie == null) return NotFound();

            if (image == null || image.Length == 0) return BadRequest("File ảnh là bắt buộc.");
            if (image.Length > 5 * 1024 * 1024) return BadRequest("Dung lượng ảnh tối đa 5MB.");
            var ext = Path.GetExtension(image.FileName).ToLowerInvariant();
            var permitted = new[] { ".png", ".jpg", ".jpeg", ".webp", ".gif" };
            if (!permitted.Contains(ext)) return BadRequest("Định dạng ảnh không hợp lệ.");

            var fileName = Guid.NewGuid().ToString("N") + ext;
            if (_s3 != null && _s3Bucket != null && _s3PublicBase != null)
            {
                var put = new PutObjectRequest
                {
                    BucketName = _s3Bucket,
                    Key = fileName,
                    InputStream = image.OpenReadStream(),
                    ContentType = image.ContentType ?? "application/octet-stream",
                    CannedACL = S3CannedACL.PublicRead
                };
                await _s3.PutObjectAsync(put, ct);
            }
            else
            {
                var imagesDir = _config["IMAGES_DIR"];
                if (string.IsNullOrWhiteSpace(imagesDir)) imagesDir = Path.Combine(_env.ContentRootPath, "images");
                Directory.CreateDirectory(imagesDir);
                var filePath = Path.Combine(imagesDir, fileName);
                using (var stream = System.IO.File.Create(filePath))
                {
                    await image.CopyToAsync(stream, ct);
                }
            }

            if (!string.IsNullOrWhiteSpace(movie.PosterImageUrl))
            {
                try
                {
                    if (_s3 != null && _s3Bucket != null && _s3PublicBase != null && movie.PosterImageUrl.StartsWith(_s3PublicBase))
                    {
                        var oldKey = Path.GetFileName(movie.PosterImageUrl);
                        await _s3.DeleteObjectAsync(_s3Bucket, oldKey, ct);
                    }
                    else
                    {
                        var imagesDir = _config["IMAGES_DIR"];
                        if (string.IsNullOrWhiteSpace(imagesDir)) imagesDir = Path.Combine(_env.ContentRootPath, "images");
                        var oldPath = Path.Combine(imagesDir, Path.GetFileName(movie.PosterImageUrl));
                        if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                    }
                }
                catch { }
            }

            movie.PosterImageUrl = (_s3 != null && _s3PublicBase != null) ? (_s3PublicBase.TrimEnd('/') + "/" + fileName) : ("/images/" + fileName);
            movie.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            var result = new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Genre = movie.Genre,
                Rating = movie.Rating,
                PosterImageUrl = movie.PosterImageUrl,
                Description = movie.Description,
                CreatedAt = movie.CreatedAt,
                UpdatedAt = movie.UpdatedAt
            };

            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeleteMovie(int id, CancellationToken ct = default)
        {
            var movie = await _context.Movies.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (movie == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(movie.PosterImageUrl))
            {
                try
                {
                    if (_s3 != null && _s3Bucket != null && _s3PublicBase != null && movie.PosterImageUrl.StartsWith(_s3PublicBase))
                    {
                        var oldKey = Path.GetFileName(movie.PosterImageUrl);
                        await _s3.DeleteObjectAsync(_s3Bucket, oldKey, ct);
                    }
                    else
                    {
                        var imagesDir = _config["IMAGES_DIR"];
                        if (string.IsNullOrWhiteSpace(imagesDir)) imagesDir = Path.Combine(_env.ContentRootPath, "images");
                        var oldPath = Path.Combine(imagesDir, Path.GetFileName(movie.PosterImageUrl));
                        if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                    }
                }
                catch { }
            }

            _context.Movies.Remove(movie);
            await _context.SaveChangesAsync(ct);

            return NoContent();
        }
    }
}