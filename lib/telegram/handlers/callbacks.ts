import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";

import { db } from "@/lib/db";

/**
 * Регистрация обработчиков callback queries
 */
export function registerCallbackHandlers(bot: Bot): void {
  // Управление каналами
  bot.callbackQuery(/^channel_(.+)$/, handleChannelAction);
  bot.callbackQuery(/^toggle_channel_(.+)$/, handleToggleChannel);
  bot.callbackQuery(/^delete_channel_(.+)$/, handleDeleteChannel);
  bot.callbackQuery(/^confirm_delete_(.+)$/, handleConfirmDelete);

  // Саммари
  bot.callbackQuery("generate_summary", handleGenerateSummary);

  // Настройки
  bot.callbackQuery("toggle_notifications", handleToggleNotifications);
  bot.callbackQuery("toggle_summary_notify", handleToggleSummaryNotify);
  bot.callbackQuery("toggle_posts_notify", handleTogglePostsNotify);
  bot.callbackQuery(/^set_language_(.+)$/, handleSetLanguage);
  bot.callbackQuery(/^set_interval_(.+)$/, handleSetInterval);

  // Общие
  bot.callbackQuery("cancel", handleCancel);
  bot.callbackQuery("back_to_settings", handleBackToSettings);
  bot.callbackQuery("back_to_channels", handleBackToChannels);
}

/**
 * Действие с каналом - показать меню управления
 */
async function handleChannelAction(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.match || !ctx.from) return;

  const channelId = (ctx.match as RegExpMatchArray)[1];

  try {
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      await ctx.editMessageText("❌ Канал не найден.");
      return;
    }

    const statusEmoji = channel.isActive ? "✅" : "⏸";
    const toggleText = channel.isActive ? "⏸ Приостановить" : "▶️ Возобновить";

    const keyboard = new InlineKeyboard()
      .text(toggleText, `toggle_channel_${channelId}`)
      .row()
      .text("🗑 Удалить", `delete_channel_${channelId}`)
      .row()
      .text("« Назад к списку", "back_to_channels");

    await ctx.editMessageText(
      `📢 *${channel.name}*\n\n` +
        `📊 Статус: ${statusEmoji} ${channel.isActive ? "Активен" : "Приостановлен"}\n` +
        `🔗 ${channel.sourceUrl}\n` +
        `📅 Добавлен: ${channel.createdAt.toLocaleDateString("ru-RU")}`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error in channel action:", error);
    await ctx.editMessageText("❌ Произошла ошибка.");
  }
}

/**
 * Переключение статуса канала
 */
async function handleToggleChannel(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.match) return;

  const channelId = (ctx.match as RegExpMatchArray)[1];

  try {
    const channel = await db.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel) {
      await ctx.editMessageText("❌ Канал не найден.");
      return;
    }

    const updated = await db.channel.update({
      where: { id: channelId },
      data: { isActive: !channel.isActive },
    });

    const statusEmoji = updated.isActive ? "✅" : "⏸";
    const toggleText = updated.isActive ? "⏸ Приостановить" : "▶️ Возобновить";

    const keyboard = new InlineKeyboard()
      .text(toggleText, `toggle_channel_${channelId}`)
      .row()
      .text("🗑 Удалить", `delete_channel_${channelId}`)
      .row()
      .text("« Назад к списку", "back_to_channels");

    await ctx.editMessageText(
      `📢 *${updated.name}*\n\n` +
        `📊 Статус: ${statusEmoji} ${updated.isActive ? "Активен" : "Приостановлен"}\n` +
        `🔗 ${updated.sourceUrl}\n` +
        `📅 Добавлен: ${updated.createdAt.toLocaleDateString("ru-RU")}`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error toggling channel:", error);
    await ctx.editMessageText("❌ Произошла ошибка.");
  }
}

/**
 * Подтверждение удаления канала
 */
async function handleDeleteChannel(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.match) return;

  const channelId = (ctx.match as RegExpMatchArray)[1];

  const keyboard = new InlineKeyboard()
    .text("✅ Да, удалить", `confirm_delete_${channelId}`)
    .text("❌ Отмена", `channel_${channelId}`);

  await ctx.editMessageText("⚠️ Вы уверены, что хотите удалить этот канал?", {
    reply_markup: keyboard,
  });
}

/**
 * Удаление канала
 */
async function handleConfirmDelete(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery("Канал удален");

  if (!ctx.match) return;

  const channelId = (ctx.match as RegExpMatchArray)[1];

  try {
    await db.channel.delete({
      where: { id: channelId },
    });

    // Вернуться к списку каналов
    await handleBackToChannels(ctx);
  } catch (error) {
    console.error("Error deleting channel:", error);
    await ctx.editMessageText("❌ Не удалось удалить канал.");
  }
}

/**
 * Генерация саммари
 */
