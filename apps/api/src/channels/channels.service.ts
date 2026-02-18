import type { Channel } from "@devdigest/shared";
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";
import { CreateChannelDto } from "./dto/create-channel.dto";
import { UpdateChannelDto } from "./dto/update-channel.dto";

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<Channel[]> {
    const channels = await this.prisma.channel.findMany({
      where: { userId },
      include: {
        _count: { select: { posts: true } },
        posts: {
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return channels.map((ch) => this.toDto(ch));
  }

  async findOne(userId: string, id: string): Promise<Channel> {
    const ch = await this.prisma.channel.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { posts: true } },
        posts: {
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
    });
    if (!ch) throw new NotFoundException("Канал не найден");
    return this.toDto(ch);
  }

  async create(userId: string, dto: CreateChannelDto): Promise<Channel> {
    const existing = await this.prisma.channel.findFirst({
      where: { userId, sourceUrl: dto.url },
    });
    if (existing) throw new ConflictException("Канал уже добавлен");

    // TODO: вызвать validateAndGetSourceInfo из parsers (перенести из apps/web/lib/parsers)
    // Пока создаём с базовыми данными
    const ch = await this.prisma.channel.create({
      data: {
        userId,
        name: dto.url,
        sourceUrl: dto.url,
        sourceType: "rss",
        isActive: true,
      },
    });

    return {
      id: ch.id,
      name: ch.name,
      sourceUrl: ch.sourceUrl,
      sourceType: ch.sourceType as Channel["sourceType"],
      description: ch.description,
      imageUrl: ch.imageUrl,
      isActive: ch.isActive,
      postsCount: 0,
      lastPostAt: null,
      createdAt: ch.createdAt.toISOString(),
      updatedAt: ch.updatedAt.toISOString(),
    };
  }

  async update(userId: string, id: string, dto: UpdateChannelDto): Promise<Channel> {
    await this.findOne(userId, id);
    const ch = await this.prisma.channel.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { posts: true } },
        posts: {
          orderBy: { publishedAt: "desc" },
          take: 1,
          select: { publishedAt: true },
        },
      },
    });
    return this.toDto(ch);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOne(userId, id);
    await this.prisma.channel.delete({ where: { id } });
  }

  private toDto(ch: {
    id: string;
    name: string;
    sourceUrl: string;
    sourceType: string;
    description: string | null;
    imageUrl: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count: { posts: number };
    posts: { publishedAt: Date }[];
  }): Channel {
    return {
      id: ch.id,
      name: ch.name,
      sourceUrl: ch.sourceUrl,
      sourceType: ch.sourceType as Channel["sourceType"],
      description: ch.description,
      imageUrl: ch.imageUrl,
      isActive: ch.isActive,
      postsCount: ch._count.posts,
      lastPostAt: ch.posts[0]?.publishedAt?.toISOString() ?? null,
      createdAt: ch.createdAt.toISOString(),
      updatedAt: ch.updatedAt.toISOString(),
    };
  }
}
