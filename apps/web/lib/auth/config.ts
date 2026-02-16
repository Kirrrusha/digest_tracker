/**
 * Модуль конфигурации NextAuth.js.
 * Предоставляет Edge-совместимую конфигурацию для middleware
 * и полную конфигурацию для API routes.
 * @module lib/auth/config
 */

import type { NextAuthConfig } from "next-auth";

/**
 * Базовая конфигурация NextAuth, совместимая с Edge Runtime.
 * Не включает database providers (Prisma), т.к. они требуют Node.js.
 * Используется middleware для защиты роутов.
 *
 * @remarks
 * Полная конфигурация с провайдерами находится в lib/auth/index.ts
 */
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Контролирует доступ к роутам на основе состояния аутентификации.
     * Перенаправляет авторизованных пользователей с auth-страниц,
     * а неавторизованных — на страницу входа.
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = nextUrl.pathname === "/login" || nextUrl.pathname === "/register";

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      if (!isLoggedIn) {
        return false;
      }

      return true;
    },

    /**
     * Добавляет ID пользователя в JWT токен для доступа в сессии.
     */
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },

    /**
     * Делает ID пользователя доступным в объекте сессии на клиенте.
     */
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [],
};
