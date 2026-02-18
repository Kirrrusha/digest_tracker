import { Suspense } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { EmptyState } from "@/components/empty/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    channel?: string;
  }>;
}

async function getPosts(userId: string, page: number, channelId?: string) {
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    channel: { userId },
    ...(channelId ? { channelId } : {}),
  };

  const [posts, total] = await Promise.all([
    db.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
      include: {
        channel: {
          select: { id: true, name: true, sourceType: true },
        },
      },
    }),
    db.post.count({ where }),
  ]);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getUserChannels(userId: string) {
  return db.channel.findMany({
    where: { userId, isActive: true },
    select: { id: true, name: true, sourceType: true },
    orderBy: { name: "asc" },
  });
}

function PostSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-12 w-full" />
      </CardContent>
    </Card>
  );
}

async function PostsList({
  userId,
  page,
  channelId,
}: {
  userId: string;
  page: number;
  channelId?: string;
}) {
  const { posts, pagination } = await getPosts(userId, page, channelId);

  if (posts.length === 0) {
    return (
      <EmptyState
        iconName="inbox"
        title="Нет постов"
        description="Посты появятся после добавления каналов и обновления"
      />
    );
  }

  return (
    <>
      <div className="space-y-3">
        {posts.map((post) => {
          const displayTitle = post.title || post.contentPreview?.split("\n")[0]?.slice(0, 120);
          const preview = post.contentPreview
            ? (post.title
                ? post.contentPreview
                : post.contentPreview.split("\n").slice(1).join(" ").trim()
              ).slice(0, 300)
            : null;
          const sourceLabel =
            post.channel.sourceType === "telegram" || post.channel.sourceType === "telegram_mtproto"
              ? "TG"
              : "RSS";

          return (
            <Link key={post.id} href={`/dashboard/posts/${post.id}`} className="block">
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge variant="outline" className="text-xs">
                      {sourceLabel}
                    </Badge>
                    <span className="text-sm font-medium text-muted-foreground">
                      {post.channel.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {format(post.publishedAt, "d MMM yyyy, HH:mm", {
                        locale: ru,
                      })}
                    </span>
                    {post.url && (
                      <a
                        href={post.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Источник
                      </a>
                    )}
                  </div>
                  {displayTitle && <p className="font-medium line-clamp-2 mb-1">{displayTitle}</p>}
                  {preview && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{preview}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/dashboard/posts?page=${page - 1}${channelId ? `&channel=${channelId}` : ""}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Назад
            </Link>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Страница {page} из {pagination.totalPages}
          </span>
          {page < pagination.totalPages && (
            <Link
              href={`/dashboard/posts?page=${page + 1}${channelId ? `&channel=${channelId}` : ""}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Далее
            </Link>
          )}
        </div>
      )}
    </>
  );
}

async function ChannelFilter({
  userId,
  currentChannel,
}: {
  userId: string;
  currentChannel?: string;
}) {
  const channels = await getUserChannels(userId);

  if (channels.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/dashboard/posts"
        className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
          !currentChannel ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
        }`}
      >
        Все каналы
      </Link>
      {channels.map((channel) => (
        <Link
          key={channel.id}
          href={`/dashboard/posts?channel=${channel.id}`}
          className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
            currentChannel === channel.id
              ? "bg-primary text-primary-foreground"
              : "bg-muted hover:bg-muted/80"
          }`}
        >
          {channel.name}
        </Link>
      ))}
    </div>
  );
}

export default async function PostsPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const channel = params.channel;

  return (
    <div className="flex flex-col h-full">
      <Header title="Посты" />
      <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Все посты</h2>
          <p className="text-sm text-muted-foreground mb-4">Посты из ваших каналов</p>

          <Suspense fallback={<Skeleton className="h-8 w-full" />}>
            <ChannelFilter userId={userId} currentChannel={channel} />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          }
        >
          <PostsList userId={userId} page={page} channelId={channel} />
        </Suspense>
      </div>
    </div>
  );
}
