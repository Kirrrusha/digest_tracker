import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { summariesApi } from "../api/summaries";

export function SummariesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["summaries"],
    queryFn: () => summariesApi.list({ limit: 20 }),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Саммари</h1>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border rounded-lg p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : !data?.summaries.length ? (
        <p className="text-gray-500 text-center py-12">Саммари пока нет</p>
      ) : (
        <div className="space-y-3">
          {data.summaries.map((s) => (
            <Link
              key={s.id}
              to={`/summaries/${s.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-medium text-gray-900">{s.title}</h2>
                <span className="text-xs text-gray-400 shrink-0 ml-2">{s.period}</span>
              </div>
              {s.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.topics.slice(0, 4).map((t) => (
                    <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">{s.postsCount} постов</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
