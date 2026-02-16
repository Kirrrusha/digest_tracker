import { logger } from "./logger";

/**
 * Простые in-memory метрики для мониторинга
 */

interface MetricEntry {
  count: number;
  totalDuration: number;
  minDuration: number;
  maxDuration: number;
  errors: number;
  lastUpdated: number;
}

interface RequestMetric {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

const metrics = new Map<string, MetricEntry>();
const recentRequests: RequestMetric[] = [];
const MAX_RECENT_REQUESTS = 100;

/**
 * Запись метрики операции
 */
export function recordMetric(name: string, duration: number, isError: boolean = false): void {
  const existing = metrics.get(name) || {
    count: 0,
    totalDuration: 0,
    minDuration: Infinity,
    maxDuration: 0,
    errors: 0,
    lastUpdated: Date.now(),
  };

  metrics.set(name, {
    count: existing.count + 1,
    totalDuration: existing.totalDuration + duration,
    minDuration: Math.min(existing.minDuration, duration),
    maxDuration: Math.max(existing.maxDuration, duration),
    errors: existing.errors + (isError ? 1 : 0),
    lastUpdated: Date.now(),
  });
}

/**
 * Запись метрики HTTP запроса
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  recentRequests.push({
    method,
    path,
    statusCode,
    duration,
    timestamp: Date.now(),
  });

  // Ограничиваем размер истории
  if (recentRequests.length > MAX_RECENT_REQUESTS) {
    recentRequests.shift();
  }

  // Записываем в общие метрики
  const metricName = `http.${method.toLowerCase()}.${path.replace(/\//g, ".")}`;
  recordMetric(metricName, duration, statusCode >= 400);
}

/**
 * Получение статистики по метрике
 */
export function getMetricStats(name: string) {
  const entry = metrics.get(name);
  if (!entry || entry.count === 0) {
    return null;
  }

  return {
    count: entry.count,
    avgDuration: Math.round(entry.totalDuration / entry.count),
    minDuration: entry.minDuration === Infinity ? 0 : entry.minDuration,
    maxDuration: entry.maxDuration,
    errorRate: entry.errors / entry.count,
    lastUpdated: new Date(entry.lastUpdated).toISOString(),
  };
}

/**
 * Получение всех метрик
 */
export function getAllMetrics() {
  const result: Record<string, ReturnType<typeof getMetricStats>> = {};

  for (const [name] of metrics) {
    result[name] = getMetricStats(name);
  }

  return result;
}

/**
 * Получение последних запросов
 */
export function getRecentRequests() {
  return [...recentRequests].reverse();
}

/**
 * Получение сводной статистики
 */
export function getSummaryStats() {
  const now = Date.now();
  const oneMinuteAgo = now - 60 * 1000;
  const fiveMinutesAgo = now - 5 * 60 * 1000;

  const last1Min = recentRequests.filter((r) => r.timestamp > oneMinuteAgo);
  const last5Min = recentRequests.filter((r) => r.timestamp > fiveMinutesAgo);

  const calculate = (requests: RequestMetric[]) => {
    if (requests.length === 0) {
      return { count: 0, avgDuration: 0, errorRate: 0 };
    }

    const errors = requests.filter((r) => r.statusCode >= 400).length;
    const totalDuration = requests.reduce((sum, r) => sum + r.duration, 0);

    return {
      count: requests.length,
      avgDuration: Math.round(totalDuration / requests.length),
      errorRate: errors / requests.length,
    };
  };

  return {
    last1Min: calculate(last1Min),
    last5Min: calculate(last5Min),
    total: {
      requests: recentRequests.length,
      metricsTracked: metrics.size,
    },
  };
}

/**
 * Сброс метрик
 */
export function resetMetrics(): void {
  metrics.clear();
  recentRequests.length = 0;
  logger.info("Metrics reset");
}

/**
 * Wrapper для измерения времени выполнения и записи метрики
 */
export async function withMetrics<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  let isError = false;

  try {
    return await fn();
  } catch (error) {
    isError = true;
    throw error;
  } finally {
    const duration = Math.round(performance.now() - start);
    recordMetric(name, duration, isError);
  }
}
