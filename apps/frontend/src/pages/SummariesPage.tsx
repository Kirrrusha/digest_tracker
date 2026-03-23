import { useRef, useState } from "react";
import type { Summary } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, FolderOpen, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi } from "../api/mtproto";
import { summariesApi } from "../api/summaries";
import { MarkdownContent } from "../components/ui/MarkdownContent";

function formatSummaryDate(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function SummaryCard({
  summary,
  onDelete,
  onRegenerate,
}: {
  summary: Summary;
  onDelete: () => void;
  onRegenerate: () => void;
}) {
  const [showSources, setShowSources] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/summaries/${summary.id}`;
    if (navigator.share) {
      await navigator.share({ title: summary.title, url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Ссылка скопирована");
    }
  }

  function handleDownload() {
    const blob = new Blob([summary.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const { data: summaryDetail, isLoading: isLoadingSources } = useQuery({
    queryKey: ["summary", summary.id],
    queryFn: () => summariesApi.get(summary.id),
    enabled: showSources,
    staleTime: 5 * 60 * 1000,
  });

  const sources = summaryDetail?.sources ?? [];

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{summary.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{formatSummaryDate(summary.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button
            onClick={handleShare}
            className="p-2 rounded-lg hover:bg-[var(--border)] text-slate-400 hover:text-white transition-colors"
          >
            <Share2 size={16} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg hover:bg-[var(--border)] text-slate-400 hover:text-white transition-colors"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        <MarkdownContent content={summary.content} className="text-sm" />
      </div>

      <div className="border-t border-[var(--border)] mt-4 pt-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSources(!showSources)}
            className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
          >
            Источники ({summary.postsCount})
            <span
              className="ml-1 text-slate-500 transition-transform duration-200"
              style={{ display: "inline-block", transform: showSources ? "rotate(90deg)" : "none" }}
            >
              ›
            </span>
          </button>
          <p className="text-xs text-slate-500">Основано на {summary.postsCount} постах</p>
        </div>

        {showSources && (
          <div className="mt-3 space-y-2">
            {isLoadingSources ? (
              <p className="text-xs text-slate-500 py-2">Загрузка источников...</p>
            ) : sources.length > 0 ? (
              sources.map((source) => {
                const title =
                  source.title ||
                  source.contentPreview?.split("\n")[0]?.slice(0, 100) ||
                  "Без названия";
                return (
                  <div key={source.id} className="flex items-start gap-2">
                    <span className="text-slate-600 shrink-0 mt-1 text-xs">•</span>
                    <div className="min-w-0 flex-1">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-400 hover:text-blue-300 hover:underline transition-colors line-clamp-2 flex items-start gap-1"
                        >
                          <span className="min-w-0 flex-1">{title}</span>
                          <ExternalLink size={11} className="shrink-0 mt-0.5 opacity-60" />
                        </a>
                      ) : (
                        <span className="text-sm text-slate-300 line-clamp-2">{title}</span>
                      )}
                      <span className="text-xs text-slate-500">{source.channelName}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-slate-500 py-2">Источники не найдены</p>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-3 pt-3 border-t border-[var(--border)]">
        <button
          onClick={onRegenerate}
          className="text-xs text-slate-400 hover:text-blue-400 transition-colors"
        >
          ↻ Перегенерировать
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-auto"
        >
          🗑 Удалить
        </button>
      </div>
    </div>
  );
}

export function SummariesPage() {
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: allTopics = [] } = useQuery({
    queryKey: ["summaries", "topics"],
    queryFn: () => summariesApi.topics(),
  });

  const { data: folders = [] } = useQuery({
    queryKey: ["mtproto-folders"],
    queryFn: mtprotoApi.listFolders,
    enabled: dropdownOpen,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });

  const trackedFolders = folders.filter(
    (f) => f.channels.filter((c) => c.isAlreadyTracked).length > 0
  );

  const { data, isLoading } = useQuery({
    queryKey: ["summaries", { topic: topicFilter }],
    queryFn: () =>
      summariesApi.list({
        limit: 20,
        ...(topicFilter ? { topic: topicFilter } : {}),
      }),
  });

  function startPolling(jobId: string) {
    setIsGenerating(true);
    setDropdownOpen(false);
    pollingRef.current = setInterval(async () => {
      try {
        const { status } = await summariesApi.getJobStatus(jobId);
        if (status === "completed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsGenerating(false);
          queryClient.invalidateQueries({ queryKey: ["summaries"] });
          toast.success("Саммари готово");
        } else if (status === "failed") {
          clearInterval(pollingRef.current!);
          pollingRef.current = null;
          setIsGenerating(false);
          toast.error("Ошибка генерации");
        }
      } catch {
        clearInterval(pollingRef.current!);
        pollingRef.current = null;
        setIsGenerating(false);
        toast.error("Ошибка проверки статуса");
      }
    }, 2000);
  }

  const generateMutation = useMutation({
    mutationFn: () => summariesApi.generate(),
    onSuccess: ({ jobId }) => startPolling(jobId),
    onError: (e) => toast.error((e as Error).message || "Ошибка генерации"),
  });

  const generateFolderMutation = useMutation({
    mutationFn: ({
      folderId,
      folderTitle,
      telegramIds,
    }: {
      folderId: number;
      folderTitle: string;
      telegramIds: string[];
    }) => summariesApi.generateForFolder(folderId, folderTitle, telegramIds),
    onSuccess: ({ jobId }) => startPolling(jobId),
    onError: (e) => toast.error((e as Error).message || "Ошибка генерации"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => summariesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Саммари удалено");
    },
    onError: () => toast.error("Не удалось удалить саммари"),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => summariesApi.regenerate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Саммари перегенерировано");
    },
    onError: () => toast.error("Не удалось перегенерировать саммари"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Саммари</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Автоматически сгенерированные сводки из ваших каналов
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => !isGenerating && setDropdownOpen((v) => !v)}
            disabled={
              isGenerating || generateMutation.isPending || generateFolderMutation.isPending
            }
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-70 transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Генерируется...
              </>
            ) : (
              "+ Сгенерировать"
            )}
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 w-56 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden">
                <button
                  onClick={() => generateMutation.mutate()}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-200 hover:bg-[var(--border)] transition-colors text-left"
                >
                  <span className="font-medium">Сгенерировать</span>
                  <span className="text-xs text-slate-500">из непрочитанных</span>
                </button>
                {trackedFolders.length > 0 && (
                  <>
                    <div className="h-px bg-[var(--border)] mx-2 my-1" />
                    {trackedFolders.map((folder) => {
                      const trackedIds = folder.channels
                        .filter((c) => c.isAlreadyTracked)
                        .map((c) => c.id);
                      return (
                        <button
                          key={folder.id}
                          onClick={() =>
                            generateFolderMutation.mutate({
                              folderId: folder.id,
                              folderTitle: folder.title,
                              telegramIds: trackedIds,
                            })
                          }
                          className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-200 hover:bg-[var(--border)] transition-colors text-left"
                        >
                          <FolderOpen size={13} className="text-slate-400 shrink-0" />
                          <span className="flex-1 truncate">{folder.title}</span>
                          <span className="text-xs text-slate-500 shrink-0">
                            {trackedIds.length}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Topic filter chips */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        {allTopics.map((t) => (
          <button
            key={t}
            onClick={() => setTopicFilter(topicFilter === t ? null : t)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              topicFilter === t
                ? "bg-blue-600 text-white"
                : "bg-[var(--surface)] border border-[var(--border)] text-slate-400 hover:text-white hover:border-blue-500/50"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 animate-pulse h-48"
            />
          ))}
        </div>
      ) : !data?.summaries.length ? (
        <p className="text-slate-400 text-center py-16">Саммари пока нет</p>
      ) : (
        <div className="space-y-4">
          {data.summaries.map((s) => (
            <SummaryCard
              key={s.id}
              summary={s}
              onDelete={() => setConfirmDelete(s.id)}
              onRegenerate={() => setConfirmRegenerate(s.id)}
            />
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-80 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Удалить саммари?</h2>
            <p className="text-sm text-slate-400 mb-4">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm border border-[var(--border)] text-slate-300 rounded-lg hover:bg-[var(--border)] disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const id = confirmDelete;
                  setConfirmDelete(null);
                  deleteMutation.mutate(id);
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate confirm modal */}
      {confirmRegenerate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-80 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-2">Перегенерировать саммари?</h2>
            <p className="text-sm text-slate-400 mb-4">
              Текущий текст будет заменён новым. Посты останутся те же.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRegenerate(null)}
                disabled={regenerateMutation.isPending}
                className="flex-1 py-2 text-sm border border-[var(--border)] text-slate-300 rounded-lg hover:bg-[var(--border)] disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const id = confirmRegenerate;
                  setConfirmRegenerate(null);
                  regenerateMutation.mutate(id);
                }}
                disabled={regenerateMutation.isPending}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Перегенерировать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
