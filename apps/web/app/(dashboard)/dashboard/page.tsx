import { Suspense } from "react";
import Link from "next/link";
import { Bookmark, ExternalLink } from "lucide-react";

import { auth } from "@/lib/auth";
import {
  getCachedRecentPosts,
  getCachedTodaySummary,
  getCachedTopTopics,
  getCachedUserStats,
} from "@/lib/cache";
import { Header } from "@/components/dashboard/header";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { TopicStatsGrid } from "@/components/dashboard/topic-stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-14" />
        </div>
        <Skeleton className="h-20 w-full" />
      </CardContent>
    </Card>
  );
}

function TopicStatsSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-40" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
      {[1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

async function SummarySection({ userId }: { userId: string }) {
  const [summary, stats] = await Promise.all([
    getCachedTodaySummary(userId),
    getCachedUserStats(userId),
  ]);

  return (
    <TodaySummary
      summary={summary}
      postsCount={stats.todayPostsCount}
      yesterdayPostsCount={stats.yesterdayPostsCount}
    />
  );
}

const TOPIC_COLORS = ["blue", "green", "purple", "orange"] as const;

async function TopicStatsSection({ userId }: { userId: string }) {
  const topTopics = await getCachedTopTopics(userId, 8);
  const topics = topTopics.map(({ topic, count }, i) => ({
    name: topic,
    count,
    color: TOPIC_COLORS[i % TOPIC_COLORS.length],
  }));

  return <TopicStatsGrid topics={topics} />;
}

interface Post {
  id: string;
  title: string | null;
  contentPreview: string | null;
  url: string | null;
  publishedAt: Date;
  channel: {
    id: string;
    name: string;
    sourceType: string;
    tags: string[];
  };
}

function PostItem({ post }: { post: Post }) {
  const tags = post.channel.tags?.length
    ? post.channel.tags
    : post.channel.name.toLowerCase().includes("react")
      ? ["React"]
      : post.channel.name.toLowerCase().includes("typescript")
        ? ["TypeScript"]
        : post.channel.name.toLowerCase().includes("node")
          ? ["Node.js"]
          : ["Updates"];

  const timeAgo = getTimeAgo(post.publishedAt);

  const displayTitle =
    post.title || post.contentPreview?.split("\n")[0]?.slice(0, 120) || "Без заголовка";
  const preview =
    !post.title && post.contentPreview
      ? post.contentPreview.split("\n").slice(1).join(" ").trim().slice(0, 200)
      : null;

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
            {post.channel.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{post.channel.name}</p>
            {post.url ? (
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sm hover:underline line-clamp-2"
              >
                {displayTitle}
              </a>
            ) : (
              <span className="font-medium text-sm line-clamp-2">{displayTitle}</span>
            )}
            {preview && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{preview}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">{timeAgo}</span>
              <span className="text-muted-foreground">·</span>
              <div className="flex gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Bookmark size={16} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) return `${diffMins} мин. назад`;
  if (diffHours < 24) return `${diffHours} ч. назад`;
  if (diffDays === 1) return "вчера";
  return `${diffDays} дн. назад`;
}

async function PostsSection({ userId }: { userId: string }) {
  const posts = await getCachedRecentPosts(userId, 5);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Последние посты</h2>
        <Link
          href="/dashboard/channels"
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Показать всё
          <ExternalLink size={14} />
        </Link>
      </div>
      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostItem key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Нет постов. Добавьте каналы для отслеживания.</p>
            <Link href="/dashboard/channels">
              <Button variant="outline" className="mt-4">
                Добавить каналы
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <div className="flex flex-col h-full">
      <Header title="Последняя сводка" />
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        {/* Summary Section */}
        <Suspense fallback={<SummarySkeleton />}>
          <SummarySection userId={userId} />
        </Suspense>

        {/* Topic Stats Section */}
        <Suspense fallback={<TopicStatsSkeleton />}>
          <TopicStatsSection userId={userId} />
        </Suspense>

        {/* Recent Posts Section */}
        <Suspense fallback={<PostsSkeleton />}>
          <PostsSection userId={userId} />
        </Suspense>
      </div>
    </div>
  );
}
