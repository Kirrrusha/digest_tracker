import Parser from "rss-parser";

import type {
  ChannelInfo,
  ContentParser,
  ParsedPost,
  ParseOptions,
  ParseResult,
} from "./types";
import { ParseError, ParseErrorCode } from "./types";

/**
 * Кастомные поля RSS
 */
type CustomFeed = {
  image?: { url?: string };
};

type CustomItem = {
  "content:encoded"?: string;
  "media:content"?: { $?: { url?: string } };
  enclosure?: { url?: string };
};

/**
 * RSS Parser с поддержкой кастомных полей
 */
const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    feed: ["image"],
    item: ["content:encoded", "media:content", "enclosure"],
  },
  timeout: 10000, // 10 секунд
});

/**
 * Парсер RSS фидов
 */
export class RSSParser implements ContentParser {
  readonly type = "rss" as const;

  /**
   * Проверка валидности URL RSS фида
   */
  isValidSource(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Проверяем базовые признаки RSS URL
      return (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        (url.includes("/feed") ||
          url.includes("/rss") ||
          url.includes(".xml") ||
          url.includes("atom") ||
          url.includes("/feeds/"))
      );
    } catch {
      return false;
    }
  }

  /**
   * Получение информации о RSS фиде
   */
  async getChannelInfo(url: string): Promise<ChannelInfo> {
    try {
      const feed = await parser.parseURL(url);

      return {
        name: feed.title || "Unknown Feed",
        description: feed.description || null,
        url: feed.link || url,
        imageUrl: feed.image?.url || null,
      };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Парсинг постов из RSS фида
   */
  async fetchPosts(url: string, options: ParseOptions = {}): Promise<ParseResult> {
    const { limit = 50, since } = options;

    try {
      const feed = await parser.parseURL(url);

      let items = feed.items || [];

      // Фильтруем по дате если указано
      if (since) {
        items = items.filter((item) => {
          const pubDate = item.pubDate ? new Date(item.pubDate) : null;
          return pubDate && pubDate >= since;
        });
      }

      // Ограничиваем количество
      items = items.slice(0, limit);

      const posts: ParsedPost[] = items.map((item) => this.parseItem(item));

      const channel: ChannelInfo = {
        name: feed.title || "Unknown Feed",
        description: feed.description || null,
        url: feed.link || url,
        imageUrl: feed.image?.url || null,
      };

      return { channel, posts };
    } catch (error) {
      throw this.handleError(error, url);
    }
  }

  /**
   * Парсинг одного элемента RSS
   */
  private parseItem(item: Parser.Item & CustomItem): ParsedPost {
    // Получаем контент (пробуем разные поля)
    const content =
      item["content:encoded"] ||
      item.content ||
      item.contentSnippet ||
      item.summary ||
      "";

    // Очищаем HTML теги для получения чистого текста
    const cleanContent = this.stripHtml(content);

    // Получаем изображение если есть
    const imageUrl =
      item["media:content"]?.$?.url || item.enclosure?.url || this.extractImageFromContent(content);

    return {
      externalId: item.guid || item.link || this.generateId(item),
      title: item.title || null,
      content: cleanContent,
      url: item.link || null,
      author: item.creator || item.author || null,
      publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
      media: imageUrl
        ? [
            {
              type: "image",
              url: imageUrl,
            },
          ]
        : undefined,
    };
  }

  /**
   * Удаление HTML тегов из текста
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  /**
   * Извлечение URL изображения из HTML контента
   */
  private extractImageFromContent(html: string): string | null {
    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    return imgMatch ? imgMatch[1] : null;
  }

  /**
   * Генерация ID для элемента без guid
   */
  private generateId(item: Parser.Item): string {
    const base = `${item.title || ""}-${item.pubDate || ""}-${item.link || ""}`;
    // Простой хэш
    let hash = 0;
    for (let i = 0; i < base.length; i++) {
      const char = base.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `rss-${Math.abs(hash).toString(36)}`;
  }

  /**
   * Обработка ошибок парсинга
   */
  private handleError(error: unknown, url: string): ParseError {
    if (error instanceof ParseError) {
      return error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    // Определяем тип ошибки
    if (message.includes("ENOTFOUND") || message.includes("ETIMEDOUT")) {
      return new ParseError(
        `Не удалось подключиться к ${url}`,
        url,
        ParseErrorCode.NETWORK_ERROR
      );
    }

    if (message.includes("404") || message.includes("Not Found")) {
      return new ParseError(`RSS фид не найден: ${url}`, url, ParseErrorCode.SOURCE_NOT_FOUND);
    }

    if (message.includes("403") || message.includes("Forbidden")) {
      return new ParseError(`Доступ к RSS фиду запрещен: ${url}`, url, ParseErrorCode.ACCESS_DENIED);
    }

    if (message.includes("429") || message.includes("Too Many")) {
      return new ParseError(
        `Слишком много запросов к ${url}`,
        url,
        ParseErrorCode.RATE_LIMITED
      );
    }

    return new ParseError(
      `Ошибка парсинга RSS: ${message}`,
      url,
      ParseErrorCode.PARSE_FAILED
    );
  }
}

/**
 * Singleton экземпляр парсера
 */
export const rssParser = new RSSParser();

/**
 * Быстрый парсинг RSS фида
 */
export async function parseRSSFeed(
  url: string,
  options?: ParseOptions
): Promise<ParsedPost[]> {
  const result = await rssParser.fetchPosts(url, options);
  return result.posts;
}

/**
 * Проверка валидности RSS URL
 */
export function isValidRSSUrl(url: string): boolean {
  return rssParser.isValidSource(url);
}
