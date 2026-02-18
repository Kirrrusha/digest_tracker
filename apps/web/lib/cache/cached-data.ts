import { unstable_cache } from "next/cache";
import { endOfDay, startOfDay, subDays } from "date-fns";

import { db } from "@/lib/db";

import { CACHE_KEYS, CACHE_TTL, getCachedData } from "./redis";

/**
 * Кэшированная статистика пользователя
 */
export async function getCachedUserStats(userId: string) {
  return getCachedData(
    CACHE_KEYS.userStats(userId),
    async () => {
      const today = new Date();
      const yesterday = subDays(today, 1);
      const [channelsCount, postsCount, summariesCount, todayPostsCount, yesterdayPostsCount] =
        await Promise.all([
          db.channel.count({ where: { userId, isActive: true } }),
          db.post.count({ where: { channel: { userId } } }),
          db.summary.count({ where: { userId } }),
          db.post.count({
            where: {
              channel: { userId },
              publishedAt: {
                gte: startOfDay(today),
                lte: endOfDay(today),
              },
            },
          }),
          db.post.count({
            where: {
              channel: { userId },
              publishedAt: {
                gte: startOfDay(yesterday),
                lte: endOfDay(yesterday),
              },
            },
          }),
        ]);

      return { channelsCount, postsCount, summariesCount, todayPostsCount, yesterdayPostsCount };
    },
    CACHE_TTL.MEDIUM
  );
}

/**
 * Кэшированные каналы пользователя
 */
export async function getCachedUserChannels(userId: string) {
  return getCachedData(
    CACHE_KEYS.userChannels(userId),
    async () => {
      const channels = await db.channel.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { posts: true } },
          posts: {
            orderBy: { publishedAt: "desc" },
            take: 1,
            select: { publishedAt: true },
          },
        },
      });

      return channels.map((channel) => ({
        id: channel.id,
        name: channel.name,
        sourceUrl: channel.sourceUrl,
        sourceType: channel.sourceType,
        description: channel.description,
        imageUrl: channel.imageUrl,
        isActive: channel.isActive,
        tags: channel.tags,
        postsCount: channel._count.posts,
        lastPostAt: channel.posts[0]?.publishedAt || null,
      }));
    },
    CACHE_TTL.MEDIUM
  );
}

/**
 * Кэшированный саммари за сегодня
 */
export async function getCachedTodaySummary(userId: string) {
  const today = new Date().toISOString().split("T")[0];
  const period = `daily-${today}`;

  return getCachedData(
    CACHE_KEYS.todaySummary(userId),
    async () => {
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
    },
    CACHE_TTL.MEDIUM
  );
}

/**
 * Кэшированные последние посты пользователя
 */
export const getCachedRecentPosts = unstable_cache(
  async (userId: string, limit: number = 10) => {
    return db.post.findMany({
      where: { channel: { userId } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        contentPreview: true,
        url: true,
        publishedAt: true,
        channel: {
          select: {
            id: true,
            name: true,
            sourceType: true,
            tags: true,
          },
        },
      },
    });
  },
  ["recent-posts"],
  { revalidate: 300, tags: ["posts"] }
);

/**
 * Получение постов с фильтрацией по тегам каналов
 */
export async function getFilteredPosts(
  userId: string,
  options: {
    tags?: string[];
    useUserPreferences?: boolean;
    limit?: number;
  } = {}
) {
  const { tags, useUserPreferences = false, limit = 20 } = options;

  let filterTags = tags;

  // Если нужно использовать предпочтения пользователя
  if (!filterTags && useUserPreferences) {
    const preferences = await db.userPreferences.findUnique({
      where: { userId },
      select: { topics: true },
    });
    filterTags = preferences?.topics;
  }

  // Формируем условие для фильтрации каналов по тегам
  const channelWhere: { userId: string; tags?: { hasSome: string[] } } = { userId };
  if (filterTags && filterTags.length > 0) {
    channelWhere.tags = { hasSome: filterTags };
  }

  return db.post.findMany({
    where: { channel: channelWhere },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true,
      title: true,
      contentPreview: true,
      url: true,
      publishedAt: true,
      channel: {
        select: {
          id: true,
          name: true,
          sourceType: true,
          tags: true,
        },
      },
    },
  });
}

/**
 * Кэшированные последние саммари пользователя
 */
export const getCachedRecentSummaries = unstable_cache(
  async (userId: string, limit: number = 10) => {
    return db.summary.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        topics: true,
        period: true,
        createdAt: true,
      },
    });
  },
  ["recent-summaries"],
  { revalidate: 300, tags: ["summaries"] }
);

/**
 * Кэшированные топ-темы пользователя
 */
export async function getCachedTopTopics(userId: string, limit: number = 10) {
  return getCachedData(
    `user:${userId}:top-topics`,
    async () => {
      const summaries = await db.summary.findMany({
        where: { userId },
        select: { topics: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      const topicCounts = new Map<string, number>();
      summaries.forEach((s) => {
        s.topics.forEach((t) => {
          topicCounts.set(t, (topicCounts.get(t) || 0) + 1);
        });
      });

      return Array.from(topicCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([topic, count]) => ({ topic, count }));
    },
    CACHE_TTL.LONG
  );
}

/**
 * Кэшированная активность за неделю
 */
export async function getCachedWeeklyActivity(userId: string) {
  return getCachedData(
    `user:${userId}:weekly-activity`,
    async () => {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const postsCount = await db.post.count({
          where: {
            channel: { userId },
            publishedAt: {
              gte: startOfDay(date),
              lte: endOfDay(date),
            },
          },
        });
        days.push({
          date: date.toISOString().split("T")[0],
          posts: postsCount,
        });
      }
      return days;
    },
    CACHE_TTL.LONG
  );
}
