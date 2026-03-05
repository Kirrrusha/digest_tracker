import { useEffect, useState } from "react";
import type { Channel } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  FolderOpen,
  Loader2,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { channelsApi } from "../api/channels";
import { mtprotoApi, type MTProtoFolderInfo } from "../api/mtproto";
import { summariesApi } from "../api/summaries";
import { TelegramChannelBrowser } from "../components/TelegramChannelBrowser";
import { TelegramFolderBrowser } from "../components/TelegramFolderBrowser";
import { TelegramGroupBrowser } from "../components/TelegramGroupBrowser";

type AddTab = "url" | "telegram" | "groups" | "folders";
type TypeFilter = "all" | "telegram" | "rss";
type ViewMode = "list" | "folders";

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

function buildFolderGroups(channels: Channel[], folders: MTProtoFolderInfo[]) {
  const matchedIds = new Set<string>();
  const folderGroups = folders
    .map((folder) => {
      const folderTelegramIds = new Set(folder.channels.map((c) => c.id));
      const matched = channels.filter(
        (ch) => ch.telegramId && folderTelegramIds.has(ch.telegramId)
      );
      matched.forEach((ch) => matchedIds.add(ch.id));
      return { id: folder.id, title: folder.title, channels: matched };
    })
    .filter((g) => g.channels.length > 0);
  const ungrouped = channels.filter((ch) => !matchedIds.has(ch.id));
  return { folderGroups, ungrouped };
}

