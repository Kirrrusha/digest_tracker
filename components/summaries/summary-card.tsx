import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{summary.title}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isDaily ? "default" : isWeekly ? "secondary" : "outline"}>
                {isDaily ? "Дневной" : isWeekly ? "Недельный" : "Другой"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {format(summary.createdAt, "d MMM yyyy, HH:mm", { locale: ru })}
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {summary.topics.slice(0, 5).map((topic) => (
            <Badge key={topic} variant="outline" className="text-xs">
              {topic}
            </Badge>
          ))}
          {summary.topics.length > 5 && (
            <Badge variant="outline" className="text-xs">
              +{summary.topics.length - 5}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-3">{summary.content}</p>
        <Link href={`/dashboard/summaries/${summary.id}`}>
          <Button variant="ghost" size="sm">
            Читать полностью
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
