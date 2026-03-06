import { useEffect, useState } from "react";
import type { AppFolder, Channel } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  FolderOpen,
  FolderPlus,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { appFoldersApi } from "../api/appFolders";
import { channelsApi } from "../api/channels";
import { mtprotoApi, type MTProtoFolderInfo } from "../api/mtproto";
import { summariesApi } from "../api/summaries";
import { TelegramChannelBrowser } from "../components/TelegramChannelBrowser";
import { TelegramFolderBrowser } from "../components/TelegramFolderBrowser";
import { TelegramGroupBrowser } from "../components/TelegramGroupBrowser";

type AddTab = "url" | "telegram" | "groups" | "folders";
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

function buildTelegramFolderGroups(channels: Channel[], tgFolders: MTProtoFolderInfo[]) {
  const matchedIds = new Set<string>();
  const groups = tgFolders
    .map((folder) => {
      const folderTelegramIds = new Set(folder.channels.map((c) => c.id));
      const matched = channels.filter(
        (ch) => ch.telegramId && folderTelegramIds.has(ch.telegramId)
      );
      matched.forEach((ch) => matchedIds.add(ch.id));
      return { id: folder.id, title: folder.title, channels: matched };
    })
    .filter((g) => g.channels.length > 0);
  return { groups, matchedIds };
}

