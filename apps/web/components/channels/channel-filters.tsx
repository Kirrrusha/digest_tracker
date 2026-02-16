"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export type ChannelFilterType = "all" | "telegram" | "rss";

interface ChannelFiltersProps {
  activeFilter: ChannelFilterType;
  searchQuery: string;
}

export function ChannelFilters({ activeFilter, searchQuery }: ChannelFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchQuery);

  useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  const updateUrl = useCallback(
    (updates: { source?: ChannelFilterType; search?: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (updates.source !== undefined) {
        if (updates.source === "all") {
          params.delete("source");
        } else {
          params.set("source", updates.source);
        }
      }
      if (updates.search !== undefined) {
        if (updates.search) {
          params.set("search", updates.search);
        } else {
          params.delete("search");
        }
      }
      params.delete("page");
      router.push(`/dashboard/channels?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== searchQuery) {
        const params = new URLSearchParams(searchParams.toString());
        if (localSearch) {
          params.set("search", localSearch);
        } else {
          params.delete("search");
        }
        params.delete("page");
        router.push(`/dashboard/channels?${params.toString()}`);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, searchQuery, router, searchParams]);

  const handleFilterChange = (filter: ChannelFilterType) => {
    updateUrl({ source: filter });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleFilterChange("all")}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5",
            activeFilter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Все
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("telegram")}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5",
            activeFilter === "telegram"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          Telegram
        </button>
        <button
          type="button"
          onClick={() => handleFilterChange("rss")}
          className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5",
            activeFilter === "rss"
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          )}
        >
          RSS
        </button>
      </div>

      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Поиск каналов..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
