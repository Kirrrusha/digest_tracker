import type { SummariesResponse, Summary } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SummariesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, page = 1, limit = 10, type?: string): Promise<SummariesResponse> {
    const where = {
      userId,
      ...(type ? { period: { startsWith: type } } : {}),
    };

    const [total, summaries] = await Promise.all([
      this.prisma.summary.count({ where }),
      this.prisma.summary.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { posts: { select: { id: true } } },
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
      include: { posts: { select: { id: true } } },
    });
    if (!s) throw new NotFoundException("Саммари не найдено");
    return this.toDto(s);
  }

  private toDto(s: {
    id: string;
    title: string;
    content: string;
    period: string;
    topics: string[];
    createdAt: Date;
    posts: { id: string }[];
  }): Summary {
    return {
      id: s.id,
      title: s.title,
      content: s.content,
      period: s.period,
      topics: s.topics,
      postsCount: s.posts.length,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
