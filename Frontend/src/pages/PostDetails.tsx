import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiGet } from '../api'
import type { Post } from '../types'
import { ArrowLeft, Copy, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PostDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [lightbox, setLightbox] = useState(false)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const data = await apiGet<Post>(`/api/posts/${id}`)
        setPost(data)
      } catch (err) {
        toast.error('Không tải được bài viết')
        console.error(err)
      }
    })()
  }, [id])
  

  if (!post) return <div className="text-slate-500">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100">
          <ArrowLeft className="size-4" /> Back
        </button>
        <button
          onClick={() => {
            navigator.clipboard.writeText(window.location.href)
            toast.success('Đã copy link bài viết')
          }}
          className="ml-auto inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          <Copy className="size-4" /> Copy link
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {post.imageUrl && (
          <img
            src={post.imageUrl.startsWith('http') ? post.imageUrl : `${import.meta.env.VITE_API_BASE_URL}${post.imageUrl}`}
            alt={post.name}
            className="w-full max-h-[480px] object-contain rounded-lg border bg-slate-100 cursor-zoom-in"
            onClick={() => setLightbox(true)}
          />
        )}
        <h1 className="mt-4 text-2xl font-semibold">{post.name}</h1>
        <p className="mt-2 text-slate-700">{post.description}</p>
        <div className="mt-4 text-xs text-slate-500">Created: {new Date(post.createdAt).toLocaleString()}</div>
      </div>

      {lightbox && post?.imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center" onClick={() => { setLightbox(false); setZoom(false); }}>
          <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={(e) => { e.stopPropagation(); setLightbox(false); setZoom(false); }}>
            <X className="size-6" />
          </button>
          <img
            src={post.imageUrl.startsWith('http') ? post.imageUrl : `${import.meta.env.VITE_API_BASE_URL}${post.imageUrl}`}
            alt={post.name}
            className={`max-h-[90vh] max-w-[90vw] object-contain transition-transform ${zoom ? 'scale-125' : 'scale-100'}`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={() => setZoom((z) => !z)}
          />
          <div className="absolute bottom-6 text-center text-white/80 text-xs">Double click để zoom</div>
        </div>
      )}
    </div>
  )
}