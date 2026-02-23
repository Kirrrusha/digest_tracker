import type { SummariesResponse, Summary } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export interface PostSource {
  id: string;
  title: string | null;
  contentPreview: string | null;
  url: string | null;
  publishedAt: string;
  channelName: string;
  channelType: string;
}

export interface SummaryWithSources extends Summary {
  sources: PostSource[];
}

@Injectable()
export class SummariesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
    type?: string,
    topic?: string
  ): Promise<SummariesResponse> {
    const where = {
      userId,
      ...(type ? { period: { startsWith: type } } : {}),
      ...(topic ? { topics: { has: topic } } : {}),
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

  async findOne(userId: string, id: string): Promise<SummaryWithSources> {
    const s = await this.prisma.summary.findFirst({
      where: { id, userId },
      include: {
        posts: {
          select: {
            id: true,
            title: true,
            contentPreview: true,
            url: true,
            publishedAt: true,
            channel: { select: { name: true, sourceType: true } },
          },
        },
      },
    });
    if (!s) throw new NotFoundException("Саммари не найдено");

    const sources: PostSource[] = s.posts.map((p) => ({
      id: p.id,
      title: p.title,
      contentPreview: p.contentPreview,
      url: p.url,
      publishedAt: p.publishedAt.toISOString(),
      channelName: p.channel.name,
      channelType: p.channel.sourceType,
    }));

    return {
      ...this.toDto({ ...s, posts: s.posts }),
      sources,
    };
  }

  async getTopics(userId: string): Promise<string[]> {
    const summaries = await this.prisma.summary.findMany({
      where: { userId },
      select: { topics: true },
    });
    const topics = Array.from(new Set(summaries.flatMap((s) => s.topics))).sort();
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
