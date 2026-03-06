import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { AppFoldersModule } from "./app-folders/app-folders.module";
import { AuthModule } from "./auth/auth.module";
import { ChannelsModule } from "./channels/channels.module";
import { CronModule } from "./cron/cron.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { MtprotoModule } from "./mtproto/mtproto.module";
import { PasskeyModule } from "./passkey/passkey.module";
import { PreferencesModule } from "./preferences/preferences.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { SummariesModule } from "./summaries/summaries.module";
import { TelegramModule } from "./telegram/telegram.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>("REDIS_URL") },
      }),
    }),
    PrismaModule,
    AuthModule,
    AppFoldersModule,
    PasskeyModule,
    ChannelsModule,
    SummariesModule,
    PreferencesModule,
    ProfileModule,
    MtprotoModule,
    TelegramModule,
    CronModule,
    DashboardModule,
    HealthModule,
  ],
})
export class AppModule {}
