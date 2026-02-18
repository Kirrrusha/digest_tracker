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

    const [channelsCount, postsCount, summariesCount] = await Promise.all([
      this.prisma.channel.count({ where: { userId, isActive: true } }),
      this.prisma.post.count({
        where: { channel: { userId } },
      }),
      this.prisma.summary.count({ where: { userId } }),
    ]);

    return { channelsCount, postsCount, summariesCount };
  }
}
