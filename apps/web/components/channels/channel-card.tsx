"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ExternalLink, MoreVertical, Power, PowerOff, RefreshCw, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteChannel, refreshChannel, toggleChannel } from "@/app/actions/channels";

import { ChannelTags } from "./channel-tags";

interface ChannelCardProps {
  channel: {
    id: string;
    name: string;
    sourceUrl: string;
    sourceType: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    postsCount: number;
    lastPostAt: Date | null;
    tags?: string[];
  };
}

export function ChannelCard({ channel }: ChannelCardProps) {
  const [isRefreshing, startRefresh] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isDeleting, startDelete] = useTransition();
  const [localChannel, setLocalChannel] = useState(channel);

  const handleRefresh = () => {
    startRefresh(async () => {
      const result = await refreshChannel(channel.id);
      if (result.success) {
        setLocalChannel((prev) => ({
          ...prev,
          postsCount: prev.postsCount + result.data.added,
          lastPostAt: new Date(),
        }));
      }
    });
  };

  const handleToggle = () => {
    startToggle(async () => {
      const result = await toggleChannel(channel.id, !localChannel.isActive);
      if (result.success) {
        setLocalChannel((prev) => ({ ...prev, isActive: !prev.isActive }));
      }
    });
  };

  const handleDelete = () => {
    if (!confirm("Удалить канал и все его посты?")) return;
    startDelete(async () => {
      await deleteChannel(channel.id);
    });
  };

  if (isDeleting) {
    return null;
  }

  return (
    <Card className={cn("gap-3", !localChannel.isActive && "opacity-60")}>
      {/* Header */}
      <div className="px-6 flex items-start justify-between">
        <div className="flex items-start gap-3 min-w-0">
          {localChannel.imageUrl ? (
            <img
              src={localChannel.imageUrl}
              alt={localChannel.name}
              className="w-10 h-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {localChannel.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold truncate">{localChannel.name}</span>
              <Badge variant="outline" className="text-xs shrink-0">
                {localChannel.sourceType.startsWith("telegram") ? "TG" : "RSS"}
              </Badge>
            </div>
            {localChannel.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {localChannel.description}
              </p>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0 -mr-2">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
              <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
              Обновить
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggle} disabled={isToggling}>
              {localChannel.isActive ? (
                <>
                  <PowerOff className="mr-2 h-4 w-4" />
                  Отключить
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  Включить
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={localChannel.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Открыть источник
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="px-6 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <span className="text-muted-foreground">{localChannel.postsCount} постов</span>
          {localChannel.lastPostAt && (
            <span className="text-muted-foreground">
              Обновлено{" "}
              {formatDistanceToNow(localChannel.lastPostAt, {
                addSuffix: true,
                locale: ru,
              })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ChannelTags channelId={channel.id} tags={channel.tags || []} compact />
          <Link href={`/dashboard/channels/${channel.id}`}>
            <Button variant="ghost" size="sm">
              Посты
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
