"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { CACHE_KEYS, invalidateCache } from "@/lib/cache";
import { db } from "@/lib/db";
import { encryptSession } from "@/lib/mtproto/client";
import { listUserChannels, type MTProtoChannelInfo } from "@/lib/mtproto/service";
import { fetchAndSaveChannelPosts } from "@/lib/parsers";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Добавляет один MTProto канал
 */
export async function addMTProtoChannel(channelData: {
  telegramId: string;
  title: string;
  username: string | null;
  accessHash: string;
}): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const userId = session.user.id;
    const sourceUrl = `mtproto://${userId}/${channelData.telegramId}`;

    // Проверяем дубликат
    const existing = await db.channel.findFirst({
      where: { userId, sourceUrl },
    });

    if (existing) {
      return { success: false, error: "Этот канал уже добавлен", code: "CHANNEL_EXISTS" };
    }

    const encryptedAccessHash = encryptSession(channelData.accessHash);

    const channel = await db.channel.create({
      data: {
        userId,
        name: channelData.title,
        sourceUrl,
        sourceType: "telegram_mtproto",
        telegramId: channelData.telegramId,
        accessHash: encryptedAccessHash,
        isActive: true,
      },
    });

    await Promise.all([
      invalidateCache(CACHE_KEYS.userChannels(userId)),
      invalidateCache(CACHE_KEYS.userStats(userId)),
    ]);
    revalidatePath("/channels");
    revalidatePath("/dashboard");

    // Загрузка начальных постов в фоне
    void fetchAndSaveChannelPosts(channel.id, { limit: 20 })
      .then(async () => {
        await Promise.all([
          invalidateCache(CACHE_KEYS.userChannels(userId)),
          invalidateCache(CACHE_KEYS.userStats(userId)),
        ]);
        revalidatePath("/channels");
        revalidatePath("/dashboard");
      })
      .catch((e) =>
        console.error("Failed to fetch initial posts for MTProto channel:", channel.id, e)
      );

    return { success: true, data: { id: channel.id, name: channel.name } };
  } catch (error) {
    console.error("Error adding MTProto channel:", error);
    return { success: false, error: "Не удалось добавить канал" };
  }
}

/**
 * Возвращает список Telegram-каналов пользователя через MTProto
 */
export async function listMyTelegramChannels(): Promise<ActionResult<MTProtoChannelInfo[]>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const channels = await listUserChannels(session.user.id);
    return { success: true, data: channels };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось получить каналы";
    return { success: false, error: message };
  }
}

/**
 * Пакетное добавление MTProto каналов
 */
export async function addMultipleMTProtoChannels(
  channels: Array<{
    telegramId: string;
    title: string;
    username: string | null;
    accessHash: string;
  }>
): Promise<ActionResult<{ added: number; errors: string[] }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const userId = session.user.id;
    let added = 0;
    const channelErrors: string[] = [];

    for (const channelData of channels) {
      const result = await addMTProtoChannel(channelData);
      if (result.success) {
        added++;
      } else if (result.code !== "CHANNEL_EXISTS") {
        channelErrors.push(`${channelData.title}: ${result.error}`);
      }
    }

    // Инвалидируем кэш один раз для всего батча
    await Promise.all([
      invalidateCache(CACHE_KEYS.userChannels(userId)),
      invalidateCache(CACHE_KEYS.userStats(userId)),
    ]);
    revalidatePath("/channels");
    revalidatePath("/dashboard");

    return { success: true, data: { added, errors: channelErrors } };
  } catch (error) {
    console.error("Error adding multiple MTProto channels:", error);
    return { success: false, error: "Не удалось добавить каналы" };
  }
}
