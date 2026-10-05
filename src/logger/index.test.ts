import { makeError } from 'ethers';
import noop from 'lodash/noop.js';
import { z } from 'zod';

import { createBaseLogger, validateLogConfig, wrapper, type LogConfig } from './index.js';

// Winston stores the serialized log entry under this symbol, which the "triple-beam" package exports as MESSAGE.
const serializedLogEntryKey = Symbol.for('message');

const createTestLogger = () => {
  const baseLogger = createBaseLogger({ enabled: true, minLevel: 'debug', format: 'json', colorize: false });
  const logger = wrapper(baseLogger);
  jest.spyOn(baseLogger, 'debug').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'info').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'warn').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'error').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'child').mockImplementation(noop as any);

  return { baseLogger, logger };
};

const createTestLoggerWithCapturedLogEntries = (logConfigOverrides: Partial<LogConfig> = {}) => {
  const baseLogger = createBaseLogger({
    enabled: true,
    minLevel: 'debug',
    format: 'json',
    colorize: false,
    ...logConfigOverrides,
  });
  const transportLogSpy = jest
    .spyOn(baseLogger.transports[0]!, 'log')
    .mockImplementation((_logEntry: any, next: () => void) => next());
  const getLogEntries = () => transportLogSpy.mock.calls.map(([logEntry]) => logEntry);
  const getSerializedLogEntries = (): string[] => getLogEntries().map((logEntry) => logEntry[serializedLogEntryKey]);

  return { logger: wrapper(baseLogger), getLogEntries, getSerializedLogEntries };
};

const infuraRedactionRule = {
  pattern: /(?<prefix>https:\/\/[\w-]+\.infura\.io\/v3\/)[\w-]+/g,
  replacement: '$<prefix>********',
};

test('works with sync functions', () => {
  const { baseLogger, logger } = createTestLogger();

  logger.runWithContext({ requestId: 'parent' }, () => {
    logger.debug('parent start');
    logger.runWithContext({ requestId: 'child' }, () => {
      logger.debug('child');
    });

    logger.debug('parent end');
  });

  expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { ctx: { requestId: 'parent' } });
  expect(baseLogger.debug).toHaveBeenCalledWith('child', { ctx: { requestId: 'child' } });
  expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { ctx: { requestId: 'parent' } });
});

test('works with async functions', async () => {
  const { baseLogger, logger } = createTestLogger();

  await logger.runWithContext({ requestId: 'parent' }, async () => {
    logger.debug('parent start');
    await logger.runWithContext({ requestId: 'child' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
      logger.debug('child');
    });

    logger.debug('parent end');
  });

  expect(baseLogger.debug).toHaveBeenCalledTimes(3);
  expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { ctx: { requestId: 'parent' } });
  expect(baseLogger.debug).toHaveBeenCalledWith('child', { ctx: { requestId: 'child' } });
  expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { ctx: { requestId: 'parent' } });
});

