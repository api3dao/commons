/* eslint-disable camelcase */
import assert from 'node:assert';
import async_hooks from 'node:async_hooks';
import buffer from 'node:buffer';
import child_process from 'node:child_process';
import cluster from 'node:cluster';
import console from 'node:console';
import constants from 'node:constants';
import crypto from 'node:crypto';
import dgram from 'node:dgram';
import dns from 'node:dns';
import events from 'node:events';
import fs from 'node:fs';
import http from 'node:http';
import http2 from 'node:http2';
import https from 'node:https';
import inspector from 'node:inspector';
import module from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import perf_hooks from 'node:perf_hooks';
import process from 'node:process';
import readline from 'node:readline';
import repl from 'node:repl';
import stream from 'node:stream';
import string_decoder from 'node:string_decoder';
import timers from 'node:timers';
import tls from 'node:tls';
import trace_events from 'node:trace_events';
import tty from 'node:tty';
import url from 'node:url';
import util from 'node:util';
import v8 from 'node:v8';
import vm from 'node:vm';
import worker_threads from 'node:worker_threads';
import zlib from 'node:zlib';

import { type GoWrappedError, go } from '@api3/promise-utils';

import { createTimers } from './vm-timers';

const builtInNodeModules = {
  assert,
  async_hooks,
  buffer,
  child_process,
  cluster,
  console,
  constants,
  crypto,
  dgram,
  dns,
  events,
  fs,
  http,
  http2,
  https,
  inspector,
  module,
  net,
  os,
  path,
  perf_hooks,
  process,
  readline,
  repl,
  stream,
  string_decoder,
  timers,
  tls,
  trace_events,
  tty,
  url,
  util,
  v8,
  vm,
  worker_threads,
  zlib,
};

/**
 * Evaluates the provided code in a new VM context with the specified global variables.
 *
 * **Security Warning:** This function executes the provided code and can have unintended side effects or
 * vulnerabilities if used with untrusted or malicious input. It's imperative to use this function only with code you
 * trust completely. Avoid using this function with user-generated code or third-party code that hasn't been thoroughly
 * reviewed.
 *
 * @param code The JavaScript code to evaluate.
 * @param globalVariables A key-value pair of variables to be made available in the context of the executed code.
 * @param timeout Duration in milliseconds to wait before terminating the execution.
 *
 * @returns The result of the evaluated code.
 *
 * @throws Throws an error if the execution exceeds the provided timeout or if there's a problem with the code.
 *
 * @example
 *
 *const result = unsafeEvaluate('const output = input + 1;', { input: 1 }, 1000);
 *console.log(result); // Outputs: 2
 */
export const unsafeEvaluate = (code: string, globalVariables: Record<string, unknown>, timeout: number) => {
  const vmContext = {
    ...globalVariables,
    ...builtInNodeModules,
    deferredOutput: undefined as unknown,
  };

  vm.runInNewContext(`${code}; deferredOutput = output;`, vmContext, {
    displayErrors: true,
    timeout,
  });

  return vmContext.deferredOutput;
};

export const unsafeEvaluateAsyncV2 = async (code: string, payload: unknown, timeout: number) => {
  const timers = createTimers();

  const goEvaluate = await go<Promise<any>, GoWrappedError>(
    // eslint-disable-next-line @typescript-eslint/require-await
    async () =>
      vm.runInNewContext(
        `
          (async () => {
            return await (${code})(__payload)
          })();
        `,
        {
          ...builtInNodeModules,
          setTimeout: timers.customSetTimeout,
          setInterval: timers.customSetInterval,
          clearTimeout: timers.customClearTimeout,
          clearInterval: timers.customClearInterval,
          __payload: payload,
        },
        { displayErrors: true, timeout }
      ),
    // Make sure the timeout is applied. When the processing snippet uses setTimeout or setInterval, the timeout option
    // from VM is broken. See: https://github.com/nodejs/node/issues/3020.
    { totalTimeoutMs: timeout }
  );

  // We need to manually clear all timers and reject the processing manually.
  timers.clearAll();

  if (goEvaluate.success) {
    return goEvaluate.data;
  } else {
    throw (goEvaluate.error.reason as Error) ?? goEvaluate.error;
  }
};

/**
 * Asynchronously evaluates the provided code in a new VM context with the specified global variables.
 *
 * **Security Warning:** This function executes the provided code and can have unintended side effects or
 * vulnerabilities if used with untrusted or malicious input. It's imperative to use this function only with code you
 * trust completely. Avoid using this function with user-generated code or third-party code that hasn't been thoroughly
 * reviewed.
 *
 * @param code The JavaScript code to evaluate. The code should call the `resolve` method to return the result of the
 * evaluation. You may use async/await syntax in the code.
 * @param globalVariables A key-value pair of variables to be made available in the context of the executed code.
 * @param timeout Duration in milliseconds to wait before terminating the execution.
 *
 * @returns The result of the evaluated code wrapped in a Promise.
 *
 * @throws Throws an error if the execution exceeds the provided timeout or if there's a problem with the code.
 *
 * @example
 *
 *const result = await unsafeEvaluateAsync(
 *  "const output = {...input, c: 'some-value'}; resolve(output);",
 *  { input: { a: true, b: 123 } },
 *  5000
 *);
 *console.log(result); // Outputs: { a: true, b: 123, c: 'some-value' }
 */
export const unsafeEvaluateAsync = async (code: string, globalVariables: Record<string, unknown>, timeout: number) => {
  let vmReject: (reason: unknown) => void;

  // Make sure the timeout is applied. When the processing snippet uses setTimeout or setInterval, the timeout option
  // from VM is broken. See: https://github.com/nodejs/node/issues/3020.
  //
  // We need to manually clear all timers and reject the processing manually.
  const timeoutTimer = setTimeout(() => {
    vmReject(new Error('Timeout exceeded'));
  }, timeout);

  return new Promise((resolve, reject) => {
    const timers = createTimers();
    const vmResolve = (value: unknown) => {
      timers.clearAll();
      clearTimeout(timeoutTimer);
      resolve(value);
    };
    vmReject = (reason: unknown) => {
      timers.clearAll();
      clearTimeout(timeoutTimer);
      reject(reason);
    };

    const vmContext = {
      ...globalVariables,
      ...builtInNodeModules,
      resolve: vmResolve,
      reject: vmReject,
      setTimeout: timers.customSetTimeout,
      setInterval: timers.customSetInterval,
      clearTimeout: timers.customClearTimeout,
      clearInterval: timers.customClearInterval,
    };
    vm.runInNewContext(code, vmContext, { displayErrors: true, timeout });
  });
};
