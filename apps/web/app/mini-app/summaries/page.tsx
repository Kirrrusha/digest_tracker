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
    showMainButton("Создать саммари", () => hapticImpact("medium"));
    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [isReady]);

  const fetchSummaries = async () => {
    try {
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

  const filteredSummaries = summaries.filter(
    (s) => filter === "all" || s.period.startsWith(filter)
  );

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-10 h-10 border-3 border-(--tg-theme-secondary-bg-color) border-t-(--tg-theme-button-color) rounded-full" />
      </div>
    );
  }

  return (
    <main className="p-4 pb-24">
      <header className="mb-4">
        <h1 className="m-0 text-2xl font-bold">Мои саммари</h1>
        <p className="text-sm text-(--tg-theme-hint-color)">{summaries.length} записей</p>
      </header>

      {/* Filter */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {[
          { key: "all", label: "Все" },
          { key: "daily", label: "Дневные" },
          { key: "weekly", label: "Недельные" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={`py-2 px-4 border-none rounded-full text-sm font-medium cursor-pointer whitespace-nowrap transition-all ${
              filter === tab.key
                ? "bg-(--tg-theme-button-color) text-(--tg-theme-button-text-color)"
                : "bg-(--tg-theme-secondary-bg-color) text-(--tg-theme-text-color)"
            }`}
            onClick={() => handleFilterChange(tab.key as typeof filter)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summaries List */}
      <section className="flex flex-col gap-3">
        {filteredSummaries.length === 0 ? (
          <div className="text-center py-10 px-5">
            <span className="text-5xl block mb-4">📊</span>
            <p className="m-0 mb-2 text-base font-medium">Нет саммари</p>
            <p className="text-sm text-(--tg-theme-hint-color)">
              Нажми кнопку ниже чтобы создать первое
            </p>
          </div>
        ) : (
          filteredSummaries.map((summary) => (
            <Link
              key={summary.id}
              href={`/mini-app/summaries/${summary.id}`}
              className="flex flex-col gap-3 no-underline text-inherit bg-(--tg-theme-secondary-bg-color) rounded-xl p-4 transition-transform active:scale-[0.98]"
              onClick={() => hapticImpact("light")}
            >
              <div className="flex gap-3">
                <span className="text-2xl">
                  {summary.period.startsWith("weekly") ? "📅" : "📋"}
                </span>
                <div className="flex flex-col">
                  <span className="font-medium text-[15px]">{summary.title}</span>
                  <span className="text-sm text-(--tg-theme-hint-color) mt-0.5">
                    {summary.postsCount} постов •{" "}
                    {new Date(summary.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {summary.topics.slice(0, 3).map((topic) => (
                  <span
                    key={topic}
                    className="py-1 px-2.5 bg-(--tg-theme-button-color) text-(--tg-theme-button-text-color) rounded-xl text-xs font-medium"
                  >
                    {topic}
                  </span>
                ))}
                {summary.topics.length > 3 && (
                  <span className="py-1 px-2.5 text-xs text-(--tg-theme-hint-color)">
                    +{summary.topics.length - 3}
                  </span>
                )}
              </div>
            </Link>
          ))
        )}
      </section>
    </main>
  );
}
