/**
 * Типы источников контента
 */
export type SourceType = "telegram" | "rss";

/**
 * Распарсенный пост из любого источника
 */
export interface ParsedPost {
  externalId: string;
  title: string | null;
  content: string;
  url: string | null;
  author: string | null;
  publishedAt: Date;
  media?: PostMedia[];
}

/**
 * Медиа-контент поста
 */
export interface PostMedia {
  type: "image" | "video" | "document" | "audio";
  url: string;
  thumbnail?: string;
  caption?: string;
}

/**
 * Информация о канале/фиде
 */
export interface ChannelInfo {
  name: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  subscribersCount?: number;
  postsCount?: number;
}

/**
 * Результат парсинга
 */
export interface ParseResult {
  channel: ChannelInfo;
  posts: ParsedPost[];
  nextCursor?: string;
}

/**
 * Опции парсинга
 */
export interface ParseOptions {
  limit?: number;
  since?: Date;
  cursor?: string;
}

/**
 * Интерфейс парсера контента
 */
export interface ContentParser {
  /**
   * Тип источника
   */
  readonly type: SourceType;

  /**
   * Проверка валидности URL источника
   */
  isValidSource(url: string): boolean;

  /**
   * Получение информации о канале/фиде
   */
  getChannelInfo(url: string): Promise<ChannelInfo>;

  /**
   * Парсинг постов из источника
   */
  fetchPosts(url: string, options?: ParseOptions): Promise<ParseResult>;

  /**
   * Парсинг одного поста по URL
   */
  fetchPost?(postUrl: string): Promise<ParsedPost | null>;
}

/**
 * Ошибка парсинга
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public readonly source: string,
    public readonly code: ParseErrorCode
  ) {
    super(message);
    this.name = "ParseError";
  }
}

/**
 * Коды ошибок парсинга
 */
export enum ParseErrorCode {
  INVALID_URL = "INVALID_URL",
  SOURCE_NOT_FOUND = "SOURCE_NOT_FOUND",
  ACCESS_DENIED = "ACCESS_DENIED",
  RATE_LIMITED = "RATE_LIMITED",
  PARSE_FAILED = "PARSE_FAILED",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN = "UNKNOWN",
}
