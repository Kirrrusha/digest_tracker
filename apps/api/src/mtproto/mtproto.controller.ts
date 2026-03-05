import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { BulkAddChannelsDto } from "./dto/bulk-add-channels.dto";
import { BulkAddGroupsDto } from "./dto/bulk-add-groups.dto";
import { QrPollDto } from "./dto/qr-poll.dto";
import { QrVerify2faDto } from "./dto/qr-verify-2fa.dto";
import { ResendCodeDto } from "./dto/resend-code.dto";
import { SendCodeDto } from "./dto/send-code.dto";
import { VerifyCodeDto } from "./dto/verify-code.dto";
import { MtprotoService } from "./mtproto.service";

@ApiTags("mtproto")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("mtproto")
export class MtprotoController {
  constructor(private mtproto: MtprotoService) {}

  @Get("status")
  @ApiOperation({ summary: "Статус MTProto сессии" })
  async status(@Request() req: { user: { userId: string } }) {
    const hasSession = await this.mtproto.hasActiveSession(req.user.userId);
    return { hasActiveSession: hasSession };
  }

  @Post("auth/send-code")
  @ApiOperation({ summary: "Отправить код верификации" })
  async sendCode(@Body() dto: SendCodeDto) {
    return this.mtproto.sendCode(dto.phoneNumber);
  }

  @Post("auth/resend-code")
  @ApiOperation({ summary: "Переотправить код (по SMS если первый был через приложение)" })
  async resendCode(@Body() dto: ResendCodeDto) {
    return this.mtproto.resendCode(dto);
  }

  @Post("auth/verify")
  @ApiOperation({ summary: "Подтвердить код → создать сессию" })
  async verify(@Request() req: { user: { userId: string } }, @Body() dto: VerifyCodeDto) {
    try {
      const { sessionString } = await this.mtproto.signIn({
        sessionString: dto.sessionString,
        phoneNumber: dto.phoneNumber,
        phoneCode: dto.phoneCode,
        phoneCodeHash: dto.phoneCodeHash,
        password: dto.password,
      });
      await this.mtproto.saveSession(req.user.userId, sessionString, dto.phoneNumber);
      return { success: true };
    } catch (error) {
      if (error instanceof BadRequestException && error.message === "NEEDS_2FA") {
        return { needs2FA: true };
      }
      throw error;
    }
  }

  @Post("auth/qr-start")
  @ApiOperation({ summary: "Начать QR-авторизацию — получить токен для QR-кода" })
  async qrStart() {
    return this.mtproto.qrStart();
  }

  @Post("auth/qr-poll")
  @ApiOperation({ summary: "Проверить статус QR-авторизации" })
  async qrPoll(@Request() req: { user: { userId: string } }, @Body() dto: QrPollDto) {
    return this.mtproto.qrPoll(req.user.userId, dto.sessionString);
  }

  @Post("auth/qr-verify-2fa")
  @ApiOperation({ summary: "Подтвердить 2FA при QR-авторизации" })
  async qrVerify2fa(@Request() req: { user: { userId: string } }, @Body() dto: QrVerify2faDto) {
    await this.mtproto.qrVerify2fa(req.user.userId, dto.sessionString, dto.password);
    return { success: true };
  }

  @Post("auth/disconnect")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Отозвать MTProto-сессию" })
  async disconnect(@Request() req: { user: { userId: string } }) {
    await this.mtproto.disconnect(req.user.userId);
  }

  @Get("channels")
  @ApiOperation({ summary: "Каналы доступные через MTProto" })
  async channels(@Request() req: { user: { userId: string } }) {
    return this.mtproto.listUserChannels(req.user.userId);
  }

  @Post("channels/bulk")
  @ApiOperation({ summary: "Массовое добавление каналов через MTProto" })
  async bulkAdd(@Request() req: { user: { userId: string } }, @Body() dto: BulkAddChannelsDto) {
    return this.mtproto.bulkAddChannels(req.user.userId, dto.channels);
  }

  @Get("groups")
  @ApiOperation({ summary: "Группы доступные через MTProto" })
  async groups(@Request() req: { user: { userId: string } }) {
    return this.mtproto.listUserGroups(req.user.userId);
  }

  @Post("groups/bulk")
  @ApiOperation({ summary: "Массовое добавление групп через MTProto" })
  async bulkAddGroups(@Request() req: { user: { userId: string } }, @Body() dto: BulkAddGroupsDto) {
    return this.mtproto.bulkAddGroups(req.user.userId, dto.groups);
  }

  @Get("folders")
  @ApiOperation({ summary: "Папки (Dialog Filters) пользователя с каналами внутри" })
  async folders(@Request() req: { user: { userId: string } }) {
    return this.mtproto.listUserFolders(req.user.userId);
  }
}