test('works with deeply nested functions', async () => {
  const { baseLogger, logger } = createTestLogger();

  await logger.runWithContext({ parent: true }, async () => {
    logger.debug('parent start');

    await logger.runWithContext({ A: true }, async () => {
      logger.debug('A start');

      await logger.runWithContext({ B: true }, async () => {
        setTimeout(() => logger.debug('C'), 25);
        setTimeout(() => logger.debug('D'), 50);
        setTimeout(() => logger.debug('E'), 75);

        await new Promise((resolve) => setTimeout(resolve, 100));
        logger.debug('B end');
      });

      logger.debug('A end');
    });

    logger.debug('parent end');
  });

  expect(baseLogger.debug).toHaveBeenCalledTimes(8);
  expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { ctx: { parent: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('A start', { ctx: { parent: true, A: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('C', { ctx: { parent: true, A: true, B: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('D', { ctx: { parent: true, A: true, B: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('E', { ctx: { parent: true, A: true, B: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('B end', { ctx: { parent: true, A: true, B: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('A end', { ctx: { parent: true, A: true } });
  expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { ctx: { parent: true } });
});

test('throws if the sync callback function throws', () => {
  const { logger } = createTestLogger();

  expect(() =>
    logger.runWithContext({}, () => {
      throw new Error('some-error');
    })
  ).toThrow('some-error');
});

test('returns rejected promise if the async callback function rejects', async () => {
  const { logger } = createTestLogger();

  await expect(async () =>
    logger.runWithContext({}, async () => {
      throw new Error('some-error');
    })
  ).rejects.toThrow('some-error');
});

test('can log using all variants of logger.error', () => {
  const { baseLogger, logger } = createTestLogger();

  logger.error('only message');
  logger.error('message and context', { requestId: 'parent' });
  logger.error('message and error', new Error('some-error'));
  logger.error('message, error and context', new Error('some-error'), { requestId: 'parent' });

  expect(baseLogger.error).toHaveBeenNthCalledWith(1, 'only message', undefined);
  expect(baseLogger.error).toHaveBeenNthCalledWith(2, 'message and context', { ctx: { requestId: 'parent' } });
  expect(baseLogger.error).toHaveBeenNthCalledWith(3, 'message and error', {
    error: { message: 'some-error', name: 'Error', stack: expect.any(String) },
  });
  expect(baseLogger.error).toHaveBeenNthCalledWith(4, 'message, error and context', {
    ctx: { requestId: 'parent' },
    error: { message: 'some-error', name: 'Error', stack: expect.any(String) },
  });
});

test('keeps the log message when logging an error with an own message field', () => {
  const { logger, getLogEntries } = createTestLoggerWithCapturedLogEntries();
  const { error } = z.object({ amount: z.string() }).safeParse({ amount: 123 });

  logger.error('Parsing failed', error!, { requestId: 'parent' });

  expect(getLogEntries()).toStrictEqual([
    expect.objectContaining({
      message: 'Parsing failed',
      ctx: { requestId: 'parent' },
      error: { message: error!.message, name: 'ZodError', stack: error!.stack },
    }),
  ]);
});

test('logs the additional fields of an error inside the error field', () => {
  const { logger, getLogEntries } = createTestLoggerWithCapturedLogEntries();
  const error = makeError('invalid argument', 'INVALID_ARGUMENT', { argument: 'amount', value: 123 });

  logger.error('Validation failed', error);

  const [logEntry] = getLogEntries();
  expect(logEntry.message).toBe('Validation failed');
  expect(logEntry.code).toBeUndefined();
  expect(logEntry.error).toMatchObject({
    argument: 'amount',
    code: 'INVALID_ARGUMENT',
    message: error.message,
    name: 'TypeError',
    stack: error.stack,
    value: 123,
  });
});

test('logs an error when passed as context to non error level', () => {
  const { baseLogger, logger } = createTestLogger();
  const e = new Error('some-error');

  logger.debug('debug message', e);
  logger.info('info message', e);
  logger.warn('warn message', e);

  expect(baseLogger.debug).toHaveBeenCalledWith('debug message', { ctx: { error: 'some-error', name: 'Error' } });
  expect(baseLogger.info).toHaveBeenCalledWith('info message', { ctx: { error: 'some-error', name: 'Error' } });
  expect(baseLogger.warn).toHaveBeenCalledWith('warn message', { ctx: { error: 'some-error', name: 'Error' } });
});

test('redacts sensitive data in JSON logs', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries({
    redactionRules: [infuraRedactionRule],
  });

  logger.info('Connecting to https://mainnet.infura.io/v3/secret-key', {
    urls: ['https://mainnet.infura.io/v3/secret-key', 'https://base-mainnet.infura.io/v3/secret-key'],
  });

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(serializedLogEntry).not.toContain('secret-key');
  expect(JSON.parse(serializedLogEntry!)).toMatchObject({
    message: 'Connecting to https://mainnet.infura.io/v3/********',
    ctx: { urls: ['https://mainnet.infura.io/v3/********', 'https://base-mainnet.infura.io/v3/********'] },
  });
});

test('redacts sensitive data in the fields of a logged error', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries({
    redactionRules: [infuraRedactionRule],
  });
  const error = makeError('server error', 'SERVER_ERROR', { request: 'https://mainnet.infura.io/v3/secret-key' });

  logger.error('Request failed', error);

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(serializedLogEntry).not.toContain('secret-key');
  expect(JSON.parse(serializedLogEntry!).error.request).toBe('https://mainnet.infura.io/v3/********');
});

test('serializes bigints in JSON logs', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries({
    redactionRules: [infuraRedactionRule],
  });

  logger.info('Transferring tokens', { amount: 10n ** 18n });

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(JSON.parse(serializedLogEntry!).ctx).toStrictEqual({ amount: '1000000000000000000' });
});

test('truncates hex data longer than maxHexDataLength in JSON logs', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries({ maxHexDataLength: 100 });
  const hexDataWithMaxLength = `0x${'ab'.repeat(49)}`;
  const longHexData = `0x${'cd'.repeat(49)}e`;

  logger.info('Sending transaction', { hexDataWithMaxLength, longHexData });

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(JSON.parse(serializedLogEntry!).ctx).toStrictEqual({
    hexDataWithMaxLength,
    longHexData: '0xcdcdcdcdcd...<101 chars>',
  });
});

test('truncates all long hex data in a string value', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries({ maxHexDataLength: 20 });
  const calldata = `0x${'ab'.repeat(60)}`;
  const returndata = `0x${'cd'.repeat(55)}`;

  logger.error('Transaction failed', new Error(`calldata: ${calldata}, returndata: ${returndata}`));

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(JSON.parse(serializedLogEntry!).error.message).toBe(
    'calldata: 0xababababab...<122 chars>, returndata: 0xcdcdcdcdcd...<112 chars>'
  );
});

test('does not truncate hex data when maxHexDataLength is not set', () => {
  const { logger, getSerializedLogEntries } = createTestLoggerWithCapturedLogEntries();
  const calldata = `0x${'ab'.repeat(1000)}`;

  logger.info('Sending transaction', { calldata });

  const [serializedLogEntry] = getSerializedLogEntries();
  expect(JSON.parse(serializedLogEntry!).ctx).toStrictEqual({ calldata });
});

test('validates maxHexDataLength', () => {
  const logConfig: LogConfig = { enabled: true, minLevel: 'debug', format: 'json', colorize: false };

  expect(validateLogConfig({ ...logConfig, maxHexDataLength: 100 })).toStrictEqual({
    ...logConfig,
    maxHexDataLength: 100,
  });
  expect(() => validateLogConfig({ ...logConfig, maxHexDataLength: 0 })).toThrow(
    'Invalid logger configuration: maxHexDataLength must be a positive integer'
  );
  expect(() => validateLogConfig({ ...logConfig, maxHexDataLength: 1.5 })).toThrow(
    'Invalid logger configuration: maxHexDataLength must be a positive integer'
  );
  expect(() => validateLogConfig({ ...logConfig, maxHexDataLength: '100' })).toThrow(
    'Invalid logger configuration: maxHexDataLength must be a positive integer'
  );
});
