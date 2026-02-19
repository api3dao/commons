import { type Logger } from '../logger';
import * as utils from '../utils';

import { runInLoop } from './index';

const createMockLogger = (): Logger => ({
  runWithContext: jest.fn((_: Record<string, any>, fn: () => any) => fn()) as Logger['runWithContext'],
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn() as Logger['error'],
  child: jest.fn() as Logger['child'],
});

const createTestRunInLoopFunction = (executions: number) => {
  let callCount = 0;

  return jest.fn(async () => {
    callCount += 1;
    return { shouldContinueRunning: callCount < executions };
  });
};

const getRunContexts = (mockedLogger: Logger) => {
  const runWithContextMock = jest.mocked(mockedLogger.runWithContext);
  return runWithContextMock.mock.calls.map(([context]) => context);
};

describe(runInLoop.name, () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('stops the loop after getting the stop signal', async () => {
    const mockedLogger = createMockLogger();
    const fnSpy = createTestRunInLoopFunction(3);
    await runInLoop(fnSpy, { logger: mockedLogger });
    expect(fnSpy).toHaveBeenCalledTimes(3);
  });

  it('uses random execution IDs by default', async () => {
    const mockedLogger = createMockLogger();
    const fnSpy = createTestRunInLoopFunction(1);
    jest.spyOn(utils, 'generateRandomBytes32').mockReturnValue('0xrandom');

    await runInLoop(fnSpy, { logger: mockedLogger });

    expect(getRunContexts(mockedLogger)).toStrictEqual([{ executionId: '0xrandom' }]);
  });

  it('uses incremental execution IDs', async () => {
    const mockedLogger = createMockLogger();
    const fnSpy = createTestRunInLoopFunction(3);

    await runInLoop(fnSpy, {
      logger: mockedLogger,
      executionIdOptions: { type: 'incremental' },
    });

    expect(getRunContexts(mockedLogger)).toStrictEqual([
      { executionId: '0' },
      { executionId: '1' },
      { executionId: '2' },
    ]);
  });

  it('uses incremental execution IDs with prefix', async () => {
    const mockedLogger = createMockLogger();
    const fnSpy = createTestRunInLoopFunction(3);

    await runInLoop(fnSpy, {
      logger: mockedLogger,
      executionIdOptions: { type: 'incremental', prefix: 'worker' },
    });

    expect(getRunContexts(mockedLogger)).toStrictEqual([
      { executionId: 'worker-0' },
      { executionId: 'worker-1' },
      { executionId: 'worker-2' },
    ]);
  });
});
