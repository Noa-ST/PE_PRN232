import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FileText, PlusSquare } from 'lucide-react'

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="h-16 flex items-center px-4 border-b">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-semibold">PE</span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold">PE PRN232</span>
            <span className="text-xs text-slate-500">Post Management</span>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3">
        <ul className="space-y-1">
          <li>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Posts</span>
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/create"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 border border-brand-100'
                    : 'text-slate-700 hover:bg-slate-100'
                }`
              }
            >
              <PlusSquare className="h-4 w-4" />
              <span>Create</span>
            </NavLink>
          </li>
          <li>
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100"
            >
              <FileText className="h-4 w-4" />
              <span>Docs</span>
            </a>
          </li>
        </ul>
      </nav>
      <div className="p-3 border-t text-xs text-slate-500">v1.0.0</div>
    </aside>
  )
}