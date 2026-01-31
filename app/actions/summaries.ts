"use server";

import { revalidatePath } from "next/cache";

import { generateDailySummary, generateWeeklySummary } from "@/lib/ai/summarizer";
import { auth } from "@/lib/auth";
import { CACHE_KEYS, invalidateCache } from "@/lib/cache";
import { db } from "@/lib/db";

/**
 * Результат действия
 */
interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Генерация дневного саммари (без userId - для Server Action)
 */
export async function generateDailySummaryAction(): Promise<
  ActionResult<{
    id: string;
    title: string;
    content: string;
    topics: string[];
    createdAt: Date;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const userId = session.user.id;

    // Проверяем наличие постов
    const postsCount = await db.post.count({
      where: {
        channel: { userId },
        publishedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    if (postsCount === 0) {
      return {
        success: false,
        error: "Нет постов за сегодня для генерации саммари",
      };
    }

    const summary = await generateDailySummary(userId);

    // Инвалидируем кэш
    await Promise.all([
      invalidateCache(CACHE_KEYS.userStats(userId)),
      invalidateCache(CACHE_KEYS.todaySummary(userId)),
      invalidateCache(CACHE_KEYS.userSummaries(userId)),
    ]);
    revalidatePath("/dashboard/summaries");

    return {
      success: true,
      data: {
        id: summary.id,
        title: summary.title,
        content: summary.content,
        topics: summary.topics,
        createdAt: summary.createdAt,
      },
    };
  } catch (error) {
    console.error("Error generating daily summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось создать саммари",
    };
  }
}

/**
 * Генерация дневного саммари
 */
export async function createDailySummary(
  userId: string
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    // Проверяем наличие постов
    const postsCount = await db.post.count({
      where: {
        channel: { userId },
        publishedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    });

    if (postsCount === 0) {
      return {
        success: false,
        error: "Нет постов за сегодня для генерации саммари",
      };
    }

    const summary = await generateDailySummary(userId);

    // Инвалидируем кэш
    await Promise.all([
      invalidateCache(CACHE_KEYS.userStats(userId)),
      invalidateCache(CACHE_KEYS.todaySummary(userId)),
      invalidateCache(CACHE_KEYS.userSummaries(userId)),
    ]);
    revalidatePath("/dashboard/summaries");

    return {
      success: true,
      data: {
        id: summary.id,
        title: summary.title,
      },
    };
  } catch (error) {
    console.error("Error creating daily summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось создать саммари",
    };
  }
}

/**
 * Генерация недельного саммари
 */
export async function createWeeklySummary(
  userId: string
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    const summary = await generateWeeklySummary(userId);

    // Инвалидируем кэш
    await Promise.all([
      invalidateCache(CACHE_KEYS.userStats(userId)),
      invalidateCache(CACHE_KEYS.userSummaries(userId)),
    ]);
    revalidatePath("/dashboard/summaries");

    return {
      success: true,
      data: {
        id: summary.id,
        title: summary.title,
      },
    };
  } catch (error) {
    console.error("Error creating weekly summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось создать саммари",
    };
  }
}

/**
 * Получение саммари по ID
 */
export async function getSummary(summaryId: string) {
  try {
    const summary = await db.summary.findUnique({
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
      },
    });

    if (!summary) {
      return { success: false, error: "Саммари не найдено" };
    }

    return { success: true, data: summary };
  } catch (error) {
    console.error("Error getting summary:", error);
    return {
      success: false,
      error: "Не удалось загрузить саммари",
    };
  }
}

/**
 * Получение списка саммари пользователя
 */
export async function getUserSummaries(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: "daily" | "weekly" | "all";
  } = {}
) {
  const { limit = 10, offset = 0, type = "all" } = options;

  try {
    const where: { userId: string; period?: { startsWith: string } } = { userId };

    if (type !== "all") {
      where.period = { startsWith: type };
    }

    const [summaries, total] = await Promise.all([
      db.summary.findMany({
        where,
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
      }),
      db.summary.count({ where }),
    ]);

    return {
      success: true,
      data: {
        summaries,
        total,
        hasMore: offset + limit < total,
      },
    };
  } catch (error) {
    console.error("Error getting user summaries:", error);
    return {
      success: false,
      error: "Не удалось загрузить список саммари",
    };
  }
}

/**
 * Удаление саммари
 */
