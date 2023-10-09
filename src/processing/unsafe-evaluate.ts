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
 * This function is dangerous. Make sure to use it only with Trusted code.
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

/**
 * This function runs asynchronous code in a Node VM.

 * @code should be written as ({input, resolve}) => {something; resolve({...input, something: 1})};
 * Refer to vmContext here for what's available.
 *
 * Some libraries one might expect to be available may not necessarily be available in cloud environments due to
 * being stripped out by webpack. In these cases these libraries may need to be minified and included in the `code`
 * payload.
 *
 * The value given to `resolve` is expected to be the equivalent of `output` above.
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
