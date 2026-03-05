import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, ChevronDown, ChevronRight, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi, type MTProtoChannelInfo } from "../api/mtproto";

interface TelegramFolderBrowserProps {
  onAdded?: () => void;
}

export function TelegramFolderBrowser({ onAdded }: TelegramFolderBrowserProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [localFolders, setLocalFolders] = useState<
    { id: number; title: string; channels: MTProtoChannelInfo[] }[] | null
  >(null);

  const {
    data: folders = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mtproto-folders"],
    queryFn: mtprotoApi.listFolders,
  });

  const displayed = localFolders ?? folders;

  const bulkAddMutation = useMutation({
    mutationFn: (
      items: Array<{
        telegramId: string;
        title: string;
        username?: string | null;
        accessHash: string;
      }>
    ) => mtprotoApi.bulkAdd(items),
    onSuccess: (result, items) => {
      toast.success(`Добавлено каналов: ${result.added}`);
      if (result.errors.length > 0) toast.error(`Ошибок: ${result.errors.length}`);
      setSelected(new Set());
      const addedIds = new Set(items.map((i) => i.telegramId));
      setLocalFolders(
        (localFolders ?? folders).map((f) => ({
          ...f,
          channels: f.channels.map((ch) =>
            addedIds.has(ch.id) ? { ...ch, isAlreadyTracked: true } : ch
          ),
        }))
      );
      qc.invalidateQueries({ queryKey: ["channels"] });
      onAdded?.();
    },
    onError: () => toast.error("Ошибка добавления каналов"),
  });

  const toggleFolder = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleChannel = (id: string, alreadyTracked: boolean) => {
    if (alreadyTracked) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllInFolder = (channels: MTProtoChannelInfo[]) => {
    const addable = channels.filter((ch) => !ch.isAlreadyTracked).map((ch) => ch.id);
    setSelected((prev) => {
      const next = new Set(prev);
      addable.forEach((id) => next.add(id));
      return next;
    });
  };

  const handleAddSelected = () => {
    const allChannels = displayed.flatMap((f) => f.channels);
    const toAdd = allChannels
      .filter((ch) => selected.has(ch.id))
      .map((ch) => ({
        telegramId: ch.id,
        title: ch.title,
        username: ch.username,
        accessHash: ch.accessHash,
      }));
    if (!toAdd.length) return;
    bulkAddMutation.mutate(toAdd);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Загрузка папок...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 text-red-400 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        {(error as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Не удалось загрузить папки. Убедитесь, что Telegram подключён в настройках."}
      </div>
    );
  }

  if (displayed.length === 0) {
    return (
      <p className="text-center text-sm text-slate-400 py-6">
        Папки не найдены. Создайте папки в Telegram для организации каналов.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="max-h-80 overflow-y-auto rounded border border-[--border] divide-y divide-[--border]">
        {displayed.map((folder) => {
          const isOpen = expanded.has(folder.id);
          const addable = folder.channels.filter((ch) => !ch.isAlreadyTracked);
          const allAddableSelected =
            addable.length > 0 && addable.every((ch) => selected.has(ch.id));

          return (
            <div key={folder.id}>
              {/* Folder header */}
              <div
                className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[--border] transition-colors"
                onClick={() => toggleFolder(folder.id)}
              >
                {isOpen ? (
                  <ChevronDown size={14} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-slate-400 shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium text-white">{folder.title}</span>
                <span className="text-xs text-slate-500 shrink-0">
                  {folder.channels.length} кан.
                </span>
                {addable.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (allAddableSelected) {
                        setSelected((prev) => {
                          const next = new Set(prev);
                          addable.forEach((ch) => next.delete(ch.id));
                          return next;
                        });
                      } else {
                        selectAllInFolder(folder.channels);
                      }
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 shrink-0 px-1"
                  >
                    {allAddableSelected ? "Снять все" : "Выбрать все"}
                  </button>
                )}
              </div>

              {/* Channels list */}
              {isOpen && (
                <div className="divide-y divide-[--border]">
                  {folder.channels.map((ch) => (
                    <div
                      key={ch.id}
                      className={`flex items-center gap-3 pl-7 pr-3 py-2 transition-colors ${
                        ch.isAlreadyTracked
                          ? "opacity-50 cursor-default"
                          : "cursor-pointer hover:bg-[--border]"
                      }`}
                      onClick={() => toggleChannel(ch.id, ch.isAlreadyTracked)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(ch.id) || ch.isAlreadyTracked}
                        disabled={ch.isAlreadyTracked}
                        onChange={() => toggleChannel(ch.id, ch.isAlreadyTracked)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded accent-blue-500 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white truncate">{ch.title}</span>
                          {ch.isAlreadyTracked && (
                            <span className="text-xs px-1.5 py-0.5 bg-[--border] text-slate-400 rounded shrink-0">
                              Отслеживается
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {ch.username && (
                            <span className="text-xs text-slate-500">@{ch.username}</span>
                          )}
                          {ch.participantsCount !== null && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Users size={11} />
                              {ch.participantsCount.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {selected.size > 0 ? `Выбрано: ${selected.size}` : `Папок: ${displayed.length}`}
        </span>
        <button
          onClick={handleAddSelected}
          disabled={selected.size === 0 || bulkAddMutation.isPending}
          className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded text-sm disabled:opacity-50 hover:bg-blue-700"
        >
          {bulkAddMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} />
          )}
          {bulkAddMutation.isPending ? "Добавление..." : `Добавить (${selected.size})`}
        </button>
      </div>
    </div>
  );
}
