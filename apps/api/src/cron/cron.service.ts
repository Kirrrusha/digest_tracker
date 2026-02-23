import { Injectable, Logger } from "@nestjs/common";

import { MtprotoService } from "../mtproto/mtproto.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private prisma: PrismaService,
    private mtproto: MtprotoService
  ) {}

  async fetchPosts(): Promise<{ fetched: number; channels: number; errors: number }> {
    const sessions = await this.prisma.mTProtoSession.findMany({
      where: { isActive: true },
      select: { userId: true },
    });

    let totalFetched = 0;
    let totalChannels = 0;
    let totalErrors = 0;

    for (const { userId } of sessions) {
      const channels = await this.prisma.channel.findMany({
        where: { userId, sourceType: "telegram_mtproto", isActive: true },
        select: { id: true, name: true },
      });

      for (const channel of channels) {
        try {
          const result = await this.mtproto.fetchAndSaveChannelPosts(userId, channel.id, 50);
          totalFetched += result.saved;
          totalChannels++;
          this.logger.log(`[${channel.name}] saved=${result.saved} skipped=${result.skipped}`);
        } catch (err) {
          totalErrors++;
          this.logger.error(`[${channel.name}] sync failed: ${(err as Error).message}`);
        }
      }
    }

    return { fetched: totalFetched, channels: totalChannels, errors: totalErrors };
  }

  async dailySummary() {
    // TODO: сгенерировать дневное саммари через OpenAI
    return { generated: 0 };
  }

  async weeklySummary() {
    // TODO: сгенерировать недельное саммари через OpenAI
    return { generated: 0 };
  }
}
