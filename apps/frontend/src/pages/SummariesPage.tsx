import { useState } from "react";
import type { Summary } from "@devdigest/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Download, ExternalLink, Share2 } from "lucide-react";
import { toast } from "sonner";

import { summariesApi } from "../api/summaries";
import { MarkdownContent } from "../components/ui/MarkdownContent";

type PeriodFilter = "daily" | "weekly" | "monthly";

const PERIOD_LABELS: Record<PeriodFilter, string> = {
  daily: "День",
  weekly: "Неделя",
  monthly: "Месяц",
};

function formatSummaryDate(period: string): string {
  const parts = period.split("-");
  if (parts.length < 2) return period;
  const type = parts[0];
  if (type === "daily" && parts.length === 4) {
    const date = new Date(`${parts[1]}-${parts[2]}-${parts[3]}`);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return `Сегодня, ${date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}`;
    }
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
  }
  if (type === "weekly" && parts.length >= 3) {
    return `${parts[1]}-${parts[2]}`;
  }
  return period;
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
          <p className="text-sm text-slate-400 mt-0.5">{formatSummaryDate(summary.period)}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <button className="p-2 rounded-lg hover:bg-[var(--border)] text-slate-400 hover:text-white transition-colors">
            <Share2 size={16} />
          </button>
          <button className="p-2 rounded-lg hover:bg-[var(--border)] text-slate-400 hover:text-white transition-colors">
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
  const [showDialog, setShowDialog] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("daily");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRegenerate, setConfirmRegenerate] = useState<string | null>(null);

  const { data: allTopics = [] } = useQuery({
    queryKey: ["summaries", "topics"],
    queryFn: () => summariesApi.topics(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["summaries", { type: periodFilter, topic: topicFilter }],
    queryFn: () =>
      summariesApi.list({
        limit: 20,
        type: periodFilter,
        ...(topicFilter ? { topic: topicFilter } : {}),
      } as Parameters<typeof summariesApi.list>[0]),
  });

  const generateMutation = useMutation({
    mutationFn: ({ type, force }: { type: "daily" | "weekly"; force?: boolean }) =>
      summariesApi.generate(type, force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
      setShowDialog(false);
      toast.success("Саммари сгенерировано");
    },
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
        <button
          onClick={() => setShowDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Сгенерировать
        </button>
      </div>

      {/* Period filter */}
      <div className="flex items-center gap-3 mt-5 mb-4">
        <Calendar size={18} className="text-slate-400 shrink-0" />
        <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as PeriodFilter[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                periodFilter === p ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
              }`}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
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

      {/* Generate dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 w-80 shadow-2xl">
            <h2 className="text-lg font-semibold text-white mb-4">Тип саммари</h2>
            {generateMutation.isError && (
              <p className="text-sm text-red-400 mb-3">
                {(generateMutation.error as Error)?.message || "Ошибка генерации"}
              </p>
            )}
            <div className="space-y-2">
              {(
                [
                  { type: "daily", label: "Дневное", desc: "Посты за сегодня или последние" },
                  { type: "weekly", label: "Недельное", desc: "Посты за текущую неделю" },
                ] as const
              ).map(({ type, label, desc }) => (
                <div key={type} className="border border-(--border) rounded-lg overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <div className="font-medium text-white text-sm">{label}</div>
                    <div className="text-xs text-slate-400">{desc}</div>
                  </div>
                  <div className="flex border-t border-(--border)">
                    <button
                      onClick={() => generateMutation.mutate({ type })}
                      disabled={generateMutation.isPending}
                      className="flex-1 py-2 text-xs text-slate-300 hover:bg-(--border) disabled:opacity-50 transition-colors"
                    >
                      Создать
                    </button>
                    <div className="w-px bg-(--border)" />
                    <button
                      onClick={() => generateMutation.mutate({ type, force: true })}
                      disabled={generateMutation.isPending}
                      className="flex-1 py-2 text-xs text-blue-400 hover:bg-(--border) disabled:opacity-50 transition-colors"
                    >
                      ↻ Перегенерировать
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {generateMutation.isPending && (
              <p className="text-sm text-slate-400 mt-3 text-center">Генерируем саммари...</p>
            )}
            <button
              onClick={() => {
                setShowDialog(false);
                generateMutation.reset();
              }}
              disabled={generateMutation.isPending}
              className="mt-4 w-full py-2 text-sm text-slate-400 hover:text-white disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
