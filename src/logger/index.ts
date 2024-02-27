import winston from 'winston';
import { consoleFormat } from 'winston-console-format';

import { getAsyncLocalStorage } from './async-storage';

export const logFormatOptions = ['json', 'pretty'] as const;

export type LogFormat = (typeof logFormatOptions)[number];

export const logLevelOptions = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof logLevelOptions)[number];

export interface LogConfig {
  colorize: boolean;
  enabled: boolean;
  format: LogFormat;
  minLevel: LogLevel;
}

const createConsoleTransport = (config: LogConfig) => {
  const { colorize, enabled, format } = config;

  if (!enabled) {
    return new winston.transports.Console({ silent: true });
  }

  switch (format) {
    case 'json': {
      return new winston.transports.Console({ format: winston.format.json() });
    }
    case 'pretty': {
      const formats = [
        colorize ? winston.format.colorize({ all: true }) : null,
        winston.format.padLevels(),
        consoleFormat({
          showMeta: true,
          metaStrip: [],
          inspectOptions: {
            depth: Number.POSITIVE_INFINITY,
            colors: colorize,
            maxArrayLength: Number.POSITIVE_INFINITY,
            breakLength: 120,
            compact: Number.POSITIVE_INFINITY,
          },
        }),
      ].filter(Boolean) as winston.Logform.Format[];

      return new winston.transports.Console({
        format: winston.format.combine(...formats),
      });
    }
  }
};

export const createBaseLogger = (config: LogConfig) => {
  const { enabled, minLevel } = config;

  return winston.createLogger({
    level: minLevel,
    // This format is recommended by the "winston-console-format" package.
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    silent: !enabled,
    exitOnError: false,
    transports: [createConsoleTransport(config)],
  });
};

export type LogContext = Record<string, any>;

export interface Logger {
  runWithContext: <T>(context: LogContext, fn: () => T) => T;
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  // We need to handle both overloads of the `error` function. It may a bit surprising that the variants are joined with
  // "&" instead of "|", but it forces TypeScript to be more deliberate when resolving overloads. For functions, this
  // means the implementation must handle all overloads, and TypeScript will look for the correct overload based on the
  // arguments provided.
  error: ((message: string, context?: LogContext) => void) &
    ((message: string, error: Error, context?: LogContext) => void);
  child: (options: { name: string }) => Logger;
}

const createFullContext = (localContext: LogContext | undefined) => {
  const globalContext = getAsyncLocalStorage().getStore();
  if (!globalContext && !localContext) return;
  const fullContext = { ...globalContext, ...localContext };

  // If the context contains a `name` or `message` field, it will override the `name` and `message` fields of the log
  // entry. To avoid this, we return the context as a separate field.
  return { ctx: fullContext };
};

// Winston by default merges content of `context` among the rest of the fields for the JSON format.
// That's causing an override of fields `name` and `message` if they are present.
export const wrapper = (logger: winston.Logger): Logger => {
  return {
    debug: (message, localContext) => {
      logger.debug(message, createFullContext(localContext));
    },
    info: (message, localContext) => {
      logger.info(message, createFullContext(localContext));
    },
    warn: (message, localContext) => {
      logger.warn(message, createFullContext(localContext));
    },
    // We need to handle both overloads of the `error` function
    error: (message, errorOrLocalContext: Error | LogContext, localContext?: LogContext) => {
      const globalContext = getAsyncLocalStorage().getStore();
      // eslint-disable-next-line lodash/prefer-lodash-typecheck
      if (errorOrLocalContext instanceof Error) {
        const fullContext = globalContext || localContext ? { ...globalContext, ...localContext } : undefined;
        logger.error(message, errorOrLocalContext, fullContext);
      } else {
        logger.error(message, createFullContext(localContext));
      }
    },
    child: (options) => wrapper(logger.child(options)),
    runWithContext: (context, fn) => {
      const asyncStorage = getAsyncLocalStorage();
      const oldContext = asyncStorage.getStore() ?? {};
      // From https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args
      //
      // If the callback function throws an error, the error is thrown by run() too. The stacktrace is not impacted by
      // this call and the context is exited.
      return asyncStorage.run({ ...oldContext, ...context }, fn);
    },
  } as Logger;
};

export const validateLogConfig = (config: unknown): LogConfig => {
  // eslint-disable-next-line lodash/prefer-lodash-typecheck
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid logger configuration');
  }

  const { colorize, enabled, format, minLevel } = config as Partial<LogConfig>;
  // eslint-disable-next-line lodash/prefer-lodash-typecheck
  if (typeof colorize !== 'boolean') {
    throw new TypeError('Invalid logger configuration: colorize must be a boolean');
  }
  // eslint-disable-next-line lodash/prefer-lodash-typecheck
  if (typeof enabled !== 'boolean') {
    throw new TypeError('Invalid logger configuration: enabled must be a boolean');
  }
  if (!logFormatOptions.includes(format as any)) {
    throw new TypeError('Invalid logger configuration: format must be one of "json" or "pretty"');
  }
  if (!logLevelOptions.includes(minLevel as any)) {
    throw new TypeError('Invalid logger configuration: minLevel must be one of "debug", "info", "warn" or "error"');
  }

  return config as LogConfig;
};

export const createLogger = (config: LogConfig) => {
  // Ensure that the logger configuration is valid.
  return wrapper(createBaseLogger(validateLogConfig(config)));
};
