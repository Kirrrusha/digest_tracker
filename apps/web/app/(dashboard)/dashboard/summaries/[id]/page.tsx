import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Calendar, ExternalLink, Tag } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getSummary(summaryId: string, userId: string) {
  return db.summary.findFirst({
    where: { id: summaryId, userId },
    include: {
      posts: {
        include: {
          channel: {
            select: { name: true, sourceType: true },
          },
        },
      },
    },
  });
}

export default async function SummaryDetailPage({ params }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const { id } = await params;
  const summary = await getSummary(id, userId);

  if (!summary) {
    notFound();
  }

  const isDaily = summary.period.startsWith("daily-");
  const isWeekly = summary.period.startsWith("weekly-");
  console.log("summary", summary);
  return (
    <div className="flex flex-col h-full">
      <Header title="Саммари" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Link href="/dashboard/summaries">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к списку
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{summary.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(summary.createdAt, "d MMMM yyyy, HH:mm", { locale: ru })}
                  </div>
                  <Badge variant={isDaily ? "default" : isWeekly ? "secondary" : "outline"}>
                    {isDaily ? "Дневной" : isWeekly ? "Недельный" : summary.period}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {summary.topics.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Темы</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topics.map((topic) => (
                    <Badge key={topic} variant="outline">
                      {topic}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator className="my-6" />

            <MarkdownContent content={summary.content} />
          </CardContent>
        </Card>

        {summary.posts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Источники ({summary.posts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary.posts.map((post) => {
                  const displayTitle =
                    post.title || post.contentPreview?.split("\n")[0]?.slice(0, 120);
                  const preview =
                    !post.title && post.contentPreview
                      ? post.contentPreview.split("\n").slice(1).join(" ").trim().slice(0, 200)
                      : post.contentPreview?.slice(0, 200);

                  return (
                    <div key={post.id} className="p-3 rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {post.channel.sourceType === "telegram" ||
                          post.channel.sourceType === "telegram_mtproto"
                            ? "TG"
                            : "RSS"}
                        </Badge>
                        <span className="text-sm font-medium">{post.channel.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(post.publishedAt, "d MMM, HH:mm", { locale: ru })}
                        </span>
                      </div>
                      {displayTitle && (
                        <p className="text-sm font-medium line-clamp-2">{displayTitle}</p>
                      )}
                      {preview && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{preview}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {post.url && (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Открыть в Telegram
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
