import { AsyncLocalStorage } from 'node:async_hooks';

export interface TaskOptions {
  name?: string;
  timeoutMs?: number;
}

export interface TaskContext {
  startTimestampMs: number;
  timeoutMs: number;
}

let asyncLocalStorage: AsyncLocalStorage<TaskContext>;

export const getAsyncLocalStorage = () => {
  if (!asyncLocalStorage) asyncLocalStorage = new AsyncLocalStorage<TaskContext>();
  return asyncLocalStorage;
};
