import type { Post } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) {}

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

  async findOne(id: string): Promise<Post> {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post) throw new NotFoundException("Пост не найден");
    return this.toDto(post);
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
      title: p.title,
      contentPreview: p.contentPreview,
      url: p.url,
      author: p.author,
      publishedAt: p.publishedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
    };
  }
}
