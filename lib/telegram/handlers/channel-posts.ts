import { type Bot, type Context } from "grammy";

import { db } from "@/lib/db";

/**
 * Регистрация обработчиков постов из каналов
 *
 * Когда бот добавлен как участник канала, он получает channel_post обновления.
 * Также отслеживаем добавление/удаление бота из каналов через my_chat_member.
 */
export function registerChannelPostHandlers(bot: Bot): void {
  bot.on("channel_post", handleChannelPost);
  bot.on("my_chat_member", handleMyChatMember);
}

/**
 * Обработка нового поста из канала (real-time)
 */
async function handleChannelPost(ctx: Context): Promise<void> {
  const post = ctx.channelPost;
  if (!post) return;

  const chatId = post.chat.id.toString();

  try {
    // Находим все Channel записи, отслеживающие этот канал через бота
    const channels = await db.channel.findMany({
      where: {
        telegramId: chatId,
        sourceType: "telegram_bot",
        isActive: true,
      },
    });

    if (channels.length === 0) return;

    const content = post.text || post.caption || "";
    if (!content) return;

    const externalId = post.message_id.toString();
    const publishedAt = new Date(post.date * 1000);
    const author = post.author_signature || null;

    // Формируем URL поста
    const channelNumericId = chatId.replace(/^-100/, "");
    const postUrl = `https://t.me/c/${channelNumericId}/${post.message_id}`;

    // Сохраняем пост для каждой Channel записи
    for (const channel of channels) {
      await db.post.upsert({
        where: {
          channelId_externalId: {
            channelId: channel.id,
            externalId,
          },
        },
        create: {
          channelId: channel.id,
          externalId,
          title: null,
          content,
          url: postUrl,
          author,
          publishedAt,
        },
        update: {
          content,
          author,
        },
      });
    }
  } catch (error) {
    console.error("Error handling channel post:", error);
  }
}

/**
 * Отслеживание добавления/удаления бота из канала
 */
async function handleMyChatMember(ctx: Context): Promise<void> {
  const update = ctx.myChatMember;
  if (!update || update.chat.type !== "channel") return;

  const chatId = update.chat.id.toString();
  const newStatus = update.new_chat_member.status;
  const botAccess = newStatus === "administrator" || newStatus === "member";

  try {
    await db.channel.updateMany({
      where: { telegramId: chatId, sourceType: "telegram_bot" },
      data: { botAccess },
    });

    console.log(
      `Bot ${botAccess ? "added to" : "removed from"} channel ${chatId} (${update.chat.title})`
    );
  } catch (error) {
    console.error("Error handling chat member update:", error);
  }
}
