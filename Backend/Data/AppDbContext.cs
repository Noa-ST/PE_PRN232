using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Movie> Movies { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            // Indexes to optimize common queries
            modelBuilder.Entity<Movie>().HasIndex(p => p.CreatedAt);
            modelBuilder.Entity<Movie>().HasIndex(p => p.Title);
            modelBuilder.Entity<Movie>().HasIndex(p => p.Genre);
        }
    }
}