import crypto from "crypto";

import { db } from "@/lib/db";

import type { WebAppUser } from "./types";

/**
 * Валидация initData из Telegram WebApp
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramWebAppData(initData: string): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not defined");
    return false;
  }

  try {
    const urlParams = new URLSearchParams(initData);
    const hash = urlParams.get("hash");

    if (!hash) {
      return false;
    }

    // Удаляем hash из параметров
    urlParams.delete("hash");

    // Сортируем параметры и создаем строку для проверки
    const dataCheckString = Array.from(urlParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Создаем secret key
    const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();

    // Вычисляем hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    return calculatedHash === hash;
  } catch (error) {
    console.error("Error validating Telegram WebApp data:", error);
    return false;
  }
}

/**
 * Проверка срока действия initData (не старше 1 часа)
 */
export function isInitDataFresh(initData: string, maxAgeSeconds: number = 3600): boolean {
  try {
    const urlParams = new URLSearchParams(initData);
    const authDate = urlParams.get("auth_date");

    if (!authDate) {
      return false;
    }

    const authTimestamp = parseInt(authDate, 10);
    const currentTimestamp = Math.floor(Date.now() / 1000);

    return currentTimestamp - authTimestamp <= maxAgeSeconds;
  } catch {
    return false;
  }
}

/**
 * Извлечение данных пользователя из initData
 */
export function extractUserFromInitData(initData: string): WebAppUser | null {
  try {
    const urlParams = new URLSearchParams(initData);
    const userJson = urlParams.get("user");

    if (!userJson) {
      return null;
    }

    return JSON.parse(userJson) as WebAppUser;
  } catch (error) {
    console.error("Error extracting user from initData:", error);
    return null;
  }
}

/**
 * Полная валидация и извлечение пользователя
 */
export function validateAndExtractUser(initData: string): WebAppUser | null {
  if (!validateTelegramWebAppData(initData)) {
    console.warn("Invalid Telegram WebApp data signature");
    return null;
  }

  if (!isInitDataFresh(initData)) {
    console.warn("Telegram WebApp data is too old");
    return null;
  }

  return extractUserFromInitData(initData);
}

/**
 * Получение или создание пользователя по данным из Telegram
 */
export async function getUserFromTelegramData(initData: string) {
  const telegramUser = validateAndExtractUser(initData);

  if (!telegramUser) {
    throw new Error("Invalid Telegram data");
  }

  const telegramId = telegramUser.id.toString();

  // Ищем существующего пользователя
  let user = await db.user.findFirst({
    where: { telegramAccount: { telegramId } },
    include: {
      telegramAccount: true,
      preferences: true,
    },
  });

  if (!user) {
    // Создаем нового пользователя
    user = await db.user.create({
      data: {
        name: telegramUser.first_name,
        telegramAccount: {
          create: {
            telegramId,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            languageCode: telegramUser.language_code,
            photoUrl: telegramUser.photo_url,
          },
        },
        preferences: {
          create: {
            language: telegramUser.language_code === "ru" ? "ru" : "en",
            telegramNotifications: true,
            notifyOnNewSummary: true,
          },
        },
      },
      include: {
        telegramAccount: true,
        preferences: true,
      },
    });
  } else {
    // Обновляем данные Telegram аккаунта
    await db.telegramAccount.update({
      where: { telegramId },
      data: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        languageCode: telegramUser.language_code,
        photoUrl: telegramUser.photo_url,
      },
    });
  }

  return user;
}

/**
 * Валидация webhook запроса
 */
export function validateWebhookRequest(
  secretToken: string | null,
  expectedSecret: string | undefined
): boolean {
  if (!expectedSecret) {
    // Если секрет не настроен, пропускаем проверку
    return true;
  }

  return secretToken === expectedSecret;
}
