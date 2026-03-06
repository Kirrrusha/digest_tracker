import type { SummariesResponse, Summary } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SummariesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
    type?: string,
    topic?: string,
    channelId?: string
  ): Promise<SummariesResponse> {
    const where = {
      userId,
      ...(type ? { period: { contains: type } } : {}),
      ...(topic ? { topics: { some: { name: topic } } } : {}),
      ...(channelId !== undefined ? { channelId: channelId || null } : {}),
    };

    const [total, summaries] = await Promise.all([
      this.prisma.summary.count({ where }),
      this.prisma.summary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { topics: { select: { name: true } } },
      }),
    ]);

    return {
      summaries: summaries.map((s) => this.toDto(s)),
      total,
      page,
      hasMore: page * limit < total,
    };
  }

  async findOne(userId: string, id: string): Promise<Summary> {
    const s = await this.prisma.summary.findFirst({
      where: { id, userId },
      include: { topics: { select: { name: true } } },
    });
    if (!s) throw new NotFoundException("Саммари не найдено");
    return this.toDto(s);
  }

  async getTopics(userId: string): Promise<string[]> {
    const summaries = await this.prisma.summary.findMany({
      where: { userId },
      select: { topics: true },
    });
    const topics = Array.from(
      new Set(summaries.flatMap((s) => s.topics.map((t) => t.name)))
    ).sort();
    return topics;
  }

  async remove(userId: string, id: string): Promise<void> {
    const summary = await this.prisma.summary.findFirst({ where: { id, userId } });
    if (!summary) throw new NotFoundException("Саммари не найдено");
    await this.prisma.summary.delete({ where: { id } });
  }

  private toDto(s: {
    id: string;
    title: string;
    content: string;
    period: string;
    channelId?: string | null;
    topics: { name: string }[];
    createdAt: Date;
  }): Summary {
    return {
      id: s.id,
      title: s.title,
      content: s.content,
      period: s.period,
      channelId: s.channelId,
      topics: s.topics.map((t) => t.name),
      postsCount: 0,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
