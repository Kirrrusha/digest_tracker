import { FileText, LayoutDashboard, LogOut, Newspaper, Radio, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useAuthStore } from "../../stores/auth.store";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/channels", label: "Каналы", icon: Radio },
  { to: "/summaries", label: "Саммари", icon: FileText },
  { to: "/posts", label: "Посты", icon: Newspaper },
  { to: "/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);

  return (
    <aside className="w-56 bg-white border-r flex flex-col">
      <div className="p-4 border-b font-bold text-lg">DevDigest</div>
      <nav className="flex-1 p-2 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-gray-100 text-gray-900 font-medium"
                  : "text-gray-600 hover:bg-gray-50"
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-5 py-4 text-sm text-gray-500 hover:text-gray-700 border-t"
      >
        <LogOut size={16} />
        Выйти
      </button>
    </aside>
  );
}
