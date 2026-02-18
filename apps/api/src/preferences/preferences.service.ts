import type { UserPreferences } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";

@Injectable()
export class PreferencesService {
  constructor(private prisma: PrismaService) {}

  async get(userId: string): Promise<UserPreferences> {
    const prefs = await this.prisma.userPreferences.findUnique({
      where: { userId },
    });
    if (!prefs) throw new NotFoundException("Настройки не найдены");
    return {
      topics: prefs.topics,
      summaryInterval: prefs.summaryInterval as "daily" | "weekly",
      language: prefs.language,
      notificationsEnabled: prefs.notificationsEnabled,
      notificationTime: prefs.notificationTime,
      telegramNotifications: prefs.telegramNotifications,
      notifyOnNewSummary: prefs.notifyOnNewSummary,
      notifyOnNewPosts: prefs.notifyOnNewPosts,
    };
  }

  async update(userId: string, dto: UpdatePreferencesDto): Promise<UserPreferences> {
    const prefs = await this.prisma.userPreferences.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
    return {
      topics: prefs.topics,
      summaryInterval: prefs.summaryInterval as "daily" | "weekly",
      language: prefs.language,
      notificationsEnabled: prefs.notificationsEnabled,
      notificationTime: prefs.notificationTime,
      telegramNotifications: prefs.telegramNotifications,
      notifyOnNewSummary: prefs.notifyOnNewSummary,
      notifyOnNewPosts: prefs.notifyOnNewPosts,
    };
  }
}
