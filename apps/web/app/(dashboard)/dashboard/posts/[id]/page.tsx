import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, Calendar, ExternalLink, Hash, User } from "lucide-react";

import { auth } from "@/lib/auth";
import { getPostContentWithRefetch } from "@/lib/cache/post-content";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getPost(postId: string, userId: string) {
  return db.post.findFirst({
    where: {
      id: postId,
      channel: { userId },
    },
    include: {
      channel: {
        select: { id: true, name: true, sourceType: true, sourceUrl: true },
      },
      summaries: {
        select: { id: true, title: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });
}

export default async function PostDetailPage({ params }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const { id } = await params;
  const post = await getPost(id, userId);

  if (!post) {
    notFound();
  }

  const sourceLabel =
    post.channel.sourceType === "telegram" || post.channel.sourceType === "telegram_mtproto"
      ? "Telegram"
      : "RSS";

  // Загружаем полный контент из Redis (с перезагрузкой из источника при необходимости)
  const fullContent = await getPostContentWithRefetch({
    id: post.id,
    externalId: post.externalId,
    channel: {
      sourceType: post.channel.sourceType,
      sourceUrl: post.channel.sourceUrl,
    },
  });

  return (
    <div className="flex flex-col h-full">
      <Header title="Пост" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <Link href="/dashboard/posts">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к постам
          </Button>
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {post.title && <CardTitle className="text-2xl mb-3">{post.title}</CardTitle>}
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="outline">{sourceLabel}</Badge>
                  <Link
                    href={`/dashboard/posts?channel=${post.channel.id}`}
                    className="font-medium hover:underline"
                  >
                    {post.channel.name}
                  </Link>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(post.publishedAt, "d MMMM yyyy, HH:mm", {
                      locale: ru,
                    })}
                  </div>
                  {post.author && (
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {post.author}
                    </div>
                  )}
                </div>
              </div>
              {post.url && (
                <a href={post.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Открыть в {sourceLabel}
                  </Button>
                </a>
              )}
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="pt-6">
            {fullContent ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                {fullContent}
              </div>
            ) : post.contentPreview ? (
              <div>
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
                  {post.contentPreview}
                </div>
                <p className="text-sm text-muted-foreground mt-4 italic">
                  Полный текст недоступен. Показано превью.
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">Контент недоступен</p>
            )}
          </CardContent>
        </Card>

        {post.summaries.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Hash className="h-5 w-5" />
                Саммари с этим постом ({post.summaries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {post.summaries.map((summary) => (
                  <Link
                    key={summary.id}
                    href={`/dashboard/summaries/${summary.id}`}
                    className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <p className="font-medium text-sm">{summary.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(summary.createdAt, "d MMMM yyyy, HH:mm", {
                        locale: ru,
                      })}
                    </p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