export async function deleteSummary(
  summaryId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    // Проверяем, что саммари принадлежит пользователю
    const summary = await db.summary.findFirst({
      where: { id: summaryId, userId },
    });

    if (!summary) {
      return {
        success: false,
        error: "Саммари не найдено или у вас нет прав на его удаление",
      };
    }

    await db.summary.delete({
      where: { id: summaryId },
    });

    // Инвалидируем кэш
    await Promise.all([
      invalidateCache(CACHE_KEYS.userStats(userId)),
      invalidateCache(CACHE_KEYS.todaySummary(userId)),
      invalidateCache(CACHE_KEYS.userSummaries(userId)),
      invalidateCache(CACHE_KEYS.summary(summaryId)),
    ]);
    revalidatePath("/dashboard/summaries");

    return { success: true };
  } catch (error) {
    console.error("Error deleting summary:", error);
    return {
      success: false,
      error: "Не удалось удалить саммари",
    };
  }
}

/**
 * Обновление саммари (перегенерация)
 */
export async function regenerateSummary(
  summaryId: string,
  userId: string
): Promise<ActionResult<{ id: string; title: string }>> {
  try {
    // Получаем существующее саммари
    const existingSummary = await db.summary.findFirst({
      where: { id: summaryId, userId },
    });

    if (!existingSummary) {
      return {
        success: false,
        error: "Саммари не найдено",
      };
    }

    // Удаляем старое саммари
    await db.summary.delete({
      where: { id: summaryId },
    });

    // Генерируем новое в зависимости от типа
    const isWeekly = existingSummary.period.startsWith("weekly");

    const newSummary = isWeekly
      ? await generateWeeklySummary(userId)
      : await generateDailySummary(userId);

    // Инвалидируем кэш
    await Promise.all([
      invalidateCache(CACHE_KEYS.userStats(userId)),
      invalidateCache(CACHE_KEYS.todaySummary(userId)),
      invalidateCache(CACHE_KEYS.userSummaries(userId)),
      invalidateCache(CACHE_KEYS.summary(summaryId)),
    ]);
    revalidatePath("/dashboard/summaries");

    return {
      success: true,
      data: {
        id: newSummary.id,
        title: newSummary.title,
      },
    };
  } catch (error) {
    console.error("Error regenerating summary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось перегенерировать саммари",
    };
  }
}

/**
 * Получение саммари с фильтрацией по темам пользователя
 */
export async function getFilteredSummaries(
  userId: string,
  options: {
    topics?: string[];
    useUserPreferences?: boolean;
    limit?: number;
    offset?: number;
  } = {}
) {
  const { topics, useUserPreferences = true, limit = 10, offset = 0 } = options;

  try {
    let filterTopics = topics;

    // Если темы не указаны и нужно использовать предпочтения пользователя
    if (!filterTopics && useUserPreferences) {
      const preferences = await db.userPreferences.findUnique({
        where: { userId },
        select: { topics: true },
      });
      filterTopics = preferences?.topics;
    }

    // Формируем условие фильтрации
    const where: { userId: string; topics?: { hasSome: string[] } } = { userId };
    if (filterTopics && filterTopics.length > 0) {
      where.topics = { hasSome: filterTopics };
    }

    const [summaries, total] = await Promise.all([
      db.summary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          topics: true,
          period: true,
          createdAt: true,
          _count: { select: { posts: true } },
        },
      }),
      db.summary.count({ where }),
    ]);

    return {
      success: true,
      data: {
        summaries,
        total,
        hasMore: offset + limit < total,
        appliedTopics: filterTopics || [],
      },
    };
  } catch (error) {
    console.error("Error getting filtered summaries:", error);
    return {
      success: false,
      error: "Не удалось загрузить саммари",
    };
  }
}

/**
 * Получение статистики саммари для дашборда
 */
export async function getSummaryStats(userId: string) {
  try {
    const [totalSummaries, recentSummaries, channelsCount] = await Promise.all([
      db.summary.count({ where: { userId } }),
      db.summary.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          topics: true,
          createdAt: true,
        },
      }),
      db.channel.count({ where: { userId, isActive: true } }),
    ]);

    // Собираем топ тем
    const topicCounts: Record<string, number> = {};
    for (const summary of recentSummaries) {
      for (const topic of summary.topics) {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      }
    }

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    return {
      success: true,
      data: {
        totalSummaries,
        channelsCount,
        topTopics,
        lastSummary: recentSummaries[0] || null,
      },
    };
  } catch (error) {
    console.error("Error getting summary stats:", error);
    return {
      success: false,
      error: "Не удалось загрузить статистику",
    };
  }
}
