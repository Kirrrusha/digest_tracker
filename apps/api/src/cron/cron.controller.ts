import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { CronService } from "./cron.service";

@ApiTags("cron")
@Controller("cron")
export class CronController {
  constructor(
    private cron: CronService,
    private config: ConfigService
  ) {}

  private checkSecret(secret: string) {
    const expected = this.config.get("CRON_SECRET");
    if (expected && secret !== expected) throw new UnauthorizedException();
  }

  @Post("fetch-posts")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Фетч постов (CRON_SECRET)" })
  fetchPosts(@Headers("x-cron-secret") secret: string) {
    this.checkSecret(secret);
    return this.cron.fetchPosts();
  }

  @Post("daily-summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Дневное саммари (CRON_SECRET)" })
  dailySummary(@Headers("x-cron-secret") secret: string) {
    this.checkSecret(secret);
    return this.cron.dailySummary();
  }

  @Post("weekly-summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Недельное саммари (CRON_SECRET)" })
  weeklySummary(@Headers("x-cron-secret") secret: string) {
    this.checkSecret(secret);
    return this.cron.weeklySummary();
  }
}
