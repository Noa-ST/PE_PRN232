import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiDelete, apiGet, apiPutForm, apiPutJson } from '../api'
import type { Post } from '../types'
import { Loader2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function EditPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

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

  const save = async () => {
    if (!post) return
    if (!post.name || !post.description) {
      alert('Name và Description là bắt buộc')
      return
    }
    setLoading(true)
    try {
      await apiPutJson<Post>(`/api/posts/${id}`, {
        name: post.name,
        description: post.description,
        imageUrl: post.imageUrl ?? null,
      })
      if (image) {
        const form = new FormData()
        form.append('image', image)
        await apiPutForm<Post>(`/api/posts/${id}/image`, form)
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
      await apiDelete(`/api/posts/${id}`)
      toast.success('Xóa thành công')
      navigate('/')
    } catch (err) {
      toast.error('Xóa thất bại')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!post) return <div className="text-slate-500">Loading...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Edit Post</h2>
      <div className="bg-white rounded-xl shadow p-6 max-w-lg space-y-4">
        <div>
          <label className="block text-sm mb-1">Name</label>
          <input className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Name" value={post.name} onChange={(e) => setPost({ ...post, name: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm mb-1">Description</label>
          <textarea className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Description" value={post.description} onChange={(e) => setPost({ ...post, description: e.target.value })} rows={4} />
        </div>
        {post.imageUrl && (
          <img src={`${import.meta.env.VITE_API_URL}${post.imageUrl}`} alt={post.name} className="max-w-sm rounded-md" />
        )}
        <div>
          <label className="block text-sm mb-1">Update Image</label>
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

      {/* Confirm delete modal */}
      {confirmingDelete && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-2xl shadow p-6 w-[420px]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" />
              <h3 className="font-semibold">Are you sure you want to delete this post?</h3>
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