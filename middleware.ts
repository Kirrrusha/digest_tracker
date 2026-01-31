import { type NextRequest, type NextResponse } from "next/server";
import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

/**
 * Middleware с логированием и авторизацией
 */
export default async function middleware(request: NextRequest) {
  const start = Date.now();
  const { pathname, search } = request.nextUrl;
  const method = request.method;

  // Пропускаем логирование для статических ресурсов и health check
  const skipLogging =
    pathname.startsWith("/_next") || pathname.startsWith("/api/health") || pathname.includes(".");

  // Выполняем auth middleware
  // @ts-expect-error - NextAuth types are complex, but this works at runtime
  const response = (await auth(request)) as NextResponse | undefined;

  // Логируем запрос (в production это будет JSON)
  if (!skipLogging && process.env.NODE_ENV === "production") {
    const duration = Date.now() - start;
    const status = response?.status || 200;

    // Структурированный лог для production
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        message: "HTTP Request",
        context: {
          method,
          path: pathname,
          query: search || undefined,
          status,
          durationMs: duration,
          userAgent: request.headers.get("user-agent") || undefined,
        },
      })
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
