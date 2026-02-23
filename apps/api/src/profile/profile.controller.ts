import type { UserProfile } from "@devdigest/shared";
import { Controller, Get, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("profile")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("profile")
export class ProfileController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Профиль пользователя" })
  async getProfile(@Request() req: { user: { userId: string } }): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: req.user.userId },
      include: {
        telegramAccount: { select: { id: true } },
        authenticators: { select: { id: true } },
      },
    });

    return {
      id: user.id,
      login: user.login,
      name: user.name,
      hasTelegram: user.telegramAccount !== null,
      hasPasskey: user.authenticators.length > 0,
    };
  }
}
