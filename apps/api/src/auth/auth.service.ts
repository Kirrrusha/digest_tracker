import { randomUUID } from "crypto";
import type { AuthTokens } from "@devdigest/shared";
import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { Redis } from "ioredis";

import { PrismaService } from "../prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {
    this.redis = new Redis(config.getOrThrow<string>("REDIS_URL"));
  }

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (existing) throw new ConflictException("Логин уже занят");

    const hash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { login: dto.login, name: dto.name ?? null, passwordHash: hash },
    });

    return this.issueTokens(user.id);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.prisma.user.findUnique({ where: { login: dto.login } });
    if (!user?.passwordHash) throw new UnauthorizedException("Неверные данные");

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException("Неверные данные");

    return this.issueTokens(user.id);
  }

  async refresh(userId: string, tokenId: string): Promise<AuthTokens> {
    const key = `refresh:${userId}:${tokenId}`;
    const exists = await this.redis.exists(key);
    if (!exists) throw new UnauthorizedException("Токен недействителен");

    await this.redis.del(key);
    return this.issueTokens(userId);
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    await this.redis.del(`refresh:${userId}:${tokenId}`);
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const tokenId = randomUUID();
    const expiresIn = this.config.get("JWT_REFRESH_EXPIRES_IN", "7d");
    const ttlSeconds = this.parseTtl(expiresIn);

    await this.redis.setex(`refresh:${userId}:${tokenId}`, ttlSeconds, "1");

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow("JWT_SECRET"),
        expiresIn: this.config.get("JWT_EXPIRES_IN", "15m"),
      }
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti: tokenId },
      {
        secret: this.config.getOrThrow("JWT_REFRESH_SECRET"),
        expiresIn,
      }
    );

    return { accessToken, refreshToken };
  }

  private parseTtl(value: string): number {
    const match = value.match(/^(\d+)([smhd])$/);
    if (!match) return 604800;
    const n = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return n * (multipliers[unit] ?? 1);
  }
}
