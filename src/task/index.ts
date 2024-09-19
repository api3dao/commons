import { go } from '@api3/promise-utils';

import { getAsyncLocalStorage, type TaskContext, type TaskOptions } from './async-storage';

export const runTask = async (callback: () => void | Promise<void>, options?: TaskOptions) => {
  const asyncStorage = getAsyncLocalStorage();
  const inheritedContext = asyncStorage.getStore();

  // Validate that the timeout is set for the root task.
  if (!inheritedContext && !options?.timeoutMs) throw new Error('Root task must have a timeout');

  while (true) {
    // Determine the timeout for the current task.
    const currentTaskStartTimestampMs = Date.now();
    let timeoutMs: number | undefined = options?.timeoutMs;
    if (inheritedContext) {
      const timeLeft = Math.max(
        0,
        inheritedContext.timeoutMs - (currentTaskStartTimestampMs - inheritedContext.startTimestampMs)
      );
      timeoutMs = timeoutMs ? Math.min(timeoutMs, timeLeft) : timeLeft;
    }

    // Validate that there is still time left.
    if (timeoutMs === undefined) throw new Error('Invariant broken: Timeout must be defined');
    if (timeoutMs === 0) throw new Error('No time left for task');

    // Create the task context.
    const context: TaskContext = {
      startTimestampMs: currentTaskStartTimestampMs,
      timeoutMs,
    };

    // From https://nodejs.org/api/async_context.html#asynclocalstoragerunstore-callback-args
    //
    // If the callback function throws an error, the error is thrown by run() too. The stacktrace is not impacted by
    // this call and the context is exited.
    const callbackWithContext = () => asyncStorage.run(context, callback);

    // Log the task attempt.
    console.info(`Executing task`, options?.name ?? 'unknown', context);

    // Run the callback with the context and timeout. In case the task fails, retry with whatever timeout is left.
    const goResult = await go(callbackWithContext, { totalTimeoutMs: timeoutMs });
    if (goResult.success) return goResult.data;
  }
};
