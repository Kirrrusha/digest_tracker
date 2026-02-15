import { db } from "@/lib/db";

import { isValidRSSUrl, parseRSSFeed, rssParser, RSSParser } from "./rss-parser";
import { telegramBotParser, TelegramBotParser } from "./telegram-bot-parser";
import {
  extractTelegramUsername,
  isValidTelegramUrl,
  parseTelegramChannel,
  telegramParser,
  TelegramParser,
} from "./telegram-parser";
import {
  ParseError,
  ParseErrorCode,
  type ChannelInfo,
  type ContentParser,
  type ParsedPost,
  type ParseOptions,
  type ParseResult,
  type SourceType,
} from "./types";

// Re-export types
export type { ChannelInfo, ContentParser, ParsedPost, ParseOptions, ParseResult, SourceType };
export { ParseError, ParseErrorCode };

// Re-export parsers
export { rssParser, RSSParser, parseRSSFeed, isValidRSSUrl };
export { telegramBotParser, TelegramBotParser };
export {
  telegramParser,
  TelegramParser,
  parseTelegramChannel,
  isValidTelegramUrl,
  extractTelegramUsername,
};

/**
 * Фабрика парсеров
 */
class ParserFactory {
  private parsers: Map<SourceType, ContentParser> = new Map();

  constructor() {
    this.register(rssParser);
    this.register(telegramParser);
    this.register(telegramBotParser);
  }

  /**
   * Регистрация парсера
   */
  register(parser: ContentParser): void {
    this.parsers.set(parser.type, parser);
  }

  /**
   * Получение парсера по типу
   */
  getParser(type: SourceType): ContentParser | null {
    return this.parsers.get(type) || null;
  }

  /**
   * Автоматическое определение типа источника и получение парсера
   */
  getParserForUrl(url: string): ContentParser | null {
    for (const parser of this.parsers.values()) {
      if (parser.isValidSource(url)) {
        return parser;
      }
    }
    return null;
  }

  /**
   * Определение типа источника по URL
   */
  detectSourceType(url: string): SourceType | null {
    if (telegramParser.isValidSource(url)) {
      return "telegram";
    }
    if (rssParser.isValidSource(url)) {
      return "rss";
    }
    return null;
  }

  /**
   * Проверка валидности URL для любого парсера
   */
  isValidSource(url: string): boolean {
    return this.getParserForUrl(url) !== null;
  }

  /**
   * Получение информации о канале
   */
  async getChannelInfo(url: string): Promise<ChannelInfo> {
    const parser = this.getParserForUrl(url);
    if (!parser) {
      throw new ParseError("Неподдерживаемый тип источника", url, ParseErrorCode.INVALID_URL);
    }
    return parser.getChannelInfo(url);
  }

  /**
   * Парсинг постов из источника
   */
  async fetchPosts(url: string, options?: ParseOptions): Promise<ParseResult> {
    const parser = this.getParserForUrl(url);
    if (!parser) {
      throw new ParseError("Неподдерживаемый тип источника", url, ParseErrorCode.INVALID_URL);
    }
    return parser.fetchPosts(url, options);
  }
}

/**
 * Singleton фабрики парсеров
 */
export const parserFactory = new ParserFactory();

/**
 * Фетчинг и сохранение постов для канала
 */
export async function fetchAndSaveChannelPosts(
  channelId: string,
  options?: ParseOptions
): Promise<{ added: number; skipped: number }> {
  // Получаем информацию о канале из БД
  const channel = await db.channel.findUnique({
    where: { id: channelId },
  });

  if (!channel) {
    throw new Error(`Channel ${channelId} not found`);
  }

  if (!channel.isActive) {
    return { added: 0, skipped: 0 };
  }

  // Определяем since - дату последнего поста или undefined
  const lastPost = await db.post.findFirst({
    where: { channelId },
    orderBy: { publishedAt: "desc" },
    select: { publishedAt: true },
  });

  const fetchOptions: ParseOptions = {
    ...options,
    since: lastPost?.publishedAt || options?.since,
  };

  // Парсим посты
  const result = await parserFactory.fetchPosts(channel.sourceUrl, fetchOptions);

  let added = 0;
  let skipped = 0;

  // Сохраняем посты в БД
  for (const post of result.posts) {
    try {
      await db.post.upsert({
        where: {
          channelId_externalId: {
            channelId,
            externalId: post.externalId,
          },
        },
        create: {
          channelId,
          externalId: post.externalId,
          title: post.title,
          content: post.content,
          url: post.url,
          author: post.author,
          publishedAt: post.publishedAt,
        },
        update: {
          title: post.title,
          content: post.content,
          url: post.url,
          author: post.author,
        },
      });
      added++;
    } catch {
      // Пропускаем дубликаты
      skipped++;
    }
  }

  // Обновляем время последнего обновления канала
  await db.channel.update({
    where: { id: channelId },
    data: { updatedAt: new Date() },
  });

  return { added, skipped };
}

/**
 * Фетчинг постов для всех активных каналов пользователя
 */
export async function fetchAllUserChannels(
  userId: string,
  options?: ParseOptions
): Promise<{ total: number; errors: string[] }> {
  const channels = await db.channel.findMany({
    where: {
      userId,
      isActive: true,
      // telegram_bot каналы push-based — пропускаем в cron
      sourceType: { not: "telegram_bot" },
    },
  });

  let total = 0;
  const errors: string[] = [];

  for (const channel of channels) {
    try {
      const result = await fetchAndSaveChannelPosts(channel.id, options);
      total += result.added;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`${channel.name}: ${message}`);
    }
  }

  return { total, errors };
}

/**
 * Валидация и получение информации о новом источнике
 */
export async function validateAndGetSourceInfo(url: string): Promise<{
  type: SourceType;
  info: ChannelInfo;
}> {
  const type = parserFactory.detectSourceType(url);

  if (!type) {
    throw new ParseError(
      "URL не является валидным Telegram каналом или RSS фидом",
      url,
      ParseErrorCode.INVALID_URL
    );
  }

  const info = await parserFactory.getChannelInfo(url);

  return { type, info };
}
