import { InlineKeyboard, type Bot, type Context } from "grammy";

import { db } from "@/lib/db";

import { channelsKeyboard, mainKeyboard, settingsKeyboard } from "../keyboards/reply";

/**
 * Регистрация команд бота
 */
export function registerCommands(bot: Bot): void {
  // /start - регистрация и приветствие
  bot.command("start", handleStart);

  // /subscribe - подписка на канал
  bot.hears(/\/subscribe (.+)/, handleSubscribe);

  // /unsubscribe - отписка от канала
  bot.hears(/\/unsubscribe (.+)/, handleUnsubscribe);

  // /list - список каналов
  bot.command("list", handleList);

  // /summary - получить саммари
  bot.command("summary", handleSummary);

  // /settings - настройки
  bot.command("settings", handleSettings);

  // /help - справка
  bot.command("help", handleHelp);
}

/**
 * Команда /start - регистрация пользователя
 */
async function handleStart(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();
  const username = ctx.from.username;
  const firstName = ctx.from.first_name;
  const lastName = ctx.from.last_name;
  const languageCode = ctx.from.language_code;

  try {
    // Проверяем, есть ли пользователь
    let user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
    });

    if (!user) {
      // Создаем нового пользователя
      user = await db.user.create({
        data: {
          name: firstName,
          telegramAccount: {
            create: {
              telegramId,
              username,
              firstName,
              lastName,
              languageCode,
            },
          },
          preferences: {
            create: {
              language: languageCode === "ru" ? "ru" : "en",
              telegramNotifications: true,
              notifyOnNewSummary: true,
            },
          },
        },
      });
    }

    await ctx.reply(
      `👋 Привет, ${firstName}!\n\n` +
        `Я помогу тебе отслеживать интересный контент по программированию.\n\n` +
        `*Что я умею:*\n` +
        `• 📱 Парсить Telegram каналы и RSS\n` +
        `• 🤖 Генерировать AI саммари\n` +
        `• 🎯 Фильтровать по темам\n` +
        `• 📊 Показывать аналитику\n\n` +
        `Используй команды или открывай Mini App для удобной работы!`,
      {
        parse_mode: "Markdown",
        reply_markup: mainKeyboard(),
      }
    );
  } catch (error) {
    console.error("Error in /start command:", error);
    await ctx.reply("❌ Произошла ошибка при регистрации. Попробуй еще раз.");
  }
}

/**
 * Команда /subscribe - подписка на канал
 */
async function handleSubscribe(ctx: Context): Promise<void> {
  if (!ctx.from || !ctx.match) return;

  const channelUrl = (ctx.match as RegExpMatchArray)[1];
  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
    });

    if (!user) {
      await ctx.reply("❌ Сначала выполни /start");
      return;
    }

    // Проверяем, не добавлен ли уже этот канал
    const existingChannel = await db.channel.findFirst({
      where: {
        userId: user.id,
        sourceUrl: channelUrl,
      },
    });

    if (existingChannel) {
      await ctx.reply("⚠️ Этот канал уже добавлен в твой список.");
      return;
    }

    // Парсим канал и добавляем в БД
    const channel = await db.channel.create({
      data: {
        userId: user.id,
        name: extractChannelName(channelUrl),
        sourceType: "telegram",
        sourceUrl: channelUrl,
        telegramId: extractTelegramId(channelUrl),
        isActive: true,
      },
    });

    await ctx.reply(
      `✅ Канал *${channel.name}* добавлен!\n\nТеперь я буду отслеживать новые посты.`,
      { parse_mode: "Markdown" }
    );
  } catch (error) {
    console.error("Error in /subscribe command:", error);
    await ctx.reply("❌ Не удалось добавить канал. Проверь URL и попробуй снова.");
  }
}

/**
 * Команда /unsubscribe - отписка от канала
 */
async function handleUnsubscribe(ctx: Context): Promise<void> {
  if (!ctx.from || !ctx.match) return;

  const channelName = (ctx.match as RegExpMatchArray)[1];
  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { channels: true },
    });

    if (!user) {
      await ctx.reply("❌ Сначала выполни /start");
      return;
    }

    const channel = user.channels.find(
      (c) => c.name.toLowerCase() === channelName.toLowerCase() || c.telegramId === channelName
    );

    if (!channel) {
      await ctx.reply(`❌ Канал "${channelName}" не найден в твоем списке.`);
      return;
    }

    await db.channel.delete({
      where: { id: channel.id },
    });

    await ctx.reply(`✅ Канал *${channel.name}* удален из списка.`, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    console.error("Error in /unsubscribe command:", error);
    await ctx.reply("❌ Не удалось удалить канал. Попробуй еще раз.");
  }
}

