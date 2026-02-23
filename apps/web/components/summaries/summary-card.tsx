"use client";

import { useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Download, Share2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6} /g, "")
    .replace(/\*{1,2}([^*\n]+)\*{1,2}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*+] /gm, "")
    .replace(/\n{2,}/g, " ")
    .trim();
}

const TOPIC_COLORS: Record<string, string> = {
  React: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  "Node.js": "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  TypeScript: "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  DevOps: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
  CSS: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  JavaScript: "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30",
};

function getTopicBadgeClass(topic: string): string {
  return TOPIC_COLORS[topic] ?? "bg-muted text-muted-foreground border-muted-foreground/30";
}

interface SummaryCardProps {
  summary: {
    id: string;
    title: string;
    content: string;
    topics: string[];
    period: string;
    createdAt: Date;
  };
}

export function SummaryCard({ summary }: SummaryCardProps) {
  const isDaily = summary.period.startsWith("daily-");
  const isWeekly = summary.period.startsWith("weekly-");
  const isMonthly = summary.period.startsWith("monthly-");

  const periodLabel = isDaily
    ? "Дневной"
    : isWeekly
      ? "Недельный"
      : isMonthly
        ? "Месячный"
        : "Другой";

  const handleShare = useCallback(async () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/summaries/${summary.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: summary.title,
          text: summary.content.slice(0, 200) + "...",
          url,
        });
      } catch {
        await navigator.clipboard.writeText(url);
      }
    } else {
      await navigator.clipboard.writeText(url);
    }
  }, [summary.id, summary.title, summary.content]);

  const handleDownload = useCallback(() => {
    const blob = new Blob(
      [
        `# ${summary.title}\n\n${format(summary.createdAt, "d MMMM yyyy", { locale: ru })}\n\n${summary.content}`,
      ],
      { type: "text/markdown" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${summary.title.replace(/\s+/g, "-")}-${format(summary.createdAt, "yyyy-MM-dd", { locale: ru })}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [summary]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-base">{summary.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isDaily ? "default" : isWeekly ? "secondary" : "outline"}>
                {periodLabel}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(summary.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {summary.topics.slice(0, 5).map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className={cn("text-xs", getTopicBadgeClass(topic))}
            >
              {topic}
            </Badge>
          ))}
          {summary.topics.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{summary.topics.length - 5}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {stripMarkdown(summary.content)}
        </p>
        <Link href={`/dashboard/summaries/${summary.id}`}>
          <Button variant="ghost" size="sm">
            Читать полностью
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
