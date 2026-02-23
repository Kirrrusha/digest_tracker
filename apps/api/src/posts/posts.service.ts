import type { Post } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

export interface PostWithChannel extends Post {
  channelName: string;
  channelType: string;
}

export interface PostsListResponse {
  posts: PostWithChannel[];
  total: number;
  hasMore: boolean;
}

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    page = 1,
    limit = 20,
    channelId?: string
  ): Promise<PostsListResponse> {
    const where = {
      channel: { userId },
      ...(channelId ? { channelId } : {}),
    };

    const [total, posts] = await Promise.all([
      this.prisma.post.count({ where }),
      this.prisma.post.findMany({
        where,
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: { channel: { select: { name: true, sourceType: true } } },
      }),
    ]);

    return {
      posts: posts.map((p) => ({
        ...this.toDto(p),
        channelName: p.channel.name,
        channelType: p.channel.sourceType,
      })),
      total,
      hasMore: page * limit < total,
    };
  }

  async findByChannel(userId: string, channelId: string, page = 1, limit = 20): Promise<Post[]> {
    const channel = await this.prisma.channel.findFirst({ where: { id: channelId, userId } });
    if (!channel) throw new NotFoundException("Канал не найден");

    const posts = await this.prisma.post.findMany({
      where: { channelId },
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    });

    return posts.map((p) => this.toDto(p));
  }

  async findOne(id: string): Promise<PostWithChannel> {
    const post = await this.prisma.post.findUnique({
      where: { id },
      include: { channel: { select: { name: true, sourceType: true } } },
    });
    if (!post) throw new NotFoundException("Пост не найден");
    return {
      ...this.toDto(post),
      channelName: post.channel.name,
      channelType: post.channel.sourceType,
    };
  }

  private toDto(p: {
    id: string;
    channelId: string;
    externalId: string;
    title: string | null;
    contentPreview: string | null;
    url: string | null;
    author: string | null;
    publishedAt: Date;
    createdAt: Date;
  }): Post {
    return {
      id: p.id,
      channelId: p.channelId,
      externalId: p.externalId,
      title:
        p.title ??
        (p.contentPreview ? p.contentPreview.split("\n")[0].slice(0, 100) || null : null),
      contentPreview: p.contentPreview,
      url: p.url,
      author: p.author,
      publishedAt: p.publishedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    };
  }
}
