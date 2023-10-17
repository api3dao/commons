import winston from 'winston';
import { consoleFormat } from 'winston-console-format';

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

const createBaseLogger = (config: LogConfig) => {
  const { enabled, minLevel } = config;

  return winston.createLogger({
    level: minLevel,
    // This format is recommended by the "winston-console-format" package.
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.ms(),
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
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: ((message: string, context?: LogContext) => void) &
    ((message: string, error: Error, context?: LogContext) => void);
  child: (options: { name: string }) => Logger;
}

// Winston by default merges content of `context` among the rest of the fields for the JSON format.
// That's causing an override of fields `name` and `message` if they are present.
const wrapper = (logger: Logger): Logger => {
  return {
    debug: (message, context) => logger.debug(message, context ? { context } : undefined),
    info: (message, context) => logger.info(message, context ? { context } : undefined),
    warn: (message, context) => logger.warn(message, context ? { context } : undefined),
    // We need to handle both overloads of the `error` function
    error: (message, errorOrContext, context) => {
      // eslint-disable-next-line lodash/prefer-lodash-typecheck
      if (errorOrContext instanceof Error) {
        logger.error(message, errorOrContext, context ? { context } : undefined);
      } else {
        logger.error(message, errorOrContext ? { context: errorOrContext } : undefined);
      }
    },
    child: (options) => wrapper(logger.child(options)),
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
