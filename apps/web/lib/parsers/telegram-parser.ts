import {
  ParseError,
  ParseErrorCode,
  type ChannelInfo,
  type ContentParser,
  type ParsedPost,
  type ParseOptions,
  type ParseResult,
  type PostMedia,
} from "./types";

/**
 * Парсер публичных Telegram каналов
 *
 * Использует веб-версию t.me/s/channel для парсинга публичных каналов.
 * Для приватных каналов требуется Bot API с доступом к каналу.
 */
export class TelegramParser implements ContentParser {
  readonly type = "telegram" as const;

  private readonly baseUrl = "https://t.me";

  /**
   * Проверка валидности URL Telegram канала
   */
  isValidSource(url: string): boolean {
    try {
      // Поддерживаемые форматы:
      // - https://t.me/channel_name
      // - https://telegram.me/channel_name
      // - @channel_name
      // - t.me/channel_name

      if (url.startsWith("@")) {
        return /^@[a-zA-Z][a-zA-Z0-9_]{3,30}$/.test(url);
      }

      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      const isTelegram =
        parsed.hostname === "t.me" ||
        parsed.hostname === "telegram.me" ||
        parsed.hostname === "telegram.org";

      if (!isTelegram) return false;

      // Извлекаем username канала
      const username = this.extractUsername(url);
      return username !== null && /^[a-zA-Z][a-zA-Z0-9_]{3,30}$/.test(username);
    } catch {
      return false;
    }
  }

