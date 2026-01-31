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

    // Загружаем данные дашборда
    fetchDashboardData();
  }, [isReady]);

  useEffect(() => {
    if (!webApp || !isReady) return;

    // Настраиваем MainButton
    showMainButton("Создать саммари", handleGenerateSummary);

    return () => {
      hideMainButton();
    };
  }, [webApp, isReady, showMainButton, hideMainButton]);

  const fetchDashboardData = async () => {
    try {
      // TODO: Заменить на реальный API вызов
      // const response = await fetch('/api/mini-app/dashboard', {
      //   headers: { 'X-Telegram-Init-Data': webApp?.initData || '' }
      // });
      // const data = await response.json();

      // Временные данные
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

    // TODO: Реализовать генерацию саммари
    webApp?.showAlert("Генерация саммари скоро будет доступна!");
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
    <main className="dashboard safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="header">
        <div className="user-info">
          {user?.photo_url ? (
            <img src={user.photo_url} alt="" className="avatar" />
          ) : (
            <div className="avatar-placeholder">{user?.first_name?.charAt(0) || "U"}</div>
          )}
          <div>
            <h1 className="greeting">Привет, {user?.first_name || "Пользователь"}!</h1>
            <p className="tg-hint">Твой персональный дайджест</p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="stats">
        <div className="stat-card tg-card">
          <span className="stat-icon">📢</span>
          <span className="stat-value">{data?.channelsCount || 0}</span>
          <span className="stat-label tg-hint">Каналов</span>
        </div>
        <div className="stat-card tg-card">
          <span className="stat-icon">📊</span>
          <span className="stat-value">{data?.summariesCount || 0}</span>
          <span className="stat-label tg-hint">Саммари</span>
        </div>
      </section>

      {/* Last Summary */}
      {data?.lastSummary && (
        <section className="section">
          <h2 className="section-title">Последнее саммари</h2>
          <Link
            href={`/mini-app/summaries/${data.lastSummary.id}`}
            className="summary-card tg-card"
          >
            <div className="summary-header">
              <span className="summary-icon">📋</span>
              <span className="summary-title">{data.lastSummary.title}</span>
            </div>
            <span className="summary-date tg-hint">
              {new Date(data.lastSummary.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </Link>
        </section>
      )}

      {/* Quick Actions */}
      <section className="section">
        <h2 className="section-title">Быстрые действия</h2>
        <nav className="quick-actions">
          <Link href="/mini-app/channels" className="action-item tg-card">
            <span className="action-icon">📢</span>
            <span className="action-label">Каналы</span>
          </Link>
          <Link href="/mini-app/summaries" className="action-item tg-card">
            <span className="action-icon">📊</span>
            <span className="action-label">Саммари</span>
          </Link>
          <Link href="/mini-app/settings" className="action-item tg-card">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Настройки</span>
          </Link>
        </nav>
      </section>

      <style jsx>{`
        .dashboard {
          padding: 16px;
          padding-bottom: 100px; /* Space for MainButton */
        }

        .header {
          margin-bottom: 24px;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .avatar,
        .avatar-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 50%;
        }

        .avatar {
          object-fit: cover;
        }

        .avatar-placeholder {
          background: var(--tg-theme-button-color);
          color: var(--tg-theme-button-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
        }

        .greeting {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 24px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          text-align: center;
        }

        .stat-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 12px;
          margin-top: 4px;
        }

        .section {
          margin-bottom: 24px;
        }

        .section-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px 0;
        }

        .summary-card {
          display: flex;
          flex-direction: column;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .summary-icon {
          font-size: 20px;
        }

        .summary-title {
          font-weight: 500;
        }

        .summary-date {
          font-size: 13px;
        }

        .quick-actions {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 16px 8px;
          text-decoration: none;
          color: inherit;
          transition: transform 0.1s;
        }

        .action-item:active {
          transform: scale(0.95);
        }

        .action-icon {
          font-size: 28px;
          margin-bottom: 8px;
        }

        .action-label {
          font-size: 13px;
          font-weight: 500;
        }
      `}</style>
    </main>
  );
}
