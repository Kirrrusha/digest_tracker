/**
 * Модуль клиента базы данных.
 * Предоставляет singleton-инстанс Prisma Client с кэшированием в development.
 * @module lib/db
 */

import { PrismaClient } from "@/lib/generated/prisma/client";

/**
 * Глобальное хранилище для Prisma Client.
 * Используется для предотвращения создания множества инстансов в development
 * при hot-reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Singleton-инстанс Prisma Client для работы с базой данных.
 * В development режиме логирует queries, errors и warnings.
 * В production логирует только errors.
 *
 * @example
 * import { db } from "@/lib/db";
 *
 * const users = await db.user.findMany();
 * const post = await db.post.create({ data: { ... } });
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// Сохраняем инстанс в globalThis для предотвращения дублирования при hot-reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

// Реэкспортируем типы и enums из Prisma Client
export * from "@/lib/generated/prisma/client";
