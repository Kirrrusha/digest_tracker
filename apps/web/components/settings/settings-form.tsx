"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, Globe, Loader2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLanguage, updateSummaryInterval } from "@/app/actions/preferences";

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
  const [interval, setInterval] = useState(preferences.summaryInterval);
  const [language, setLanguage] = useState(preferences.language);

  const [isPendingInterval, startIntervalTransition] = useTransition();
  const [isPendingLanguage, startLanguageTransition] = useTransition();

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

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Профиль
          </CardTitle>
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
            <Calendar className="h-5 w-5" />
            Генерация саммари
            {isPendingInterval && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </CardTitle>
          <CardDescription>Как часто генерировать автоматические саммари</CardDescription>
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
            <Globe className="h-5 w-5" />
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
    </>
  );
}
