import { db } from "@/lib/db";

import type { ChannelInfo, ContentParser, ParseOptions, ParseResult } from "./types";

/**
 * Парсер для каналов, подключённых через бота
 *
 * Минимальная реализация для совместимости с ParserFactory.
 * Посты приходят push-based через webhook (channel_post),
 * поэтому fetchPosts() возвращает пустой результат.
 */
export class TelegramBotParser implements ContentParser {
  readonly type = "telegram_bot" as const;

  /**
   * Проверка валидности URL источника
   * Поддерживает формат tg://channel/{chatId} и обычные t.me ссылки
   */
  isValidSource(url: string): boolean {
    return /^tg:\/\/channel\//.test(url) || /^https?:\/\/t\.me\//.test(url);
  }

  /**
   * Получение информации о канале из БД
   */
  async getChannelInfo(url: string): Promise<ChannelInfo> {
    const channel = await db.channel.findFirst({
      where: { sourceUrl: url, sourceType: "telegram_bot" },
    });

    return {
      name: channel?.name || "Telegram Channel",
      description: channel?.description || null,
      url,
      imageUrl: channel?.imageUrl || null,
    };
  }

  /**
   * Посты push-based через webhook — возвращаем пустой результат
   */
  async fetchPosts(url: string, _options?: ParseOptions): Promise<ParseResult> {
    const info = await this.getChannelInfo(url);
    return {
      channel: info,
      posts: [],
    };
  }
}

export const telegramBotParser = new TelegramBotParser();
