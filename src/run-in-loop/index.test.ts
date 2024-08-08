import { createLogger } from '../logger';

import { runInLoop } from './index';

describe(runInLoop.name, () => {
  const logger = createLogger({
    colorize: true,
    enabled: true,
    minLevel: 'info',
    format: 'json',
  });

  it('stops the loop after getting the stop signal', async () => {
    const fn = async () => ({ shouldContinueRunning: false });
    const fnSpy = jest
      .spyOn({ fn }, 'fn')
      .mockImplementationOnce(async () => ({ shouldContinueRunning: true }))
      .mockImplementationOnce(async () => ({ shouldContinueRunning: true }))
      .mockImplementationOnce(async () => ({ shouldContinueRunning: false }));
    await runInLoop(fnSpy as any, { logger });
    expect(fnSpy).toHaveBeenCalledTimes(3);
  });
});