async function handleGenerateSummary(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery("Генерирую саммари...");

  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    await ctx.editMessageText("🔄 Генерирую саммари...\n\nЭто может занять некоторое время.");

    // TODO: Вызвать реальную генерацию саммари через AI
    // const summary = await generateDailySummary(user.id);

    // Пока просто показываем сообщение
    const keyboard = new InlineKeyboard().webApp(
      "📱 Открыть Mini App",
      process.env.MINI_APP_URL || ""
    );

    await ctx.editMessageText(
      "✅ Саммари сгенерировано!\n\nОткрой Mini App чтобы посмотреть результат.",
      { reply_markup: keyboard }
    );
  } catch (error) {
    console.error("Error generating summary:", error);
    await ctx.editMessageText("❌ Не удалось сгенерировать саммари. Попробуй позже.");
  }
}

/**
 * Переключение уведомлений
 */
async function handleToggleNotifications(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    await db.userPreferences.update({
      where: { id: user.preferences.id },
      data: { telegramNotifications: !user.preferences.telegramNotifications },
    });

    await handleBackToSettings(ctx);
  } catch (error) {
    console.error("Error toggling notifications:", error);
  }
}

/**
 * Переключение уведомлений о саммари
 */
async function handleToggleSummaryNotify(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    await db.userPreferences.update({
      where: { id: user.preferences.id },
      data: { notifyOnNewSummary: !user.preferences.notifyOnNewSummary },
    });

    await handleBackToSettings(ctx);
  } catch (error) {
    console.error("Error toggling summary notify:", error);
  }
}

/**
 * Переключение уведомлений о постах
 */
async function handleTogglePostsNotify(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    await db.userPreferences.update({
      where: { id: user.preferences.id },
      data: { notifyOnNewPosts: !user.preferences.notifyOnNewPosts },
    });

    await handleBackToSettings(ctx);
  } catch (error) {
    console.error("Error toggling posts notify:", error);
  }
}

/**
 * Установка языка
 */
async function handleSetLanguage(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.from || !ctx.match) return;

  const language = (ctx.match as RegExpMatchArray)[1];
  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    await db.userPreferences.update({
      where: { id: user.preferences.id },
      data: { language },
    });

    await handleBackToSettings(ctx);
  } catch (error) {
    console.error("Error setting language:", error);
  }
}

/**
 * Установка интервала саммари
 */
async function handleSetInterval(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery();

  if (!ctx.from || !ctx.match) return;

  const interval = (ctx.match as RegExpMatchArray)[1];
  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    await db.userPreferences.update({
      where: { id: user.preferences.id },
      data: { summaryInterval: interval },
    });

    await handleBackToSettings(ctx);
  } catch (error) {
    console.error("Error setting interval:", error);
  }
}

/**
 * Отмена действия
 */
async function handleCancel(ctx: Context): Promise<void> {
  await ctx.answerCallbackQuery("Отменено");
  await ctx.deleteMessage();
}

/**
 * Возврат к настройкам
 */
async function handleBackToSettings(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { preferences: true },
    });

    if (!user?.preferences) return;

    const prefs = user.preferences;
    const notificationsStatus = prefs.telegramNotifications ? "✅" : "❌";
    const newSummaryStatus = prefs.notifyOnNewSummary ? "✅" : "❌";
    const newPostsStatus = prefs.notifyOnNewPosts ? "✅" : "❌";

    const keyboard = new InlineKeyboard()
      .text(`${notificationsStatus} Уведомления`, "toggle_notifications")
      .row()
      .text(`${newSummaryStatus} О новых саммари`, "toggle_summary_notify")
      .row()
      .text(`${newPostsStatus} О новых постах`, "toggle_posts_notify")
      .row()
      .text(`🌐 Язык: ${prefs.language}`, "show_language_options")
      .row()
      .text(`📅 Интервал: ${prefs.summaryInterval}`, "show_interval_options");

    await ctx.editMessageText(
      `⚙️ *Настройки*\n\n` +
        `Нажми на параметр, чтобы изменить его:`,
      {
        parse_mode: "Markdown",
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    console.error("Error in back to settings:", error);
  }
}

/**
 * Возврат к списку каналов
 */
async function handleBackToChannels(ctx: Context): Promise<void> {
  if (!ctx.from) return;

  const telegramId = ctx.from.id.toString();

  try {
    const user = await db.user.findFirst({
      where: { telegramAccount: { telegramId } },
      include: { channels: true },
    });

    if (!user?.channels.length) {
      await ctx.editMessageText(
        "📭 У тебя пока нет добавленных каналов.\n\nИспользуй /subscribe <url> для добавления."
      );
      return;
    }

    const keyboard = new InlineKeyboard();
    user.channels.forEach((channel) => {
      const statusEmoji = channel.isActive ? "✅" : "⏸";
      keyboard.text(`${statusEmoji} ${channel.name}`, `channel_${channel.id}`).row();
    });

    await ctx.editMessageText("📋 *Твои каналы:*", {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error("Error in back to channels:", error);
  }
}
