"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface SummaryDetail {
  id: string;
  title: string;
  content: string;
  topics: string[];
  period: string;
  createdAt: string;
  posts: Array<{
    id: string;
    title: string;
    channelName: string;
    url?: string;
  }>;
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
      // TODO: Заменить на реальный API
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
          {
            id: "3",
            title: "Docker Best Practices 2024",
            channelName: "@devops_weekly",
          },
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
    // Share via Telegram
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
      <div className="loading-container">
        <div className="loading-spinner" />
        <style jsx>{`
          .loading-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--tg-theme-secondary-bg-color);
            border-top-color: var(--tg-theme-button-color);
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="error-state">
        <p>Саммари не найдено</p>
      </div>
    );
  }

  return (
    <main className="summary-detail safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="header">
        <h1 className="title">{summary.title}</h1>
        <p className="meta tg-hint">
          {new Date(summary.createdAt).toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </header>

      {/* Topics */}
      <div className="topics">
        {summary.topics.map((topic) => (
          <span key={topic} className="topic-tag">
            {topic}
          </span>
        ))}
      </div>

      {/* Content */}
      <article className="content tg-card">
        {summary.content.split("\n").map((line, i) => {
          if (line.startsWith("## ")) {
            return (
              <h2 key={i} className="content-h2">
                {line.replace("## ", "")}
              </h2>
            );
          }
          if (line.startsWith("### ")) {
            return (
              <h3 key={i} className="content-h3">
                {line.replace("### ", "")}
              </h3>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <li key={i} className="content-li">
                {line.replace("- ", "")}
              </li>
            );
          }
          if (line.trim()) {
            return (
              <p key={i} className="content-p">
                {line}
              </p>
            );
          }
          return null;
        })}
      </article>

      {/* Source Posts */}
      <section className="sources">
        <h2 className="section-title">Источники ({summary.posts.length})</h2>
        <div className="posts-list">
          {summary.posts.map((post) => (
            <button
              key={post.id}
              className="post-item tg-card"
              onClick={() => handleOpenPost(post.url)}
              disabled={!post.url}
            >
              <span className="post-title">{post.title}</span>
              <span className="post-channel tg-hint">{post.channelName}</span>
              {post.url && <span className="post-arrow">→</span>}
            </button>
          ))}
        </div>
      </section>

      <style jsx>{`
        .summary-detail {
          padding: 16px;
          padding-bottom: 100px;
        }

        .header {
          margin-bottom: 16px;
        }

        .title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          line-height: 1.3;
        }

        .meta {
          margin: 8px 0 0;
        }

        .topics {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .topic-tag {
          padding: 6px 12px;
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
          border-radius: 16px;
          font-size: 13px;
          font-weight: 500;
        }

        .content {
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .content-h2 {
          font-size: 18px;
          font-weight: 700;
          margin: 20px 0 12px;
        }

        .content-h2:first-child {
          margin-top: 0;
        }

        .content-h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 16px 0 8px;
        }

        .content-p {
          margin: 8px 0;
        }

        .content-li {
          margin: 6px 0;
          padding-left: 8px;
          list-style-position: inside;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px;
        }

        .posts-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .post-item {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          text-align: left;
          border: none;
          cursor: pointer;
          padding: 12px 16px;
          position: relative;
        }

        .post-item:disabled {
          cursor: default;
        }

        .post-title {
          font-weight: 500;
          font-size: 14px;
        }

        .post-channel {
          font-size: 12px;
          margin-top: 4px;
        }

        .post-arrow {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--tg-theme-hint-color);
        }

        .error-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          color: var(--tg-theme-hint-color);
        }

        .sources {
          margin-top: 24px;
        }
      `}</style>
    </main>
  );
}
