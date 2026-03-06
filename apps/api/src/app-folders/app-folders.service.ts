import type { AppFolder } from "@devdigest/shared";
import { Injectable, NotFoundException } from "@nestjs/common";

import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AppFoldersService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<AppFolder[]> {
    const folders = await this.prisma.appFolder.findMany({
      where: { userId },
      include: { channels: { select: { id: true } } },
      orderBy: { createdAt: "asc" },
    });
    return folders.map(this.toDto);
  }

  async create(userId: string, name: string, channelIds: string[] = []): Promise<AppFolder> {
    const folder = await this.prisma.appFolder.create({
      data: {
        userId,
        name,
        channels: channelIds.length ? { connect: channelIds.map((id) => ({ id })) } : undefined,
      },
      include: { channels: { select: { id: true } } },
    });
    return this.toDto(folder);
  }

  async update(
    userId: string,
    id: string,
    name?: string,
    channelIds?: string[]
  ): Promise<AppFolder> {
    await this.findOwned(userId, id);
    const folder = await this.prisma.appFolder.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(channelIds !== undefined
          ? { channels: { set: channelIds.map((cid) => ({ id: cid })) } }
          : {}),
      },
      include: { channels: { select: { id: true } } },
    });
    return this.toDto(folder);
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwned(userId, id);
    await this.prisma.appFolder.delete({ where: { id } });
  }

  private async findOwned(userId: string, id: string) {
    const folder = await this.prisma.appFolder.findFirst({ where: { id, userId } });
    if (!folder) throw new NotFoundException("Папка не найдена");
    return folder;
  }

  private toDto(folder: {
    id: string;
    name: string;
    channels: { id: string }[];
    createdAt: Date;
    updatedAt: Date;
  }): AppFolder {
    return {
      id: folder.id,
      name: folder.name,
      channelIds: folder.channels.map((c) => c.id),
      createdAt: folder.createdAt.toISOString(),
      updatedAt: folder.updatedAt.toISOString(),
    };
  }
}
