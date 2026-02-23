"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface SummaryDetail {
  id: string;
  title: string;
  content: string;
  topics: string[];
  period: string;
  createdAt: string;
  posts: Array<{ id: string; title: string; channelName: string; url?: string }>;
}

export default function SummaryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const {
    webApp,
    isReady,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    hapticImpact,
    openLink,
  } = useTelegramWebApp();

  const [summary, setSummary] = useState<SummaryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    fetchSummary();
  }, [isReady, params.id]);

  useEffect(() => {
    if (!isReady) return;
    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app/summaries");
    });
    showMainButton("Поделиться", handleShare);
    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [isReady]);

  const fetchSummary = async () => {
    try {
      setSummary({
        id: params.id as string,
        title: "Саммари за 30 января",
        content: `## Основные темы дня

### React и Next.js
Сегодня было много обсуждений о новых фичах React 19 и Server Components. Особенно интересны:
- Новый хук useOptimistic для оптимистичных обновлений
- Улучшения в Suspense для стриминга данных
- Server Actions теперь стабильны

### TypeScript
Вышла новая версия TypeScript 5.4 с улучшенной типизацией. Ключевые изменения:
- Улучшенный вывод типов в generic функциях
- Новый синтаксис для conditional types
- Лучшая поддержка ESM

### DevOps
Обсуждения Docker и Kubernetes:
- Новые best practices для multi-stage builds
- Оптимизация размера образов
- Helm charts для production`,
        topics: ["React", "TypeScript", "Next.js", "DevOps", "Docker"],
        period: "daily-2024-01-30",
        createdAt: new Date().toISOString(),
        posts: [
          {
            id: "1",
            title: "React 19: What's New",
            channelName: "@frontend_dev",
            url: "https://t.me/frontend_dev/123",
          },
          {
            id: "2",
            title: "TypeScript 5.4 Released",
            channelName: "@typescript_ru",
            url: "https://t.me/typescript_ru/456",
          },
          { id: "3", title: "Docker Best Practices 2024", channelName: "@devops_weekly" },
        ],
      });
    } catch (error) {
      console.error("Error fetching summary:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    hapticImpact("medium");
    webApp?.openTelegramLink(
      `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(summary?.title || "")}`
    );
  };

  const handleOpenPost = (url?: string) => {
    if (!url) return;
    hapticImpact("light");
    openLink(url);
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-10 h-10 border-3 border-(--tg-theme-secondary-bg-color) border-t-(--tg-theme-button-color) rounded-full" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center min-h-screen text-(--tg-theme-hint-color)">
        <p>Саммари не найдено</p>
      </div>
    );
  }

  return (
    <main className="p-4 pb-24">
      {/* Header */}
      <header className="mb-4">
        <h1 className="m-0 text-2xl font-bold leading-tight">{summary.title}</h1>
        <p className="mt-2 text-(--tg-theme-hint-color)">
          {new Date(summary.createdAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Topics */}
      <div className="flex flex-wrap gap-2 mb-5">
        {summary.topics.map((topic) => (
          <span
            key={topic}
            className="py-1.5 px-3 bg-(--tg-theme-button-color) text-(--tg-theme-button-text-color) rounded-2xl text-sm font-medium"
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Content */}
      <article className="bg-(--tg-theme-secondary-bg-color) rounded-xl p-4 mb-6">
        <div className="mini-app-markdown">
          <ReactMarkdown>{summary.content}</ReactMarkdown>
        </div>
      </article>

      {/* Source Posts */}
      <section className="mt-6">
        <h2 className="text-base font-semibold m-0 mb-3">Источники ({summary.posts.length})</h2>
        <div className="flex flex-col gap-2">
          {summary.posts.map((post) => (
            <button
              key={post.id}
              className="flex flex-col items-start text-left border-none cursor-pointer py-3 px-4 relative bg-(--tg-theme-secondary-bg-color) rounded-xl disabled:cursor-default"
              onClick={() => handleOpenPost(post.url)}
              disabled={!post.url}
            >
              <span className="font-medium text-sm">{post.title}</span>
              <span className="text-xs mt-1 text-(--tg-theme-hint-color)">{post.channelName}</span>
              {post.url && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-(--tg-theme-hint-color)">
                  →
                </span>
              )}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