export function ChannelsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [showAddChannel, setShowAddChannel] = useState(false);
  const [activeTab, setActiveTab] = useState<AddTab>("folders");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [folderJobId, setFolderJobId] = useState<string | null>(null);
  const [generatingFolderKey, setGeneratingFolderKey] = useState<string | null>(null);

  // Channel context menu
  const [menuChannelId, setMenuChannelId] = useState<string | null>(null);

  // App folder dialog state
  const [showFolderDialog, setShowFolderDialog] = useState(false);
  const [editingFolder, setEditingFolder] = useState<AppFolder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderChannelIds, setFolderChannelIds] = useState<Set<string>>(new Set());

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["channels"],
    queryFn: channelsApi.list,
  });

  const {
    data: tgFolders = [],
    isError: tgFoldersError,
    isLoading: tgFoldersLoading,
  } = useQuery({
    queryKey: ["mtproto-folders"],
    queryFn: mtprotoApi.listFolders,
    enabled: viewMode === "folders",
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const { data: appFolders = [], isLoading: appFoldersLoading } = useQuery({
    queryKey: ["app-folders"],
    queryFn: appFoldersApi.list,
    enabled: viewMode === "folders",
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

  const addChannelMutation = useMutation({
    mutationFn: () => channelsApi.create({ url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      setUrl("");
      setShowAddChannel(false);
      toast.success("Канал добавлен");
    },
    onError: () => toast.error("Ошибка добавления канала"),
  });

  const removeChannelMutation = useMutation({
    mutationFn: channelsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels"] });
      toast.success("Канал удалён");
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: () => appFoldersApi.create(folderName.trim(), Array.from(folderChannelIds)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-folders"] });
      closeFolderDialog();
      toast.success("Папка создана");
    },
    onError: () => toast.error("Ошибка создания папки"),
  });

  const updateFolderMutation = useMutation({
    mutationFn: () =>
      appFoldersApi.update(editingFolder!.id, {
        name: folderName.trim(),
        channelIds: Array.from(folderChannelIds),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-folders"] });
      closeFolderDialog();
      toast.success("Папка обновлена");
    },
    onError: () => toast.error("Ошибка обновления папки"),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id: string) => appFoldersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-folders"] });
      toast.success("Папка удалена");
    },
    onError: () => toast.error("Ошибка удаления папки"),
  });

  function toggleChannelInFolder(folder: AppFolder, channelId: string) {
    const inFolder = folder.channelIds.includes(channelId);
    const next = inFolder
      ? folder.channelIds.filter((id) => id !== channelId)
      : [...folder.channelIds, channelId];
    appFoldersApi
      .update(folder.id, { channelIds: next })
      .then(() => qc.invalidateQueries({ queryKey: ["app-folders"] }))
      .catch(() => toast.error("Ошибка обновления папки"));
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setFolderName("");
    setFolderChannelIds(new Set());
    setShowFolderDialog(true);
  }

  function openEditFolder(folder: AppFolder, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderChannelIds(new Set(folder.channelIds));
    setShowFolderDialog(true);
  }

  function closeFolderDialog() {
    setShowFolderDialog(false);
    setEditingFolder(null);
    setFolderName("");
    setFolderChannelIds(new Set());
  }

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
    return (
      !search ||
      ch.name.toLowerCase().includes(search.toLowerCase()) ||
      ch.sourceUrl.toLowerCase().includes(search.toLowerCase())
    );
  });

  function ChannelCard({ ch }: { ch: Channel }) {
    const color = channelColor(ch.name);
    const initial = channelInitial(ch.name);
    const typeLabel = isTelegramChannel(ch) ? "Telegram" : "RSS";
    const menuOpen = menuChannelId === ch.id;

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
              onClick={() => removeChannelMutation.mutate(ch.id)}
              disabled={removeChannelMutation.isPending}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-(--border) transition-colors disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
            {appFolders.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMenuChannelId(menuOpen ? null : ch.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    menuOpen
                      ? "text-white bg-(--border)"
                      : "text-slate-500 hover:text-white hover:bg-(--border)"
                  }`}
                >
                  <MoreVertical size={14} />
                </button>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuChannelId(null)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-52 bg-(--surface) border border-(--border) rounded-xl shadow-2xl overflow-hidden">
                      <p className="px-3 py-2 text-xs text-slate-500 border-b border-(--border)">
                        Добавить в папку
                      </p>
                      {appFolders.map((folder) => {
                        const inFolder = folder.channelIds.includes(ch.id);
                        return (
                          <button
                            key={folder.id}
                            onClick={() => {
                              toggleChannelInFolder(folder, ch.id);
                              setMenuChannelId(null);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-200 hover:bg-(--border) transition-colors text-left"
                          >
                            <FolderOpen
                              size={13}
                              className={inFolder ? "text-amber-400" : "text-slate-500"}
                            />
                            <span className="flex-1 truncate">{folder.name}</span>
                            {inFolder && <span className="text-xs text-amber-400 shrink-0">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-(--border) text-slate-300 px-2 py-0.5 rounded">
            {typeLabel}
          </span>
        </div>
      </div>
    );
  }

  function TelegramFolderSection({
    sectionKey,
    title,
    sectionChannels,
    folderId,
  }: {
    sectionKey: string;
    title: string;
    sectionChannels: Channel[];
    folderId: number;
  }) {
    const expanded = isExpanded(sectionKey);
    const isGenerating = generatingFolderKey === sectionKey;

    async function handleGenerateSummary(e: React.MouseEvent) {
      e.stopPropagation();
      if (isGenerating) return;
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
          <Send size={14} className="text-sky-400 shrink-0" />
          <span className="font-medium text-white flex-1 truncate">{title}</span>
          <span className="text-xs text-sky-400/70 bg-sky-400/10 px-2 py-0.5 rounded-full shrink-0 font-medium">
            Telegram
          </span>
          <span className="text-xs text-slate-500 bg-(--bg) px-2 py-0.5 rounded-full shrink-0">
            {sectionChannels.length}
          </span>
          <span
            role="button"
            onClick={handleGenerateSummary}
            title="Сгенерировать саммари по папке"
            className={`p-1 rounded-md transition-colors shrink-0 ${
              isGenerating
                ? "text-blue-400"
                : "text-slate-500 hover:text-blue-400 hover:bg-(--border)"
            }`}
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          </span>
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

  function AppFolderSection({ folder }: { folder: AppFolder }) {
    const sectionKey = `app-${folder.id}`;
    const expanded = isExpanded(sectionKey);
    const sectionChannels = filtered.filter((ch) => folder.channelIds.includes(ch.id));

    return (
      <div className="mb-3">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center gap-2.5 px-4 py-3 bg-(--surface) border border-(--border) rounded-xl hover:border-slate-600 transition-colors text-left"
        >
          <FolderOpen size={14} className="text-amber-400 shrink-0" />
          <span className="font-medium text-white flex-1 truncate">{folder.name}</span>
          <span className="text-xs text-amber-400/70 bg-amber-400/10 px-2 py-0.5 rounded-full shrink-0 font-medium">
            Мои папки
          </span>
          <span className="text-xs text-slate-500 bg-(--bg) px-2 py-0.5 rounded-full shrink-0">
            {sectionChannels.length}
          </span>
          <span
            role="button"
            onClick={(e) => openEditFolder(folder, e)}
            title="Редактировать папку"
            className="p-1 rounded-md text-slate-500 hover:text-amber-400 hover:bg-(--border) transition-colors shrink-0"
          >
            <Pencil size={13} />
          </span>
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteFolderMutation.mutate(folder.id);
            }}
            title="Удалить папку"
            className="p-1 rounded-md text-slate-500 hover:text-red-400 hover:bg-(--border) transition-colors shrink-0"
          >
            <Trash2 size={13} />
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-400 transition-transform shrink-0 ${expanded ? "" : "-rotate-90"}`}
          />
        </button>
        {expanded && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
            {sectionChannels.length > 0 ? (
              sectionChannels.map((ch) => <ChannelCard key={ch.id} ch={ch} />)
            ) : (
              <p className="text-sm text-slate-500 py-4 pl-1">Нет каналов в этой папке</p>
            )}
          </div>
        )}
      </div>
    );
  }

  const { groups: tgGroups, matchedIds: tgMatchedIds } =
    viewMode === "folders" && tgFolders.length > 0
      ? buildTelegramFolderGroups(filtered, tgFolders)
      : { groups: [], matchedIds: new Set<string>() };

  const appFolderChannelIds = new Set(appFolders.flatMap((f) => f.channelIds));
  const ungrouped = filtered.filter(
    (ch) => !tgMatchedIds.has(ch.id) && !appFolderChannelIds.has(ch.id)
  );

  const isFolderSaving = createFolderMutation.isPending || updateFolderMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Мои каналы</h1>
          <p className="text-sm text-slate-400 mt-0.5">{channels.length} каналов</p>
        </div>
        <div className="flex items-center gap-2">
          {viewMode === "folders" && (
            <button
              onClick={openCreateFolder}
              className="flex items-center gap-2 border border-(--border) text-slate-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-(--surface) transition-colors"
            >
              <FolderPlus size={15} />
              Новая папка
            </button>
          )}
          <button
            onClick={() => setShowAddChannel(true)}
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

      {isLoading || (viewMode === "folders" && (appFoldersLoading || tgFoldersLoading)) ? (
        viewMode === "folders" ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-(--surface) border border-(--border) rounded-xl h-14 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-(--surface) border border-(--border) rounded-xl p-5 animate-pulse h-40"
              />
            ))}
          </div>
        )
      ) : viewMode === "folders" ? (
        filtered.length === 0 && appFolders.length === 0 ? (
          <div className="text-center text-slate-400 py-16">
            {channels.length === 0
              ? "Каналов нет. Добавьте первый!"
              : "Нет каналов по заданным фильтрам"}
          </div>
        ) : (
          <div>
            {/* App folders first */}
            {appFolders.map((folder) => (
              <AppFolderSection key={folder.id} folder={folder} />
            ))}

            {/* Telegram folders */}
            {!tgFoldersError &&
              tgGroups.map((group) => (
                <TelegramFolderSection
                  key={group.id}
                  sectionKey={String(group.id)}
                  title={group.title}
                  sectionChannels={group.channels}
                  folderId={group.id}
                />
              ))}

            {/* Ungrouped */}
            {ungrouped.length > 0 && (
              <div className="mb-3">
                <button
                  onClick={() => toggleSection("ungrouped")}
                  className="w-full flex items-center gap-2.5 px-4 py-3 bg-(--surface) border border-(--border) rounded-xl hover:border-slate-600 transition-colors text-left"
                >
                  <span className="text-slate-500 text-sm shrink-0">—</span>
                  <span className="font-medium text-white flex-1 truncate">Без папки</span>
                  <span className="text-xs text-slate-500 bg-(--bg) px-2 py-0.5 rounded-full shrink-0">
                    {ungrouped.length}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform shrink-0 ${isExpanded("ungrouped") ? "" : "-rotate-90"}`}
                  />
                </button>
                {isExpanded("ungrouped") && (
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                    {ungrouped.map((ch) => (
                      <ChannelCard key={ch.id} ch={ch} />
                    ))}
                  </div>
                )}
              </div>
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

      {/* Add channel dialog */}
      {showAddChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-(--surface) border border-(--border) rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
              <h2 className="text-base font-semibold text-white">Добавить канал</h2>
              <button
                onClick={() => setShowAddChannel(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-(--border)">
              {(["url", "telegram", "groups", "folders"] as AddTab[]).map((tab) => {
                const labels: Record<AddTab, string> = {
                  url: "По URL",
                  telegram: "Мои каналы",
                  groups: "Мои группы",
                  folders: "Папки TG",
                };
                return (
                  <button
                    key={tab}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-blue-500 text-blue-400"
                        : "text-slate-400 hover:text-white"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div className="p-5">
              {activeTab === "url" ? (
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://t.me/example или RSS URL"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addChannelMutation.mutate()}
                    className="flex-1 bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                    autoFocus
                  />
                  <button
                    onClick={() => addChannelMutation.mutate()}
                    disabled={!url || addChannelMutation.isPending}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  >
                    Добавить
                  </button>
                </div>
              ) : activeTab === "telegram" ? (
                <TelegramChannelBrowser
                  onAdded={() => qc.invalidateQueries({ queryKey: ["channels"] })}
                />
              ) : activeTab === "groups" ? (
                <TelegramGroupBrowser
                  onAdded={() => qc.invalidateQueries({ queryKey: ["channels"] })}
                />
              ) : (
                <TelegramFolderBrowser
                  onAdded={() => qc.invalidateQueries({ queryKey: ["channels"] })}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* App folder create/edit dialog */}
      {showFolderDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-(--surface) border border-(--border) rounded-xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-(--border) shrink-0">
              <h2 className="text-base font-semibold text-white">
                {editingFolder ? "Редактировать папку" : "Создать папку"}
              </h2>
              <button onClick={closeFolderDialog} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1">
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-1.5">Название папки</label>
                <input
                  type="text"
                  placeholder="Например: AI / Backend / Избранное"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  autoFocus
                  className="w-full bg-(--bg) border border-(--border) rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-2">
                  Каналы ({folderChannelIds.size} выбрано)
                </label>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {channels.map((ch) => {
                    const selected = folderChannelIds.has(ch.id);
                    return (
                      <label
                        key={ch.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                          selected
                            ? "bg-blue-600/20 border border-blue-500/40"
                            : "hover:bg-(--border) border border-transparent"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => {
                            setFolderChannelIds((prev) => {
                              const next = new Set(prev);
                              if (next.has(ch.id)) next.delete(ch.id);
                              else next.add(ch.id);
                              return next;
                            });
                          }}
                          className="accent-blue-500 shrink-0"
                        />
                        <div
                          className={`w-7 h-7 rounded-full ${channelColor(ch.name)} flex items-center justify-center text-white text-xs font-semibold shrink-0`}
                        >
                          {channelInitial(ch.name)}
                        </div>
                        <span className="text-sm text-white truncate">{ch.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-(--border) flex gap-2 shrink-0">
              <button
                onClick={closeFolderDialog}
                disabled={isFolderSaving}
                className="flex-1 py-2 text-sm border border-(--border) text-slate-300 rounded-lg hover:bg-(--border) disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() =>
                  editingFolder ? updateFolderMutation.mutate() : createFolderMutation.mutate()
                }
                disabled={!folderName.trim() || isFolderSaving}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isFolderSaving ? "Сохраняем..." : editingFolder ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
