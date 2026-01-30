type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLogLevel(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
  if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
    return envLevel;
  }
  return process.env.NODE_ENV === "production" ? "info" : "debug";
}

function shouldLog(level: LogLevel): boolean {
  const minLevel = getMinLogLevel();
  return LOG_LEVELS[level] >= LOG_LEVELS[minLevel];
}

function formatError(error: unknown): LogEntry["error"] | undefined {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    };
  }

  return {
    name: "UnknownError",
    message: String(error),
  };
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: unknown
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 && { context }),
    ...(error && { error: formatError(error) }),
  };
}

function output(entry: LogEntry): void {
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction) {
    // JSON формат для production (парсится системами логирования)
    console.log(JSON.stringify(entry));
  } else {
    // Человекочитаемый формат для development
    const color = {
      debug: "\x1b[36m", // cyan
      info: "\x1b[32m",  // green
      warn: "\x1b[33m",  // yellow
      error: "\x1b[31m", // red
    }[entry.level];
    const reset = "\x1b[0m";

    const contextStr = entry.context
      ? ` ${JSON.stringify(entry.context)}`
      : "";
    const errorStr = entry.error
      ? `\n  Error: ${entry.error.message}${entry.error.stack ? `\n${entry.error.stack}` : ""}`
      : "";

    console.log(
      `${color}[${entry.level.toUpperCase()}]${reset} ${entry.timestamp} ${entry.message}${contextStr}${errorStr}`
    );
  }
}

/**
 * Логгер для приложения
 */
export const logger = {
  debug(message: string, context?: LogContext): void {
    if (shouldLog("debug")) {
      output(createLogEntry("debug", message, context));
    }
  },

  info(message: string, context?: LogContext): void {
    if (shouldLog("info")) {
      output(createLogEntry("info", message, context));
    }
  },

  warn(message: string, context?: LogContext, error?: unknown): void {
    if (shouldLog("warn")) {
      output(createLogEntry("warn", message, context, error));
    }
  },

  error(message: string, context?: LogContext, error?: unknown): void {
    if (shouldLog("error")) {
      output(createLogEntry("error", message, context, error));
    }
  },

  /**
   * Создание child логгера с предустановленным контекстом
   */
  child(defaultContext: LogContext) {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...defaultContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...defaultContext, ...context }),
      warn: (message: string, context?: LogContext, error?: unknown) =>
        logger.warn(message, { ...defaultContext, ...context }, error),
      error: (message: string, context?: LogContext, error?: unknown) =>
        logger.error(message, { ...defaultContext, ...context }, error),
    };
  },
};

/**
 * Измерение времени выполнения операции
 */
export function withTiming<T>(
  operation: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const start = performance.now();

  return fn()
    .then((result) => {
      const duration = Math.round(performance.now() - start);
      logger.debug(`${operation} completed`, { ...context, durationMs: duration });
      return result;
    })
    .catch((error) => {
      const duration = Math.round(performance.now() - start);
      logger.error(`${operation} failed`, { ...context, durationMs: duration }, error);
      throw error;
    });
}

/**
 * Декоратор для логирования функций
 */
export function logged(operation: string) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyKey: string,
    descriptor: TypedPropertyDescriptor<T>
  ): TypedPropertyDescriptor<T> {
    const originalMethod = descriptor.value!;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const start = performance.now();
      try {
        const result = await originalMethod.apply(this, args);
        const duration = Math.round(performance.now() - start);
        logger.debug(`${operation} completed`, { durationMs: duration });
        return result;
      } catch (error) {
        const duration = Math.round(performance.now() - start);
        logger.error(`${operation} failed`, { durationMs: duration }, error);
        throw error;
      }
    } as T;

    return descriptor;
  };
}
