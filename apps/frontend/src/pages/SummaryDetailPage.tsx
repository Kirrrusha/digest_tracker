import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { useParams } from "react-router-dom";

import { summariesApi } from "../api/summaries";

export function SummaryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", id],
    queryFn: () => summariesApi.get(id!),
    enabled: !!id,
  });

  if (isLoading)
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-8 bg-gray-100 rounded w-2/3" />
        <div className="h-4 bg-gray-100 rounded w-1/3" />
      </div>
    );
  if (!summary) return <p className="text-gray-500">Саммари не найдено</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{summary.title}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {summary.period} · {summary.postsCount} постов
        </p>
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
      <div className="bg-white border rounded-lg p-6 prose prose-sm max-w-none">
        <ReactMarkdown>{summary.content}</ReactMarkdown>
      </div>
    </div>
  );
}
