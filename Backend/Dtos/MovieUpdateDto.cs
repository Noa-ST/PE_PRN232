namespace Backend.Dtos
{
    public class MovieUpdateDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Genre { get; set; }
        public int? Rating { get; set; }
        public string? PosterImageUrl { get; set; }
        public string? Description { get; set; }
    }
}