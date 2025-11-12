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
    public class PostsController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly IConfiguration _config;
        private readonly IAmazonS3? _s3;
        private readonly string? _s3Bucket;
        private readonly string? _s3PublicBase;
        private const int MaxPageSize = 50;

        public PostsController(AppDbContext context, IWebHostEnvironment env, IConfiguration config)
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

        // GET /api/posts?search=&sort=asc|desc&page=1&pageSize=9&time=today|week
        [HttpGet]
        public async Task<ActionResult<IEnumerable<PostDto>>> GetPosts(
            [FromQuery] string? search,
            [FromQuery] string? sort,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 9,
            [FromQuery] string? time = null,
            CancellationToken ct = default)
        {
            var query = _context.Posts.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                // Use ILIKE for case-insensitive search in PostgreSQL
                query = query.Where(p => EF.Functions.ILike(p.Name, $"%{search.Trim()}%"));
            }

            // Quick time filters
            if (!string.IsNullOrWhiteSpace(time))
            {
                var nowUtc = DateTime.UtcNow;
                if (string.Equals(time, "today", StringComparison.OrdinalIgnoreCase))
                {
                    var startOfDayUtc = new DateTime(nowUtc.Year, nowUtc.Month, nowUtc.Day, 0, 0, 0, DateTimeKind.Utc);
                    query = query.Where(p => p.CreatedAt >= startOfDayUtc);
                }
                else if (string.Equals(time, "week", StringComparison.OrdinalIgnoreCase) || string.Equals(time, "this_week", StringComparison.OrdinalIgnoreCase))
                {
                    var sevenDaysAgo = nowUtc.AddDays(-7);
                    query = query.Where(p => p.CreatedAt >= sevenDaysAgo);
                }
            }

            if (string.Equals(sort, "asc", StringComparison.OrdinalIgnoreCase))
            {
                query = query.OrderBy(p => p.Name);
            }
            else if (string.Equals(sort, "desc", StringComparison.OrdinalIgnoreCase))
            {
                query = query.OrderByDescending(p => p.Name);
            }
            else
            {
                // Default sort by newest
                query = query.OrderByDescending(p => p.CreatedAt);
            }
            // Pagination
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 9;
            if (pageSize > MaxPageSize) pageSize = MaxPageSize;

            var total = await query.CountAsync(ct);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PostDto
                {
                    Id = p.Id,
                    Name = p.Name,
                    Description = p.Description,
                    ImageUrl = p.ImageUrl,
                    CreatedAt = p.CreatedAt,
                    UpdatedAt = p.UpdatedAt
                })
                .ToListAsync(ct);

            // Include total count for client-side pagination
            Response.Headers["X-Total-Count"] = total.ToString();
            return Ok(items);
        }

        // POST /api/posts/upload (multipart/form-data: name, description, image)
        [HttpPost("upload")]
        public async Task<ActionResult<PostDto>> CreatePostWithImage([FromForm] string name, [FromForm] string description, [FromForm] IFormFile? image, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(description))
                return BadRequest("Name và Description là bắt buộc.");

            string? imageUrl = null;
            if (image != null && image.Length > 0)
            {
                // Validate size and extension
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
                    imageUrl = _s3PublicBase.TrimEnd('/') + "/" + fileName;
                }
                else
                {
                    var imagesDir = _config["IMAGES_DIR"];
                    if (string.IsNullOrWhiteSpace(imagesDir))
                    {
                        imagesDir = Path.Combine(_env.ContentRootPath, "images");
                    }
                    Directory.CreateDirectory(imagesDir);
                    var filePath = Path.Combine(imagesDir, fileName);
                    using (var stream = System.IO.File.Create(filePath))
                    {
                        await image.CopyToAsync(stream, ct);
                    }
                    imageUrl = "/images/" + fileName;
                }
            }

            var now = DateTime.UtcNow;
            var post = new Post
            {
                Name = name.Trim(),
                Description = description.Trim(),
                ImageUrl = imageUrl,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync(ct);

            var result = new PostDto
            {
                Id = post.Id,
                Name = post.Name,
                Description = post.Description,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt
            };

            return CreatedAtAction(nameof(GetPost), new { id = post.Id }, result);
        }

        // PUT /api/posts/{id}/image (multipart/form-data: image)
        [HttpPut("{id:int}/image")]
        public async Task<ActionResult<PostDto>> UpdatePostImage(int id, [FromForm] IFormFile image, CancellationToken ct = default)
        {
            var post = await _context.Posts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (post == null) return NotFound();

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

            // delete old image if exists
            if (!string.IsNullOrWhiteSpace(post.ImageUrl))
            {
                try
                {
                    if (_s3 != null && _s3Bucket != null && _s3PublicBase != null && post.ImageUrl.StartsWith(_s3PublicBase))
                    {
                        var oldKey = Path.GetFileName(post.ImageUrl);
                        await _s3.DeleteObjectAsync(_s3Bucket, oldKey, ct);
                    }
                    else
                    {
                        var imagesDir = _config["IMAGES_DIR"];
                        if (string.IsNullOrWhiteSpace(imagesDir)) imagesDir = Path.Combine(_env.ContentRootPath, "images");
                        var oldPath = Path.Combine(imagesDir, Path.GetFileName(post.ImageUrl));
                        if (System.IO.File.Exists(oldPath)) System.IO.File.Delete(oldPath);
                    }
                }
                catch { }
            }

            post.ImageUrl = (_s3 != null && _s3PublicBase != null) ? (_s3PublicBase.TrimEnd('/') + "/" + fileName) : ("/images/" + fileName);
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            var result = new PostDto
            {
                Id = post.Id,
                Name = post.Name,
                Description = post.Description,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt
            };

            return Ok(result);
        }
        // GET /api/posts/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<PostDto>> GetPost(int id, CancellationToken ct = default)
        {
            var p = await _context.Posts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct);
            if (p == null) return NotFound();

            return Ok(new PostDto
            {
                Id = p.Id,
                Name = p.Name,
                Description = p.Description,
                ImageUrl = p.ImageUrl,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            });
        }

        // POST /api/posts
        [HttpPost]
        public async Task<ActionResult<PostDto>> CreatePost([FromBody] PostCreateDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Description))
                return BadRequest("Name và Description là bắt buộc.");

            var now = DateTime.UtcNow;
            var post = new Post
            {
                Name = dto.Name.Trim(),
                Description = dto.Description.Trim(),
                ImageUrl = string.IsNullOrWhiteSpace(dto.ImageUrl) ? null : dto.ImageUrl,
                CreatedAt = now,
                UpdatedAt = now
            };

            _context.Posts.Add(post);
            await _context.SaveChangesAsync(ct);

            var result = new PostDto
            {
                Id = post.Id,
                Name = post.Name,
                Description = post.Description,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt
            };

            return CreatedAtAction(nameof(GetPost), new { id = post.Id }, result);
        }

        // PUT /api/posts/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult<PostDto>> UpdatePost(int id, [FromBody] PostUpdateDto dto, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Description))
                return BadRequest("Name và Description là bắt buộc.");
            var post = await _context.Posts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (post == null) return NotFound();

            post.Name = dto.Name.Trim();
            post.Description = dto.Description.Trim();
            post.ImageUrl = dto.ImageUrl ?? post.ImageUrl;
            post.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(ct);

            var result = new PostDto
            {
                Id = post.Id,
                Name = post.Name,
                Description = post.Description,
                ImageUrl = post.ImageUrl,
                CreatedAt = post.CreatedAt,
                UpdatedAt = post.UpdatedAt
            };

            return Ok(result);
        }

        // DELETE /api/posts/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> DeletePost(int id, CancellationToken ct = default)
        {
            var post = await _context.Posts.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (post == null) return NotFound();

            _context.Posts.Remove(post);
            await _context.SaveChangesAsync(ct);

            return NoContent();
        }

    }
}