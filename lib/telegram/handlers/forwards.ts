import { InlineKeyboard, type Bot, type Context } from "grammy";

import { db } from "@/lib/db";

/**
 * Регистрация обработчиков пересланных сообщений
 */
export function registerForwardHandlers(bot: Bot): void {
  bot.on("message:forward_origin:channel", handleForwardedChannelMessage);
}

/**
 * Обработка пересланного сообщения из канала
 *
 * Когда пользователь пересылает боту сообщение из канала,
 * предлагаем подписаться на этот канал через бота.
 */
async function handleForwardedChannelMessage(ctx: Context): Promise<void> {
  if (!ctx.from || !ctx.msg?.forward_origin) return;

  const origin = ctx.msg.forward_origin;
  if (origin.type !== "channel") return;

  const chat = origin.chat;
  const chatId = chat.id.toString();
  const title = chat.title;
  const username = "username" in chat ? chat.username : null;

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

    // Проверяем дубликаты по telegramId
    const existing = user.channels.find((c) => c.telegramId === chatId);
    if (existing) {
      await ctx.reply(`⚠️ Канал *${escapeMarkdown(title)}* уже в твоём списке.`, {
        parse_mode: "Markdown",
      });
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("✅ Подписаться", `sub_fwd_${chatId}`)
      .text("❌ Отмена", "cancel_fwd");

    const usernameStr = username ? ` (@${username})` : "";

    await ctx.reply(
      `📢 Найден канал: *${escapeMarkdown(title)}*${usernameStr}\n\n` +
        `Добавить в список отслеживаемых?`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  } catch (error) {
    console.error("Error handling forwarded message:", error);
    await ctx.reply("❌ Произошла ошибка.");
  }
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
}
