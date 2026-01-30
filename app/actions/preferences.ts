"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Получение настроек пользователя
 */
export async function getPreferences(): Promise<
  ActionResult<{
    topics: string[];
    summaryInterval: string;
    language: string;
    notificationsEnabled: boolean;
    notificationTime: string | null;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const preferences = await db.userPreferences.findUnique({
      where: { userId: session.user.id },
    });

    return {
      success: true,
      data: {
        topics: preferences?.topics || [],
        summaryInterval: preferences?.summaryInterval || "daily",
        language: preferences?.language || "ru",
        notificationsEnabled: preferences?.notificationsEnabled || false,
        notificationTime: preferences?.notificationTime || null,
      },
    };
  } catch (error) {
    console.error("Error getting preferences:", error);
    return { success: false, error: "Не удалось получить настройки" };
  }
}

/**
 * Обновление тем пользователя
 */
export async function updateTopics(topics: string[]): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { topics },
      create: { userId: session.user.id, topics },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating topics:", error);
    return { success: false, error: "Не удалось обновить темы" };
  }
}

/**
 * Обновление интервала саммари
 */
export async function updateSummaryInterval(
  interval: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    if (!["daily", "weekly"].includes(interval)) {
      return { success: false, error: "Неверный интервал" };
    }

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { summaryInterval: interval },
      create: { userId: session.user.id, summaryInterval: interval },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating summary interval:", error);
    return { success: false, error: "Не удалось обновить интервал" };
  }
}

/**
 * Обновление языка
 */
export async function updateLanguage(language: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    if (!["ru", "en"].includes(language)) {
      return { success: false, error: "Неверный язык" };
    }

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      update: { language },
      create: { userId: session.user.id, language },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating language:", error);
    return { success: false, error: "Не удалось обновить язык" };
  }
}

/**
 * Обновление настроек уведомлений
 */
export async function updateNotificationSettings(settings: {
  enabled: boolean;
  time?: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      update: {
        notificationsEnabled: settings.enabled,
        notificationTime: settings.time || null,
      },
      create: {
        userId: session.user.id,
        notificationsEnabled: settings.enabled,
        notificationTime: settings.time || null,
      },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return { success: false, error: "Не удалось обновить настройки уведомлений" };
  }
}

/**
 * Обновление всех настроек
 */
export async function updateAllPreferences(data: {
  topics?: string[];
  summaryInterval?: string;
  language?: string;
  notificationsEnabled?: boolean;
  notificationTime?: string | null;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const updateData: Record<string, unknown> = {};

    if (data.topics !== undefined) {
      updateData.topics = data.topics;
    }
    if (data.summaryInterval !== undefined) {
      updateData.summaryInterval = data.summaryInterval;
    }
    if (data.language !== undefined) {
      updateData.language = data.language;
    }
    if (data.notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = data.notificationsEnabled;
    }
    if (data.notificationTime !== undefined) {
      updateData.notificationTime = data.notificationTime;
    }

    await db.userPreferences.upsert({
      where: { userId: session.user.id },
      update: updateData,
      create: { userId: session.user.id, ...updateData },
    });

    revalidatePath("/dashboard/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating preferences:", error);
    return { success: false, error: "Не удалось обновить настройки" };
  }
}
