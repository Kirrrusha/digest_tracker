"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTelegramWebApp } from "@/lib/telegram/useTelegramWebApp";

interface Channel {
  id: string;
  name: string;
  type: "telegram" | "rss";
  sourceUrl: string;
  isActive: boolean;
  postsCount: number;
}

export default function ChannelsPage() {
  const router = useRouter();
  const {
    webApp,
    isReady,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    hapticImpact,
    hapticNotification,
  } = useTelegramWebApp();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannelUrl, setNewChannelUrl] = useState("");

  useEffect(() => {
    if (!isReady) return;

    fetchChannels();
  }, [isReady]);

  useEffect(() => {
    if (!webApp || !isReady) return;

    // Back button
    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app");
    });

    // Main button для добавления канала
    showMainButton("Добавить канал", () => {
      hapticImpact("medium");
      setShowAddForm(true);
    });

    return () => {
      hideBackButton();
      hideMainButton();
    };
  }, [webApp, isReady]);

  const fetchChannels = async () => {
    try {
      // TODO: Заменить на реальный API
      setChannels([
        {
          id: "1",
          name: "@frontend_dev",
          type: "telegram",
          sourceUrl: "https://t.me/frontend_dev",
          isActive: true,
          postsCount: 156,
        },
        {
          id: "2",
          name: "@backend_weekly",
          type: "telegram",
          sourceUrl: "https://t.me/backend_weekly",
          isActive: true,
          postsCount: 89,
        },
        {
          id: "3",
          name: "CSS-Tricks RSS",
          type: "rss",
          sourceUrl: "https://css-tricks.com/feed/",
          isActive: false,
          postsCount: 42,
        },
      ]);
    } catch (error) {
      console.error("Error fetching channels:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleChannel = async (channelId: string) => {
    hapticImpact("light");

    setChannels((prev) =>
      prev.map((ch) => (ch.id === channelId ? { ...ch, isActive: !ch.isActive } : ch))
    );

    // TODO: API call to toggle channel
  };

  const handleDeleteChannel = async (channelId: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      webApp?.showConfirm("Удалить этот канал?", resolve);
    });

    if (!confirmed) return;

    hapticNotification("warning");
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));

    // TODO: API call to delete channel
  };

  const handleAddChannel = async () => {
    if (!newChannelUrl.trim()) return;

    hapticImpact("medium");

    // TODO: API call to add channel
    const newChannel: Channel = {
      id: Date.now().toString(),
      name: newChannelUrl.includes("t.me") ? `@${newChannelUrl.split("/").pop()}` : "New Channel",
      type: newChannelUrl.includes("t.me") ? "telegram" : "rss",
      sourceUrl: newChannelUrl,
      isActive: true,
      postsCount: 0,
    };

    setChannels((prev) => [...prev, newChannel]);
    setNewChannelUrl("");
    setShowAddForm(false);
    hapticNotification("success");
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
    <main className="channels-page safe-area-top safe-area-bottom">
      <header className="header">
        <h1 className="title">Мои каналы</h1>
        <p className="tg-hint">{channels.length} каналов</p>
      </header>

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => setShowAddForm(false)}>
          <div className="modal tg-card" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Добавить канал</h2>
            <input
              type="text"
              className="input"
              placeholder="https://t.me/channel или RSS URL"
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Отмена
              </button>
              <button className="tg-button" onClick={handleAddChannel}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channels List */}
      <section className="channels-list">
        {channels.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📢</span>
            <p className="empty-text">Нет добавленных каналов</p>
            <p className="tg-hint">Нажми кнопку ниже чтобы добавить первый канал</p>
          </div>
        ) : (
          channels.map((channel) => (
            <div key={channel.id} className="channel-item tg-card">
              <div className="channel-info">
                <div className="channel-icon">{channel.type === "telegram" ? "📢" : "📡"}</div>
                <div className="channel-details">
                  <span className="channel-name">{channel.name}</span>
                  <span className="channel-meta tg-hint">{channel.postsCount} постов</span>
                </div>
              </div>
              <div className="channel-actions">
                <button
                  className={`toggle-btn ${channel.isActive ? "active" : ""}`}
                  onClick={() => handleToggleChannel(channel.id)}
                >
                  {channel.isActive ? "✅" : "⏸"}
                </button>
                <button className="delete-btn" onClick={() => handleDeleteChannel(channel.id)}>
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <style jsx>{`
        .channels-page {
          padding: 16px;
          padding-bottom: 100px;
        }

        .header {
          margin-bottom: 20px;
        }

        .title {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
        }

        .channels-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .channel-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
        }

        .channel-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .channel-icon {
          font-size: 24px;
        }

        .channel-details {
          display: flex;
          flex-direction: column;
        }

        .channel-name {
          font-weight: 500;
          font-size: 15px;
        }

        .channel-meta {
          font-size: 13px;
        }

        .channel-actions {
          display: flex;
          gap: 8px;
        }

        .toggle-btn,
        .delete-btn {
          background: none;
          border: none;
          font-size: 20px;
          padding: 8px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s;
        }

        .toggle-btn:active,
        .delete-btn:active {
          background: var(--tg-theme-secondary-bg-color);
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

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 100;
        }

        .modal {
          width: 100%;
          max-width: 320px;
        }

        .modal-title {
          margin: 0 0 16px;
          font-size: 18px;
          font-weight: 600;
        }

        .input {
          width: 100%;
          padding: 12px;
          border: 1px solid var(--tg-theme-hint-color);
          border-radius: 8px;
          font-size: 16px;
          background: var(--tg-theme-bg-color);
          color: var(--tg-theme-text-color);
          margin-bottom: 16px;
        }

        .input:focus {
          outline: none;
          border-color: var(--tg-theme-button-color);
        }

        .modal-actions {
          display: flex;
          gap: 12px;
        }

        .btn-secondary {
          flex: 1;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          background: var(--tg-theme-secondary-bg-color);
          color: var(--tg-theme-text-color);
          cursor: pointer;
        }

        .modal-actions .tg-button {
          flex: 1;
        }
      `}</style>
    </main>
  );
}
