import { go } from '@api3/promise-utils';

import { type Logger } from '../logger';
import { generateRandomBytes32, sleep } from '../utils';

export type RunInLoopExecutionIdOptions =
  | {
      /**
       * Generate a random 32-byte execution ID for each iteration.
       */
      type: 'random';
    }
  | {
      /**
       * Generate execution IDs as incrementing numbers starting from 0.
       */
      type: 'incremental';
      /**
       * Optional prefix prepended to the incrementing number (e.g. "my-prefix-0").
       */
      prefix?: string;
    };

export interface RunInLoopOptions {
  /** An API3 logger instance required to execute the callback with context. */
  logger: Logger;
  /** Part of every message logged by the logger. */
  logLabel?: Lowercase<string>;
  /**
   * The ideal frequency of callback executions. E.g. value 500 means that the next callback execution will be started
   * only after 500ms from the start of the previous one (even if the previous one ended after 150ms). Default is 0. The
   * delay between callback executions can be modified by min/max wait time.
   */
  frequencyMs?: number;
  /**
   * Minimum time to wait between executions. E.g. value 50 means that next execution will start 50ms after the previous
   * one ended. Default is 0.
   */
  minWaitTimeMs?: number;
  /**
   * Maximum time to wait between executions. E.g. value 100 means that the next execution will be started at most after
   * 100ms from the end of the previous one. The maxWaitTime has higher precedence than minWaitTime and frequencyMs.
   */
  maxWaitTimeMs?: number;
  /**
   * Maximum time to wait for the execution to finish. If the execution exceeds this time a warning is logged.
   */
  softTimeoutMs?: number;
  /**
   * Maximum time to wait for the callback execution to finish. If the execution exceeds this time an error is logged and the
   * execution is force-stopped.
   */
  hardTimeoutMs?: number;
  /**
   * If false, the execution will not run. This is useful for temporarily disabling the execution (e.g. change
   * environment variable and redeploy). Note that, there is no way to stop the loop execution once started. Default is
   * true.
   */
  enabled?: boolean;
  /**
   * The initial delay to to wait before executing the callback for the first time. Default is 0, which means the
   * callback is executed immediately.
   */
  initialDelayMs?: number;

  /**
   * Configures how execution IDs are generated. Defaults to random IDs.
   */
  executionIdOptions?: RunInLoopExecutionIdOptions;
}

const getExecutionId = (iteration: number, options: RunInLoopExecutionIdOptions) => {
  if (options.type === 'random') {
    return generateRandomBytes32();
  }
  return options.prefix ? `${options.prefix}-${iteration}`.trim() : iteration.toString();
};

export const runInLoop = async (
  fn: () => Promise<{ shouldContinueRunning: boolean } | void>,
  options: RunInLoopOptions
) => {
  const {
    logger,
    logLabel,
    frequencyMs = 0,
    minWaitTimeMs = 0,
    maxWaitTimeMs,
    softTimeoutMs = frequencyMs,
    hardTimeoutMs,
    enabled = true,
    initialDelayMs,
    executionIdOptions = { type: 'random' },
  } = options;

  if (hardTimeoutMs && hardTimeoutMs < softTimeoutMs) {
    throw new Error('hardTimeoutMs must not be smaller than softTimeoutMs');
  }
  if (minWaitTimeMs && maxWaitTimeMs && maxWaitTimeMs < minWaitTimeMs) {
    throw new Error('maxWaitTimeMs must not be smaller than minWaitTimeMs');
  }

  if (initialDelayMs) await sleep(initialDelayMs);

  let iteration = 0;
  while (true) {
    const executionStart = performance.now();
    const executionId = getExecutionId(iteration++, executionIdOptions);

    if (enabled) {
      const context = logLabel ? { executionId, label: logLabel } : { executionId };
      const shouldContinueRunning = await logger.runWithContext(context, async () => {
        logger.info('Starting execution');
        const goRes = await go(fn, hardTimeoutMs ? { totalTimeoutMs: hardTimeoutMs } : {}); // NOTE: This is a safety net to prevent the loop from hanging
        if (!goRes.success) {
          logger.error(`Unexpected runInLoop error`, goRes.error);
        }

        const executionTimeMs = performance.now() - executionStart;
        if (executionTimeMs >= softTimeoutMs!) {
          logger.warn(`Execution took longer than the interval`, { executionTimeMs });
        } else {
          logger.info(`Execution finished`, { executionTimeMs });
        }

        return goRes.data?.shouldContinueRunning === false ? false : true;
      });

      // Stop loop execution if the callback return value indicates it should stop
      if (!shouldContinueRunning) {
        break;
      }
    } else {
      // If the bot is disabled, we still want to run the loop to prevent the process from hanging. We also want to
      // sleep according to the wait time logic.
      logger.info('Loop execution is disabled.');
    }

    const remainingWaitTime = Math.max(frequencyMs - (performance.now() - executionStart), 0);
    const waitTime = Math.max(minWaitTimeMs, remainingWaitTime);
    const actualWaitTime = maxWaitTimeMs ? Math.min(waitTime, maxWaitTimeMs) : waitTime;
    if (actualWaitTime > 0) await sleep(actualWaitTime);
  }
};
