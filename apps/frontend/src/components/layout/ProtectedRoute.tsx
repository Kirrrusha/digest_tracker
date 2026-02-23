import { Bell, Search } from "lucide-react";
import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "../../stores/auth.store";
import { Sidebar } from "./Sidebar";

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);

  if (!token) return <Navigate to="/login" replace />;

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="flex h-screen bg-[#0d1629]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-3 border-b border-[#1e3050] shrink-0">
          <div className="flex-1 relative max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Поиск..."
              className="w-full bg-[#142035] border border-[#1e3050] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <button className="p-2 rounded-lg hover:bg-[#142035] text-slate-400 hover:text-white transition-colors">
            <Bell size={18} />
          </button>
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
            {initials}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
