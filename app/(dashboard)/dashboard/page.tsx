import { Suspense } from "react";
import { Rss, FileText, Clock, TrendingUp } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { TodaySummary } from "@/components/dashboard/today-summary";
import { RecentPosts } from "@/components/dashboard/recent-posts";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

async function getStats(userId: string) {
  const [channelsCount, postsCount, summariesCount, todayPostsCount] = await Promise.all([
    db.channel.count({ where: { userId, isActive: true } }),
    db.post.count({
      where: { channel: { userId } },
    }),
    db.summary.count({ where: { userId } }),
    db.post.count({
      where: {
        channel: { userId },
        publishedAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),
  ]);

  return { channelsCount, postsCount, summariesCount, todayPostsCount };
}

async function getTodaySummary(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const period = `daily-${today}`;

  return db.summary.findFirst({
    where: { userId, period },
    select: {
      id: true,
      title: true,
      content: true,
      topics: true,
      createdAt: true,
    },
  });
}

async function getRecentPosts(userId: string) {
  return db.post.findMany({
    where: { channel: { userId } },
    orderBy: { publishedAt: "desc" },
    take: 5,
    select: {
      id: true,
      title: true,
      content: true,
      url: true,
      publishedAt: true,
      channel: {
        select: {
          id: true,
          name: true,
          sourceType: true,
        },
      },
    },
  });
}

function StatsCardSkeleton() {
  return (
    <Card className="py-4">
      <CardContent className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

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

function PostsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4 mt-1" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

async function StatsSection({ userId }: { userId: string }) {
  const stats = await getStats(userId);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatsCard
        title="Активных каналов"
        value={stats.channelsCount}
        icon={Rss}
        description="Telegram и RSS"
      />
      <StatsCard
        title="Всего постов"
        value={stats.postsCount}
        icon={FileText}
      />
      <StatsCard
        title="Постов сегодня"
        value={stats.todayPostsCount}
        icon={Clock}
      />
      <StatsCard
        title="Саммари"
        value={stats.summariesCount}
        icon={TrendingUp}
        description="Сгенерировано"
      />
    </div>
  );
}

async function SummarySection({ userId }: { userId: string }) {
  const [summary, postsCount] = await Promise.all([
    getTodaySummary(userId),
    db.post.count({
      where: {
        channel: { userId },
        publishedAt: {
          gte: startOfDay(new Date()),
          lte: endOfDay(new Date()),
        },
      },
    }),
  ]);

  return <TodaySummary summary={summary} postsCount={postsCount} />;
}

async function PostsSection({ userId }: { userId: string }) {
  const posts = await getRecentPosts(userId);
  return <RecentPosts posts={posts} />;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  return (
    <div className="flex flex-col h-full">
      <Header title="Главная" />
      <div className="flex-1 p-6 space-y-6">
        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <StatsCardSkeleton key={i} />
              ))}
            </div>
          }
        >
          <StatsSection userId={userId} />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<SummarySkeleton />}>
            <SummarySection userId={userId} />
          </Suspense>

          <Suspense fallback={<PostsSkeleton />}>
            <PostsSection userId={userId} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
