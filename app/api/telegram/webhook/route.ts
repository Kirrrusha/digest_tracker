import { NextResponse, type NextRequest } from "next/server";

import { validateWebhookRequest } from "@/lib/telegram/auth";
import { initializeBot } from "@/lib/telegram/bot";

/**
 * POST /api/telegram/webhook
 *
 * Обработка входящих обновлений от Telegram Bot API
 */
export async function POST(req: NextRequest) {
  try {
    // Валидация секретного токена
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    if (!validateWebhookRequest(secretToken, process.env.TELEGRAM_WEBHOOK_SECRET)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Инициализируем бота
    const bot = await initializeBot();

    // Получаем webhook handler и обрабатываем запрос
    const handler = bot.getWebhookHandler();
    return await handler(req);
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/telegram/webhook
 *
 * Установка webhook URL (вызывать при деплое)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    const bot = await initializeBot();

    switch (action) {
      case "set": {
        const webhookUrl = `${process.env.APP_URL}/api/telegram/webhook`;
        await bot.setWebhook(webhookUrl);
        return NextResponse.json({
          success: true,
          message: "Webhook set",
          url: webhookUrl,
        });
      }

      case "delete": {
        await bot.deleteWebhook();
        return NextResponse.json({
          success: true,
          message: "Webhook deleted",
        });
      }

      case "info":
      default: {
        const info = await bot.getWebhookInfo();
        return NextResponse.json({
          success: true,
          webhook: info,
        });
      }
    }
  } catch (error) {
    console.error("Webhook setup error:", error);
    return NextResponse.json({ error: "Failed to manage webhook" }, { status: 500 });
  }
}
