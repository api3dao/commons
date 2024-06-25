import { expect, jest, test } from '@jest/globals';
import noop from 'lodash/noop';

import { type LogConfig, createBaseLogger, wrapper } from '.';

const createTestLogger = (
  logConfig: LogConfig = { enabled: true, minLevel: 'debug', format: 'json', colorize: false }
) => {
  const baseLogger = createBaseLogger(logConfig);
  const logger = wrapper(baseLogger);
  jest.spyOn(baseLogger, 'debug').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'info').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'warn').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'error').mockImplementation(noop as any);
  jest.spyOn(baseLogger, 'child').mockImplementation(noop as any);

  return { baseLogger, logger };
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
  expect(baseLogger.error).toHaveBeenNthCalledWith(3, 'message and error', new Error('some-error'), undefined);
  expect(baseLogger.error).toHaveBeenNthCalledWith(4, 'message, error and context', new Error('some-error'), {
    ctx: {
      requestId: 'parent',
    },
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
