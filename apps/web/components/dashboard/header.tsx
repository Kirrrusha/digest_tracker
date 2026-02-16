"use client";

import { useState, useTransition } from "react";
import { Bell, RefreshCw, User } from "lucide-react";
import { useSession } from "next-auth/react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { refreshAllChannels } from "@/app/actions/channels";

interface HeaderProps {
  title?: string;
}

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  const [refreshResult, setRefreshResult] = useState<string | null>(null);

  const handleRefresh = () => {
    startTransition(async () => {
      const result = await refreshAllChannels();
      if (result.success) {
        setRefreshResult(`Добавлено ${result.data.total} постов`);
        setTimeout(() => setRefreshResult(null), 3000);
      }
    });
  };

  return (
    <header className="bg-card border-b px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {title && <h1 className="text-xl font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-2">
        {refreshResult && <span className="text-sm text-muted-foreground">{refreshResult}</span>}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={isPending}
          title="Обновить все каналы"
        >
          <RefreshCw size={18} className={cn(isPending && "animate-spin")} />
        </Button>

        <Button variant="ghost" size="icon" title="Уведомления">
          <Bell size={18} />
        </Button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="px-2 py-1.5">
              <p className="font-medium">{session?.user?.name || "Пользователь"}</p>
              <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/dashboard/settings">Настройки</a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
