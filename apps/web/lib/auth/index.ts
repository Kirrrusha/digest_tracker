import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "@/lib/db";

import { authConfig } from "./config";

const loginSchema = z.object({
  login: z.string().min(3),
  password: z.string().min(6),
});

const passkeyLoginSchema = z.object({
  userId: z.string(),
  name: z.string().nullable().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    // Login/Password provider
    Credentials({
      id: "credentials",
      name: "Login & Password",
      credentials: {
        login: { label: "Логин", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { login, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { login },
        });

        if (!user || !user.passwordHash) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatch) {
          return null;
        }

        return {
          id: user.id,
          login: user.login,
          name: user.name,
        };
      },
    }),
    // Passkey provider (called after WebAuthn verification)
    Credentials({
      id: "passkey",
      name: "Passkey",
      credentials: {
        userId: { label: "User ID", type: "text" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        const parsed = passkeyLoginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        // Verify user exists
        const user = await db.user.findUnique({
          where: { id: parsed.data.userId },
        });

        if (!user) {
          return null;
        }

        return {
          id: user.id,
          login: user.login,
          name: user.name,
        };
      },
    }),
  ],
});