  /**
   * Получение информации о канале
   */
  async getChannelInfo(url: string): Promise<ChannelInfo> {
    const username = this.extractUsername(url);
    if (!username) {
      throw new ParseError("Invalid Telegram URL", url, ParseErrorCode.INVALID_URL);
    }

    try {
      // Получаем HTML страницы канала
      const response = await fetch(`${this.baseUrl}/s/${username}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new ParseError(
            `Канал @${username} не найден`,
            url,
            ParseErrorCode.SOURCE_NOT_FOUND
          );
        }
        throw new ParseError(
          `Ошибка доступа к каналу: ${response.status}`,
          url,
          ParseErrorCode.ACCESS_DENIED
        );
      }

      const html = await response.text();
      return this.parseChannelInfo(html, username, url);
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Не удалось получить информацию о канале: ${error instanceof Error ? error.message : "Unknown error"}`,
        url,
        ParseErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Парсинг постов из канала
   */
  async fetchPosts(url: string, options: ParseOptions = {}): Promise<ParseResult> {
    const { limit = 20, since } = options;
    const username = this.extractUsername(url);

    if (!username) {
      throw new ParseError("Invalid Telegram URL", url, ParseErrorCode.INVALID_URL);
    }

    try {
      // Получаем HTML страницы канала
      const response = await fetch(`${this.baseUrl}/s/${username}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        throw new ParseError(
          `Ошибка доступа к каналу: ${response.status}`,
          url,
          ParseErrorCode.ACCESS_DENIED
        );
      }

      const html = await response.text();

      const channel = this.parseChannelInfo(html, username, url);
      let posts = this.parseMessages(html, username);

      // Фильтруем по дате
      if (since) {
        posts = posts.filter((post) => post.publishedAt >= since);
      }

      // Ограничиваем количество
      posts = posts.slice(0, limit);

      return { channel, posts };
    } catch (error) {
      if (error instanceof ParseError) throw error;
      throw new ParseError(
        `Не удалось получить посты: ${error instanceof Error ? error.message : "Unknown error"}`,
        url,
        ParseErrorCode.NETWORK_ERROR
      );
    }
  }

  /**
   * Извлечение username канала из URL
   */
  private extractUsername(url: string): string | null {
    // @channel_name
    if (url.startsWith("@")) {
      return url.slice(1);
    }

    try {
      const fullUrl = url.startsWith("http") ? url : `https://${url}`;
      const parsed = new URL(fullUrl);
      const path = parsed.pathname.replace(/^\/s\//, "/").replace(/^\//, "");
      const username = path.split("/")[0];
      return username || null;
    } catch {
      return null;
    }
  }

  /**
   * Парсинг информации о канале из HTML
   */
  private parseChannelInfo(html: string, username: string, _url: string): ChannelInfo {
    // Извлекаем название канала
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    const name = titleMatch ? this.decodeHtml(titleMatch[1]) : `@${username}`;

    // Извлекаем описание
    const descMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const description = descMatch ? this.decodeHtml(descMatch[1]) : null;

    // Извлекаем изображение
    const imageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
    const imageUrl = imageMatch ? imageMatch[1] : null;

    // Извлекаем количество подписчиков
    const subsMatch = html.match(/<div class="tgme_page_extra">([^<]+)<\/div>/);
    let subscribersCount: number | undefined;
    if (subsMatch) {
      const subsText = subsMatch[1];
      const numMatch = subsText.match(/([\d\s]+)/);
      if (numMatch) {
        subscribersCount = parseInt(numMatch[1].replace(/\s/g, ""), 10);
      }
    }

    return {
      name,
      description,
      url: `${this.baseUrl}/${username}`,
      imageUrl,
      subscribersCount,
    };
  }

  /**
   * Парсинг сообщений из HTML
   */
  private parseMessages(html: string, username: string): ParsedPost[] {
    const posts: ParsedPost[] = [];

    // Регулярка для извлечения блоков сообщений
    const messageRegex =
      /<div class="tgme_widget_message_wrap[^"]*"[^>]*data-post="([^"]+)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/g;

    let match;
    while ((match = messageRegex.exec(html)) !== null) {
      const postId = match[1];
      const messageHtml = match[2];

      const post = this.parseMessage(messageHtml, postId, username);
      if (post) {
        posts.push(post);
      }
    }

    // Альтернативный парсинг если основной не сработал
    if (posts.length === 0) {
      const simpleRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
      let simpleMatch;
      let index = 0;

      while ((simpleMatch = simpleRegex.exec(html)) !== null) {
        const content = this.stripHtml(simpleMatch[1]);
        if (content.trim()) {
          posts.push({
            externalId: `${username}/${++index}`,
            title: null,
            content: content.trim(),
            url: `${this.baseUrl}/${username}/${index}`,
            author: `@${username}`,
            publishedAt: new Date(),
          });
        }
      }
    }

    return posts;
  }

  /**
   * Парсинг одного сообщения
   */
  private parseMessage(html: string, postId: string, username: string): ParsedPost | null {
    // Извлекаем текст сообщения
    const textMatch = html.match(
      /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/
    );
    const content = textMatch ? this.stripHtml(textMatch[1]) : "";

    if (!content.trim()) return null;

    // Извлекаем дату
    const dateMatch = html.match(/datetime="([^"]+)"/);
    const publishedAt = dateMatch ? new Date(dateMatch[1]) : new Date();

    // Извлекаем медиа
    const media = this.extractMedia(html);

    // Извлекаем автора (для forwarded сообщений)
    const authorMatch = html.match(/class="tgme_widget_message_owner_name[^"]*"[^>]*>([^<]+)</);
    const author = authorMatch ? this.decodeHtml(authorMatch[1]) : `@${username}`;

    return {
      externalId: postId,
      title: null, // Telegram посты обычно без заголовков
      content: content.trim(),
      url: `${this.baseUrl}/${postId}`,
      author,
      publishedAt,
      media: media.length > 0 ? media : undefined,
    };
  }

  /**
   * Извлечение медиа из сообщения
   */
  private extractMedia(html: string): PostMedia[] {
    const media: PostMedia[] = [];

    // Изображения
    const imageMatches = html.matchAll(/background-image:url\('([^']+)'\)/g);
    for (const match of imageMatches) {
      media.push({
        type: "image",
        url: match[1],
      });
    }

    // Видео превью
    const videoMatch = html.match(/<video[^>]+poster="([^"]+)"/);
    if (videoMatch) {
      media.push({
        type: "video",
        url: videoMatch[1],
        thumbnail: videoMatch[1],
      });
    }

    return media;
  }

  /**
   * Удаление HTML тегов
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  /**
   * Декодирование HTML entities
   */
  private decodeHtml(html: string): string {
    return html
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ");
  }
}

/**
 * Singleton экземпляр парсера
 */
export const telegramParser = new TelegramParser();

/**
 * Быстрый парсинг Telegram канала
 */
export async function parseTelegramChannel(
  url: string,
  options?: ParseOptions
): Promise<ParsedPost[]> {
  const result = await telegramParser.fetchPosts(url, options);
  return result.posts;
}

/**
 * Проверка валидности Telegram URL
 */
export function isValidTelegramUrl(url: string): boolean {
  return telegramParser.isValidSource(url);
}

/**
 * Извлечение username из Telegram URL
 */
export function extractTelegramUsername(url: string): string | null {
  if (url.startsWith("@")) {
    return url.slice(1);
  }

  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const parsed = new URL(fullUrl);
    const path = parsed.pathname.replace(/^\/s\//, "/").replace(/^\//, "");
    return path.split("/")[0] || null;
  } catch {
    return null;
  }
}
