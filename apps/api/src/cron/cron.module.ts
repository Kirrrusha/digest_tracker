import { Module } from "@nestjs/common";

import { CronController } from "./cron.controller";
import { CronService } from "./cron.service";

@Module({
  providers: [CronService],
  controllers: [CronController],
})
export class CronModule {}
