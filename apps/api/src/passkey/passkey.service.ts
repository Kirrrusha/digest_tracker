import { randomUUID } from "crypto";
import type { AuthTokens } from "@devdigest/shared";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { Redis } from "ioredis";

import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../prisma/prisma.service";

const CHALLENGE_TTL = 300; // 5 минут

@Injectable()
export class PasskeyService {
  private redis: Redis;
  private rpID: string;
  private rpName: string;
  private origin: string;

  constructor(
    private prisma: PrismaService,
    private auth: AuthService,
    private config: ConfigService
  ) {
    this.redis = new Redis(config.getOrThrow<string>("REDIS_URL"));
    this.rpID = config.get("WEBAUTHN_RP_ID", "localhost");
    this.rpName = config.get("WEBAUTHN_RP_NAME", "DevDigest");
    this.origin = config.get("WEBAUTHN_ORIGIN", "http://localhost:5173");
  }

  // ---------- Registration ----------

  async registrationOptions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { authenticators: true },
    });
    if (!user) throw new NotFoundException("Пользователь не найден");

    const existingCredentials = user.authenticators.map((a) => ({
      id: a.credentialID,
      transports: a.transports
        ? (a.transports.split(",") as AuthenticatorTransportFuture[])
        : undefined,
    }));

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: user.login ?? user.name ?? user.id,
      userDisplayName: user.name ?? user.login ?? "Пользователь",
      attestationType: "none",
      excludeCredentials: existingCredentials,
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await this.redis.setex(`passkey:reg:${userId}`, CHALLENGE_TTL, options.challenge);

    return options;
  }

  async verifyRegistration(
    userId: string,
    response: RegistrationResponseJSON,
    name?: string
  ): Promise<{ verified: boolean }> {
    const expectedChallenge = await this.redis.get(`passkey:reg:${userId}`);
    if (!expectedChallenge) throw new UnauthorizedException("Challenge истёк или не найден");

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException("Верификация passkey не прошла");
    }

    await this.redis.del(`passkey:reg:${userId}`);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await this.prisma.authenticator.create({
      data: {
        userId,
        credentialID: credential.id,
        credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        credentialDeviceType,
        credentialBackedUp,
        transports: credential.transports?.join(",") ?? null,
        name: name ?? null,
      },
    });

    return { verified: true };
  }

  // ---------- Signup (new users, no password) ----------

  async signupOptions(name?: string) {
    const challengeId = randomUUID();
    const userIdStub = randomUUID();

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userName: userIdStub,
      userDisplayName: name ?? "Пользователь",
      attestationType: "none",
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
      },
    });

    await this.redis.setex(
      `passkey:signup:${challengeId}`,
      CHALLENGE_TTL,
      JSON.stringify({ challenge: options.challenge, name: name ?? null })
    );

    return { options, challengeId };
  }

  async verifySignup(challengeId: string, response: RegistrationResponseJSON): Promise<AuthTokens> {
    const raw = await this.redis.get(`passkey:signup:${challengeId}`);
    if (!raw) throw new UnauthorizedException("Challenge истёк или не найден");

    const { challenge: expectedChallenge, name } = JSON.parse(raw) as {
      challenge: string;
      name: string | null;
    };

    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new UnauthorizedException("Верификация passkey не прошла");
    }

    await this.redis.del(`passkey:signup:${challengeId}`);

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const user = await this.prisma.user.create({
      data: {
        name: name ?? null,
        authenticators: {
          create: {
            credentialID: credential.id,
            credentialPublicKey: Buffer.from(credential.publicKey).toString("base64"),
            counter: credential.counter,
            credentialDeviceType,
            credentialBackedUp,
            transports: credential.transports?.join(",") ?? null,
          },
        },
      },
    });

    return this.auth.issueTokens(user.id);
  }

  // ---------- Authentication ----------

  async authenticationOptions() {
    const challengeId = randomUUID();

    const options = await generateAuthenticationOptions({
      rpID: this.rpID,
      userVerification: "preferred",
    });

    await this.redis.setex(`passkey:auth:${challengeId}`, CHALLENGE_TTL, options.challenge);

    return { options, challengeId };
  }

  async verifyAuthentication(
    challengeId: string,
    response: AuthenticationResponseJSON
  ): Promise<AuthTokens> {
    const expectedChallenge = await this.redis.get(`passkey:auth:${challengeId}`);
    if (!expectedChallenge) throw new UnauthorizedException("Challenge истёк или не найден");

    const authenticator = await this.prisma.authenticator.findUnique({
      where: { credentialID: response.id },
    });
    if (!authenticator) throw new UnauthorizedException("Passkey не найден");

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: authenticator.credentialID,
        publicKey: Buffer.from(authenticator.credentialPublicKey, "base64"),
        counter: Number(authenticator.counter),
        transports: authenticator.transports
          ? (authenticator.transports.split(",") as AuthenticatorTransportFuture[])
          : undefined,
      },
    });

    if (!verification.verified) throw new UnauthorizedException("Верификация passkey не прошла");

    await this.redis.del(`passkey:auth:${challengeId}`);

    await this.prisma.authenticator.update({
      where: { id: authenticator.id },
      data: { counter: verification.authenticationInfo.newCounter },
    });

    return this.auth.issueTokens(authenticator.userId);
  }
}
