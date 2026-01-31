"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface Summary {
  id: string;
  title: string;
  topics: string[];
  period: string;
  createdAt: string;
  postsCount: number;
}

export default function SummariesPage() {
  const router = useRouter();
  const {
    isReady,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    hapticImpact,
    hapticSelection,
  } = useTelegramWebApp();

  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "daily" | "weekly">("all");

  useEffect(() => {
    if (!isReady) return;

    fetchSummaries();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app");
    });

    showMainButton("Создать саммари", () => {
      hapticImpact("medium");
      // TODO: Генерация саммари
    });

    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [isReady]);

  const fetchSummaries = async () => {
    try {
      // TODO: Заменить на реальный API
      setSummaries([
        {
          id: "1",
          title: "Саммари за 30 января",
          topics: ["React", "TypeScript", "Next.js"],
          period: "daily-2024-01-30",
          createdAt: new Date().toISOString(),
          postsCount: 15,
        },
        {
          id: "2",
          title: "Саммари за 29 января",
          topics: ["Node.js", "Docker", "DevOps"],
          period: "daily-2024-01-29",
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          postsCount: 12,
        },
        {
          id: "3",
          title: "Недельное саммари #4",
          topics: ["Frontend", "Backend", "AI"],
          period: "weekly-2024-04",
          createdAt: new Date(Date.now() - 172800000).toISOString(),
          postsCount: 45,
        },
      ]);
    } catch (error) {
      console.error("Error fetching summaries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (newFilter: typeof filter) => {
    hapticSelection();
    setFilter(newFilter);
  };

  const filteredSummaries = summaries.filter((s) => {
    if (filter === "all") return true;
    return s.period.startsWith(filter);
  });

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

  return (
    <main className="summaries-page safe-area-top safe-area-bottom">
      <header className="header">
        <h1 className="title">Мои саммари</h1>
        <p className="tg-hint">{summaries.length} записей</p>
      </header>

      {/* Filter */}
      <div className="filter-tabs">
        {[
          { key: "all", label: "Все" },
          { key: "daily", label: "Дневные" },
          { key: "weekly", label: "Недельные" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`filter-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => handleFilterChange(tab.key as typeof filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summaries List */}
      <section className="summaries-list">
        {filteredSummaries.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📊</span>
            <p className="empty-text">Нет саммари</p>
            <p className="tg-hint">Нажми кнопку ниже чтобы создать первое</p>
          </div>
        ) : (
          filteredSummaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/mini-app/summaries/${summary.id}`}
              className="summary-item tg-card"
              onClick={() => hapticImpact("light")}
            >
              <div className="summary-header">
                <span className="summary-icon">
                  {summary.period.startsWith("weekly") ? "📅" : "📋"}
                </span>
                <div className="summary-info">
                  <span className="summary-title">{summary.title}</span>
                  <span className="summary-meta tg-hint">
                    {summary.postsCount} постов •{" "}
                    {new Date(summary.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              <div className="summary-topics">
                {summary.topics.slice(0, 3).map((topic) => (
                  <span key={topic} className="topic-tag">
                    {topic}
                  </span>
                ))}
                {summary.topics.length > 3 && (
                  <span className="topic-more tg-hint">+{summary.topics.length - 3}</span>
                )}
              </div>
            </Link>
          ))
        )}
      </section>

      <style jsx>{`
        .summaries-page {
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
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .filter-tab {
          padding: 8px 16px;
          border: none;
          border-radius: 20px;
          background: var(--tg-theme-secondary-bg-color);
          color: var(--tg-theme-text-color);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.2s;
        }

        .filter-tab.active {
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
        }

        .summaries-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .summary-item {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.1s;
        }

        .summary-item:active {
          transform: scale(0.98);
        }

        .summary-header {
          display: flex;
          gap: 12px;
        }

        .summary-icon {
          font-size: 24px;
        }

        .summary-info {
          display: flex;
          flex-direction: column;
        }

        .summary-title {
          font-weight: 500;
          font-size: 15px;
        }

        .summary-meta {
          font-size: 13px;
          margin-top: 2px;
        }

        .summary-topics {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .topic-tag {
          padding: 4px 10px;
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .topic-more {
          padding: 4px 10px;
          font-size: 12px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
        }

        .empty-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 16px;
        }

        .empty-text {
          margin: 0 0 8px;
          font-size: 16px;
          font-weight: 500;
        }
      `}</style>
    </main>
  );
}
