import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Api, errors } from "telegram";
import { type StringSession } from "telegram/sessions";

import { PrismaService } from "../prisma/prisma.service";
import {
  createClient,
  createClientFromEncrypted,
  decryptSession,
  encryptSession,
  getApiCredentials,
} from "./mtproto-crypto";

import bigInt = require("big-integer");

export interface MTProtoChannelInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string;
  isAlreadyTracked: boolean;
}

@Injectable()
export class MtprotoService {
  private readonly logger = new Logger(MtprotoService.name);

  constructor(private prisma: PrismaService) {}

  async sendCode(phoneNumber: string): Promise<{ phoneCodeHash: string; sessionString: string }> {
    const client = createClient();
    try {
      await client.connect();
      const { apiId, apiHash } = getApiCredentials();
      const { phoneCodeHash } = await client.sendCode({ apiId, apiHash }, phoneNumber);
      const sessionString = (client.session as StringSession).save();
      return { phoneCodeHash, sessionString };
    } catch (error) {
      if (error instanceof errors.FloodWaitError) {
        throw new BadRequestException(`Слишком много попыток. Подождите ${error.seconds} секунд.`);
      }
      if (error instanceof errors.RPCError && error.errorMessage === "PHONE_NUMBER_INVALID") {
        throw new BadRequestException(
          "Неверный номер телефона. Используйте международный формат: +7XXXXXXXXXX"
        );
      }
      if (error instanceof errors.RPCError && error.errorMessage === "PHONE_NUMBER_BANNED") {
        throw new BadRequestException("Этот номер телефона заблокирован в Telegram.");
      }
      throw new BadRequestException(
        "Не удалось отправить код. Проверьте номер и попробуйте снова."
      );
    } finally {
      try {
        await new Promise((r) => setTimeout(r, 1000));
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async signIn(params: {
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
        await client.invoke(new Api.auth.SignIn({ phoneNumber, phoneCodeHash, phoneCode }));
      } catch (error) {
        if (error instanceof errors.RPCError && error.errorMessage === "SESSION_PASSWORD_NEEDED") {
          if (!password) {
            throw new BadRequestException("NEEDS_2FA");
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
        } else if (
          error instanceof errors.RPCError &&
          error.errorMessage === "PHONE_CODE_INVALID"
        ) {
          throw new BadRequestException("Неверный код подтверждения. Попробуйте ещё раз.");
        } else if (
          error instanceof errors.RPCError &&
          error.errorMessage === "PHONE_CODE_EXPIRED"
        ) {
          throw new BadRequestException("Код подтверждения истёк. Запросите новый код.");
        } else {
          throw error;
        }
      }

      const finalSessionString = (client.session as StringSession).save();
      return { sessionString: finalSessionString };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof errors.RPCError && error.errorMessage === "PASSWORD_HASH_INVALID") {
        throw new BadRequestException("Неверный пароль двухфакторной аутентификации.");
      }
      throw new BadRequestException("Не удалось авторизоваться. Попробуйте снова.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async saveSession(userId: string, sessionString: string, phoneNumber: string): Promise<void> {
    const encryptedSession = encryptSession(sessionString);
    const encryptedPhone = encryptSession(phoneNumber);

    await this.prisma.mTProtoSession.upsert({
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

  async listUserChannels(userId: string): Promise<MTProtoChannelInfo[]> {
    const session = await this.prisma.mTProtoSession.findUnique({ where: { userId } });
    if (!session?.isActive) {
      throw new UnauthorizedException(
        "MTProto сессия не найдена или неактивна. Подключите Telegram в настройках."
      );
    }

    const client = createClientFromEncrypted(session.sessionData);
    try {
      await client.connect();
      const dialogs = await client.getDialogs({ limit: 500 });
      const channelDialogs = dialogs.filter((d) => d.isChannel && !d.isGroup);

      const existingChannels = await this.prisma.channel.findMany({
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

      await this.prisma.mTProtoSession.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return result;
    } catch (error) {
      if (error instanceof errors.AuthKeyError) {
        await this.prisma.mTProtoSession.update({
          where: { userId },
          data: { isActive: false },
        });
        throw new UnauthorizedException(
          "MTProto сессия истекла. Необходима повторная авторизация в настройках."
        );
      }
      throw new BadRequestException("Не удалось получить список каналов.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async bulkAddChannels(
    userId: string,
    channels: Array<{
      telegramId: string;
      title: string;
      username?: string | null;
      accessHash: string;
    }>
  ): Promise<{ added: number; errors: string[] }> {
    let added = 0;
    const errs: string[] = [];

    for (const ch of channels) {
      try {
        const sourceUrl = ch.username
          ? `https://t.me/${ch.username}`
          : `mtproto://channel/${ch.telegramId}`;

        const existing = await this.prisma.channel.findFirst({
          where: { userId, telegramId: ch.telegramId },
        });
        if (existing) {
          errs.push(`${ch.title}: уже отслеживается`);
          continue;
        }

        await this.prisma.channel.create({
          data: {
            userId,
            name: ch.title,
            sourceType: "telegram_mtproto",
            sourceUrl,
            telegramId: ch.telegramId,
            accessHash: encryptSession(ch.accessHash),
            isActive: true,
          },
        });
        added++;
      } catch {
        errs.push(`${ch.title}: ошибка добавления`);
      }
    }

    return { added, errors: errs };
  }

  async fetchAndSaveChannelPosts(
    userId: string,
    channelId: string,
    limit = 50
  ): Promise<{ saved: number; skipped: number }> {
    const session = await this.prisma.mTProtoSession.findUnique({ where: { userId } });
    if (!session?.isActive) {
      throw new UnauthorizedException(
        "MTProto сессия не найдена или неактивна. Подключите Telegram в настройках."
      );
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, sourceType: "telegram_mtproto" },
    });
    if (!channel?.telegramId || !channel.accessHash) {
      throw new NotFoundException("Канал не найден или не поддерживает синхронизацию.");
    }

    const decryptedHash = decryptSession(channel.accessHash);

    // Extract username from sourceUrl (https://t.me/username → "username")
    let username: string | null = null;
    if (channel.sourceUrl.startsWith("https://t.me/")) {
      const candidate = channel.sourceUrl.replace("https://t.me/", "").split("/")[0];
      if (candidate) username = candidate;
    }

    const client = createClientFromEncrypted(session.sessionData);
    try {
      await client.connect();

      const peer = username
        ? await client.getInputEntity(username)
        : new Api.InputChannel({
            channelId: bigInt(channel.telegramId),
            accessHash: bigInt(decryptedHash),
          });

      const result = await client.invoke(
        new Api.messages.GetHistory({
          peer,
          limit,
          offsetId: 0,
          offsetDate: 0,
          addOffset: 0,
          maxId: 0,
          minId: 0,
          hash: bigInt(0),
        })
      );

      const sanitize = (text: string): string =>
        text
          .replace(/\x00/g, "") // null bytes — PostgreSQL rejects them
          .replace(/[\uD800-\uDFFF]/g, "") // lone surrogates — break JSON serialization
          // Remove any backslash not starting a valid JSON escape:
          // valid: \" \\ \/ \n \r \t \b \f \uXXXX
          // invalid (e.g. \x, \u with <4 hex digits) cause PostgreSQL JSON parser to fail
          .replace(/\\(?!["\\\/nrtbf]|u[0-9a-fA-F]{4})/g, "");

      const messages = "messages" in result ? result.messages : [];
      const postsData = messages
        .filter((m): m is Api.Message => m instanceof Api.Message && !!m.message)
        .map((m) => ({
          channelId: channel.id,
          externalId: String(m.id),
          title: sanitize(m.message).split("\n")[0].slice(0, 100) || null,
          contentPreview: sanitize(m.message).slice(0, 500),
          url: username
            ? `https://t.me/${username}/${m.id}`
            : `https://t.me/c/${channel.telegramId}/${m.id}`,
          publishedAt: new Date(m.date * 1000),
        }));

      const { count } = await this.prisma.post.createMany({
        data: postsData,
        skipDuplicates: true,
      });

      const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
      if (prefs?.markTelegramAsRead && messages.length > 0) {
        const maxId = Math.max(
          ...messages.filter((m): m is Api.Message => m instanceof Api.Message).map((m) => m.id)
        );
        if (maxId > 0) {
          try {
            await client.invoke(new Api.channels.ReadHistory({ channel: peer, maxId }));
          } catch (e) {
            this.logger.warn(`ReadHistory failed: ${(e as Error)?.message}`);
          }
        }
      }

      await this.prisma.mTProtoSession.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return { saved: count, skipped: postsData.length - count };
    } catch (error) {
      if (error instanceof errors.AuthKeyError) {
        await this.prisma.mTProtoSession.update({
          where: { userId },
          data: { isActive: false },
        });
        throw new UnauthorizedException(
          "MTProto сессия истекла. Необходима повторная авторизация в настройках."
        );
      }
      if (error instanceof UnauthorizedException || error instanceof NotFoundException) throw error;
      this.logger.error(
        `fetchAndSaveChannelPosts error: ${(error as Error)?.message}`,
        (error as Error)?.stack
      );
      throw new BadRequestException("Не удалось получить посты канала.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async hasActiveSession(userId: string): Promise<boolean> {
    const session = await this.prisma.mTProtoSession.findUnique({ where: { userId } });
    return !!session?.isActive;
  }

  async disconnect(userId: string): Promise<void> {
    await this.prisma.mTProtoSession.updateMany({
      where: { userId },
      data: { isActive: false },
    });
  }
}
