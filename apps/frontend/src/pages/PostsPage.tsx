import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";

import { channelsApi } from "../api/channels";
import { postsApi } from "../api/posts";

export function PostsPage() {
  const [params, setParams] = useSearchParams();
  const channelId = params.get("channelId");

  const { data: channels = [] } = useQuery({
    queryKey: ["channels"],
    queryFn: channelsApi.list,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["posts", channelId],
    queryFn: () => postsApi.byChannel(channelId!),
    enabled: !!channelId,
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Посты</h1>
      <select
        className="border rounded px-3 py-2 text-sm mb-4"
        value={channelId ?? ""}
        onChange={(e) => setParams(e.target.value ? { channelId: e.target.value } : {})}
      >
        <option value="">Выберите канал</option>
        {channels.map((ch) => (
          <option key={ch.id} value={ch.id}>
            {ch.name}
          </option>
        ))}
      </select>

      {!channelId ? (
        <p className="text-gray-500">Выберите канал для просмотра постов</p>
      ) : isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 h-16 rounded" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-gray-500">Постов нет</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="block bg-white border rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <p className="font-medium text-gray-900">{post.title || "Без заголовка"}</p>
              {post.contentPreview && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.contentPreview}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(post.publishedAt).toLocaleString("ru")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
