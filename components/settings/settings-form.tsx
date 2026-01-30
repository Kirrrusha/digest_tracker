"use client";

import { useState, useTransition } from "react";
import { Loader2, Check, X, Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  updateTopics,
  updateSummaryInterval,
  updateLanguage,
  updateNotificationSettings,
} from "@/app/actions/preferences";

const SUGGESTED_TOPICS = [
  "React",
  "TypeScript",
  "Next.js",
  "Node.js",
  "JavaScript",
  "Python",
  "Go",
  "Rust",
  "DevOps",
  "Kubernetes",
  "Docker",
  "AWS",
  "AI/ML",
  "Web3",
  "Security",
  "Performance",
];

interface SettingsFormProps {
  user: {
    name: string | null;
    email: string | null;
  } | null;
  preferences: {
    topics: string[];
    summaryInterval: string;
    language: string;
    notificationsEnabled: boolean;
    notificationTime: string | null;
  };
}

export function SettingsForm({ user, preferences }: SettingsFormProps) {
  const [topics, setTopics] = useState<string[]>(preferences.topics);
  const [newTopic, setNewTopic] = useState("");
  const [interval, setInterval] = useState(preferences.summaryInterval);
  const [language, setLanguage] = useState(preferences.language);
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    preferences.notificationsEnabled
  );
  const [notificationTime, setNotificationTime] = useState(
    preferences.notificationTime || "20:00"
  );

  const [isPendingTopics, startTopicsTransition] = useTransition();
  const [isPendingInterval, startIntervalTransition] = useTransition();
  const [isPendingLanguage, startLanguageTransition] = useTransition();
  const [isPendingNotifications, startNotificationsTransition] = useTransition();

  const addTopic = (topic: string) => {
    if (topic && !topics.includes(topic)) {
      const newTopics = [...topics, topic];
      setTopics(newTopics);
      startTopicsTransition(async () => {
        await updateTopics(newTopics);
      });
    }
    setNewTopic("");
  };

  const removeTopic = (topic: string) => {
    const newTopics = topics.filter((t) => t !== topic);
    setTopics(newTopics);
    startTopicsTransition(async () => {
      await updateTopics(newTopics);
    });
  };

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    startIntervalTransition(async () => {
      await updateSummaryInterval(newInterval);
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    startLanguageTransition(async () => {
      await updateLanguage(newLanguage);
    });
  };

  const handleNotificationsChange = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    startNotificationsTransition(async () => {
      await updateNotificationSettings({
        enabled,
        time: enabled ? notificationTime : undefined,
      });
    });
  };

  const handleNotificationTimeChange = (time: string) => {
    setNotificationTime(time);
    if (notificationsEnabled) {
      startNotificationsTransition(async () => {
        await updateNotificationSettings({
          enabled: true,
          time,
        });
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
          <CardDescription>Информация о вашем аккаунте</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Имя</Label>
            <Input value={user?.name || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Интересующие темы
            {isPendingTopics && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            Выберите темы для персонализации саммари
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {topics.map((topic) => (
              <Badge
                key={topic}
                variant="secondary"
                className="cursor-pointer"
                onClick={() => removeTopic(topic)}
              >
                {topic}
                <X className="ml-1 h-3 w-3" />
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Добавить тему..."
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTopic(newTopic);
                }
              }}
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => addTopic(newTopic)}
              disabled={!newTopic}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Популярные темы:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_TOPICS.filter((t) => !topics.includes(t)).map(
                (topic) => (
                  <Badge
                    key={topic}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted"
                    onClick={() => addTopic(topic)}
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    {topic}
                  </Badge>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Генерация саммари
            {isPendingInterval && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            Как часто генерировать автоматические саммари
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={interval === "daily" ? "default" : "outline"}
              onClick={() => handleIntervalChange("daily")}
            >
              {interval === "daily" && <Check className="mr-2 h-4 w-4" />}
              Ежедневно
            </Button>
            <Button
              variant={interval === "weekly" ? "default" : "outline"}
              onClick={() => handleIntervalChange("weekly")}
            >
              {interval === "weekly" && <Check className="mr-2 h-4 w-4" />}
              Еженедельно
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Язык
            {isPendingLanguage && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>Язык интерфейса и саммари</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={language === "ru" ? "default" : "outline"}
              onClick={() => handleLanguageChange("ru")}
            >
              {language === "ru" && <Check className="mr-2 h-4 w-4" />}
              Русский
            </Button>
            <Button
              variant={language === "en" ? "default" : "outline"}
              onClick={() => handleLanguageChange("en")}
            >
              {language === "en" && <Check className="mr-2 h-4 w-4" />}
              English
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Уведомления
            {isPendingNotifications && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>
            Настройки уведомлений о новых саммари
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              onClick={() => handleNotificationsChange(true)}
            >
              {notificationsEnabled && <Check className="mr-2 h-4 w-4" />}
              Включены
            </Button>
            <Button
              variant={!notificationsEnabled ? "default" : "outline"}
              onClick={() => handleNotificationsChange(false)}
            >
              {!notificationsEnabled && <Check className="mr-2 h-4 w-4" />}
              Отключены
            </Button>
          </div>

          {notificationsEnabled && (
            <div className="space-y-2">
              <Label>Время уведомления</Label>
              <Input
                type="time"
                value={notificationTime}
                onChange={(e) => handleNotificationTimeChange(e.target.value)}
                className="w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
