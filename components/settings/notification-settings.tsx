"use client";

import { useState, useTransition } from "react";
import { Bell, BellOff, Clock, Loader2, Mail, MessageSquare } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateNotificationSettings } from "@/app/actions/preferences";

interface NotificationSettingsProps {
  settings: {
    notificationsEnabled: boolean;
    notificationTime: string | null;
    telegramNotifications?: boolean;
    notifyOnNewSummary?: boolean;
    notifyOnNewPosts?: boolean;
  };
  hasTelegramAccount?: boolean;
}

export function NotificationSettings({
  settings,
  hasTelegramAccount = false,
}: NotificationSettingsProps) {
  const [enabled, setEnabled] = useState(settings.notificationsEnabled);
  const [time, setTime] = useState(settings.notificationTime || "20:00");
  const [telegramEnabled, setTelegramEnabled] = useState(settings.telegramNotifications ?? true);
  const [notifyOnSummary, setNotifyOnSummary] = useState(settings.notifyOnNewSummary ?? true);
  const [notifyOnPosts, setNotifyOnPosts] = useState(settings.notifyOnNewPosts ?? false);
  const [isPending, startTransition] = useTransition();

  const updateSettings = (updates: Partial<typeof settings>) => {
    startTransition(async () => {
      await updateNotificationSettings({
        enabled: updates.notificationsEnabled ?? enabled,
        time: updates.notificationTime ?? (enabled ? time : undefined),
      });
    });
  };

  const handleEnabledChange = (value: boolean) => {
    setEnabled(value);
    updateSettings({ notificationsEnabled: value });
  };

  const handleTimeChange = (value: string) => {
    setTime(value);
    if (enabled) {
      updateSettings({ notificationTime: value });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Уведомления
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </CardTitle>
        <CardDescription>
          Настройте когда и как получать уведомления о новых саммари
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Главный переключатель */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {enabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <Label htmlFor="notifications-enabled" className="text-base">
                Уведомления
              </Label>
              <p className="text-sm text-muted-foreground">
                {enabled ? "Уведомления включены" : "Уведомления отключены"}
              </p>
            </div>
          </div>
          <Switch
            id="notifications-enabled"
            checked={enabled}
            onCheckedChange={handleEnabledChange}
          />
        </div>

        {enabled && (
          <>
            {/* Время уведомления */}
            <div className="space-y-2 pl-8">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="notification-time">Время уведомления</Label>
              </div>
              <Input
                id="notification-time"
                type="time"
                value={time}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Саммари будет отправлено в указанное время
              </p>
            </div>

            {/* Каналы уведомлений */}
            <div className="space-y-4 pl-8">
              <h4 className="text-sm font-medium">Каналы уведомлений</h4>

              {/* Email */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="email-notifications" className="text-sm">
                      Email
                    </Label>
                    <p className="text-xs text-muted-foreground">Получать уведомления на почту</p>
                  </div>
                </div>
                <Switch id="email-notifications" checked={false} disabled />
              </div>

              {/* Telegram */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="telegram-notifications" className="text-sm">
                      Telegram
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {hasTelegramAccount
                        ? "Получать уведомления в Telegram"
                        : "Привяжите Telegram для получения уведомлений"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="telegram-notifications"
                  checked={telegramEnabled}
                  onCheckedChange={setTelegramEnabled}
                  disabled={!hasTelegramAccount}
                />
              </div>
            </div>

            {/* Типы уведомлений */}
            <div className="space-y-4 pl-8">
              <h4 className="text-sm font-medium">О чём уведомлять</h4>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-summary" className="text-sm">
                    Новые саммари
                  </Label>
                  <p className="text-xs text-muted-foreground">Когда сгенерирован новый дайджест</p>
                </div>
                <Switch
                  id="notify-summary"
                  checked={notifyOnSummary}
                  onCheckedChange={setNotifyOnSummary}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="notify-posts" className="text-sm">
                    Важные посты
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Срочные новости по избранным темам
                  </p>
                </div>
                <Switch
                  id="notify-posts"
                  checked={notifyOnPosts}
                  onCheckedChange={setNotifyOnPosts}
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
