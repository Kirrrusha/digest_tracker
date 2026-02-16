import { Api, errors } from "telegram";
import { type StringSession } from "telegram/sessions";

import { db } from "@/lib/db";

import { createClient, createClientFromEncrypted, encryptSession } from "./client";

export interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}

function getApiCredentials(): { apiId: number; apiHash: string } {
  const apiId = parseInt(process.env.TELEGRAM_API_ID || "", 10);
  const apiHash = process.env.TELEGRAM_API_HASH;
  if (!apiId || !apiHash) {
    throw new Error("TELEGRAM_API_ID and TELEGRAM_API_HASH are required");
  }
  return { apiId, apiHash };
}

/**
 * Отправляет код подтверждения на номер телефона
 */
export async function sendAuthCode(
  phoneNumber: string
): Promise<{ phoneCodeHash: string; sessionString: string }> {
  const client = createClient();
  try {
    await client.connect();
    const { apiId, apiHash } = getApiCredentials();
    const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phoneNumber);
    const sessionString = (client.session as StringSession).save();
    return { phoneCodeHash, sessionString };
  } catch (error) {
    if (error instanceof errors.FloodWaitError) {
      throw new Error(
        `Слишком много попыток. Подождите ${error.seconds} секунд перед повторной попыткой.`
      );
    }
    if (error instanceof errors.RPCError && error.errorMessage === "PHONE_NUMBER_INVALID") {
      throw new Error("Неверный номер телефона. Используйте международный формат: +7XXXXXXXXXX");
    }
    if (error instanceof errors.RPCError && error.errorMessage === "PHONE_NUMBER_BANNED") {
      throw new Error("Этот номер телефона заблокирован в Telegram.");
    }
    console.error("MTProto sendAuthCode error:", error);
    throw new Error("Не удалось отправить код. Проверьте номер телефона и попробуйте снова.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

/**
 * Завершает авторизацию по коду (и опционально паролю 2FA)
 */
export async function signIn(params: {
  sessionString: string;
  phoneNumber: string;
  phoneCode: string;
  phoneCodeHash: string;
  password?: string;
}): Promise<{ sessionString: string }> {
  const { sessionString, phoneNumber, phoneCode, phoneCodeHash, password } = params;
  const client = createClient(sessionString);
  try {
    await client.connect();
    const { apiId, apiHash } = getApiCredentials();

    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode,
        })
      );
    } catch (error) {
      if (error instanceof errors.RPCError && error.errorMessage === "SESSION_PASSWORD_NEEDED") {
        if (!password) {
          throw new Error("Требуется пароль двухфакторной аутентификации");
        }
        await client.signInWithPassword(
          { apiId, apiHash },
          {
            password: async () => password,
            onError: async (err) => {
              throw err;
            },
          }
        );
      } else if (error instanceof errors.RPCError && error.errorMessage === "PHONE_CODE_INVALID") {
        throw new Error("Неверный код подтверждения. Попробуйте ещё раз.");
      } else if (error instanceof errors.RPCError && error.errorMessage === "PHONE_CODE_EXPIRED") {
        throw new Error("Код подтверждения истёк. Запросите новый код.");
      } else {
        throw error;
      }
    }

    const finalSessionString = (client.session as StringSession).save();
    return { sessionString: finalSessionString };
  } catch (error) {
    if (error instanceof errors.RPCError && error.errorMessage === "PASSWORD_HASH_INVALID") {
      throw new Error("Неверный пароль двухфакторной аутентификации.");
    }
    if (error instanceof Error && error.message.includes("Требуется")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("Неверный")) {
      throw error;
    }
    if (error instanceof Error && error.message.includes("истёк")) {
      throw error;
    }
    console.error("MTProto signIn error:", error);
    throw new Error("Не удалось авторизоваться. Попробуйте снова.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

/**
 * Шифрует и сохраняет MTProto сессию в БД
 */
export async function saveSession(
  userId: string,
  sessionString: string,
  phoneNumber: string
): Promise<void> {
  const encryptedSession = encryptSession(sessionString);
  const encryptedPhone = encryptSession(phoneNumber);

  await db.mTProtoSession.upsert({
    where: { userId },
    create: {
      userId,
      sessionData: encryptedSession,
      phoneNumber: encryptedPhone,
      isActive: true,
    },
    update: {
      sessionData: encryptedSession,
      phoneNumber: encryptedPhone,
      isActive: true,
      lastUsedAt: new Date(),
    },
  });
}

/**
 * Возвращает список Telegram-каналов пользователя через MTProto
 */
export async function listUserChannels(userId: string): Promise<MTProtoChannelInfo[]> {
  const session = await db.mTProtoSession.findUnique({ where: { userId } });

  if (!session || !session.isActive) {
    throw new Error("MTProto сессия не найдена или неактивна. Подключите Telegram в настройках.");
  }

  const client = createClientFromEncrypted(session.sessionData);
  try {
    await client.connect();

    const dialogs = await client.getDialogs({ limit: 500 });
    const channelDialogs = dialogs.filter((d) => d.isChannel && !d.isGroup);

    // Загружаем уже отслеживаемые каналы пользователя
    const existingChannels = await db.channel.findMany({
      where: { userId, sourceType: "telegram_mtproto" },
      select: { telegramId: true },
    });
    const trackedIds = new Set(existingChannels.map((c) => c.telegramId));

    const result: MTProtoChannelInfo[] = [];
    for (const dialog of channelDialogs) {
      const entity = dialog.entity as Api.Channel | undefined;
      if (!entity || !dialog.id) continue;

      const idStr = dialog.id.toString();
      const accessHash = entity.accessHash?.toString() ?? null;
      if (!accessHash) continue;

      result.push({
        id: idStr,
        title: dialog.title ?? entity.title ?? "Без названия",
        username: entity.username ?? null,
        participantsCount: entity.participantsCount ?? null,
        accessHash,
        isAlreadyTracked: trackedIds.has(idStr),
      });
    }

    // Обновляем время последнего использования сессии
    await db.mTProtoSession.update({
      where: { userId },
      data: { lastUsedAt: new Date() },
    });

    return result;
  } catch (error) {
    if (error instanceof errors.AuthKeyError) {
      await db.mTProtoSession.update({
        where: { userId },
        data: { isActive: false },
      });
      throw new Error("MTProto сессия истекла. Необходима повторная авторизация в настройках.");
    }
    console.error("MTProto listUserChannels error:", error);
    throw new Error("Не удалось получить список каналов.");
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore disconnect errors
    }
  }
}

/**
 * Деактивирует MTProto сессию пользователя
 */
export async function disconnectSession(userId: string): Promise<void> {
  await db.mTProtoSession.updateMany({
    where: { userId },
    data: { isActive: false },
  });
}
