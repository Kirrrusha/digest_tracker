"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  fetchAndSaveChannelPosts,
  parserFactory,
  validateAndGetSourceInfo,
  ParseError,
  ParseErrorCode,
} from "@/lib/parsers";

/**
 * Результат действия
 */
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

/**
 * Добавление нового канала
 */
export async function addChannel(
  url: string
): Promise<ActionResult<{ id: string; name: string }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Валидируем URL и получаем информацию о канале
    const { type, info } = await validateAndGetSourceInfo(url);

    // Проверяем, не добавлен ли уже этот канал
    const existing = await db.channel.findFirst({
      where: {
        userId: session.user.id,
        sourceUrl: info.url,
      },
    });

    if (existing) {
      return {
        success: false,
        error: "Этот канал уже добавлен",
        code: "CHANNEL_EXISTS",
      };
    }

    // Создаём канал
    const channel = await db.channel.create({
      data: {
        userId: session.user.id,
        name: info.name,
        sourceUrl: info.url,
        sourceType: type,
        description: info.description,
        imageUrl: info.imageUrl,
        isActive: true,
      },
    });

    // Сразу загружаем последние посты
    try {
      await fetchAndSaveChannelPosts(channel.id, { limit: 20 });
    } catch {
      // Не блокируем создание канала если не удалось загрузить посты
      console.error("Failed to fetch initial posts for channel:", channel.id);
    }

    revalidatePath("/channels");
    revalidatePath("/dashboard");

    return {
      success: true,
      data: { id: channel.id, name: channel.name },
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
    console.error("Error adding channel:", error);
    return {
      success: false,
      error: "Не удалось добавить канал",
    };
  }
}

/**
 * Удаление канала
 */
export async function deleteChannel(
  channelId: string
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return { success: false, error: "Канал не найден" };
    }

    // Удаляем канал (посты удалятся каскадно)
    await db.channel.delete({
      where: { id: channelId },
    });

    revalidatePath("/channels");
    revalidatePath("/dashboard");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error deleting channel:", error);
    return { success: false, error: "Не удалось удалить канал" };
  }
}

/**
 * Переключение активности канала
 */
export async function toggleChannel(
  channelId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return { success: false, error: "Канал не найден" };
    }

    await db.channel.update({
      where: { id: channelId },
      data: { isActive },
    });

    revalidatePath("/channels");

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error toggling channel:", error);
    return { success: false, error: "Не удалось изменить статус канала" };
  }
}

/**
 * Обновление постов канала
 */
export async function refreshChannel(
  channelId: string
): Promise<ActionResult<{ added: number; skipped: number }>> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return { success: false, error: "Канал не найден" };
    }

    const result = await fetchAndSaveChannelPosts(channelId);

    revalidatePath("/channels");
    revalidatePath(`/channels/${channelId}`);

    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
    console.error("Error refreshing channel:", error);
    return { success: false, error: "Не удалось обновить канал" };
  }
}

/**
 * Обновление всех каналов пользователя
 */
export async function refreshAllChannels(): Promise<
  ActionResult<{ total: number; errors: string[] }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const channels = await db.channel.findMany({
      where: {
        userId: session.user.id,
        isActive: true,
      },
    });

    let total = 0;
    const errors: string[] = [];

    for (const channel of channels) {
      try {
        const result = await fetchAndSaveChannelPosts(channel.id);
        total += result.added;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        errors.push(`${channel.name}: ${message}`);
      }
    }

    revalidatePath("/channels");
    revalidatePath("/dashboard");

    return { success: true, data: { total, errors } };
  } catch (error) {
    console.error("Error refreshing all channels:", error);
    return { success: false, error: "Не удалось обновить каналы" };
  }
}

/**
 * Получение списка каналов пользователя
 */
export async function getChannels(): Promise<
  ActionResult<
    Array<{
      id: string;
      name: string;
      sourceUrl: string;
      sourceType: string;
      description: string | null;
      imageUrl: string | null;
      isActive: boolean;
      postsCount: number;
      lastPostAt: Date | null;
    }>
  >
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const channels = await db.channel.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { posts: true },
        },
        posts: {
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const result = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      sourceUrl: channel.sourceUrl,
      sourceType: channel.sourceType,
      description: channel.description,
      imageUrl: channel.imageUrl,
      isActive: channel.isActive,
      postsCount: channel._count.posts,
      lastPostAt: channel.posts[0]?.publishedAt || null,
    }));

    return { success: true, data: result };
  } catch (error) {
    console.error("Error getting channels:", error);
    return { success: false, error: "Не удалось получить каналы" };
  }
}

/**
 * Получение информации о канале с постами
 */
export async function getChannelWithPosts(
  channelId: string,
  options: { page?: number; limit?: number } = {}
): Promise<
  ActionResult<{
    channel: {
      id: string;
      name: string;
      sourceUrl: string;
      sourceType: string;
      description: string | null;
      imageUrl: string | null;
      isActive: boolean;
    };
    posts: Array<{
      id: string;
      externalId: string;
      title: string | null;
      content: string;
      url: string | null;
      author: string | null;
      publishedAt: Date;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return { success: false, error: "Канал не найден" };
    }

    const [posts, total] = await Promise.all([
      db.post.findMany({
        where: { channelId },
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          externalId: true,
          title: true,
          content: true,
          url: true,
          author: true,
          publishedAt: true,
        },
      }),
      db.post.count({ where: { channelId } }),
    ]);

    return {
      success: true,
      data: {
        channel: {
          id: channel.id,
          name: channel.name,
          sourceUrl: channel.sourceUrl,
          sourceType: channel.sourceType,
          description: channel.description,
          imageUrl: channel.imageUrl,
          isActive: channel.isActive,
        },
        posts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  } catch (error) {
    console.error("Error getting channel with posts:", error);
    return { success: false, error: "Не удалось получить канал" };
  }
}

/**
 * Валидация URL перед добавлением
 */
export async function validateChannelUrl(
  url: string
): Promise<
  ActionResult<{
    type: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
  }>
> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    const { type, info } = await validateAndGetSourceInfo(url);

    return {
      success: true,
      data: {
        type,
        name: info.name,
        description: info.description,
        imageUrl: info.imageUrl,
      },
    };
  } catch (error) {
    if (error instanceof ParseError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }
    return { success: false, error: "Не удалось проверить URL" };
  }
}

/**
 * Обновление настроек канала
 */
export async function updateChannel(
  channelId: string,
  data: { name?: string; isActive?: boolean }
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Необходима авторизация" };
    }

    // Проверяем, что канал принадлежит пользователю
    const channel = await db.channel.findFirst({
      where: {
        id: channelId,
        userId: session.user.id,
      },
    });

    if (!channel) {
      return { success: false, error: "Канал не найден" };
    }

    await db.channel.update({
      where: { id: channelId },
      data,
    });

    revalidatePath("/channels");
    revalidatePath(`/channels/${channelId}`);

    return { success: true, data: undefined };
  } catch (error) {
    console.error("Error updating channel:", error);
    return { success: false, error: "Не удалось обновить канал" };
  }
}
