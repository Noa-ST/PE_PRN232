import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiPostForm, apiPostJson } from '../api'
import type { Movie } from '../types'
import { Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function CreateMovie() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('')
  const [rating, setRating] = useState<number | ''>('')
  const [posterUrl, setPosterUrl] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ title?: string; description?: string }>(() => ({}))
  const [loading, setLoading] = useState(false)

  // Cleanup preview URL when image changes or component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])

  const validate = () => {
    const next: { title?: string } = {}
    if (!title.trim()) next.title = 'Vui lòng nhập Title.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      if (image) {
        const form = new FormData()
        form.append('title', title)
        if (genre) form.append('genre', genre)
        if (rating !== '') form.append('rating', String(rating))
        if (description) form.append('description', description)
        form.append('image', image)
        const created = await apiPostForm<Movie>('/api/movies/upload', form)
        navigate(`/movie/${created.id}`)
      } else {
        const payload: import('../types').MovieCreateDto = { title }
        if (genre) payload.genre = genre
        if (rating !== '') payload.rating = rating
        if (posterUrl) payload.posterImageUrl = posterUrl
        if (description) payload.description = description
        const created = await apiPostJson<Movie>('/api/movies', payload)
        navigate(`/movie/${created.id}`)
      }
      toast.success('Tạo bài thành công')
      setTitle('')
      setGenre('')
      setRating('')
      setPosterUrl('')
      setDescription('')
      setImage(null)
      setImagePreview(null)
      setErrors({})
    } catch (err) {
      toast.error('Tạo bài thất bại')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-lg font-semibold mb-4">Create Movie</h2>
      <div className="bg-white rounded-xl border p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4">
          {/* Title */}
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              className={`w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${
                errors.title ? 'border-red-300 focus:ring-red-400 border' : 'border border-slate-300 focus:ring-brand-500'
              }`}
              placeholder="Nhập Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value)
                if (errors.title) setErrors((s) => ({ ...s, title: undefined }))
              }}
            />
            <p className={`mt-1 text-xs ${errors.title ? 'text-red-600' : 'text-slate-500'}`}>Title bắt buộc.</p>
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title}</p>}
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm mb-1">Image (optional)</label>
            <input
              type="file"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null
                setImage(file)
                if (imagePreview) URL.revokeObjectURL(imagePreview)
                setImagePreview(file ? URL.createObjectURL(file) : null)
              }}
            />
            <p className="mt-1 text-xs text-slate-500">PNG/JPG, kích thước vừa phải để tải nhanh.</p>
            {imagePreview && (
              <div className="mt-2">
                <img src={imagePreview} alt="Preview" className="w-full h-auto max-h-64 object-contain rounded-md border bg-slate-100" />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              className={`w-full rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 bg-white ${
                errors.description ? 'border-red-300 focus:ring-red-400 border' : 'border border-slate-300 focus:ring-brand-500'
              }`}
              placeholder="Mô tả ngắn gọn nội dung bài viết"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value)
                if (errors.description) setErrors((s) => ({ ...s, description: undefined }))
              }}
              rows={4}
            />
            <p className={`mt-1 text-xs ${errors.description ? 'text-red-600' : 'text-slate-500'}`}>Mô tả giúp người xem hiểu nhanh nội dung.</p>
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description}</p>}
          </div>

          {/* Genre */}
          <div>
            <label className="block text-sm mb-1">Genre (optional)</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
              placeholder="Nhập Genre"
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm mb-1">Rating (1–5, optional)</label>
            <input
              type="number"
              min={1}
              max={5}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
              placeholder="Nhập Rating"
              value={rating}
              onChange={(e) => {
                const v = e.target.value
                setRating(v === '' ? '' : Math.max(1, Math.min(5, Number(v))))
              }}
            />
          </div>

          {/* Poster URL */}
          <div>
            <label className="block text-sm mb-1">Poster URL (optional)</label>
            <input
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
              placeholder="https://..."
              value={posterUrl}
              onChange={(e) => setPosterUrl(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end">
            <button
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-sm shadow-sm transition"
              disabled={loading}
            >
              {loading && <Loader2 className="size-4 animate-spin" />} Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}