import bigInt from "big-integer";
import { type Api, errors } from "telegram";

import { db } from "@/lib/db";
import { createClientFromEncrypted } from "@/lib/mtproto/client";

import {
  ParseError,
  ParseErrorCode,
  type ChannelInfo,
  type ContentParser,
  type ParsedPost,
  type ParseOptions,
  type ParseResult,
} from "./types";

/**
 * Парсит userId и channelId из URL формата mtproto://{userId}/{channelId}
 */
function parseMTProtoUrl(url: string): { userId: string; channelId: string } | null {
  const match = url.match(/^mtproto:\/\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_-]+)$/);
  if (!match) return null;
  return { userId: match[1], channelId: match[2] };
}

/**
 * Парсер для каналов, подключённых через MTProto (GramJS)
 *
 * Поддерживает URL формата: mtproto://{userId}/{channelId}
 * Используется в cron-задачах для периодического фетча постов.
 */
export class TelegramMTProtoParser implements ContentParser {
  readonly type = "telegram_mtproto" as const;

  isValidSource(url: string): boolean {
    return parseMTProtoUrl(url) !== null;
  }

  async getChannelInfo(url: string): Promise<ChannelInfo> {
    const channel = await db.channel.findFirst({
      where: { sourceUrl: url, sourceType: "telegram_mtproto" },
    });

    return {
      name: channel?.name || "Telegram Channel",
      description: channel?.description || null,
      url,
      imageUrl: channel?.imageUrl || null,
    };
  }

  async fetchPosts(url: string, options?: ParseOptions): Promise<ParseResult> {
    const parsed = parseMTProtoUrl(url);
    if (!parsed) {
      throw new ParseError("Неверный формат MTProto URL", url, ParseErrorCode.INVALID_URL);
    }

    const { userId, channelId } = parsed;

    const session = await db.mTProtoSession.findUnique({ where: { userId } });
    if (!session || !session.isActive) {
      throw new ParseError(
        "MTProto сессия не найдена или неактивна",
        url,
        ParseErrorCode.ACCESS_DENIED
      );
    }

    const channelInfo = await this.getChannelInfo(url);
    const client = createClientFromEncrypted(session.sessionData);

    try {
      await client.connect();

      // Разрешаем сущность канала
      const entity = await client.getEntity(bigInt(channelId));

      const getMessagesParams: Parameters<typeof client.getMessages>[1] = {
        limit: options?.limit ?? 20,
      };

      // Используем offsetDate если указан since
      if (options?.since) {
        getMessagesParams.offsetDate = Math.floor(options.since.getTime() / 1000);
      }

      const messages = await client.getMessages(entity, getMessagesParams);

      const posts: ParsedPost[] = [];
      for (const message of messages) {
        if (!message.message && !message.media) continue;

        const content = message.message || "";
        if (!content.trim()) continue;

        const postDate = new Date(message.date * 1000);
        if (options?.since && postDate <= options.since) continue;

        posts.push({
          externalId: message.id.toString(),
          title: null,
          content,
          url: null,
          author: (message as Api.Message).postAuthor ?? null,
          publishedAt: postDate,
        });
      }

      // Обновляем время последнего использования сессии
      await db.mTProtoSession.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return { channel: channelInfo, posts };
    } catch (error) {
      if (error instanceof errors.AuthKeyError) {
        await db.mTProtoSession.update({
          where: { userId },
          data: { isActive: false },
        });
        throw new ParseError(
          "MTProto сессия истекла. Необходима повторная авторизация.",
          url,
          ParseErrorCode.ACCESS_DENIED
        );
      }
      if (error instanceof errors.FloodWaitError) {
        throw new ParseError(
          `Превышен лимит запросов Telegram. Подождите ${error.seconds} секунд.`,
          url,
          ParseErrorCode.RATE_LIMITED
        );
      }
      if (error instanceof ParseError) throw error;
      console.error("MTProto fetchPosts error:", error);
      throw new ParseError("Не удалось получить посты через MTProto", url, ParseErrorCode.UNKNOWN);
    } finally {
      try {
        await client.disconnect();
      } catch {
        // ignore disconnect errors
      }
    }
  }
}

export const telegramMTProtoParser = new TelegramMTProtoParser();
