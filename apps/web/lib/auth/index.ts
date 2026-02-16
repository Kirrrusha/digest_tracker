import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { db } from "@/lib/db";

import { authConfig } from "./config";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const passkeyLoginSchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    // Email/Password provider
    Credentials({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;

        const user = await db.user.findUnique({
          where: { email },
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
          email: user.email,
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
        email: { label: "Email", type: "email" },
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
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
});
