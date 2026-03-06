import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("dashboard")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("dashboard")
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get("stats")
  @ApiOperation({ summary: "Статистика дашборда" })
  async getStats(@Request() req: { user: { userId: string } }) {
    const userId = req.user.userId;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [channelsCount, summariesToday, allSummaries] = await Promise.all([
      this.prisma.channel.count({ where: { userId, isActive: true } }),
      this.prisma.summary.count({ where: { userId, createdAt: { gte: todayStart } } }),
      this.prisma.summary.findMany({
        where: { userId },
        select: { topics: true },
      }),
    ]);

    const topicCounts: Record<string, number> = {};
    for (const s of allSummaries) {
      for (const topic of s.topics) {
        topicCounts[topic.name] = (topicCounts[topic.name] ?? 0) + 1;
      }
    }
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([topic, count]) => ({ topic, count }));

    return { channelsCount, postsToday: 0, summariesToday, topTopics, recentPosts: [] };
  }
}
