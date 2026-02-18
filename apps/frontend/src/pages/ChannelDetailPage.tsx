import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { channelsApi } from "../api/channels";
import { postsApi } from "../api/posts";

export function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: channel } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => channelsApi.get(id!),
    enabled: !!id,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["channel-posts", id],
    queryFn: () => postsApi.byChannel(id!),
    enabled: !!id,
  });

  if (!channel) return <div className="animate-pulse h-8 bg-gray-100 rounded w-48" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">{channel.name}</h1>
      <p className="text-sm text-gray-500 mb-6">{channel.sourceUrl}</p>

      <h2 className="text-lg font-semibold mb-3">Посты ({channel.postsCount})</h2>
      {isLoading ? (
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
            <div key={post.id} className="bg-white border rounded-lg p-4">
              <p className="font-medium text-gray-900">{post.title || "Без заголовка"}</p>
              {post.contentPreview && (
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.contentPreview}</p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(post.publishedAt).toLocaleString("ru")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
