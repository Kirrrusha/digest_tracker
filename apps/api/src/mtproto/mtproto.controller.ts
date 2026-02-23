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
}
