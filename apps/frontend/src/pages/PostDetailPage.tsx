import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { postsApi } from "../api/posts";

export function PostDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: post, isLoading } = useQuery({
    queryKey: ["post", id],
    queryFn: () => postsApi.get(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="animate-pulse h-8 bg-gray-100 rounded w-2/3" />;
  if (!post) return <p className="text-gray-500">Пост не найден</p>;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        ← Назад
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{post.title || "Без заголовка"}</h1>
      <p className="text-sm text-gray-500 mb-4">
        {new Date(post.publishedAt).toLocaleString("ru")}
      </p>
      {post.contentPreview && (
        <div className="bg-white border rounded-lg p-6 text-gray-700">{post.contentPreview}</div>
      )}
      {post.url && (
        <a
          href={post.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-blue-600 hover:underline text-sm"
        >
          Открыть оригинал →
        </a>
      )}
    </div>
  );
}
