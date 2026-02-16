import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

/**
 * Кэшированное получение саммари по периоду
 *
 * Кэш обновляется каждый час или при инвалидации тега "summary"
 */
export const getCachedSummary = unstable_cache(
  async (userId: string, period: string) => {
    return await db.summary.findFirst({
      where: { userId, period },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            url: true,
            channel: {
              select: { name: true },
            },
          },
        },
      },
    });
  },
  ["summary"],
  {
    revalidate: 3600, // 1 час
    tags: ["summary"],
  }
);

/**
 * Кэшированное получение последнего саммари пользователя
 */
export const getCachedLatestSummary = unstable_cache(
  async (userId: string) => {
    return await db.summary.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            url: true,
            channel: {
              select: { name: true },
            },
          },
        },
      },
    });
  },
  ["latest-summary"],
  {
    revalidate: 1800, // 30 минут
    tags: ["summary"],
  }
);

/**
 * Кэшированное получение списка саммари пользователя
 */
export const getCachedSummaries = unstable_cache(
  async (userId: string, limit: number = 10, offset: number = 0) => {
    return await db.summary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        topics: true,
        period: true,
        createdAt: true,
        _count: {
          select: { posts: true },
        },
      },
    });
  },
  ["summaries-list"],
  {
    revalidate: 1800, // 30 минут
    tags: ["summary"],
  }
);

/**
 * Кэшированный подсчет саммари пользователя
 */
export const getCachedSummariesCount = unstable_cache(
  async (userId: string) => {
    return await db.summary.count({
      where: { userId },
    });
  },
  ["summaries-count"],
  {
    revalidate: 3600,
    tags: ["summary"],
  }
);

/**
 * Кэшированное получение саммари по ID
 */
export const getCachedSummaryById = unstable_cache(
  async (summaryId: string) => {
    return await db.summary.findUnique({
      where: { id: summaryId },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            content: true,
            url: true,
            publishedAt: true,
            channel: {
              select: { name: true, sourceType: true },
            },
          },
          orderBy: { publishedAt: "desc" },
        },
        user: {
          select: { name: true },
        },
      },
    });
  },
  ["summary-detail"],
  {
    revalidate: 3600,
    tags: ["summary"],
  }
);

/**
 * Кэшированная статистика саммари для дашборда
 */
export const getCachedSummaryStats = unstable_cache(
  async (userId: string) => {
    const [totalSummaries, totalPosts, topTopics] = await Promise.all([
      db.summary.count({ where: { userId } }),
      db.post.count({ where: { channel: { userId } } }),
      db.summary.findMany({
        where: { userId },
        select: { topics: true },
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // Подсчет популярных тем
    const topicCounts: Record<string, number> = {};
    for (const summary of topTopics) {
      for (const topic of summary.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const sortedTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      totalSummaries,
      totalPosts,
      topTopics: sortedTopics,
    };
  },
  ["summary-stats"],
  {
    revalidate: 1800,
    tags: ["summary", "posts"],
  }
);
