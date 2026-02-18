import Redis from "ioredis";

/**
 * Redis клиент (singleton)
 */
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.error("[Redis] Connection error:", err.message);
    });

    redisClient.on("connect", () => {
      console.warn("[Redis] Connected");
    });
  }

  return redisClient;
}

/**
 * Получение данных из кэша или выполнение fetcher
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const redis = getRedisClient();

  if (!redis) {
    // Redis недоступен - выполняем запрос напрямую
    return fetcher();
  }

  try {
    // Пробуем получить из кэша
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // Выполняем fetcher и сохраняем в кэш
    const fresh = await fetcher();
    await redis.setex(key, ttl, JSON.stringify(fresh));
    return fresh;
  } catch (error) {
    console.error("[Redis] Cache error:", error);
    // При ошибке Redis выполняем запрос напрямую
    return fetcher();
  }
}

/**
 * Инвалидация кэша по ключу
 */
export async function invalidateCache(key: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    console.error("[Redis] Invalidate error:", error);
  }
}

/**
 * Инвалидация кэша по паттерну
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error("[Redis] Invalidate pattern error:", error);
  }
}

/**
 * Установка значения в кэш
 */
export async function setCache<T>(key: string, value: T, ttl: number = 3600): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error("[Redis] Set error:", error);
  }
}

/**
 * Получение значения из кэша
 */
export async function getCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const value = await redis.get(key);
    if (value) {
      return JSON.parse(value) as T;
    }
    return null;
  } catch (error) {
    console.error("[Redis] Get error:", error);
    return null;
  }
}

/**
 * Cache keys
 */
export const CACHE_KEYS = {
  userChannels: (userId: string) => `user:${userId}:channels`,
  userSummaries: (userId: string) => `user:${userId}:summaries`,
  userStats: (userId: string) => `user:${userId}:stats`,
  channelPosts: (channelId: string) => `channel:${channelId}:posts`,
  summary: (summaryId: string) => `summary:${summaryId}`,
  todaySummary: (userId: string) => `user:${userId}:today-summary`,
  postContent: (postId: string) => `post:content:${postId}`,
} as const;

/**
 * Cache TTLs (в секундах)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 минута
  MEDIUM: 300, // 5 минут
  LONG: 3600, // 1 час
  DAY: 86400, // 24 часа
  WEEK: 604800, // 7 дней
} as const;

/**
 * Проверка соединения с Redis
 */
export async function checkRedisConnection(): Promise<{
  connected: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const redis = getRedisClient();

  if (!redis) {
    return { connected: false, error: "Redis URL not configured" };
  }

  try {
    const start = performance.now();
    await redis.ping();
    const latencyMs = Math.round(performance.now() - start);

    return { connected: true, latencyMs };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
