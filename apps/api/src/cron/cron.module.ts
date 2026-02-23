import { Module } from "@nestjs/common";

import { MtprotoModule } from "../mtproto/mtproto.module";
import { PrismaModule } from "../prisma/prisma.module";
import { CronController } from "./cron.controller";
import { CronService } from "./cron.service";

@Module({
  imports: [PrismaModule, MtprotoModule],
  providers: [CronService],
  controllers: [CronController],
})
export class CronModule {}
