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

// ============================================================
// Telegram Login Widget validation
// @see https://core.telegram.org/widgets/login#checking-authorization
// Отличие от Mini App: secret_key = SHA256(bot_token), не HMAC
// ============================================================

export interface LoginWidgetData {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
}

/**
 * Проверяет подпись данных от Telegram Login Widget.
 * Возвращает true если данные валидны и не старше maxAgeSeconds.
 */
export function validateLoginWidgetData(
  data: Record<string, string>,
  maxAgeSeconds = 86400
): boolean {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) return false;

  const { hash, ...rest } = data;
  if (!hash || !rest.auth_date) return false;

  // Проверяем возраст
  const age = Math.floor(Date.now() / 1000) - parseInt(rest.auth_date, 10);
  if (age > maxAgeSeconds) return false;

  // data-check-string: поля отсортированы по ключу, объединены \n
  const dataCheckString = Object.entries(rest)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // secret_key = SHA256(bot_token)  ← не HMAC, в отличие от Mini App
  const secretKey = crypto.createHash("sha256").update(BOT_TOKEN).digest();

  const expectedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  return expectedHash === hash;
}

/**
 * Получить или создать пользователя по данным от Login Widget
 */
export async function getUserFromLoginWidgetData(data: LoginWidgetData) {
  const telegramId = data.id;

  let user = await db.user.findFirst({
    where: { telegramAccount: { telegramId } },
    include: { telegramAccount: true },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: [data.first_name, data.last_name].filter(Boolean).join(" "),
        telegramAccount: {
          create: {
            telegramId,
            username: data.username,
            firstName: data.first_name,
            lastName: data.last_name,
            photoUrl: data.photo_url,
          },
        },
        preferences: {
          create: {
            telegramNotifications: true,
            notifyOnNewSummary: true,
          },
        },
      },
      include: { telegramAccount: true },
    });
  } else {
    await db.telegramAccount.update({
      where: { telegramId },
      data: {
        username: data.username,
        firstName: data.first_name,
        lastName: data.last_name,
        photoUrl: data.photo_url,
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
