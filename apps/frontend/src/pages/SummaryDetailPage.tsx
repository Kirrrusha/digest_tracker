import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { summariesApi } from "../api/summaries";

export function SummaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", id],
    queryFn: () => summariesApi.get(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => summariesApi.delete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Саммари удалено");
      navigate("/summaries");
    },
    onError: () => toast.error("Не удалось удалить саммари"),
  });

  const regenerateMutation = useMutation({
    mutationFn: () => summariesApi.regenerate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary", id] });
      queryClient.invalidateQueries({ queryKey: ["summaries"] });
      toast.success("Саммари перегенерировано");
    },
    onError: () => toast.error("Не удалось перегенерировать саммари"),
  });

  if (isLoading)
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
      </div>
    );
  if (!summary) return <p className="text-gray-500">Саммари не найдено</p>;

  const isBusy = deleteMutation.isPending || regenerateMutation.isPending;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900">{summary.title}</h1>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setConfirmRegenerate(true)}
              disabled={isBusy}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 disabled:opacity-40 transition-colors"
            >
              {regenerateMutation.isPending ? "Генерируем..." : "↻ Перегенерировать"}
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={isBusy}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 disabled:opacity-40 transition-colors"
            >
              {deleteMutation.isPending ? "Удаляем..." : "🗑 Удалить"}
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-1">{summary.period}</p>
        {summary.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {summary.topics.map((t) => (
              <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white border rounded-lg p-6 prose prose-sm prose-headings:font-semibold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-li:my-0.5 max-w-none">
        <ReactMarkdown>{summary.content}</ReactMarkdown>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Удалить саммари?</h2>
            <p className="text-sm text-gray-500 mb-4">Это действие нельзя отменить.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setConfirmDelete(false);
                  deleteMutation.mutate();
                }}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRegenerate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Перегенерировать саммари?</h2>
            <p className="text-sm text-gray-500 mb-4">Текущий текст будет заменён новым.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmRegenerate(false)}
                disabled={regenerateMutation.isPending}
                className="flex-1 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  setConfirmRegenerate(false);
                  regenerateMutation.mutate();
                }}
                disabled={regenerateMutation.isPending}
                className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
