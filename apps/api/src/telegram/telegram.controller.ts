import { createHmac } from "crypto";
import { Body, Controller, Headers, Post, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("telegram")
@Controller("telegram")
export class TelegramController {
  constructor(private config: ConfigService) {}

  @Post("webhook")
  @ApiOperation({ summary: "Telegram bot webhook" })
  webhook(@Body() body: unknown, @Headers("x-telegram-bot-api-secret-token") token: string) {
    const secret = this.config.get("TELEGRAM_WEBHOOK_SECRET");
    if (secret && token !== createHmac("sha256", secret).digest("hex")) {
      throw new UnauthorizedException();
    }
    // TODO: обработать входящие апдейты через Grammy
    return { ok: true };
  }
}
