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
    showBackButton(() => {
      hapticImpact("light");
      router.push("/mini-app");
    });
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
  };

  const handleDeleteChannel = async (channelId: string) => {
    const confirmed = await new Promise<boolean>((resolve) => {
      webApp?.showConfirm("Удалить этот канал?", resolve);
    });
    if (!confirmed) return;
    hapticNotification("warning");
    setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
  };

  const handleAddChannel = async () => {
    if (!newChannelUrl.trim()) return;
    hapticImpact("medium");
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner w-10 h-10 border-3 border-[var(--tg-theme-secondary-bg-color)] border-t-[var(--tg-theme-button-color)] rounded-full" />
      </div>
    );
  }

  return (
    <main className="p-4 pb-24">
      <header className="mb-5">
        <h1 className="m-0 text-2xl font-bold">Мои каналы</h1>
        <p className="text-sm text-[var(--tg-theme-hint-color)]">{channels.length} каналов</p>
      </header>

      {/* Add Form Modal */}
      {showAddForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-5 z-50"
          onClick={() => setShowAddForm(false)}
        >
          <div
            className="w-full max-w-80 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="m-0 mb-4 text-lg font-semibold">Добавить канал</h2>
            <input
              type="text"
              className="w-full p-3 border border-[var(--tg-theme-hint-color)] rounded-lg text-base bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] mb-4 focus:outline-none focus:border-[var(--tg-theme-button-color)]"
              placeholder="https://t.me/channel или RSS URL"
              value={newChannelUrl}
              onChange={(e) => setNewChannelUrl(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <button
                className="flex-1 py-3 border-none rounded-lg text-base bg-[var(--tg-theme-bg-color)] text-[var(--tg-theme-text-color)] cursor-pointer"
                onClick={() => setShowAddForm(false)}
              >
                Отмена
              </button>
              <button
                className="flex-1 py-3 border-none rounded-lg text-base font-medium bg-[var(--tg-theme-button-color)] text-[var(--tg-theme-button-text-color)] cursor-pointer"
                onClick={handleAddChannel}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Channels List */}
      <section className="flex flex-col gap-3">
        {channels.length === 0 ? (
          <div className="text-center py-10 px-5">
            <span className="text-5xl block mb-4">📢</span>
            <p className="m-0 mb-2 text-base font-medium">Нет добавленных каналов</p>
            <p className="text-sm text-[var(--tg-theme-hint-color)]">
              Нажми кнопку ниже чтобы добавить первый канал
            </p>
          </div>
        ) : (
          channels.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between py-3.5 px-4 bg-[var(--tg-theme-secondary-bg-color)] rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="text-2xl">{channel.type === "telegram" ? "📢" : "📡"}</div>
                <div className="flex flex-col">
                  <span className="font-medium text-[15px]">{channel.name}</span>
                  <span className="text-sm text-[var(--tg-theme-hint-color)]">
                    {channel.postsCount} постов
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-transparent border-none text-xl p-2 cursor-pointer rounded-lg transition-colors active:bg-[var(--tg-theme-secondary-bg-color)]"
                  onClick={() => handleToggleChannel(channel.id)}
                >
                  {channel.isActive ? "✅" : "⏸"}
                </button>
                <button
                  className="bg-transparent border-none text-xl p-2 cursor-pointer rounded-lg transition-colors active:bg-[var(--tg-theme-secondary-bg-color)]"
                  onClick={() => handleDeleteChannel(channel.id)}
                >
                  🗑
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
