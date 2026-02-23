import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi } from "../api/mtproto";

interface TelegramChannelBrowserProps {
  onAdded?: () => void;
}

export function TelegramChannelBrowser({ onAdded }: TelegramChannelBrowserProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: channels = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mtproto-channels"],
    queryFn: mtprotoApi.listChannels,
  });

  const [localChannels, setLocalChannels] = useState<typeof channels | null>(null);
  const displayed = localChannels ?? channels;

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
      if (result.errors.length > 0) {
        toast.error(`Ошибок: ${result.errors.length}`);
      }
      setSelected(new Set());
      setLocalChannels((prev) =>
        (prev ?? channels).map((ch) =>
          items.some((a) => a.telegramId === ch.id) ? { ...ch, isAlreadyTracked: true } : ch
        )
      );
      qc.invalidateQueries({ queryKey: ["channels"] });
      onAdded?.();
    },
    onError: () => toast.error("Ошибка добавления каналов"),
  });

  const filtered = displayed.filter((ch) => ch.title.toLowerCase().includes(search.toLowerCase()));

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
    const toAdd = displayed
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
      <div className="flex items-center justify-center py-10 text-gray-500 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Загрузка каналов...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        {(error as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Не удалось загрузить каналы. Убедитесь, что Telegram подключён в настройках."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
        <input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded pl-8 pr-3 py-2 text-sm"
        />
      </div>

      {displayed.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-6">
          Каналы не найдены. Убедитесь, что вы состоите в Telegram каналах.
        </p>
      ) : (
        <>
          <div className="max-h-72 overflow-y-auto rounded border divide-y">
            {filtered.map((ch) => (
              <div
                key={ch.id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  ch.isAlreadyTracked
                    ? "opacity-60 cursor-default"
                    : "cursor-pointer hover:bg-gray-50"
                }`}
                onClick={() => toggleSelect(ch.id, ch.isAlreadyTracked)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(ch.id) || ch.isAlreadyTracked}
                  disabled={ch.isAlreadyTracked}
                  onChange={() => toggleSelect(ch.id, ch.isAlreadyTracked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{ch.title}</span>
                    {ch.isAlreadyTracked && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded shrink-0">
                        Отслеживается
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {ch.username && <span className="text-xs text-gray-400">@{ch.username}</span>}
                    {ch.participantsCount !== null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users size={11} />
                        {ch.participantsCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <p className="py-6 text-center text-sm text-gray-400">Ничего не найдено</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {selected.size > 0
                ? `Выбрано: ${selected.size}`
                : `Всего каналов: ${displayed.length}`}
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
        </>
      )}
    </div>
  );
}
