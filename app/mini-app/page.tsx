"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface DashboardData {
  channelsCount: number;
  summariesCount: number;
  lastSummary: {
    id: string;
    title: string;
    createdAt: string;
  } | null;
}

export default function MiniAppPage() {
  const { webApp, user, isReady, hapticImpact, showMainButton, hideMainButton } =
    useTelegramWebApp();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    fetchDashboardData();
  }, [isReady]);

  useEffect(() => {
    if (!webApp || !isReady) return;
    showMainButton("Создать саммари", handleGenerateSummary);
    return () => {
      hideMainButton();
    };
  }, [webApp, isReady, showMainButton, hideMainButton]);

  const fetchDashboardData = async () => {
    try {
      setData({
        channelsCount: 5,
        summariesCount: 12,
        lastSummary: {
          id: "1",
          title: "Саммари за 30 января",
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    hapticImpact("medium");
    webApp?.showAlert("Генерация саммари скоро будет доступна!");
  };

  if (!isReady || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-10 h-10 border-3 border-[var(--tg-theme-secondary-bg-color)] border-t-[var(--tg-theme-button-color)] rounded-full" />
      </div>
    );
  }

  return (
    <main className="p-4 pb-24 pt-[env(safe-area-inset-top,0)] pb-[max(env(safe-area-inset-bottom,0),100px)]">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-center gap-3">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] flex items-center justify-center text-xl font-semibold">
              {user?.first_name?.charAt(0) || "U"}
            </div>
          )}
          <div>
            <h1 className="m-0 text-xl font-semibold">
              Привет, {user?.first_name || "Пользователь"}!
            </h1>
            <p className="text-[var(--tg-theme-hint-color)] text-sm">Твой персональный дайджест</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex flex-col items-center p-5 text-center bg-[var(--tg-theme-secondary-bg-color)] rounded-xl">
          <span className="text-3xl mb-2">📢</span>
          <span className="text-3xl font-bold">{data?.channelsCount || 0}</span>
          <span className="text-xs mt-1 text-[var(--tg-theme-hint-color)]">Каналов</span>
        </div>
        <div className="flex flex-col items-center p-5 text-center bg-[var(--tg-theme-secondary-bg-color)] rounded-xl">
          <span className="text-3xl mb-2">📊</span>
          <span className="text-3xl font-bold">{data?.summariesCount || 0}</span>
          <span className="text-xs mt-1 text-[var(--tg-theme-hint-color)]">Саммари</span>
        </div>
      </section>

      {/* Last Summary */}
      {data?.lastSummary && (
        <section className="mb-6">
          <h2 className="text-base font-semibold m-0 mb-3">Последнее саммари</h2>
          <Link
            href={`/mini-app/summaries/${data.lastSummary.id}`}
            className="flex flex-col gap-2 no-underline text-inherit bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-4"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">📋</span>
              <span className="font-medium">{data.lastSummary.title}</span>
            </div>
            <span className="text-sm text-[var(--tg-theme-hint-color)]">
              {new Date(data.lastSummary.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </Link>
        </section>
      )}

      {/* Quick Actions */}
      <section className="mb-6">
        <h2 className="text-base font-semibold m-0 mb-3">Быстрые действия</h2>
        <nav className="grid grid-cols-3 gap-3">
          <Link
            href="/mini-app/channels"
            className="flex flex-col items-center py-4 px-2 no-underline text-inherit bg-[var(--tg-theme-secondary-bg-color)] rounded-xl transition-transform active:scale-95"
          >
            <span className="text-3xl mb-2">📢</span>
            <span className="text-sm font-medium">Каналы</span>
          </Link>
          <Link
            href="/mini-app/summaries"
            className="flex flex-col items-center py-4 px-2 no-underline text-inherit bg-[var(--tg-theme-secondary-bg-color)] rounded-xl transition-transform active:scale-95"
          >
            <span className="text-3xl mb-2">📊</span>
            <span className="text-sm font-medium">Саммари</span>
          </Link>
          <Link
            href="/mini-app/settings"
            className="flex flex-col items-center py-4 px-2 no-underline text-inherit bg-[var(--tg-theme-secondary-bg-color)] rounded-xl transition-transform active:scale-95"
          >
            <span className="text-3xl mb-2">⚙️</span>
            <span className="text-sm font-medium">Настройки</span>
          </Link>
        </nav>
      </section>
    </main>
  );
}
