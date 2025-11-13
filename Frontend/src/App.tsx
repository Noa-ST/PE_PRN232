// removed global App.css to allow full-width layout
import { NavLink, Route, Routes } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import Movies from "./pages/Movies.tsx";
import CreateMovie from "./pages/CreateMovie.tsx";
import EditMovie from "./pages/EditMovie.tsx";
import Sidebar from "./components/Sidebar";
import MovieDetails from "./pages/MovieDetails.tsx";

function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Content area */}
      <div className="flex-1 min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-brand-100">
          <div className="px-6 h-14 flex items-center justify-between bg-gradient-to-r from-brand-50 to-transparent">
            <div className="text-sm text-slate-700">
              <span className="font-semibold">Dashboard</span>
              <span className="mx-2 text-slate-400">/</span>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  isActive ? "text-brand-600 font-medium" : "text-slate-600"
                }
              >
                Movies
              </NavLink>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 transition"
              title="Refresh"
            >
              <RefreshCw className="size-4" /> Refresh
            </button>
          </div>
        </header>

        {/* Routes */}
        <main className="px-6 py-6">
          <Routes>
            <Route path="/" element={<Movies />} />
            <Route path="/create" element={<CreateMovie />} />
            <Route path="/edit/:id" element={<EditMovie />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
