import { Suspense } from "react";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Header } from "@/components/dashboard/header";
import { EmptyState } from "@/components/empty/empty-state";
import { SummaryCard } from "@/components/summaries/summary-card";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    period?: string;
    topic?: string;
  }>;
}

async function getSummaries(userId: string, page: number, period?: string, topic?: string) {
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: {
    userId: string;
    period?: { startsWith: string };
    topics?: { has: string } | { hasSome: string[] };
  } = { userId };

  if (period === "daily") {
    where.period = { startsWith: "daily-" };
  } else if (period === "weekly") {
    where.period = { startsWith: "weekly-" };
  } else if (period === "monthly") {
    where.period = { startsWith: "monthly-" };
  }

  // Обработка фильтра "Мои темы"
  if (topic === "_my") {
    const preferences = await db.userPreferences.findUnique({
      where: { userId },
      select: { topics: true },
    });
    if (preferences?.topics && preferences.topics.length > 0) {
      where.topics = { hasSome: preferences.topics };
    }
  } else if (topic) {
    where.topics = { has: topic };
  }

  const [summaries, total] = await Promise.all([
    db.summary.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    db.summary.count({ where }),
  ]);

  return {
    summaries,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getTopicsData(userId: string) {
  const [summaries, preferences] = await Promise.all([
    db.summary.findMany({
      where: { userId },
      select: { topics: true },
    }),
    db.userPreferences.findUnique({
      where: { userId },
      select: { topics: true },
    }),
  ]);

  const topicsMap = new Map<string, number>();
  summaries.forEach((s) => {
    s.topics.forEach((t) => {
      topicsMap.set(t, (topicsMap.get(t) || 0) + 1);
    });
  });

  const allTopics = Array.from(topicsMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([topic, count]) => ({ topic, count }));

  return {
    allTopics,
    userTopics: preferences?.topics || [],
  };
}

function SummarySkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-48" />
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14" />
          <Skeleton className="h-5 w-18" />
          <Skeleton className="h-5 w-12" />
        </div>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

async function SummariesList({
  userId,
  page,
  period,
  topic,
}: {
  userId: string;
  page: number;
  period?: string;
  topic?: string;
}) {
  const { summaries, pagination } = await getSummaries(userId, page, period, topic);

  if (summaries.length === 0) {
    return (
      <EmptyState
        iconName="file-text"
        title="Нет саммари"
        description="Саммари появятся после генерации на главной странице или автоматически по расписанию"
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <SummaryCard key={summary.id} summary={summary} />
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {page > 1 && (
            <Link
              href={`/dashboard/summaries?page=${page - 1}${period ? `&period=${period}` : ""}${topic ? `&topic=${topic}` : ""}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Назад
            </Link>
          )}
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Страница {page} из {pagination.totalPages}
          </span>
          {page < pagination.totalPages && (
            <Link
              href={`/dashboard/summaries?page=${page + 1}${period ? `&period=${period}` : ""}${topic ? `&topic=${topic}` : ""}`}
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              Далее
            </Link>
          )}
        </div>
      )}
    </>
  );
}

async function TopicsFilter({ userId, currentTopic }: { userId: string; currentTopic?: string }) {
  const { allTopics, userTopics } = await getTopicsData(userId);

  if (allTopics.length === 0) return null;

  // Разделяем на пользовательские темы и остальные
  const userTopicsWithCount = allTopics.filter((t) => userTopics.includes(t.topic));
  const otherTopics = allTopics.filter((t) => !userTopics.includes(t.topic));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Link
          href="/dashboard/summaries"
          className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
            !currentTopic ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
          }`}
        >
          Все
        </Link>
        {userTopics.length > 0 && (
          <Link
            href="/dashboard/summaries?topic=_my"
            className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
              currentTopic === "_my"
                ? "bg-primary text-primary-foreground"
                : "bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50"
            }`}
          >
            Мои темы
          </Link>
        )}
        {userTopicsWithCount.map(({ topic, count }) => (
          <Link
            key={topic}
            href={`/dashboard/summaries?topic=${encodeURIComponent(topic)}`}
            className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
              currentTopic === topic
                ? "bg-primary text-primary-foreground"
                : "bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/30"
            }`}
          >
            {topic}
            <span className="ml-1 text-xs opacity-70">({count})</span>
          </Link>
        ))}
        {otherTopics.map(({ topic, count }) => (
          <Link
            key={topic}
            href={`/dashboard/summaries?topic=${encodeURIComponent(topic)}`}
            className={`inline-flex items-center justify-center rounded-full text-sm font-medium transition-colors px-3 py-1 ${
              currentTopic === topic
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            {topic}
            <span className="ml-1 text-xs opacity-70">({count})</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default async function SummariesPage({ searchParams }: PageProps) {
  const session = await auth();
  const userId = session!.user!.id!;

  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const period = params.period;
  const topic = params.topic;

  return (
    <div className="flex flex-col h-full">
      <Header title="Саммари" />
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Саммари</h2>
          <p className="text-sm text-muted-foreground mb-4">Автоматически сгенерированные сводки</p>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex gap-2">
              <Link
                href="/dashboard/summaries"
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5 ${
                  !period ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                }`}
              >
                Все
              </Link>
              <Link
                href="/dashboard/summaries?period=daily"
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5 ${
                  period === "daily"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                День
              </Link>
              <Link
                href="/dashboard/summaries?period=weekly"
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5 ${
                  period === "weekly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                Неделя
              </Link>
              <Link
                href="/dashboard/summaries?period=monthly"
                className={`inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors px-3 py-1.5 ${
                  period === "monthly"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                }`}
              >
                Месяц
              </Link>
            </div>
          </div>

          <Suspense fallback={<Skeleton className="h-8 w-full" />}>
            <TopicsFilter userId={userId} currentTopic={topic} />
          </Suspense>
        </div>

        <Suspense
          fallback={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SummarySkeleton key={i} />
              ))}
            </div>
          }
        >
          <SummariesList userId={userId} page={page} period={period} topic={topic} />
        </Suspense>
      </div>
    </div>
  );
}
