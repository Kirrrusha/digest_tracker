import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";

// TODO: реализовать MTProto flow (перенести из apps/web/lib/mtproto)
@ApiTags("mtproto")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("mtproto")
export class MtprotoController {
  @Post("auth/send-code")
  @ApiOperation({ summary: "Отправить код верификации" })
  sendCode() {
    return { message: "Not implemented" };
  }

  @Post("auth/verify")
  @ApiOperation({ summary: "Подтвердить код → создать сессию" })
  verify() {
    return { message: "Not implemented" };
  }

  @Post("auth/disconnect")
  @ApiOperation({ summary: "Отозвать MTProto-сессию" })
  disconnect() {
    return { message: "Not implemented" };
  }

  @Get("channels")
  @ApiOperation({ summary: "Каналы доступные через MTProto" })
  channels() {
    return { message: "Not implemented" };
  }
}
