import isError from 'lodash/isError.js';
import isString from 'lodash/isString.js';
import winston from 'winston';
import { consoleFormat } from 'winston-console-format';
import { z } from 'zod';

import { getAsyncLocalStorage } from './async-storage.js';

export const logFormatOptions = ['json', 'pretty'] as const;

export type LogFormat = (typeof logFormatOptions)[number];

export const logLevelOptions = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof logLevelOptions)[number];

export interface RedactionRule {
  pattern: RegExp;
  replacement: string;
}

export interface LogConfig {
  colorize: boolean;
  enabled: boolean;
  format: LogFormat;
  maxHexDataLength?: number | undefined;
  minLevel: LogLevel;
  redactionRules?: RedactionRule[] | undefined;
}

export const loggerEnvSchema = z.object({
  LOGGER_ENABLED: z.stringbool().default(true),
  LOG_COLORIZE: z.stringbool().default(false),
  LOG_FORMAT: z.enum(logFormatOptions).default('json'),
  LOG_LEVEL: z.enum(logLevelOptions).default('info'),
  LOG_MAX_HEX_DATA_LENGTH: z.coerce.number().int().positive().optional(),
});

export type LoggerEnv = z.infer<typeof loggerEnvSchema>;

export const createLogConfigFromEnv = (env: LoggerEnv): LogConfig => ({
  colorize: env.LOG_COLORIZE,
  enabled: env.LOGGER_ENABLED,
  format: env.LOG_FORMAT,
  maxHexDataLength: env.LOG_MAX_HEX_DATA_LENGTH,
  minLevel: env.LOG_LEVEL,
});

const truncatedHexDataPrefixLength = 12;

const truncateHexData = (value: string, longHexDataPattern: RegExp) =>
  value.replaceAll(
    longHexDataPattern,
    (hexData) => `${hexData.slice(0, truncatedHexDataPrefixLength)}...<${hexData.length} chars>`
  );

export const createJsonReplacer = (config: Pick<LogConfig, 'maxHexDataLength' | 'redactionRules'>) => {
  const { maxHexDataLength, redactionRules = [] } = config;
  // The "0x" prefix counts towards the length, so the pattern needs one hex digit less than the maximum length.
  const longHexDataPattern =
    maxHexDataLength === undefined ? undefined : new RegExp(String.raw`0x[\dA-Fa-f]{${maxHexDataLength - 1},}`, 'g');

  return (_key: string, value: unknown) => {
    // A custom replacer overrides the default one of the JSON format, which is what serializes bigints.
    if (typeof value === 'bigint') return value.toString();
    if (!isString(value)) return value;

    const redactedValue = redactionRules.reduce(
      // eslint-disable-next-line unicorn/no-unsafe-string-replacement -- Rules may use patterns like "$<prefix>".
      (partiallyRedactedValue, { pattern, replacement }) => partiallyRedactedValue.replace(pattern, replacement),
      value
    );

    return longHexDataPattern ? truncateHexData(redactedValue, longHexDataPattern) : redactedValue;
  };
};

const createConsoleTransport = (config: LogConfig) => {
  const { colorize, enabled, format } = config;

  if (!enabled) {
    return new winston.transports.Console({ silent: true });
  }

  switch (format) {
    case 'json': {
      // The format of the logger already serializes the log entry to JSON.
      return new winston.transports.Console();
    }
    case 'pretty': {
      const formats = [
        colorize ? winston.format.colorize({ all: true }) : null,
        winston.format.padLevels(),
        consoleFormat({
          showMeta: true,
          metaStrip: [],
          inspectOptions: {
            depth: Infinity,
            colors: colorize,
            maxArrayLength: Infinity,
            breakLength: 120,
            compact: Infinity,
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
    // This format is recommended by the "winston-console-format" package. Serializing at the logger level gives every
    // transport, including additional ones, the redacted JSON log entry.
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json({ replacer: createJsonReplacer(config) })
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

const parseLocalContext = (localContext: LogContext | undefined) => {
  // Sometimes an error passed as a context, but when JS error has no own enumerable properties, so when it is spread
  // (using ...) we get an empty object and lose all the context.
  if (isError(localContext)) return { error: localContext.message, name: localContext.name };
  return localContext;
};

const parseError = (error: Error) => ({
  // A JS error has no own enumerable `message`, `name` or `stack`, so the spread keeps only the additional fields (of an
  // ethers.js error, for example) and we add the rest explicitly.
  ...error,
  message: error.message,
  name: error.name,
  stack: error.stack,
});

const createFullContext = (localContext: LogContext | undefined) => {
  const globalContext = getAsyncLocalStorage().getStore();
  if (!globalContext && !localContext) return;
  const fullContext = { ...globalContext, ...parseLocalContext(localContext) };

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
      if (errorOrLocalContext instanceof Error) {
        // Winston merges additional arguments into the log entry, where fields of the error (like the `message` of a Zod
        // error) would override the log message, so we log the error as a separate field instead.
        logger.error(message, { ...createFullContext(localContext), error: parseError(errorOrLocalContext) });
      } else {
        logger.error(message, createFullContext(errorOrLocalContext));
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

export const createLogger = (config: LogConfig) => wrapper(createBaseLogger(config));
