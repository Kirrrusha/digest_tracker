"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateDailySummaryAction } from "@/app/actions/summaries";

interface TodaySummaryProps {
  summary: {
    id: string;
    title: string;
    content: string;
    topics: string[];
    createdAt: Date;
  } | null;
  postsCount: number;
}

export function TodaySummary({ summary, postsCount }: TodaySummaryProps) {
  const [isPending, startTransition] = useTransition();
  const [localSummary, setLocalSummary] = useState(summary);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = () => {
    setError(null);
    startTransition(async () => {
      const result = await generateDailySummaryAction();
      if (result.success && result.data) {
        setLocalSummary({
          id: result.data.id,
          title: result.data.title,
          content: result.data.content,
          topics: result.data.topics,
          createdAt: result.data.createdAt,
        });
      } else if (!result.success) {
        setError(result.error || "Произошла ошибка");
      }
    });
  };

  const today = format(new Date(), "d MMMM yyyy", { locale: ru });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Саммари за сегодня
        </CardTitle>
        <CardDescription>{today}</CardDescription>
      </CardHeader>
      <CardContent>
        {localSummary ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {localSummary.topics.slice(0, 5).map((topic) => (
                <Badge key={topic} variant="secondary">
                  {topic}
                </Badge>
              ))}
            </div>
            <p className="text-muted-foreground line-clamp-4">{localSummary.content}</p>
            <Link href={`/dashboard/summaries/${localSummary.id}`}>
              <Button variant="outline" size="sm">
                Читать полностью
              </Button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-6">
            {postsCount > 0 ? (
              <>
                <p className="text-muted-foreground mb-4">{postsCount} постов готовы к анализу</p>
                {error && <p className="text-destructive text-sm mb-4">{error}</p>}
                <Button onClick={handleGenerate} disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Сгенерировать саммари
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                Нет постов для анализа. Добавьте каналы для получения контента.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
