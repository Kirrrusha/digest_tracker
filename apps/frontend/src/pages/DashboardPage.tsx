import type { Summary } from "@devdigest/shared";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { api } from "../api/client";
import { summariesApi } from "../api/summaries";
import { MarkdownContent } from "../components/ui/MarkdownContent";
import { useAuthStore } from "../stores/auth.store";

interface TopTopic {
  topic: string;
  count: number;
}

interface DashboardStats {
  channelsCount: number;
  summariesToday: number;
  topTopics: TopTopic[];
}

const TOPIC_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
];

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

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white text-lg">{summary.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">{formatSummaryDate(summary.period)}</p>
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
        <MarkdownContent content={summary.content} />
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
            Каналов: {stats.channelsCount} · Саммари сегодня: {stats.summariesToday}
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
    </div>
  );
}
