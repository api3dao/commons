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

describe('log context', () => {
  it('works with sync functions', () => {
    const { baseLogger, logger } = createTestLogger();

    logger.runWithContext({ requestId: 'parent' }, () => {
      logger.debug('parent start');
      logger.runWithContext({ requestId: 'child' }, () => {
        logger.debug('child');
      });

      logger.debug('parent end');
    });

    expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { requestId: 'parent' });
    expect(baseLogger.debug).toHaveBeenCalledWith('child', { requestId: 'child' });
    expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { requestId: 'parent' });
  });

  it('works with async functions', async () => {
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
    expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { requestId: 'parent' });
    expect(baseLogger.debug).toHaveBeenCalledWith('child', { requestId: 'child' });
    expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { requestId: 'parent' });
  });

  it('works with deeply nested functions', async () => {
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
    expect(baseLogger.debug).toHaveBeenCalledWith('parent start', { parent: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('A start', { parent: true, A: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('C', { parent: true, A: true, B: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('D', { parent: true, A: true, B: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('E', { parent: true, A: true, B: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('B end', { parent: true, A: true, B: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('A end', { parent: true, A: true });
    expect(baseLogger.debug).toHaveBeenCalledWith('parent end', { parent: true });
  });

  it('throws if the sync callback function throws', () => {
    const { logger } = createTestLogger();

    expect(() =>
      logger.runWithContext({}, () => {
        throw new Error('some-error');
      })
    ).toThrow('some-error');
  });

  it('returns rejected promise if the async callback function rejects', async () => {
    const { logger } = createTestLogger();

    await expect(async () =>
      // eslint-disable-next-line @typescript-eslint/require-await
      logger.runWithContext({}, async () => {
        throw new Error('some-error');
      })
    ).rejects.toThrow('some-error');
  });

  it('can log using all variants of logger.error', () => {
    const { baseLogger, logger } = createTestLogger();

    logger.error('only message');
    logger.error('message and context', { requestId: 'parent' });
    logger.error('message and error', new Error('some-error'));
    logger.error('message, error and context', new Error('some-error'), { requestId: 'parent' });

    expect(baseLogger.error).toHaveBeenNthCalledWith(1, 'only message', undefined);
    expect(baseLogger.error).toHaveBeenNthCalledWith(2, 'message and context', { requestId: 'parent' });
    expect(baseLogger.error).toHaveBeenNthCalledWith(3, 'message and error', new Error('some-error'), undefined);
    expect(baseLogger.error).toHaveBeenNthCalledWith(4, 'message, error and context', new Error('some-error'), {
      requestId: 'parent',
    });
  });
});
