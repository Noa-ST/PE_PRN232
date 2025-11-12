import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiDelete } from '../api'
import type { Post } from '../types'
import { Loader2, RefreshCw, Search, Plus, Edit, BarChart3, ListFilter, ArrowDownAZ, ArrowUpZA, Eye, Trash2, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'asc' | 'desc'>('asc')
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const [time, setTime] = useState<'all' | 'today' | 'week'>('all')
  const [page, setPage] = useState(1)
  const pageSize = 9
  const [hasMore, setHasMore] = useState(true)

  const load = async (append = false) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (sort) params.set('sort', sort)
    if (time !== 'all') params.set('time', time)
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    const data = await apiGet<Post[]>(`/api/posts?${params.toString()}`)
    if (append) {
      setPosts((prev) => [...prev, ...data])
    } else {
      setPosts(data)
    }
    setHasMore(data.length === pageSize)
    setLoading(false)
  }

  useEffect(() => {
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto reload when search/sort changes, with debounce
  useEffect(() => {
    const h = setTimeout(() => {
      setPage(1)
      load(false)
    }, 500)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sort])

  // Reload when time filter changes
  useEffect(() => {
    setPage(1)
    load(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time])

  const del = async (id: number) => {
    setDeletingId(id)
    try {
      await apiDelete(`/api/posts/${id}`)
      setPosts((prev) => prev.filter((p) => p.id !== id))
      toast.success('Xóa thành công')
    } catch (err) {
      toast.error('Xóa thất bại')
      console.error(err)
    } finally {
      setDeletingId(null)
      setConfirmingId(null)
    }
  }

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold">Posts</h2>
          <div className="ml-auto">
            <Link
              to="/create"
              className="inline-flex items-center gap-2 rounded-md bg-brand-500 hover:bg-brand-600 text-white px-3 py-1.5 text-sm shadow-sm hover:shadow transition"
            >
              <Plus className="size-4" /> Create New
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        {posts.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <BarChart3 className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs text-slate-500">Total</div>
                <div className="font-semibold">{posts.length}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <ListFilter className="h-4 w-4" />
              </span>
              <div>
                <div className="text-xs text-slate-500">Search</div>
                <div className="font-semibold">{search ? 'Active' : 'None'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl border bg-white p-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                {sort === 'asc' ? <ArrowDownAZ className="h-4 w-4" /> : <ArrowUpZA className="h-4 w-4" />}
              </span>
              <div>
                <div className="text-xs text-slate-500">Sort</div>
                <div className="font-semibold">{sort === 'asc' ? 'A–Z' : 'Z–A'}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            className="w-full rounded-md border border-slate-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loading && search && (
            <div className="absolute left-0 top-full mt-1 text-xs text-slate-500">Đang tìm…</div>
          )}
        </div>
        <select
          value={sort}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as 'asc' | 'desc')}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
        >
          <option value="asc">Name A–Z</option>
          <option value="desc">Name Z–A</option>
        </select>
        <select
          value={time}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => setTime(e.target.value as 'all' | 'today' | 'week')}
          className="rounded-md border border-slate-300 px-2 py-2 text-sm bg-white"
        >
          <option value="all">All time</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
        </select>
        <button
          onClick={() => load(false)}
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition"
          title="Refresh"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Refresh
        </button>
      </div>

      {/* Grid / Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow overflow-hidden">
              <div className="w-full h-60 bg-slate-200 animate-pulse" />
              <div className="p-4">
                <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                <div className="mt-2 h-3 w-48 bg-slate-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        search ? (
          <div className="text-center text-slate-600 bg-white rounded-xl border border-slate-200 p-10">
            Không có kết quả phù hợp cho từ khóa.
          </div>
        ) : (
          <div className="text-center text-slate-600 bg-white rounded-xl border border-brand-100 p-10">
            <span className="text-brand-600">No posts yet.</span> Create your first one 👇
          </div>
        )
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {posts.map((p) => (
                <div key={p.id} className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden">
                  {p.imageUrl && (
                    <img
                      src={`${import.meta.env.VITE_API_BASE_URL}${p.imageUrl}`}
                      alt={p.name}
                      className="w-full h-60 object-contain bg-slate-100"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="100%" height="100%" fill="#e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="14">Image unavailable</text></svg>')
                        e.currentTarget.src = `data:image/svg+xml;charset=utf-8,${svg}`
                      }}
                    />
                  )}
                  <div className="p-4">
                <div className="flex items-center gap-2">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="ml-auto flex items-center gap-3 text-sm">
                    <Link to={`/post/${p.id}`} className="inline-flex items-center gap-1 text-slate-700 hover:underline">
                      <Eye className="size-4" /> View
                    </Link>
                    <Link to={`/edit/${p.id}`} className="inline-flex items-center gap-1 text-brand-500 hover:underline">
                      <Edit className="size-4" /> Edit
                    </Link>
                    <button onClick={() => setConfirmingId(p.id)} className="inline-flex items-center gap-1 text-red-600 hover:underline" disabled={deletingId === p.id}>
                      {deletingId === p.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-slate-600 line-clamp-2">{p.description}</p>
              </div>
            </div>
          ))}
        </div>
        {hasMore && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => { setPage((prev) => prev + 1); load(true); }}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-4 py-2 text-sm bg-white hover:bg-slate-100"
              disabled={loading}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null} Load more
            </button>
          </div>
        )}
        </>
      )}

      {/* Confirm delete modal */}
      {confirmingId !== null && (
        <div className="fixed inset-0 bg-black/40 grid place-items-center">
          <div className="bg-white rounded-2xl shadow p-6 w-[420px]">
            <div className="flex items-center gap-3">
              <AlertTriangle className="text-red-500" />
              <h3 className="font-semibold">Bạn có chắc muốn xóa bài viết này?</h3>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => del(confirmingId!)} className="inline-flex items-center gap-2 rounded-md bg-red-600 text-white px-4 py-2 text-sm">Xóa</button>
              <button onClick={() => setConfirmingId(null)} className="rounded-md border border-slate-300 px-4 py-2 text-sm">Hủy</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}