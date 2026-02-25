import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Code, Settings, User, X } from "lucide-react";
import { toast } from "sonner";

import { mtprotoApi } from "../api/mtproto";
import { preferencesApi } from "../api/preferences";
import { PasskeyRegisterButton } from "../components/auth/PasskeyRegisterButton";
import { TelegramChannelBrowser } from "../components/TelegramChannelBrowser";
import { TelegramConnect } from "../components/TelegramConnect";

type Tab = "profile" | "preferences" | "notifications" | "api";

const TABS: Array<{ id: Tab; label: string; icon: typeof User }> = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "preferences", label: "Предпочтения", icon: Settings },
  { id: "notifications", label: "Уведомления", icon: Bell },
  { id: "api", label: "API", icon: Code },
];

const ALL_TOPICS = [
  "React",
  "Vue",
  "Angular",
  "Svelte",
  "TypeScript",
  "JavaScript",
  "Python",
  "Go",
  "Node.js",
  "Deno",
  "Bun",
  "Express",
  "DevOps",
  "Docker",
  "Kubernetes",
  "CI/CD",
  "CSS",
  "Tailwind",
  "Design",
  "UX/UI",
];

type SummaryFrequency = "daily" | "weekly" | "manual";

const FREQUENCY_OPTIONS: Array<{ value: SummaryFrequency; label: string }> = [
  { value: "daily", label: "Ежедневно" },
  { value: "weekly", label: "Еженедельно" },
  { value: "manual", label: "Вручную" },
];

