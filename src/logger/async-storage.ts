import { AsyncLocalStorage } from 'node:async_hooks';

import type { LogContext } from '.';

let asyncLocalStorage: AsyncLocalStorage<LogContext>;

export const getAsyncLocalStorage = () => {
  if (!asyncLocalStorage) asyncLocalStorage = new AsyncLocalStorage<LogContext>();
  return asyncLocalStorage;
};
