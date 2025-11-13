import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiDelete, apiGet, apiPutForm, apiPutJson } from '../api'
import type { Movie } from '../types'
import { Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditMovie() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [movie, setMovie] = useState<Movie | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiGet<Movie>(`/api/movies/${id}`)
        setMovie(data)
      } catch (err) {
        toast.error('Không tải được phim')
        console.error(err)
      }
    })()
  }, [id])

  const save = async () => {
    if (!movie) return
    if (!movie.title) {
      alert('Title là bắt buộc')
      return
    }
    setLoading(true)
    try {
      await apiPutJson<Movie>(`/api/movies/${id}`, {
        title: movie.title,
        genre: movie.genre ?? null,
        rating: movie.rating ?? null,
        posterImageUrl: movie.posterImageUrl ?? null,
        description: movie.description ?? null,
      })
      if (image) {
        const form = new FormData()
        form.append('image', image)
        await apiPutForm<Movie>(`/api/movies/${id}/image`, form)
      }
      toast.success('Cập nhật thành công')
      navigate('/')
    } catch (err) {
      toast.error('Cập nhật thất bại')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const del = async () => {
    setLoading(true)
    try {
      await apiDelete(`/api/movies/${id}`)
      toast.success('Xóa thành công')
      navigate('/')
    } catch (err) {
      toast.error('Xóa thất bại')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!movie) return <div className="text-slate-500">Loading...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Edit Movie</h2>
      <div className="bg-white rounded-xl shadow p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Title" value={movie.title} onChange={(e) => setMovie({ ...movie, title: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Genre</label>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Genre" value={movie.genre ?? ''} onChange={(e) => setMovie({ ...movie, genre: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Rating</label>
          <input type="number" min={1} max={5} className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Rating" value={movie.rating ?? ''} onChange={(e) => setMovie({ ...movie, rating: e.target.value === '' ? null : Math.max(1, Math.min(5, Number(e.target.value))) })} />
        </div>
        {movie.posterImageUrl && (
          <img src={movie.posterImageUrl.startsWith('http') ? movie.posterImageUrl : `${import.meta.env.VITE_API_BASE_URL}${movie.posterImageUrl}`} alt={movie.title} className="max-w-sm rounded-md" />
        )}
        <div>
          <label className="block text-sm mb-1">Update Poster</label>
          <input type="file" className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={save} className="inline-flex items-center gap-2 rounded-md bg-brand-500 text-white px-4 py-2 text-sm hover:scale-[1.02] transition" disabled={loading}>
            {loading && <Loader2 className="size-4 animate-spin" />} Save
          </button>
          <button onClick={() => setConfirmingDelete(true)} className="ml-auto inline-flex items-center gap-2 rounded-md border border-red-300 text-red-600 px-4 py-2 text-sm hover:bg-red-50 transition" disabled={loading}>
            Delete
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-2xl shadow p-6 w-[420px]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" />
              <h3 className="font-semibold">Are you sure you want to delete this movie?</h3>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => { setConfirmingDelete(false); del(); }} className="inline-flex items-center gap-2 rounded-md bg-red-600 text-white px-4 py-2 text-sm">Delete</button>
              <button onClick={() => setConfirmingDelete(false)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}