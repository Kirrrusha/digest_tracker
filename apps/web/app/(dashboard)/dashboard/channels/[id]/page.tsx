import Link from "next/link";
import { notFound } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getChannelWithPosts(channelId: string, userId: string, page: number) {
  const limit = 20;
  const skip = (page - 1) * limit;

  const channel = await db.channel.findFirst({
    where: { id: channelId, userId },
  });

  if (!channel) {
    return null;
  }

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where: { channelId },
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
    }),
    db.post.count({ where: { channelId } }),
  ]);

  return {
    channel,
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export default async function ChannelDetailPage({ params, searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam || "1", 10));

  const data = await getChannelWithPosts(id, userId, page);

  if (!data) {
    notFound();
  }

  const { channel, posts, pagination } = data;

  return (
    <div className="flex flex-col h-full">
      <Header title={channel.name} />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <Link href="/dashboard/channels">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад к каналам
            </Button>
          </Link>

          <div className="flex items-start gap-4">
            {channel.imageUrl ? (
              <img
                src={channel.imageUrl}
                alt={channel.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {channel.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-xl font-semibold">{channel.name}</h2>
                <Badge variant="outline">
                  {channel.sourceType === "telegram" ? "Telegram" : "RSS"}
                </Badge>
                {!channel.isActive && <Badge variant="secondary">Отключен</Badge>}
              </div>
              {channel.description && (
                <p className="text-muted-foreground">{channel.description}</p>
              )}
              <a
                href={channel.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
              >
                {channel.sourceUrl}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Всего постов: {pagination.total}</p>
        </div>

        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Нет постов. Попробуйте обновить канал.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="py-4">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {post.title && <h3 className="font-medium mb-1">{post.title}</h3>}
                      {post.contentPreview && (
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {post.contentPreview}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        {post.author && <span>{post.author}</span>}
                        <span>
                          {formatDistanceToNow(post.publishedAt, {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground shrink-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            {page > 1 && (
              <Link href={`/dashboard/channels/${id}?page=${page - 1}`}>
                <Button variant="outline">Назад</Button>
              </Link>
            )}
            <span className="flex items-center px-4 text-sm text-muted-foreground">
              Страница {page} из {pagination.totalPages}
            </span>
            {page < pagination.totalPages && (
              <Link href={`/dashboard/channels/${id}?page=${page + 1}`}>
                <Button variant="outline">Далее</Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
