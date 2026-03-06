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
  createClientForDC,
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

export interface MTProtoGroupInfo {
  id: string;
  title: string;
  username: string | null;
  participantsCount: number | null;
  accessHash: string | null; // null для basic groups (chatId достаточен)
  groupType: "group" | "supergroup" | "forum";
  isAlreadyTracked: boolean;
}

export interface MTProtoFolderInfo {
  id: number;
  title: string;
  channels: MTProtoChannelInfo[];
}

export interface FetchedMessage {
  title: string | null;
  content: string;
  url: string | null;
  channelName: string;
  publishedAt: Date;
}

@Injectable()
export class MtprotoService {
  private readonly logger = new Logger(MtprotoService.name);

  constructor(private prisma: PrismaService) {}

  async sendCode(
    phoneNumber: string
  ): Promise<{ phoneCodeHash: string; sessionString: string; codeVia: "app" | "sms" | "other" }> {
    const client = createClient();
    try {
      await client.connect();
      const { apiId, apiHash } = getApiCredentials();
      this.logger.log(`sendCode: apiId=${apiId}, phone=${phoneNumber.slice(0, 4)}****`);
      const { phoneCodeHash, isCodeViaApp } = await client.sendCode(
        { apiId, apiHash },
        phoneNumber
      );
      const sessionString = (client.session as StringSession).save();
      this.logger.log(
        `sendCode success: isCodeViaApp=${isCodeViaApp}, hashPrefix=${phoneCodeHash.slice(0, 8)}, sessionLen=${sessionString.length}`
      );
      return { phoneCodeHash, sessionString, codeVia: isCodeViaApp ? "app" : "sms" };
    } catch (error) {
      this.logger.error(`sendCode error: ${(error as Error)?.message}`, (error as Error)?.stack);
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

  async resendCode(params: {
    sessionString: string;
    phoneNumber: string;
    phoneCodeHash: string;
  }): Promise<{ phoneCodeHash: string; sessionString: string; codeVia: "app" | "sms" | "other" }> {
    const client = createClient(params.sessionString);
    try {
      await client.connect();
      const result = await client.invoke(
        new Api.auth.ResendCode({
          phoneNumber: params.phoneNumber,
          phoneCodeHash: params.phoneCodeHash,
        })
      );
      const sessionString = (client.session as StringSession).save();
      if (!(result instanceof Api.auth.SentCode)) {
        throw new BadRequestException("Не удалось переотправить код. Попробуйте позже.");
      }
      let codeVia: "app" | "sms" | "other" = "other";
      if (result.type instanceof Api.auth.SentCodeTypeApp) codeVia = "app";
      else if (result.type instanceof Api.auth.SentCodeTypeSms) codeVia = "sms";
      return { phoneCodeHash: result.phoneCodeHash, sessionString, codeVia };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof errors.FloodWaitError) {
        throw new BadRequestException(`Слишком много попыток. Подождите ${error.seconds} секунд.`);
      }
      if (error instanceof errors.RPCError && error.errorMessage === "SEND_CODE_UNAVAILABLE") {
        throw new BadRequestException(
          "Переотправка кода недоступна. Используйте код из приложения Telegram или запросите новый код."
        );
      }
      this.logger.error(`resendCode error: ${(error as Error)?.message}`, (error as Error)?.stack);
      throw new BadRequestException("Не удалось переотправить код. Попробуйте позже.");
    } finally {
      try {
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

  async saveSession(userId: string, sessionString: string, phoneNumber?: string): Promise<void> {
    const encryptedSession = encryptSession(sessionString);
    const encryptedPhone = phoneNumber ? encryptSession(phoneNumber) : null;

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
        ...(encryptedPhone !== null && { phoneNumber: encryptedPhone }),
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async qrStart(): Promise<{ token: string; expires: number; sessionString: string }> {
    this.logger.log("qrStart: creating new session (new auth key)");
    const client = createClient();
    try {
      await client.connect();
      const { apiId, apiHash } = getApiCredentials();
      const result = await client.invoke(
        new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] })
      );
      const sessionString = (client.session as StringSession).save();
      this.logger.log(
        `qrStart: ExportLoginToken result type=${result.className}, sessionLen=${sessionString.length}`
      );
      if (result instanceof Api.auth.LoginToken) {
        const token = Buffer.from(result.token as Buffer).toString("base64url");
        this.logger.log(
          `qrStart: token=${token.slice(0, 12)}..., expires=${new Date(result.expires * 1000).toISOString()}`
        );
        return { token, expires: result.expires, sessionString };
      }
      throw new BadRequestException("Не удалось создать QR-код");
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`qrStart error: ${(error as Error)?.message}`, (error as Error)?.stack);
      throw new BadRequestException("Не удалось создать QR-код для авторизации");
    } finally {
      try {
        await new Promise((r) => setTimeout(r, 500));
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async qrPoll(
    userId: string,
    sessionString: string
  ): Promise<
    | { status: "pending"; token: string; expires: number; sessionString: string }
    | { status: "success" }
    | { status: "needs2FA"; sessionString: string }
    | { status: "expired" }
  > {
    this.logger.log(`qrPoll: userId=${userId}, sessionLen=${sessionString.length}`);
    const client = createClient(sessionString);
    try {
      await client.connect();
      const { apiId, apiHash } = getApiCredentials();
      const result = await client.invoke(
        new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] })
      );
      this.logger.log(`qrPoll: ExportLoginToken result type=${result.className}`);

      if (result instanceof Api.auth.LoginToken) {
        const newSessionString = (client.session as StringSession).save();
        const token = Buffer.from(result.token as Buffer).toString("base64url");
        this.logger.log(`qrPoll: status=pending, token=${token.slice(0, 12)}...`);
        return {
          status: "pending",
          token,
          expires: result.expires,
          sessionString: newSessionString,
        };
      }

      if (result instanceof Api.auth.LoginTokenSuccess) {
        const auth = result.authorization;
        if (auth instanceof Api.auth.Authorization) {
          const sessionStr = (client.session as StringSession).save();
          const user = auth.user;
          const phone = user instanceof Api.User ? (user.phone ?? undefined) : undefined;
          this.logger.log(
            `qrPoll: status=success (direct), userId=${userId}, phone=${phone?.slice(0, 4)}****`
          );
          await this.saveSession(userId, sessionStr, phone);
          return { status: "success" };
        }
      }

      if (result instanceof Api.auth.LoginTokenMigrateTo) {
        const dcId = result.dcId;
        const token = result.token;

        // _switchDC hangs in some gramJS versions — use a fresh client for the target DC instead
        const dc = await (
          client as unknown as {
            getDC: (id: number) => Promise<{ ipAddress: string; port: number }>;
          }
        ).getDC(dcId);
        this.logger.log(
          `qrPoll: LoginTokenMigrateTo → DC${dcId} (${dc.ipAddress}:${dc.port}), destroying old client...`
        );

        try {
          await client.destroy();
        } catch {
          /* ignore */
        }

        const dcClient = createClientForDC(dcId, dc.ipAddress, dc.port);
        try {
          await dcClient.connect();
          this.logger.log(`qrPoll: connected to DC${dcId}, calling ImportLoginToken...`);

          const migrateResult = await dcClient.invoke(new Api.auth.ImportLoginToken({ token }));
          this.logger.log(`qrPoll: ImportLoginToken result type=${migrateResult.className}`);

          if (
            migrateResult instanceof Api.auth.LoginTokenSuccess &&
            migrateResult.authorization instanceof Api.auth.Authorization
          ) {
            const sessionStr = (dcClient.session as StringSession).save();
            const user = migrateResult.authorization.user;
            const phone = user instanceof Api.User ? (user.phone ?? undefined) : undefined;
            this.logger.log(`qrPoll: status=success (after DC migration), userId=${userId}`);
            await this.saveSession(userId, sessionStr, phone);
            return { status: "success" };
          }
          this.logger.warn(
            `qrPoll: ImportLoginToken returned unexpected type=${migrateResult.className}`
          );
        } catch (migrateError) {
          const errMsg = (migrateError as Error & { errorMessage?: string })?.errorMessage;
          this.logger.log(`qrPoll: ImportLoginToken error=${errMsg}`);
          if (errMsg === "SESSION_PASSWORD_NEEDED") {
            const sessionStr = (dcClient.session as StringSession).save();
            this.logger.log(`qrPoll: status=needs2FA, sessionLen=${sessionStr.length}`);
            return { status: "needs2FA", sessionString: sessionStr };
          }
          throw migrateError;
        } finally {
          try {
            await dcClient.destroy();
          } catch {
            /* ignore */
          }
        }
      }

      this.logger.warn(`qrPoll: status=expired, result type=${result.className}`);
      return { status: "expired" };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`qrPoll error: ${(error as Error)?.message}`, (error as Error)?.stack);
      throw new BadRequestException("Ошибка при проверке QR-кода");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async qrVerify2fa(userId: string, sessionString: string, password: string): Promise<void> {
    this.logger.log(`qrVerify2fa: userId=${userId}, sessionLen=${sessionString.length}`);
    const client = createClient(sessionString);
    try {
      await client.connect();
      const { apiId, apiHash } = getApiCredentials();
      this.logger.log("qrVerify2fa: calling signInWithPassword...");
      await client.signInWithPassword(
        { apiId, apiHash },
        {
          password: async () => password,
          onError: async (err) => {
            throw err;
          },
        }
      );
      const finalSession = (client.session as StringSession).save();
      this.logger.log(`qrVerify2fa: success, saving session sessionLen=${finalSession.length}`);
      await this.saveSession(userId, finalSession);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const errMsg = (error as Error & { errorMessage?: string })?.errorMessage;
      this.logger.error(
        `qrVerify2fa error: errMsg=${errMsg}, message=${(error as Error)?.message}`
      );
      if (errMsg === "PASSWORD_HASH_INVALID") {
        throw new BadRequestException("Неверный пароль двухфакторной аутентификации.");
      }
      throw new BadRequestException("Не удалось подтвердить 2FA. Попробуйте снова.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
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

  async listUserGroups(userId: string): Promise<MTProtoGroupInfo[]> {
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
      const groupDialogs = dialogs.filter((d) => d.isGroup);

      const existingChannels = await this.prisma.channel.findMany({
        where: { userId, sourceType: "telegram_mtproto", isGroup: true },
        select: { telegramId: true },
      });
      const trackedIds = new Set(existingChannels.map((c) => c.telegramId));

      const result: MTProtoGroupInfo[] = [];
      for (const dialog of groupDialogs) {
        if (!dialog.id) continue;
        const idStr = dialog.id.toString();

        // Supergroup и forum — entity: Api.Channel
        if (dialog.isChannel) {
          const entity = dialog.entity as Api.Channel | undefined;
          if (!entity) continue;
          const accessHash = entity.accessHash?.toString() ?? null;
          if (!accessHash) continue;
          const groupType: "supergroup" | "forum" = entity.forum ? "forum" : "supergroup";
          result.push({
            id: idStr,
            title: dialog.title ?? entity.title ?? "Без названия",
            username: entity.username ?? null,
            participantsCount: entity.participantsCount ?? null,
            accessHash,
            groupType,
            isAlreadyTracked: trackedIds.has(idStr),
          });
        } else {
          // Basic group — entity: Api.Chat
          const entity = dialog.entity as Api.Chat | undefined;
          if (!entity) continue;
          result.push({
            id: idStr,
            title: dialog.title ?? entity.title ?? "Без названия",
            username: null,
            participantsCount: entity.participantsCount ?? null,
            accessHash: null,
            groupType: "group",
            isAlreadyTracked: trackedIds.has(idStr),
          });
        }
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
      throw new BadRequestException("Не удалось получить список групп.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async bulkAddGroups(
    userId: string,
    groups: Array<{
      telegramId: string;
      title: string;
      username?: string | null;
      accessHash?: string | null;
      groupType: "group" | "supergroup" | "forum";
    }>
  ): Promise<{ added: number; errors: string[] }> {
    let added = 0;
    const errs: string[] = [];

    for (const g of groups) {
      try {
        const sourceUrl = g.username
          ? `https://t.me/${g.username}`
          : `mtproto://group/${g.telegramId}`;

        const existing = await this.prisma.channel.findFirst({
          where: { userId, telegramId: g.telegramId },
        });
        if (existing) {
          errs.push(`${g.title}: уже отслеживается`);
          continue;
        }

        await this.prisma.channel.create({
          data: {
            userId,
            name: g.title,
            sourceType: "telegram_mtproto",
            sourceUrl,
            telegramId: g.telegramId,
            accessHash: g.accessHash ? encryptSession(g.accessHash) : null,
            isActive: true,
            isGroup: true,
            groupType: g.groupType,
          },
        });
        added++;
      } catch {
        errs.push(`${g.title}: ошибка добавления`);
      }
    }

    return { added, errors: errs };
  }

  async fetchMessages(userId: string, channelId: string, limit = 50): Promise<FetchedMessage[]> {
    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId },
      select: { isGroup: true },
    });
    if (!channel) throw new NotFoundException("Канал не найден.");
    return channel.isGroup
      ? this.fetchGroupMessages(userId, channelId, limit)
      : this.fetchChannelMessages(userId, channelId, limit);
  }

  async fetchChannelMessages(
    userId: string,
    channelId: string,
    limit = 50
  ): Promise<FetchedMessage[]> {
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
        : new Api.InputPeerChannel({
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
          .replace(/\x00/g, "")
          .replace(/[\uD800-\uDFFF]/g, "")
          .replace(/\\(?!["\\\/nrtbf]|u[0-9a-fA-F]{4})/g, "");

      const messages = "messages" in result ? result.messages : [];

      const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
      if (prefs?.markTelegramAsRead && messages.length > 0) {
        const maxId = Math.max(
          ...messages.filter((m): m is Api.Message => m instanceof Api.Message).map((m) => m.id)
        );
        if (maxId > 0) {
          try {
            const inputChannel =
              peer instanceof Api.InputPeerChannel
                ? new Api.InputChannel({ channelId: peer.channelId, accessHash: peer.accessHash })
                : (peer as unknown as Api.TypeInputChannel);
            await client.invoke(new Api.channels.ReadHistory({ channel: inputChannel, maxId }));
          } catch (e) {
            this.logger.warn(`ReadHistory failed: ${(e as Error)?.message}`);
          }
        }
      }

      await this.prisma.mTProtoSession.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return messages
        .filter((m): m is Api.Message => m instanceof Api.Message && !!m.message)
        .map((m) => ({
          title: sanitize(m.message).split("\n")[0].slice(0, 100) || null,
          content: sanitize(m.message).slice(0, 500),
          url: username
            ? `https://t.me/${username}/${m.id}`
            : `https://t.me/c/${channel.telegramId}/${m.id}`,
          channelName: channel.name,
          publishedAt: new Date(m.date * 1000),
        }));
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
        `fetchChannelMessages error: ${(error as Error)?.message}`,
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

  async fetchGroupMessages(
    userId: string,
    channelId: string,
    limit = 50
  ): Promise<FetchedMessage[]> {
    const session = await this.prisma.mTProtoSession.findUnique({ where: { userId } });
    if (!session?.isActive) {
      throw new UnauthorizedException(
        "MTProto сессия не найдена или неактивна. Подключите Telegram в настройках."
      );
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, userId, sourceType: "telegram_mtproto", isGroup: true },
    });
    if (!channel?.telegramId) {
      throw new NotFoundException("Группа не найдена или не поддерживает синхронизацию.");
    }

    const client = createClientFromEncrypted(session.sessionData);
    try {
      await client.connect();

      let peer: Api.TypeInputPeer;
      if (channel.groupType === "group") {
        peer = new Api.InputPeerChat({ chatId: bigInt(channel.telegramId) });
      } else {
        if (!channel.accessHash) throw new NotFoundException("accessHash не найден для группы.");
        const decryptedHash = decryptSession(channel.accessHash);
        peer = new Api.InputPeerChannel({
          channelId: bigInt(channel.telegramId),
          accessHash: bigInt(decryptedHash),
        });
      }

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
          .replace(/\x00/g, "")
          .replace(/[\uD800-\uDFFF]/g, "")
          .replace(/\\(?!["\\\/nrtbf]|u[0-9a-fA-F]{4})/g, "");

      const messages = "messages" in result ? result.messages : [];
      const username = channel.sourceUrl.startsWith("https://t.me/")
        ? channel.sourceUrl.replace("https://t.me/", "").split("/")[0] || null
        : null;

      const prefs = await this.prisma.userPreferences.findUnique({ where: { userId } });
      if (prefs?.markTelegramAsRead && messages.length > 0) {
        const maxId = Math.max(
          ...messages.filter((m): m is Api.Message => m instanceof Api.Message).map((m) => m.id)
        );
        if (maxId > 0) {
          try {
            if (channel.groupType === "group") {
              await client.invoke(new Api.messages.ReadHistory({ peer, maxId }));
            } else {
              await client.invoke(new Api.channels.ReadHistory({ channel: peer, maxId }));
            }
          } catch (e) {
            this.logger.warn(`ReadHistory failed: ${(e as Error)?.message}`);
          }
        }
      }

      await this.prisma.mTProtoSession.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return messages
        .filter((m): m is Api.Message => m instanceof Api.Message && !!m.message)
        .map((m) => ({
          title: sanitize(m.message).split("\n")[0].slice(0, 100) || null,
          content: sanitize(m.message).slice(0, 500),
          url: username
            ? `https://t.me/${username}/${m.id}`
            : `https://t.me/c/${channel.telegramId}/${m.id}`,
          channelName: channel.name,
          publishedAt: new Date(m.date * 1000),
        }));
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
        `fetchGroupMessages error: ${(error as Error)?.message}`,
        (error as Error)?.stack
      );
      throw new BadRequestException("Не удалось получить посты группы.");
    } finally {
      try {
        await client.destroy();
      } catch {
        // ignore
      }
    }
  }

  async listUserFolders(userId: string): Promise<MTProtoFolderInfo[]> {
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
      // include supergroups (isChannel=true && isGroup=true) — they appear in folders too
      const channelDialogs = dialogs.filter((d) => d.isChannel);

      const existingChannels = await this.prisma.channel.findMany({
        where: { userId, sourceType: "telegram_mtproto" },
        select: { telegramId: true },
      });
      const trackedIds = new Set(existingChannels.map((c) => c.telegramId));

      const channelMap = new Map<string, MTProtoChannelInfo>();
      for (const dialog of channelDialogs) {
        const entity = dialog.entity as Api.Channel | undefined;
        if (!entity || !dialog.id) continue;
        const idStr = dialog.id.toString();
        const accessHash = entity.accessHash?.toString() ?? null;
        if (!accessHash) continue;
        channelMap.set(idStr, {
          id: idStr,
          title: dialog.title ?? entity.title ?? "Без названия",
          username: entity.username ?? null,
          participantsCount: entity.participantsCount ?? null,
          accessHash,
          isAlreadyTracked: trackedIds.has(idStr),
        });
      }

      const filtersResult = await client.invoke(new Api.messages.GetDialogFilters());
      let rawFilters: unknown[];
      if (Array.isArray(filtersResult)) {
        rawFilters = filtersResult;
      } else if (filtersResult && typeof filtersResult === "object" && "filters" in filtersResult) {
        rawFilters = (filtersResult as { filters: unknown[] }).filters;
      } else {
        rawFilters = [];
      }

      const result: MTProtoFolderInfo[] = [];
      for (const filter of rawFilters) {
        if (!(filter instanceof Api.DialogFilter)) continue;

        const titleRaw = filter.title as unknown;
        const title =
          typeof titleRaw === "string"
            ? titleRaw
            : titleRaw && typeof titleRaw === "object" && "text" in titleRaw
              ? String((titleRaw as { text: unknown }).text)
              : `Папка ${filter.id}`;

        const allPeers = [...(filter.pinnedPeers ?? []), ...(filter.includePeers ?? [])];
        const folderChannels: MTProtoChannelInfo[] = [];
        const seen = new Set<string>();

        for (const peer of allPeers) {
          if (peer instanceof Api.InputPeerChannel) {
            // GramJS stores dialog.id as "-100"+channelId (Bot API format),
            // but InputPeerChannel.channelId is the raw positive ID — add prefix to match
            const markedId = "-100" + peer.channelId.toString();
            if (seen.has(markedId)) continue;
            seen.add(markedId);
            const info = channelMap.get(markedId);
            if (info) folderChannels.push(info);
          }
        }

        if (folderChannels.length > 0) {
          result.push({ id: filter.id, title, channels: folderChannels });
        }
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
      throw new BadRequestException("Не удалось получить список папок.");
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
