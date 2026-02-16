"use client";

import { useState, useTransition } from "react";
import { Calendar, Check, Globe, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updateLanguage, updateSummaryInterval } from "@/app/actions/preferences";

import { TopicsManagement } from "./topics-management";

interface PreferencesSettingsProps {
  preferences: {
    topics: string[];
    summaryInterval: string;
    language: string;
  };
}

export function PreferencesSettings({ preferences }: PreferencesSettingsProps) {
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Интервал саммари
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

      <TopicsManagement topics={preferences.topics} />
    </div>
  );
}