export function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("preferences");
  const [showChannelBrowser, setShowChannelBrowser] = useState(false);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["preferences"],
    queryFn: preferencesApi.get,
  });

  const { data: mtprotoStatus } = useQuery({
    queryKey: ["mtproto-status"],
    queryFn: mtprotoApi.getStatus,
  });

  const [localTopics, setLocalTopics] = useState<string[] | null>(null);
  const [localFrequency, setLocalFrequency] = useState<SummaryFrequency | null>(null);
  const [localLanguage, setLocalLanguage] = useState<string | null>(null);

  const selectedTopics = localTopics ?? prefs?.topics ?? [];
  const selectedFrequency: SummaryFrequency =
    localFrequency ?? (prefs?.summaryInterval as SummaryFrequency) ?? "daily";
  const selectedLanguage = localLanguage ?? prefs?.language ?? "ru";

  const mutation = useMutation({
    mutationFn: preferencesApi.update,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["preferences"] });
      setLocalTopics(null);
      setLocalFrequency(null);
      setLocalLanguage(null);
      toast.success("Настройки сохранены");
    },
    onError: () => toast.error("Ошибка сохранения"),
  });

  const handleSave = () => {
    const interval = selectedFrequency === "manual" ? "daily" : selectedFrequency;
    mutation.mutate({
      topics: selectedTopics,
      summaryInterval: interval,
      language: selectedLanguage,
    });
  };

  const handleCancel = () => {
    setLocalTopics(null);
    setLocalFrequency(null);
    setLocalLanguage(null);
  };

  const toggleTopic = (topic: string) => {
    const current = selectedTopics;
    const next = current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic];
    setLocalTopics(next);
  };

  if (isLoading)
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 bg-[var(--surface)] rounded-lg" />
        ))}
      </div>
    );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Настройки</h1>
        <p className="text-sm text-slate-400 mt-0.5">
          Управляйте вашими предпочтениями и настройками
        </p>
      </div>

      <div className="flex border-b border-[var(--border)] mb-6">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-slate-400 hover:text-white"
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">Ключи доступа (Passkey)</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Входите без пароля с помощью Touch ID, Face ID или ключа безопасности
              </p>
            </div>
            <PasskeyRegisterButton />
          </div>
          <TelegramConnect hasActiveSession={mtprotoStatus?.hasActiveSession ?? false} />
          {mtprotoStatus?.hasActiveSession && (
            <>
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Мои Telegram каналы</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Добавьте каналы из вашего Telegram
                  </p>
                </div>
                <button
                  onClick={() => setShowChannelBrowser(true)}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
                >
                  Добавить каналы
                </button>
              </div>
              <div className="bg-(--surface) border border-(--border) rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Помечать сообщения прочитанными</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    При синхронизации канала автоматически отмечать сообщения прочитанными в
                    Telegram
                  </p>
                </div>
                <button
                  onClick={() =>
                    mutation.mutate({ markTelegramAsRead: !prefs?.markTelegramAsRead })
                  }
                  disabled={mutation.isPending}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-50 ${prefs?.markTelegramAsRead ? "bg-blue-600" : "bg-slate-600"}`}
                >
                  <span
                    className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs?.markTelegramAsRead ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "preferences" && (
        <div className="space-y-6">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-1">Интересующие темы</h3>
            <p className="text-sm text-slate-400 mb-4">Выберите темы для персонализации контента</p>
            <div className="grid grid-cols-4 gap-2">
              {ALL_TOPICS.map((topic) => {
                const checked = selectedTopics.includes(topic);
                return (
                  <button
                    key={topic}
                    onClick={() => toggleTopic(topic)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-colors text-left ${
                      checked
                        ? "border-blue-500 bg-blue-500/10 text-white"
                        : "border-[var(--border)] text-slate-400 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded shrink-0 border flex items-center justify-center ${
                        checked ? "bg-blue-500 border-blue-500" : "border-slate-500"
                      }`}
                    >
                      {checked && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path
                            d="M1 4L3.5 6.5L9 1"
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </div>
                    {topic}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Частота саммари</h3>
            <div className="space-y-2">
              {FREQUENCY_OPTIONS.map(({ value, label }) => (
                <label
                  key={value}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border)] cursor-pointer hover:border-slate-600 transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedFrequency === value ? "border-blue-500" : "border-slate-500"
                    }`}
                  >
                    {selectedFrequency === value && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <input
                    type="radio"
                    name="frequency"
                    value={value}
                    checked={selectedFrequency === value}
                    onChange={() => setLocalFrequency(value)}
                    className="sr-only"
                  />
                  <span className="text-sm text-slate-300">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
            <h3 className="text-base font-semibold text-white mb-4">Язык</h3>
            <select
              value={selectedLanguage}
              onChange={(e) => setLocalLanguage(e.target.value)}
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors"
            >
              <option value="ru">Русский</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 py-2">
            <button
              onClick={handleCancel}
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm text-slate-300 border border-[var(--border)] rounded-lg hover:bg-[var(--surface)] disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={mutation.isPending}
              className="px-5 py-2.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? "Сохранение..." : "Сохранить изменения"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-4">
          {[
            {
              key: "telegramNotifications" as const,
              label: "Telegram-уведомления",
              desc: "Получать уведомления через Telegram",
            },
            {
              key: "notifyOnNewSummary" as const,
              label: "Уведомлять о новых саммари",
              desc: "Получать уведомление когда готово новое саммари",
            },
            {
              key: "notifyOnNewPosts" as const,
              label: "Уведомлять о новых постах",
              desc: "Получать уведомление о новых постах в каналах",
            },
          ].map(({ key, label, desc }, i, arr) => (
            <div key={key}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                </div>
                <button
                  onClick={() => mutation.mutate({ [key]: !prefs?.[key] })}
                  className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${prefs?.[key] ? "bg-blue-600" : "bg-slate-600"}`}
                >
                  <span
                    className={`absolute left-0 top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${prefs?.[key] ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
              {i < arr.length - 1 && <div className="border-t border-[var(--border)] mt-4" />}
            </div>
          ))}
        </div>
      )}

      {activeTab === "api" && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6">
          <h3 className="text-base font-semibold text-white mb-2">API доступ</h3>
          <p className="text-sm text-slate-400">
            Управление API ключами и интеграциями — в разработке.
          </p>
        </div>
      )}

      {showChannelBrowser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h2 className="text-base font-semibold text-white">Мои Telegram каналы</h2>
              <button
                onClick={() => setShowChannelBrowser(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5">
              <TelegramChannelBrowser
                onAdded={() => {
                  qc.invalidateQueries({ queryKey: ["channels"] });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
