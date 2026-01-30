import { Bot, InlineKeyboard, webhookCallback } from "grammy";

import { db } from "@/lib/db";

import { registerCallbackHandlers } from "./handlers/callbacks";
import { registerCommands } from "./handlers/commands";
import type { SummaryInfo } from "./types";

/**
 * DevDigest Telegram Bot
 *
 * Основной класс для работы с Telegram Bot API через grammy
 */
export class DevDigestBot {
  private bot: Bot;
  private isInitialized = false;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN is not defined");
    }
    this.bot = new Bot(token);
  }

  /**
   * Инициализация обработчиков бота
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Регистрируем обработчики
    registerCommands(this.bot);
    registerCallbackHandlers(this.bot);

    // Обработка ошибок
    this.bot.catch((err) => {
      console.error("Bot error:", err);
    });

    this.isInitialized = true;
  }

  /**
   * Запуск бота в polling режиме (для development)
   */
  async startPolling(): Promise<void> {
    await this.initialize();

    if (process.env.NODE_ENV === "development") {
      console.log("Starting bot in polling mode...");
      await this.bot.start();
    }
  }

  /**
   * Остановка бота
   */
  async stop(): Promise<void> {
    await this.bot.stop();
  }

  /**
   * Получить webhook handler для Next.js API route
   */
  getWebhookHandler() {
    return webhookCallback(this.bot, "std/http");
  }

  /**
   * Установить webhook URL
   */
  async setWebhook(url: string): Promise<void> {
    await this.bot.api.setWebhook(url, {
      secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
    });
  }

  /**
   * Удалить webhook
   */
  async deleteWebhook(): Promise<void> {
    await this.bot.api.deleteWebhook();
  }

  /**
   * Получить информацию о webhook
   */
  async getWebhookInfo() {
    return await this.bot.api.getWebhookInfo();
  }

  /**
   * Отправка текстового сообщения пользователю
   */
  async sendMessage(
    telegramId: string,
    text: string,
    options?: {
      parseMode?: "Markdown" | "MarkdownV2" | "HTML";
      disableLinkPreview?: boolean;
      replyMarkup?: InlineKeyboard;
    }
  ): Promise<void> {
    await this.bot.api.sendMessage(telegramId, text, {
      parse_mode: options?.parseMode ?? "Markdown",
      link_preview_options: { is_disabled: options?.disableLinkPreview ?? false },
      reply_markup: options?.replyMarkup,
    });
  }

  /**
   * Отправка саммари пользователю
   */
  async sendSummary(telegramId: string, summary: SummaryInfo): Promise<void> {
    const formattedContent = this.formatSummary(summary);

    const keyboard = new InlineKeyboard()
      .webApp("📖 Читать полностью", `${process.env.MINI_APP_URL}/summaries/${summary.id}`)
      .row()
      .webApp("📱 Открыть Mini App", process.env.MINI_APP_URL!);

    await this.sendMessage(telegramId, formattedContent, {
      parseMode: "Markdown",
      replyMarkup: keyboard,
    });
  }

  /**
   * Уведомление о новом саммари
   */
  async notifyNewSummary(userId: string, summaryId: string): Promise<void> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        telegramAccount: true,
        preferences: true,
      },
    });

    // Проверяем настройки уведомлений
    if (!user?.telegramAccount) return;
    if (user.preferences?.telegramNotifications === false) return;
    if (user.preferences?.notifyOnNewSummary === false) return;

    const summary = await db.summary.findUnique({
      where: { id: summaryId },
    });

    if (!summary) return;

    const keyboard = new InlineKeyboard()
      .webApp("📖 Читать", `${process.env.MINI_APP_URL}/summaries/${summaryId}`)
      .row()
      .webApp("📱 Открыть Mini App", process.env.MINI_APP_URL!);

    await this.bot.api.sendMessage(
      user.telegramAccount.telegramId,
      `🔔 *Новое саммари готово!*\n\n📊 ${summary.title}\n\n📌 Темы: ${summary.topics.join(", ")}`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  }

  /**
   * Форматирование саммари для Telegram
   */
  private formatSummary(summary: SummaryInfo): string {
    return (
      `📊 *${summary.title}*\n\n` +
      `${summary.content.slice(0, 3500)}${summary.content.length > 3500 ? "..." : ""}\n\n` +
      `📌 *Темы:* ${summary.topics.join(", ")}`
    );
  }

  /**
   * Получить экземпляр бота для прямого доступа
   */
  getBot(): Bot {
    return this.bot;
  }
}

// Singleton instance
let botInstance: DevDigestBot | null = null;

/**
 * Получить singleton экземпляр бота
 */
export function getDevDigestBot(): DevDigestBot {
  if (!botInstance) {
    botInstance = new DevDigestBot();
  }
  return botInstance;
}

/**
 * Инициализировать и вернуть бота
 */
export async function initializeBot(): Promise<DevDigestBot> {
  const bot = getDevDigestBot();
  await bot.initialize();
  return bot;
}
