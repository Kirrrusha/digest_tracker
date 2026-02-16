"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Moon,
  Rss,
  Settings,
  Sun,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "Главная", icon: Home },
  { href: "/dashboard/channels", label: "Каналы", icon: Rss },
  { href: "/dashboard/summaries", label: "Саммари", icon: FileText },
  { href: "/dashboard/settings", label: "Настройки", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  const user = session?.user;
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <aside
      className={cn(
        "bg-neutral-900 dark:bg-neutral-950 text-neutral-100 flex flex-col h-full transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with logo */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <LayoutDashboard size={18} className="text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">ContentHub</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                    isActive
                      ? "bg-primary/20 text-primary"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon size={20} />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="p-3 border-t border-neutral-800 space-y-3">
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 transition-colors",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Переключить тему" : undefined}
        >
          {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && (
            <span className="text-sm">{theme === "dark" ? "Светлая тема" : "Тёмная тема"}</span>
          )}
        </button>

        {/* User profile */}
        {user && (
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg",
              collapsed && "justify-center"
            )}
          >
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
              {userInitials}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-100 truncate">
                  {user.name || "Пользователь"}
                </p>
                <p className="text-xs text-neutral-500 truncate">{user.email}</p>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start gap-3 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800",
            collapsed && "justify-center"
          )}
          onClick={() => signOut({ callbackUrl: "/login" })}
          title={collapsed ? "Выйти" : undefined}
        >
          <LogOut size={20} />
          {!collapsed && <span>Выйти</span>}
        </Button>
      </div>
    </aside>
  );
}
