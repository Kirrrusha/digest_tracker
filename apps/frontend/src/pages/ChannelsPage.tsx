import { useState } from "react";
import type { Channel } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MoreVertical, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

import { channelsApi } from "../api/channels";
import { TelegramChannelBrowser } from "../components/TelegramChannelBrowser";

type AddTab = "url" | "telegram";
type TypeFilter = "all" | "telegram" | "rss";

const CHANNEL_COLORS = [
  "bg-purple-600",
  "bg-blue-600",
  "bg-rose-600",
  "bg-green-600",
  "bg-amber-600",
  "bg-cyan-600",
];

function channelColor(name: string): string {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffff;
  return CHANNEL_COLORS[Math.abs(h) % CHANNEL_COLORS.length];
}

function channelInitial(name: string): string {
  // Prefer first letter, fall back to first digit
  const letter = name.match(/[A-Za-zА-Яа-яЁё]/);
  if (letter) return letter[0].toUpperCase();
  const digit = name.match(/[0-9]/);
  return digit ? digit[0] : "#";
}

function isTelegramChannel(ch: Channel) {
  return (
    ch.sourceType === "telegram" ||
    ch.sourceType === "telegram_bot" ||
    ch.sourceType === "telegram_mtproto"
  );
}

export function ChannelsPage() {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<AddTab>("url");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: channelsApi.list,
  });

  const addMutation = useMutation({
    mutationFn: () => channelsApi.create({ url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      setUrl("");
      setShowDialog(false);
      toast.success("Канал добавлен");
    },
    onError: () => toast.error("Ошибка добавления канала"),
  });

  const removeMutation = useMutation({
    mutationFn: channelsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Канал удалён");
    },
  });

  const handleSync = async (ch: Channel) => {
    setSyncingId(ch.id);
    try {
      const result = await channelsApi.sync(ch.id);
      qc.invalidateQueries({ queryKey: ["channels"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (result.saved > 0) {
        toast.success(`Получено ${result.saved} новых постов`);
      } else {
        toast.info("Новых постов нет");
      }
    } catch {
      toast.error("Ошибка синхронизации");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    if (syncingAll || channels.length === 0) return;
    setSyncingAll(true);
    let totalSaved = 0;
    let errors = 0;
    for (const ch of channels) {
      setSyncingId(ch.id);
      try {
        const result = await channelsApi.sync(ch.id);
        totalSaved += result.saved;
      } catch {
        errors++;
      }
    }
    setSyncingId(null);
    setSyncingAll(false);
    qc.invalidateQueries({ queryKey: ["channels"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    if (errors > 0) {
      toast.error(`Ошибки в ${errors} каналах`);
    } else if (totalSaved > 0) {
      toast.success(`Получено ${totalSaved} новых постов`);
    } else {
      toast.info("Новых постов нет");
    }
  };

  const filtered = channels.filter((ch: Channel) => {
    const matchType =
      typeFilter === "all" ||
      (typeFilter === "telegram" && isTelegramChannel(ch)) ||
      (typeFilter === "rss" && ch.sourceType === "rss");
    const matchSearch =
      !search ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.sourceUrl.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Мои каналы</h1>
          <p className="text-sm text-slate-400 mt-0.5">{channels.length} каналов</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            disabled={syncingAll || channels.length === 0}
            title="Обновить все каналы"
            className="flex items-center gap-2 border border-[#1e3050] text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#142035] disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={15} className={syncingAll ? "animate-spin" : ""} />
            Обновить все
          </button>
          <button
            onClick={() => setShowDialog(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Добавить канал
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-[#142035] border border-[#1e3050] rounded-lg p-1">
          {(["all", "telegram", "rss"] as TypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                typeFilter === f ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {f === "all" ? "Все" : f === "telegram" ? "Telegram" : "RSS"}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск каналов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#142035] border border-[#1e3050] rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-[#142035] border border-[#1e3050] rounded-xl p-5 animate-pulse h-40"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          {channels.length === 0
            ? "Каналов нет. Добавьте первый!"
            : "Нет каналов по заданным фильтрам"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ch: Channel) => {
            const color = channelColor(ch.name);
            const initial = channelInitial(ch.name);
            const typeLabel = isTelegramChannel(ch) ? "Telegram" : "RSS";
            return (
              <div
                key={ch.id}
                className="bg-[#142035] border border-[#1e3050] rounded-xl p-5 hover:border-blue-500/40 transition-colors"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Link
                    to={`/channels/${ch.id}`}
                    className="flex items-center gap-3 flex-1 min-w-0"
                  >
                    <div
                      className={`w-10 h-10 rounded-full ${color} flex items-center justify-center text-white font-semibold text-base shrink-0`}
                    >
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white truncate">{ch.name}</p>
                      <p className="text-xs text-slate-500 truncate">{ch.sourceUrl}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleSync(ch)}
                      disabled={syncingId === ch.id}
                      title="Синхронизировать"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-[#1e3050] transition-colors disabled:opacity-40"
                    >
                      <RefreshCw size={14} className={syncingId === ch.id ? "animate-spin" : ""} />
                    </button>
                    <button
                      onClick={() => removeMutation.mutate(ch.id)}
                      disabled={syncingAll || removeMutation.isPending}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-[#1e3050] transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                    </button>
                    <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-[#1e3050] transition-colors">
                      <MoreVertical size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-[#1e3050] text-slate-300 px-2 py-0.5 rounded">
                    {typeLabel}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-400">
                  <span className="text-base">📊</span>
                  <span>{ch.postsCount} постов</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#142035] border border-[#1e3050] rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#1e3050]">
              <h2 className="text-base font-semibold text-white">Добавить канал</h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-[#1e3050]">
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "url"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("url")}
              >
                По URL
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "telegram"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("telegram")}
              >
                Мои Telegram каналы
              </button>
            </div>

            <div className="p-5">
              {activeTab === "url" ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://t.me/example или RSS URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addMutation.mutate()}
                    className="flex-1 bg-[#0d1629] border border-[#1e3050] rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => addMutation.mutate()}
                    disabled={!url || addMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              ) : (
                <TelegramChannelBrowser
                  onAdded={() => {
                    qc.invalidateQueries({ queryKey: ["channels"] });
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
