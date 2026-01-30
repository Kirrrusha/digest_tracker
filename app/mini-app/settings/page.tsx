"use client";

import { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!isReady) return;

    fetchSettings();
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;

    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app");
    });

    return () => {
      hideBackButton();
    };
  }, [isReady]);

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
  }, [isReady, hasChanges]);

  const fetchSettings = async () => {
    try {
      // TODO: Заменить на реальный API
      // Используем дефолтные настройки
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSave = async () => {
    hapticImpact("medium");

    try {
      // TODO: API call to save settings
      hapticNotification("success");
      webApp?.showAlert("Настройки сохранены!");
      setHasChanges(false);
    } catch (error) {
      hapticNotification("error");
      webApp?.showAlert("Ошибка сохранения");
    }
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

  return (
    <main className="settings-page safe-area-top safe-area-bottom">
      <header className="header">
        <h1 className="title">Настройки</h1>
      </header>

      {/* Profile */}
      <section className="section">
        <h2 className="section-title">Профиль</h2>
        <div className="profile-card tg-card">
          <div className="profile-avatar">
            {user?.photo_url ? (
              <img src={user.photo_url} alt="" />
            ) : (
              <span>{user?.first_name?.charAt(0) || "U"}</span>
            )}
          </div>
          <div className="profile-info">
            <span className="profile-name">
              {user?.first_name} {user?.last_name || ""}
            </span>
            {user?.username && (
              <span className="profile-username tg-hint">@{user.username}</span>
            )}
          </div>
        </div>
      </section>

      {/* General */}
      <section className="section">
        <h2 className="section-title">Общие</h2>
        <div className="settings-group tg-card">
          <div className="setting-item">
            <span className="setting-label">Язык</span>
            <select
              className="setting-select"
              value={settings.language}
              onChange={(e) => updateSetting("language", e.target.value)}
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>
          <div className="setting-item">
            <span className="setting-label">Интервал саммари</span>
            <select
              className="setting-select"
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
      <section className="section">
        <h2 className="section-title">Уведомления</h2>
        <div className="settings-group tg-card">
          <div className="setting-item">
            <span className="setting-label">Telegram уведомления</span>
            <button
              className={`toggle ${settings.telegramNotifications ? "on" : ""}`}
              onClick={() =>
                updateSetting("telegramNotifications", !settings.telegramNotifications)
              }
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          <div className="setting-item">
            <span className="setting-label">О новых саммари</span>
            <button
              className={`toggle ${settings.notifyOnNewSummary ? "on" : ""}`}
              onClick={() =>
                updateSetting("notifyOnNewSummary", !settings.notifyOnNewSummary)
              }
              disabled={!settings.telegramNotifications}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
          <div className="setting-item">
            <span className="setting-label">О новых постах</span>
            <button
              className={`toggle ${settings.notifyOnNewPosts ? "on" : ""}`}
              onClick={() => updateSetting("notifyOnNewPosts", !settings.notifyOnNewPosts)}
              disabled={!settings.telegramNotifications}
            >
              <span className="toggle-thumb" />
            </button>
          </div>
        </div>
      </section>

      {/* Topics */}
      <section className="section">
        <h2 className="section-title">Интересующие темы</h2>
        <p className="section-hint tg-hint">
          Выберите темы для персонализации саммари
        </p>
        <div className="topics-grid">
          {AVAILABLE_TOPICS.map((topic) => (
            <button
              key={topic}
              className={`topic-chip ${settings.topics.includes(topic) ? "selected" : ""}`}
              onClick={() => toggleTopic(topic)}
            >
              {topic}
            </button>
          ))}
        </div>
      </section>

      {/* App Info */}
      <section className="section">
        <h2 className="section-title">О приложении</h2>
        <div className="app-info tg-card">
          <div className="info-item">
            <span className="info-label tg-hint">Версия</span>
            <span className="info-value">1.0.0</span>
          </div>
          <div className="info-item">
            <span className="info-label tg-hint">Telegram WebApp</span>
            <span className="info-value">{webApp?.version || "N/A"}</span>
          </div>
        </div>
      </section>

      <style jsx>{`
        .settings-page {
          padding: 16px;
          padding-bottom: 100px;
        }

        .header {
          margin-bottom: 24px;
        }

        .title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 14px;
          font-weight: 600;
          color: var(--tg-theme-hint-color);
          text-transform: uppercase;
          margin: 0 0 12px 4px;
        }

        .section-hint {
          margin: -8px 0 12px 4px;
          font-size: 13px;
        }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .profile-avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
          overflow: hidden;
        }

        .profile-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-info {
          display: flex;
          flex-direction: column;
        }

        .profile-name {
          font-size: 17px;
          font-weight: 600;
        }

        .profile-username {
          font-size: 14px;
          margin-top: 2px;
        }

        .settings-group {
          padding: 0;
        }

        .setting-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid var(--tg-theme-bg-color);
        }

        .setting-item:last-child {
          border-bottom: none;
        }

        .setting-label {
          font-size: 15px;
        }

        .setting-select {
          background: var(--tg-theme-bg-color);
          border: 1px solid var(--tg-theme-hint-color);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: var(--tg-theme-text-color);
        }

        .toggle {
          width: 52px;
          height: 32px;
          border-radius: 16px;
          background: var(--tg-theme-hint-color);
          border: none;
          padding: 2px;
          cursor: pointer;
          transition: background 0.2s;
          position: relative;
        }

        .toggle.on {
          background: var(--tg-theme-button-color);
        }

        .toggle:disabled {
          opacity: 0.5;
        }

        .toggle-thumb {
          display: block;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: white;
          transition: transform 0.2s;
        }

        .toggle.on .toggle-thumb {
          transform: translateX(20px);
        }

        .topics-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .topic-chip {
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid var(--tg-theme-hint-color);
          background: transparent;
          color: var(--tg-theme-text-color);
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .topic-chip.selected {
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
          border-color: var(--tg-theme-button-color);
        }

        .app-info {
          padding: 0;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--tg-theme-bg-color);
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 14px;
        }

        .info-value {
          font-size: 14px;
        }
      `}</style>
    </main>
  );
}
