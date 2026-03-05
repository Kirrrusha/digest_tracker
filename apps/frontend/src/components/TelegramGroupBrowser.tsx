import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Check, Loader2, Search, Users } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi } from "../api/mtproto";

const GROUP_TYPE_LABELS: Record<string, string> = {
  group: "Группа",
  supergroup: "Супергруппа",
  forum: "Форум",
};

interface TelegramGroupBrowserProps {
  onAdded?: () => void;
}

export function TelegramGroupBrowser({ onAdded }: TelegramGroupBrowserProps) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const {
    data: groups = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mtproto-groups"],
    queryFn: mtprotoApi.listGroups,
  });

  const [localGroups, setLocalGroups] = useState<typeof groups | null>(null);
  const displayed = localGroups ?? groups;

  const bulkAddMutation = useMutation({
    mutationFn: (
      items: Array<{
        telegramId: string;
        title: string;
        username?: string | null;
        accessHash?: string | null;
        groupType: "group" | "supergroup" | "forum";
      }>
    ) => mtprotoApi.bulkAddGroups(items),
    onSuccess: (result, items) => {
      toast.success(`Добавлено групп: ${result.added}`);
      if (result.errors.length > 0) {
        toast.error(`Ошибок: ${result.errors.length}`);
      }
      setSelected(new Set());
      setLocalGroups((prev) =>
        (prev ?? groups).map((g) =>
          items.some((a) => a.telegramId === g.id) ? { ...g, isAlreadyTracked: true } : g
        )
      );
      qc.invalidateQueries({ queryKey: ["channels"] });
      onAdded?.();
    },
    onError: () => toast.error("Ошибка добавления групп"),
  });

  const filtered = displayed.filter((g) => g.title.toLowerCase().includes(search.toLowerCase()));

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
      .filter((g) => selected.has(g.id))
      .map((g) => ({
        telegramId: g.id,
        title: g.title,
        username: g.username,
        accessHash: g.accessHash,
        groupType: g.groupType,
      }));
    if (!toAdd.length) return;
    bulkAddMutation.mutate(toAdd);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 text-slate-400 text-sm gap-2">
        <Loader2 size={16} className="animate-spin" />
        Загрузка групп...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 text-red-400 text-sm">
        <AlertCircle size={16} className="shrink-0" />
        {(error as { response?: { data?: { message?: string } } }).response?.data?.message ??
          "Не удалось загрузить группы. Убедитесь, что Telegram подключён в настройках."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
        <input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[--bg] border border-[--border] rounded pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
        />
      </div>

      {displayed.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">
          Группы не найдены. Убедитесь, что вы состоите в Telegram группах.
        </p>
      ) : (
        <>
          <div className="max-h-72 overflow-y-auto rounded border border-[--border] divide-y divide-[--border]">
            {filtered.map((g) => (
              <div
                key={g.id}
                className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  g.isAlreadyTracked
                    ? "opacity-50 cursor-default"
                    : "cursor-pointer hover:bg-[--border]"
                }`}
                onClick={() => toggleSelect(g.id, g.isAlreadyTracked)}
              >
                <input
                  type="checkbox"
                  checked={selected.has(g.id) || g.isAlreadyTracked}
                  disabled={g.isAlreadyTracked}
                  onChange={() => toggleSelect(g.id, g.isAlreadyTracked)}
                  onClick={(e) => e.stopPropagation()}
                  className="h-4 w-4 rounded accent-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{g.title}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-400 rounded shrink-0">
                      {GROUP_TYPE_LABELS[g.groupType] ?? g.groupType}
                    </span>
                    {g.isAlreadyTracked && (
                      <span className="text-xs px-1.5 py-0.5 bg-[--border] text-slate-400 rounded shrink-0">
                        Отслеживается
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {g.username && <span className="text-xs text-slate-500">@{g.username}</span>}
                    {g.participantsCount !== null && (
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Users size={11} />
                        {g.participantsCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && search && (
              <p className="py-6 text-center text-sm text-slate-400">Ничего не найдено</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              {selected.size > 0 ? `Выбрано: ${selected.size}` : `Всего групп: ${displayed.length}`}
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