/**
 * Команда /list - список каналов
 */
async function handleList(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { channels: true },
    });

    if (!user?.channels.length) {
      await ctx.reply(
        "📭 У тебя пока нет добавленных каналов.\n\nИспользуй /subscribe <url> для добавления."
      );
      return;
    }

    await ctx.reply("📋 *Твои каналы:*", {
      parse_mode: "Markdown",
      reply_markup: channelsKeyboard(user.channels),
    });
  } catch (error) {
    console.error("Error in /list command:", error);
    await ctx.reply("❌ Не удалось загрузить список каналов.");
  }
}

/**
 * Команда /summary - получить саммари
 */
async function handleSummary(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
    });

    if (!user) {
      await ctx.reply("❌ Сначала выполни /start");
      return;
    }

    // Получаем последнее саммари
    const summary = await db.summary.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!summary) {
      const keyboard = new InlineKeyboard()
        .text("✅ Да, сгенерировать", "generate_summary")
        .text("❌ Отмена", "cancel");

      await ctx.reply(
        "🤖 У тебя пока нет саммари.\n\nСгенерировать новое на основе постов из каналов?",
        {
          reply_markup: keyboard,
        }
      );
      return;
    }

    const keyboard = new InlineKeyboard()
      .webApp("📱 Открыть в Mini App", `${process.env.MINI_APP_URL}/summaries/${summary.id}`)
      .row()
      .text("🔄 Сгенерировать новое", "generate_summary");

    await ctx.reply(formatSummary(summary), {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Error in /summary command:", error);
    await ctx.reply("❌ Не удалось загрузить саммари.");
  }
}

/**
 * Команда /settings - настройки
 */
async function handleSettings(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user) {
      await ctx.reply("❌ Сначала выполни /start");
      return;
    }

    const prefs = user.preferences;
    const notificationsStatus = prefs?.telegramNotifications ? "✅" : "❌";
    const newSummaryStatus = prefs?.notifyOnNewSummary ? "✅" : "❌";
    const newPostsStatus = prefs?.notifyOnNewPosts ? "✅" : "❌";

    await ctx.reply(
      `⚙️ *Настройки*\n\n` +
        `📬 Уведомления: ${notificationsStatus}\n` +
        `📊 О новых саммари: ${newSummaryStatus}\n` +
        `📝 О новых постах: ${newPostsStatus}\n` +
        `🌐 Язык: ${prefs?.language || "ru"}\n` +
        `📅 Интервал саммари: ${prefs?.summaryInterval || "daily"}\n\n` +
        `Выбери, что хочешь изменить:`,
      {
        parse_mode: "Markdown",
        reply_markup: settingsKeyboard(),
      }
    );
  } catch (error) {
    console.error("Error in /settings command:", error);
    await ctx.reply("❌ Не удалось загрузить настройки.");
  }
}

/**
 * Команда /help - справка
 */
async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    `📖 *Справка по командам*\n\n` +
      `/start - начать работу\n` +
      `/subscribe <url> - подписаться на канал\n` +
      `/unsubscribe <name> - отписаться от канала\n` +
      `/list - мои каналы\n` +
      `/summary - последнее саммари\n` +
      `/settings - настройки\n` +
      `/help - эта справка\n\n` +
      `💡 Используй кнопки меню или открой Mini App для удобной работы!`,
    { parse_mode: "Markdown" }
  );
}

// Вспомогательные функции

function extractChannelName(url: string): string {
  const match = url.match(/t\.me\/([^\/]+)/);
  return match ? `@${match[1]}` : url;
}

function extractTelegramId(url: string): string | null {
  const match = url.match(/t\.me\/([^\/]+)/);
  return match ? match[1] : null;
}

function formatSummary(summary: {
  title: string;
  content: string;
  topics: string[];
  createdAt: Date;
}): string {
  const dateStr = summary.createdAt.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    `📊 *${summary.title}*\n` +
    `📅 ${dateStr}\n\n` +
    `${summary.content.slice(0, 3000)}${summary.content.length > 3000 ? "..." : ""}\n\n` +
    `📌 *Темы:* ${summary.topics.join(", ")}`
  );
}
