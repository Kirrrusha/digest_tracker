import type { Summary } from "@devdigest/shared";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Download, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

import { api } from "../api/client";
import { summariesApi } from "../api/summaries";
import { MarkdownContent } from "../components/ui/MarkdownContent";
import { useAuthStore } from "../stores/auth.store";

interface TopTopic {
  topic: string;
  count: number;
}

interface RecentPost {
  id: string;
  title?: string | null;
  channelName: string;
  channelType: string;
  publishedAt: string;
  topics: string[];
}

interface DashboardStats {
  channelsCount: number;
  postsToday: number;
  summariesToday: number;
  topTopics: TopTopic[];
  recentPosts: RecentPost[];
}

const TOPIC_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

function formatTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)} минут назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} часа назад`;
  return "вчера";
}

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
  return period;
}

function SummaryCard({ summary }: { summary: Summary }) {
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
        <MarkdownContent content={summary.content} />
      </div>

      <div className="border-t border-[var(--border)] mt-4 pt-3 flex items-center justify-between">
        <button className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1">
          Источники ({summary.postsCount}) <span className="text-slate-500">›</span>
        </button>
        <p className="text-xs text-slate-500">Основано на {summary.postsCount} постах</p>
      </div>
    </div>
  );
}

function TopicCard({ topic, colorClass }: { topic: TopTopic; colorClass: string }) {
  const trend = Math.floor(Math.random() * 10) - 2;
  return (
    <div className={`${colorClass} rounded-xl p-5 text-white`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-lg">
          {"</>"}
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium ${trend >= 0 ? "text-white" : "text-red-100"}`}
        >
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {trend >= 0 ? "+" : ""}
          {trend}
        </div>
      </div>
      <p className="font-semibold text-base">{topic.topic}</p>
      <p className="text-3xl font-bold mt-1">{topic.count}</p>
      <p className="text-sm text-white/70 mt-0.5">постов сегодня</p>
    </div>
  );
}

function RecentPostItem({ post }: { post: RecentPost }) {
  const initial = post.channelName?.[0]?.toUpperCase() ?? "?";
  return (
    <Link to={`/posts/${post.id}`} className="block">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center gap-4 hover:border-blue-500/40 transition-colors">
        <div className="w-9 h-9 rounded-full bg-purple-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-0.5">{post.channelName}</p>
          <p className="text-sm font-medium text-white truncate">{post.title ?? "Без заголовка"}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs text-slate-500">{formatTimeAgo(post.publishedAt)}</span>
            {post.topics?.map((t) => (
              <span
                key={t}
                className="text-xs bg-[var(--border)] text-slate-300 px-2 py-0.5 rounded"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <button className="text-slate-500 hover:text-white transition-colors shrink-0">
          <Bookmark size={16} />
        </button>
      </div>
    </Link>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.get<DashboardStats>("/dashboard/stats").then((r) => r.data),
  });

  const { data: summariesData } = useQuery({
    queryKey: ["summaries", "latest"],
    queryFn: () => summariesApi.list({ limit: 1 }),
  });

  const latestSummary = summariesData?.summaries[0];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Доброе утро" : hour < 17 ? "Добрый день" : "Добрый вечер";
  const firstName = user?.name?.split(" ")[0] ?? "Пользователь";

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">
          {greeting}, {firstName}! 👋
        </h1>
        {stats && (
          <p className="text-slate-400 mt-1">
            У вас {stats.postsToday} новых постов из ваших каналов
          </p>
        )}
      </div>

      {latestSummary && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Последняя сводка</h2>
          <SummaryCard summary={latestSummary} />
        </section>
      )}

      {stats?.topTopics && stats.topTopics.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4">Статистика по темам</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.topTopics.slice(0, 4).map((t, i) => (
              <TopicCard
                key={t.topic}
                topic={t}
                colorClass={TOPIC_COLORS[i % TOPIC_COLORS.length]}
              />
            ))}
          </div>
        </section>
      )}

      {stats?.recentPosts && stats.recentPosts.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Последние посты</h2>
            <Link
              to="/posts"
              className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Показать всё
            </Link>
          </div>
          <div className="space-y-2">
            {stats.recentPosts.map((post) => (
              <RecentPostItem key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