export function ChannelsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<AddTab>("folders");
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [folderJobId, setFolderJobId] = useState<string | null>(null);
  const [generatingFolderKey, setGeneratingFolderKey] = useState<string | null>(null);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: channelsApi.list,
  });

  const {
    data: folders = [],
    isLoading: foldersLoading,
    isError: foldersError,
  } = useQuery({
    queryKey: ["mtproto-folders"],
    queryFn: mtprotoApi.listFolders,
    enabled: viewMode === "folders",
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const { data: folderJobData } = useQuery({
    queryKey: ["summary-job", folderJobId],
    queryFn: () => summariesApi.getJobStatus(folderJobId!),
    enabled: !!folderJobId,
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "completed" || s === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (!folderJobData) return;
    if (folderJobData.status === "completed" && folderJobData.summaryId) {
      setFolderJobId(null);
      setGeneratingFolderKey(null);
      toast.success("Саммари создано");
      navigate(`/summaries/${folderJobData.summaryId}`);
    } else if (folderJobData.status === "failed") {
      setFolderJobId(null);
      setGeneratingFolderKey(null);
      toast.error(folderJobData.error || "Ошибка генерации саммари");
    }
  }, [folderJobData]);

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

  function toggleSection(key: string) {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const isExpanded = (key: string) => !collapsedSections.has(key);

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

  function ChannelCard({ ch }: { ch: Channel }) {
    const color = channelColor(ch.name);
    const initial = channelInitial(ch.name);
    const typeLabel = isTelegramChannel(ch) ? "Telegram" : "RSS";
    return (
      <div className="bg-(--surface) border border-(--border) rounded-xl p-5 hover:border-blue-500/40 transition-colors">
        <div className="flex items-start gap-3 mb-3">
          <Link to={`/channels/${ch.id}`} className="flex items-center gap-3 flex-1 min-w-0">
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
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-(--border) transition-colors disabled:opacity-40"
            >
              <RefreshCw size={14} className={syncingId === ch.id ? "animate-spin" : ""} />
            </button>
            <button
              onClick={() => removeMutation.mutate(ch.id)}
              disabled={syncingAll || removeMutation.isPending}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-(--border) transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
            <button className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-(--border) transition-colors">
              <MoreVertical size={14} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-(--border) text-slate-300 px-2 py-0.5 rounded">
            {typeLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-3 text-sm text-slate-400">
          <span className="text-base">📊</span>
          <span>{ch.postsCount} постов</span>
        </div>
      </div>
    );
  }

  function FolderSection({
    sectionKey,
    title,
    icon,
    channels: sectionChannels,
    folderId,
  }: {
    sectionKey: string;
    title: string;
    icon?: React.ReactNode;
    channels: Channel[];
    folderId?: number;
  }) {
    const expanded = isExpanded(sectionKey);
    const isGenerating = generatingFolderKey === sectionKey;

    async function handleGenerateFolderSummary(e: React.MouseEvent) {
      e.stopPropagation();
      if (isGenerating || !folderId) return;
      const ids = sectionChannels.map((ch) => ch.telegramId).filter((id): id is string => !!id);
      if (ids.length === 0) {
        toast.error("В папке нет каналов с Telegram ID");
        return;
      }
      try {
        const { jobId } = await summariesApi.generateForFolder(folderId, title, ids);
        setGeneratingFolderKey(sectionKey);
        setFolderJobId(jobId);
        toast.info("Генерация саммари запущена...");
      } catch {
        toast.error("Ошибка запуска генерации");
      }
    }

    return (
      <div className="mb-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-(--surface) border border-(--border) rounded-xl hover:border-slate-600 transition-colors text-left"
        >
          {icon ?? <FolderOpen size={16} className="text-slate-400 shrink-0" />}
          <span className="font-medium text-white flex-1 truncate">{title}</span>
          <span className="text-xs text-slate-500 bg-(--bg) px-2 py-0.5 rounded-full shrink-0">
            {sectionChannels.length}
          </span>
          {folderId !== undefined && (
            <span
              role="button"
              onClick={handleGenerateFolderSummary}
              title="Сгенерировать саммари по папке"
              className={`p-1 rounded-md transition-colors shrink-0 ${
                isGenerating
                  ? "text-blue-400"
                  : "text-slate-500 hover:text-blue-400 hover:bg-(--border)"
              }`}
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform shrink-0 ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
        {expanded && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
            {sectionChannels.map((ch) => (
              <ChannelCard key={ch.id} ch={ch} />
            ))}
          </div>
        )}
      </div>
    );
  }

  const { folderGroups, ungrouped } =
    viewMode === "folders" && folders.length > 0
      ? buildFolderGroups(filtered, folders)
      : { folderGroups: [], ungrouped: filtered };

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
            className="flex items-center gap-2 border border-(--border) text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-(--surface) disabled:opacity-40 transition-colors"
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
        <div className="flex items-center gap-1 bg-(--surface) border border-(--border) rounded-lg p-1">
          <button
            onClick={() => setViewMode("folders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "folders" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <FolderOpen size={13} />
            Папки
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === "list" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Список
          </button>
        </div>
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Поиск каналов..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-(--surface) border border-(--border) rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-(--surface) border border-(--border) rounded-xl p-5 animate-pulse h-40"
            />
          ))}
        </div>
      ) : viewMode === "folders" ? (
        foldersLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-(--surface) border border-(--border) rounded-xl h-14 animate-pulse"
              />
            ))}
          </div>
        ) : foldersError ? (
          <div className="text-center text-slate-400 py-16">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-30" />
            <p className="mb-1">Не удалось загрузить папки</p>
            <p className="text-sm text-slate-500">Подключите Telegram MTProto в настройках</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-slate-400 py-16">
            {channels.length === 0
              ? "Каналов нет. Добавьте первый!"
              : "Нет каналов по заданным фильтрам"}
          </div>
        ) : (
          <div>
            {folderGroups.map((group) => (
              <FolderSection
                key={group.id}
                sectionKey={String(group.id)}
                title={group.title}
                channels={group.channels}
                folderId={group.id}
              />
            ))}
            {ungrouped.length > 0 && (
              <FolderSection
                sectionKey="ungrouped"
                title="Без папки"
                icon={<span className="text-slate-500 text-sm">—</span>}
                channels={ungrouped}
              />
            )}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="text-center text-slate-400 py-16">
          {channels.length === 0
            ? "Каналов нет. Добавьте первый!"
            : "Нет каналов по заданным фильтрам"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ch: Channel) => (
            <ChannelCard key={ch.id} ch={ch} />
          ))}
        </div>
      )}

      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-(--surface) border border-(--border) rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
              <h2 className="text-base font-semibold text-white">Добавить канал</h2>
              <button
                onClick={() => setShowDialog(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-(--border)">
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
                Мои каналы
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "groups"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("groups")}
              >
                Мои группы
              </button>
              <button
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === "folders"
                    ? "border-b-2 border-blue-500 text-blue-400"
                    : "text-slate-400 hover:text-white"
                }`}
                onClick={() => setActiveTab("folders")}
              >
                Папки
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
                    className="flex-1 bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
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
              ) : activeTab === "telegram" ? (
                <TelegramChannelBrowser
                  onAdded={() => {
                    qc.invalidateQueries({ queryKey: ["channels"] });
                  }}
                />
              ) : activeTab === "groups" ? (
                <TelegramGroupBrowser
                  onAdded={() => {
                    qc.invalidateQueries({ queryKey: ["channels"] });
                  }}
                />
              ) : (
                <TelegramFolderBrowser
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
