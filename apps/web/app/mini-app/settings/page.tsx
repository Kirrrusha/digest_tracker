"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface Settings {
  language: string;
  summaryInterval: string;
  telegramNotifications: boolean;
  notifyOnNewSummary: boolean;
  notifyOnNewPosts: boolean;
  topics: string[];
}

const AVAILABLE_TOPICS = [
  "React",
  "Vue",
  "Angular",
  "TypeScript",
  "JavaScript",
  "Node.js",
  "Next.js",
  "Python",
  "Go",
  "Rust",
  "DevOps",
  "Docker",
  "Kubernetes",
  "AI/ML",
  "Database",
  "Security",
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    webApp,
    user,
    isReady,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    hapticImpact,
    hapticNotification,
    hapticSelection,
  } = useTelegramWebApp();

  const [settings, setSettings] = useState<Settings>({
    language: "ru",
    summaryInterval: "daily",
    telegramNotifications: true,
    notifyOnNewSummary: true,
    notifyOnNewPosts: false,
    topics: ["React", "TypeScript", "Next.js"],
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app");
    });
    return () => {
      hideBackButton();
    };
  }, [isReady, hapticImpact, hideBackButton, router, showBackButton]);

  const handleSave = useCallback(async () => {
    hapticImpact("medium");
    try {
      hapticNotification("success");
      webApp?.showAlert("Настройки сохранены!");
      setHasChanges(false);
    } catch {
      hapticNotification("error");
      webApp?.showAlert("Ошибка сохранения");
    }
  }, [hapticImpact, hapticNotification, webApp]);

  useEffect(() => {
    if (!isReady) return;
    if (hasChanges) {
      showMainButton("Сохранить", handleSave);
    } else {
      hideMainButton();
    }
    return () => {
      hideMainButton();
    };
  }, [isReady, hasChanges, handleSave, hideMainButton, showMainButton]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    hapticSelection();
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const toggleTopic = (topic: string) => {
    hapticSelection();
    setSettings((prev) => ({
      ...prev,
      topics: prev.topics.includes(topic)
        ? prev.topics.filter((t) => t !== topic)
        : [...prev.topics, topic],
    }));
    setHasChanges(true);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-10 h-10 border-3 border-[var(--tg-theme-secondary-bg-color)] border-t-[var(--tg-theme-button-color)] rounded-full" />
      </div>
    );
  }

  return (
    <main className="p-4 pb-24">
      <header className="mb-6">
        <h1 className="m-0 text-2xl font-bold">Настройки</h1>
      </header>

      {/* Profile */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color)] uppercase m-0 mb-3 ml-1">
          Профиль
        </h2>
        <div className="flex items-center gap-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-4">
          <div className="w-14 h-14 rounded-full bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] flex items-center justify-center text-2xl font-semibold overflow-hidden">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{user?.first_name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold">
              {user?.first_name} {user?.last_name || ""}
            </span>
            {user?.username && (
              <span className="text-sm text-[var(--tg-theme-hint-color)] mt-0.5">
                @{user.username}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* General */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color)] uppercase m-0 mb-3 ml-1">
          Общие
        </h2>
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between py-3.5 px-4 border-b border-[var(--tg-theme-bg-color)]">
            <span className="text-[15px]">Язык</span>
            <select
              className="bg-[var(--tg-theme-bg-color)] border border-[var(--tg-theme-hint-color)] rounded-lg py-2 px-3 text-sm text-[var(--tg-theme-text-color)]"
              value={settings.language}
              onChange={(e) => updateSetting("language", e.target.value)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-3.5 px-4">
            <span className="text-[15px]">Интервал саммари</span>
            <select
              className="bg-[var(--tg-theme-bg-color)] border border-[var(--tg-theme-hint-color)] rounded-lg py-2 px-3 text-sm text-[var(--tg-theme-text-color)]"
              value={settings.summaryInterval}
              onChange={(e) => updateSetting("summaryInterval", e.target.value)}
            >
              <option value="daily">Ежедневно</option>
              <option value="weekly">Еженедельно</option>
            </select>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color)] uppercase m-0 mb-3 ml-1">
          Уведомления
        </h2>
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl overflow-hidden">
          {[
            {
              label: "Telegram уведомления",
              key: "telegramNotifications" as const,
              disabled: false,
            },
            {
              label: "О новых саммари",
              key: "notifyOnNewSummary" as const,
              disabled: !settings.telegramNotifications,
            },
            {
              label: "О новых постах",
              key: "notifyOnNewPosts" as const,
              disabled: !settings.telegramNotifications,
            },
          ].map((item, idx, arr) => (
            <div
              key={item.key}
              className={`flex items-center justify-between py-3.5 px-4 ${idx < arr.length - 1 ? "border-b border-[var(--tg-theme-bg-color)]" : ""}`}
            >
              <span className="text-[15px]">{item.label}</span>
              <button
                className={`w-13 h-8 rounded-2xl p-0.5 cursor-pointer transition-colors relative ${settings[item.key] ? "bg-[var(--tg-theme-button-color)]" : "bg-[var(--tg-theme-hint-color)]"} ${item.disabled ? "opacity-50" : ""}`}
                onClick={() => updateSetting(item.key, !settings[item.key])}
                disabled={item.disabled}
              >
                <span
                  className={`block w-7 h-7 rounded-full bg-white transition-transform ${settings[item.key] ? "translate-x-5" : ""}`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Topics */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color)] uppercase m-0 mb-3 ml-1">
          Интересующие темы
        </h2>
        <p className="text-sm text-[var(--tg-theme-hint-color)] -mt-2 mb-3 ml-1">
          Выберите темы для персонализации саммари
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOPICS.map((topic) => (
            <button
              key={topic}
              className={`py-2 px-4 rounded-full border text-sm cursor-pointer transition-all ${
                settings.topics.includes(topic)
                  ? "bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] border-[var(--tg-theme-button-color)]"
                  : "bg-transparent text-[var(--tg-theme-text-color)] border-[var(--tg-theme-hint-color)]"
              }`}
              onClick={() => toggleTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {/* App Info */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--tg-theme-hint-color)] uppercase m-0 mb-3 ml-1">
          О приложении
        </h2>
        <div className="bg-[var(--tg-theme-secondary-bg-color)] rounded-xl overflow-hidden">
          <div className="flex justify-between py-3 px-4 border-b border-[var(--tg-theme-bg-color)]">
            <span className="text-sm text-[var(--tg-theme-hint-color)]">Версия</span>
            <span className="text-sm">1.0.0</span>
          </div>
          <div className="flex justify-between py-3 px-4">
            <span className="text-sm text-[var(--tg-theme-hint-color)]">Telegram WebApp</span>
            <span className="text-sm">{webApp?.version || "N/A"}</span>
          </div>
        </div>
      </section>
    </main>
  );
}
