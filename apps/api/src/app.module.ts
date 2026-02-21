import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { AuthModule } from "./auth/auth.module";
import { ChannelsModule } from "./channels/channels.module";
import { CronModule } from "./cron/cron.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { HealthModule } from "./health/health.module";
import { MtprotoModule } from "./mtproto/mtproto.module";
import { PasskeyModule } from "./passkey/passkey.module";
import { PostsModule } from "./posts/posts.module";
import { PreferencesModule } from "./preferences/preferences.module";
import { PrismaModule } from "./prisma/prisma.module";
import { ProfileModule } from "./profile/profile.module";
import { SummariesModule } from "./summaries/summaries.module";
import { TelegramModule } from "./telegram/telegram.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    PrismaModule,
    AuthModule,
    PasskeyModule,
    ChannelsModule,
    PostsModule,
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
