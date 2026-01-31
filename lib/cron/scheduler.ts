import cron from "node-cron";

import { generateDailySummary, generateWeeklySummary } from "@/lib/ai/summarizer";
import { db } from "@/lib/db";
import { fetchAndSaveChannelPosts } from "@/lib/parsers";

let isInitialized = false;

/**
 * Фетчинг постов для всех активных каналов
 */
async function fetchAllPosts() {
  console.warn("[CRON] Starting fetch-posts job...");

  try {
    const channels = await db.channel.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    let totalAdded = 0;
    let errors = 0;

    for (const channel of channels) {
      try {
        const result = await fetchAndSaveChannelPosts(channel.id);
        totalAdded += result.added;
        console.warn(`[CRON] ${channel.name}: +${result.added} posts`);
      } catch (error) {
        errors++;
        console.error(`[CRON] Error fetching ${channel.name}:`, error);
      }
    }

    console.warn(
      `[CRON] fetch-posts completed: ${channels.length} channels, ${totalAdded} new posts, ${errors} errors`
    );
  } catch (error) {
    console.error("[CRON] fetch-posts failed:", error);
  }
}

/**
 * Генерация дневных саммари для всех пользователей
 */
async function generateDailySummaries() {
  console.warn("[CRON] Starting daily-summary job...");

  try {
    const users = await db.user.findMany({
      where: {
        preferences: { summaryInterval: "daily" },
        channels: { some: { isActive: true } },
      },
      select: { id: true, email: true },
    });

    let generated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        // Проверяем посты за сегодня
        const postsCount = await db.post.count({
          where: {
            channel: { userId: user.id },
            publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        });

        if (postsCount === 0) {
          skipped++;
          continue;
        }

        // Проверяем, не был ли уже создан саммари
        const today = new Date().toISOString().split("T")[0];
        const existing = await db.summary.findFirst({
          where: { userId: user.id, period: `daily-${today}` },
        });

        if (existing) {
          skipped++;
          continue;
        }

        await generateDailySummary(user.id);
        generated++;
        console.warn(`[CRON] Generated daily summary for ${user.email}`);
      } catch (error) {
        console.error(`[CRON] Error generating summary for ${user.email}:`, error);
      }
    }

    console.warn(`[CRON] daily-summary completed: ${generated} generated, ${skipped} skipped`);
  } catch (error) {
    console.error("[CRON] daily-summary failed:", error);
  }
}

/**
 * Генерация недельных саммари для всех пользователей
 */
async function generateWeeklySummaries() {
  console.warn("[CRON] Starting weekly-summary job...");

  try {
    const users = await db.user.findMany({
      where: {
        preferences: { summaryInterval: "weekly" },
        channels: { some: { isActive: true } },
      },
      select: { id: true, email: true },
    });

    let generated = 0;
    let skipped = 0;

    for (const user of users) {
      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const postsCount = await db.post.count({
          where: {
            channel: { userId: user.id },
            publishedAt: { gte: weekAgo },
          },
        });

        if (postsCount === 0) {
          skipped++;
          continue;
        }

        await generateWeeklySummary(user.id);
        generated++;
        console.warn(`[CRON] Generated weekly summary for ${user.email}`);
      } catch (error) {
        console.error(`[CRON] Error generating weekly summary for ${user.email}:`, error);
      }
    }

    console.warn(`[CRON] weekly-summary completed: ${generated} generated, ${skipped} skipped`);
  } catch (error) {
    console.error("[CRON] weekly-summary failed:", error);
  }
}

/**
 * Инициализация cron задач
 */
export function initCronJobs() {
  if (isInitialized) {
    console.warn("[CRON] Already initialized, skipping...");
    return;
  }

  // Проверяем, включены ли cron задачи
  if (process.env.ENABLE_CRON !== "true") {
    console.warn("[CRON] Cron jobs disabled (ENABLE_CRON !== true)");
    return;
  }

  console.warn("[CRON] Initializing cron jobs...");

  // Фетчинг постов каждые 6 часов (0:00, 6:00, 12:00, 18:00)
  cron.schedule("0 */6 * * *", fetchAllPosts, {
    timezone: "Europe/Moscow",
  });

  // Дневные саммари в 20:00
  cron.schedule("0 20 * * *", generateDailySummaries, {
    timezone: "Europe/Moscow",
  });

  // Недельные саммари в воскресенье в 20:00
  cron.schedule("0 20 * * 0", generateWeeklySummaries, {
    timezone: "Europe/Moscow",
  });

  isInitialized = true;
  console.warn("[CRON] Cron jobs initialized:");
  console.warn("  - fetch-posts: every 6 hours");
  console.warn("  - daily-summary: daily at 20:00");
  console.warn("  - weekly-summary: Sunday at 20:00");
}

/**
 * Ручной запуск задач (для тестирования)
 */
export const cronJobs = {
  fetchAllPosts,
  generateDailySummaries,
  generateWeeklySummaries,
};
