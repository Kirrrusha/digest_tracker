import { FileText, LayoutDashboard, LogOut, Moon, Radio, Settings, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuthStore } from "../../stores/auth.store";
import { useThemeStore } from "../../stores/theme.store";

const nav = [
  { to: "/dashboard", label: "Главная", icon: LayoutDashboard },
  { to: "/channels", label: "Каналы", icon: Radio },
  { to: "/summaries", label: "Саммари", icon: FileText },
  { to: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const isDark = useThemeStore((s) => s.isDark);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <aside className="w-56 bg-[var(--bg)] border-r border-[var(--border)] flex flex-col shrink-0">
      <div className="p-4 border-b border-[var(--border)] flex items-center gap-2.5">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <FileText size={15} className="text-white" />
        </div>
        <span className="font-bold text-white text-base">ContentHub</span>
      </div>

      <nav className="flex-1 p-2 space-y-0.5">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600 text-white font-medium"
                  : "text-slate-400 hover:bg-[var(--surface)] hover:text-white"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[var(--border)] space-y-1">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-[var(--surface)] hover:text-white transition-colors"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
          {isDark ? "Светлая тема" : "Тёмная тема"}
        </button>
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name ?? "Пользователь"}
            </p>
            <p className="text-xs text-slate-500 truncate">{user?.login ?? ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-[var(--surface)] hover:text-red-400 transition-colors"
        >
          <LogOut size={16} />
          Выйти
        </button>
      </div>
    </aside>
  );
}
