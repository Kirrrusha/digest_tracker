"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Check, Loader2, Search, Users } from "lucide-react";

import type { MTProtoChannelInfo } from "@/lib/mtproto/service";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addMultipleMTProtoChannels, listMyTelegramChannels } from "@/app/actions/mtproto";

interface TelegramChannelBrowserProps {
  onAdded?: () => void;
}

export function TelegramChannelBrowser({ onAdded }: TelegramChannelBrowserProps) {
  const [channels, setChannels] = useState<MTProtoChannelInfo[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [isLoading, startLoad] = useTransition();
  const [isAdding, startAdd] = useTransition();
  const [addResult, setAddResult] = useState<{ added: number; errors: string[] } | null>(null);

  useEffect(() => {
    startLoad(async () => {
      const result = await listMyTelegramChannels();
      if (result.success) {
        setChannels(result.data);
      } else {
        setError(result.error);
      }
    });
  }, []);

  const filtered = channels.filter((ch) => ch.title.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string, alreadyTracked: boolean) => {
    if (alreadyTracked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSelected = () => {
    const toAdd = channels.filter((ch) => selected.has(ch.id));
    if (!toAdd.length) return;
    setAddResult(null);
    setError(null);
    startAdd(async () => {
      const result = await addMultipleMTProtoChannels(
        toAdd.map((ch) => ({
          telegramId: ch.id,
          title: ch.title,
          username: ch.username,
          accessHash: ch.accessHash,
        }))
      );
      if (result.success) {
        setAddResult(result.data);
        setSelected(new Set());
        // Обновляем список — помечаем добавленные как отслеживаемые
        setChannels((prev) =>
          prev.map((ch) =>
            toAdd.some((a) => a.id === ch.id) ? { ...ch, isAlreadyTracked: true } : ch
          )
        );
        onAdded?.();
      } else {
        setError(result.error);
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Загрузка каналов...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3 overflow-hidden">
      {addResult && (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/50">
          <Check className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm">
            Добавлено каналов: <span className="font-medium">{addResult.added}</span>
            {addResult.errors.length > 0 && (
              <span className="text-destructive"> · Ошибок: {addResult.errors.length}</span>
            )}
          </p>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      {channels.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Каналы не найдены. Убедитесь, что вы состоите в Telegram каналах.
        </p>
      ) : (
        <>
          <div className="flex-1 min-h-0 max-h-[280px] overflow-y-auto rounded-md border">
            <div className="divide-y">
              {filtered.map((ch) => (
                <div
                  key={ch.id}
                  className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                    ch.isAlreadyTracked
                      ? "opacity-60 cursor-default"
                      : "cursor-pointer hover:bg-muted/50"
                  }`}
                  onClick={() => toggleSelect(ch.id, ch.isAlreadyTracked)}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(ch.id) || ch.isAlreadyTracked}
                    disabled={ch.isAlreadyTracked}
                    onChange={() => toggleSelect(ch.id, ch.isAlreadyTracked)}
                    onClick={(e) => e.stopPropagation()}
                    className="h-4 w-4 rounded border-input accent-primary cursor-pointer disabled:cursor-default"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{ch.title}</span>
                      {ch.isAlreadyTracked && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          Отслеживается
                        </Badge>
                      )}
                    </div>
                    {(ch.username || ch.participantsCount !== null) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {ch.username && (
                          <span className="text-xs text-muted-foreground">@{ch.username}</span>
                        )}
                        {ch.participantsCount !== null && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {ch.participantsCount.toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {filtered.length === 0 && search && (
                <p className="py-6 text-center text-sm text-muted-foreground">Ничего не найдено</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {selected.size > 0
                ? `Выбрано: ${selected.size}`
                : `Всего каналов: ${channels.length}`}
            </span>
            <Button
              onClick={handleAddSelected}
              disabled={selected.size === 0 || isAdding}
              size="sm"
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Добавление...
                </>
              ) : (
                `Добавить (${selected.size})`
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
