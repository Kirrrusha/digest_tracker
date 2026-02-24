import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { channelsApi } from "../api/channels";
import { postsApi } from "../api/posts";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 2) return "вчера";
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function channelInitial(name: string): string {
  const letter = name.match(/[A-Za-zА-Яа-яЁё]/);
  if (letter) return letter[0].toUpperCase();
  const digit = name.match(/[0-9]/);
  return digit ? digit[0] : "#";
}

export function ChannelDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: channel, isLoading: channelLoading } = useQuery({
    queryKey: ["channel", id],
    queryFn: () => channelsApi.get(id!),
    enabled: !!id,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["channel-posts", id],
    queryFn: () => postsApi.byChannel(id!),
    enabled: !!id,
  });

  if (channelLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-6 bg-[var(--surface)] rounded w-32" />
        <div className="h-24 bg-[var(--surface)] rounded-xl" />
      </div>
    );
  }

  if (!channel) return <p className="text-slate-400">Канал не найден</p>;

  const isTelegram =
    channel.sourceType === "telegram" ||
    channel.sourceType === "telegram_bot" ||
    channel.sourceType === "telegram_mtproto";

  return (
    <div className="max-w-3xl">
      <Link
        to="/channels"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Назад к каналам
      </Link>

      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xl shrink-0">
            {channelInitial(channel.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white">{channel.name}</h1>
            <a
              href={channel.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 mt-0.5"
            >
              {channel.sourceUrl}
              <ExternalLink size={11} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4 flex-wrap">
          <span className="text-xs bg-[var(--border)] text-slate-300 px-2.5 py-1 rounded-full">
            {isTelegram ? "Telegram" : "RSS"}
          </span>
          <span className="text-sm text-slate-400">{channel.postsCount} постов</span>
          {channel.lastPostAt && (
            <span className="text-sm text-slate-500">
              Последний: {formatDate(channel.lastPostAt)}
            </span>
          )}
        </div>
      </div>

      <h2 className="text-lg font-semibold text-white mb-3">Посты</h2>

      {postsLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 animate-pulse h-20"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-slate-400 text-center py-12">Постов нет</p>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              to={`/posts/${post.id}`}
              className="block bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 hover:border-blue-500/40 transition-colors"
            >
              <p className="font-medium text-white">{post.title || "Без заголовка"}</p>
              {post.contentPreview && (
                <p className="text-sm text-slate-400 mt-1 line-clamp-2">{post.contentPreview}</p>
              )}
              <p className="text-xs text-slate-500 mt-2">{formatDate(post.publishedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
