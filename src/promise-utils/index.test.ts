/* eslint-disable lodash/prefer-constant */
/* eslint-disable unicorn/error-message */
/* eslint-disable functional/no-classes */
import { assertType, type IsEqual } from 'type-plus';

import { go, goSync, success, fail, assertGoSuccess, assertGoError, GoWrappedError } from './index.js';

const expectToBeAround = (actual: number, expected: number, range = 10) => {
  expect(actual).toBeGreaterThanOrEqual(expected - range);
  expect(actual).toBeLessThanOrEqual(expected + range);
};

const resolveAfter = <T>(ms: number, value?: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value as T), ms));
const rejectAfter = <T>(ms: number, value?: T): Promise<never> =>
  new Promise((_resolve, reject) => setTimeout(() => reject(value), ms));

describe('basic goSync usage', () => {
  it('resolves successful synchronous functions', () => {
    const res = goSync(() => 2 + 2);
    expect(res).toStrictEqual(success(4));
    expect(res).toStrictEqual({ success: true, data: 4, error: undefined });
  });

  it('resolves unsuccessful synchronous functions', () => {
    const err = new Error('Computer says no');
    const res = goSync(() => {
      throw err;
    });
    expect(res).toStrictEqual(fail(err));
    expect(res).toStrictEqual({ success: false, data: undefined, error: err });
  });
});

describe('basic go usage', () => {
  it('resolves successful asynchronous functions', async () => {
    const successFn = new Promise((resolve) => resolve(2));
    const res = await go(() => successFn);
    expect(res).toStrictEqual(success(2));
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise((_resolve, reject) => reject(err));
    const res = await go(() => errorFn);
    expect(res).toStrictEqual(fail(err));
  });

  it('resolves asynchronous functions which throws', async () => {
    const err = new Error('Computer says no');
    const errorFn = new Promise(() => {
      throw err;
    });
    const res = await go(() => errorFn);
    expect(res).toStrictEqual(fail(err));
  });

  it('resolves on sync errors as well', async () => {
    const obj = {} as any;
    const res = await go(() => obj.nonExistingFunction());
    expect(res).toStrictEqual(fail(new TypeError('obj.nonExistingFunction is not a function')));
  });

  // NOTE: This is not an issue of promise utils library since the error is thrown before the value is passed as an
  // argument to the go function
  it('throws on sync usage without callback', async () => {
    const obj = {} as any;
    expect(() => go(obj.nonExistingFunction())).toThrow(new TypeError('obj.nonExistingFunction is not a function'));
  });

  it('accepts a sync function if the return type is never', async () => {
    const err = new Error('asd');
    const res = await go(() => {
      throw err;
    });
    expect(res).toStrictEqual(fail(err));
  });
});

describe('basic retry usage', () => {
  const operations = {
    successFn: () => new Promise((resolve) => resolve(2)),
    errorFn: () => new Promise((_resolve, reject) => reject(new Error('Computer says no'))),
  };

  it('retries the specified number of times', async () => {
    jest
      .spyOn(operations, 'successFn')
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'));

    const res = await go(operations.successFn, { retries: 2 });
    expect(operations.successFn).toHaveBeenCalledTimes(3);
    expect(res).toStrictEqual(success(2));
  });

  it('retries and resolves unsuccessful asynchronous functions with the error from last retry', async () => {
    const attempts = 3;
    jest
      .spyOn(operations, 'errorFn')
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'));

    const res = await go(operations.errorFn, { retries: 2 });
    expect(operations.errorFn).toHaveBeenCalledTimes(attempts);
    expect(res).toStrictEqual(fail(new Error('Computer says no')));
  });

  it('resolves unsuccessful asynchronous functions with no retries', async () => {
    jest.spyOn(operations, 'errorFn').mockRejectedValueOnce(new Error('Computer says no'));

    const res = await go(operations.errorFn, { retries: 0 });
    expect(operations.errorFn).toHaveBeenCalledTimes(1);
    expect(res).toStrictEqual(fail(new Error('Computer says no')));
  });
});

describe('basic timeout usage', () => {
  const operations = {
    successFn: () => resolveAfter(10, 2),
    errorFn: () => rejectAfter(10, new Error('Computer says no')),
  };

  it('resolves successful asynchronous functions within the timout limit', async () => {
    const res = await go(operations.successFn, { attemptTimeoutMs: 20 });
    expect(res).toStrictEqual(success(2));
  });

  it('resolves unsuccessful asynchronous functions within the timout limit', async () => {
    const res = await go(operations.errorFn, { attemptTimeoutMs: 20 });
    expect(res).toStrictEqual(fail(new Error('Computer says no')));
  });

  it('resolves timed out asynchronous functions', async () => {
    const res = await go(operations.successFn, { attemptTimeoutMs: 5 });
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });

  it('shows difference between promise callback and promise value', async () => {
    // Promise value tries to resolve THE SAME promise every attempt
    const sleepPromise = resolveAfter(50);
    const goVal = await go(() => sleepPromise, { attemptTimeoutMs: 30, retries: 1 });
    expect(goVal).toStrictEqual(success(undefined));

    // Promise callback tries to resolve NEW promise every attempt
    const goFn = await go(() => resolveAfter(50), { attemptTimeoutMs: 30, retries: 1 });
    expect(goFn).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });

  it('shows that timeout 0 means 0 ms (not infinity)', async () => {
    const res = await go(operations.successFn, { attemptTimeoutMs: 0 });
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });
});

describe('basic retry and timeout usage', () => {
  const operations = {
    successFn: () => resolveAfter(100, 2),
    errorFn: () => rejectAfter(100, new Error('Computer says no')),
  };

  it('resolves successful asynchronous functions', async () => {
    const res = await go(operations.successFn, { attemptTimeoutMs: 120, retries: 3 });
    expect(res).toStrictEqual(success(2));
  });

  it('resolves unsuccessful asynchronous functions', async () => {
    const res = await go(operations.errorFn, { attemptTimeoutMs: 120, retries: 3 });
    expect(res).toStrictEqual(fail(new Error('Computer says no')));
  });

  it('retries and resolves successful asynchronous functions', async () => {
    jest
      .spyOn(operations, 'successFn')
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'));

    const res = await go(operations.successFn, { attemptTimeoutMs: 120, retries: 3 });
    expect(operations.successFn).toHaveBeenCalledTimes(3);
    expect(res).toStrictEqual(success(2));
  });

  it('retries and resolves successful asynchronous functions with varying timeouts', async () => {
    jest.spyOn(operations, 'successFn');
    const start = performance.now();
    const res = await go(operations.successFn, { attemptTimeoutMs: [50, 70, 90, 120], retries: 3 });
    const end = performance.now();
    expectToBeAround(end - start, 50 + 70 + 90 + 100);
    expect(operations.successFn).toHaveBeenCalledTimes(4);
    expect(res).toStrictEqual(success(2));
  });

  it('retries and resolves unsuccessful asynchronous functions', async () => {
    jest
      .spyOn(operations, 'errorFn')
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'));

    const res = await go(operations.errorFn, { attemptTimeoutMs: 120, retries: 2 });
    expect(operations.errorFn).toHaveBeenCalledTimes(3);
    expect(res).toStrictEqual(fail(new Error('Computer says no')));
  });

  it('retries and resolves unsuccessful timed out functions', async () => {
    const attempts = 3;
    jest.spyOn(operations, 'successFn');

    const res = await go(operations.successFn, { attemptTimeoutMs: 50, retries: 2 });
    expect(operations.successFn).toHaveBeenCalledTimes(attempts);
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });

  it('retries with multiple timeout durations and resolves unsuccessful timed out functions', async () => {
    const attempts = 3;
    jest.spyOn(operations, 'successFn');

    const start = performance.now();
    const res = await go(operations.successFn, { attemptTimeoutMs: [50, 70, 90], retries: 2 });
    const end = performance.now();
    expectToBeAround(end - start, 50 + 70 + 90);
    expect(operations.successFn).toHaveBeenCalledTimes(attempts);
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });

  it('retries and timeouts within the timeout limit of each attempt', async () => {
    jest.spyOn(operations, 'successFn');
    const start = performance.now();
    const res = await go(operations.successFn, { attemptTimeoutMs: [50, 60, 70, 80, 90, 95], retries: 5 });
    const end = performance.now();
    expectToBeAround(end - start, 50 + 60 + 70 + 80 + 90 + 95);
    expect(operations.successFn).toHaveBeenCalledTimes(6);
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });

  it('retries with multiple timeout durations and uses the last value if array length is smaller than total attempts', async () => {
    const attempts = 6;
    jest.spyOn(operations, 'successFn');
    const start = performance.now();
    const res = await go(operations.successFn, { attemptTimeoutMs: [50, 70], retries: 5 });
    const end = performance.now();
    expectToBeAround(end - start, 50 + 70 + 70 + 70 + 70 + 70);
    expect(operations.successFn).toHaveBeenCalledTimes(attempts);
    expect(res).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
  });
});

describe('custom error type', () => {
  class CustomError extends Error {
    custom: string;

    constructor(message: string) {
      super(message);
      this.custom = '123';
    }
  }

  describe('goSync', () => {
    it('error handling', () => {
      const goRes = goSync(() => {
        throw new CustomError('custom');
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<Error>(err);
      // Check that "err" is not assignable to CustomError
      // eslint-disable-next-line deprecation/deprecation
      assertType.isFalse(false as IsEqual<CustomError, typeof err>);
      expect(err).toBeInstanceOf(CustomError);
    });

    it('can specify custom error type', () => {
      const goRes = goSync<never, CustomError>(() => {
        throw new CustomError('custom');
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<CustomError>(err);
      expect(err).toBeInstanceOf(CustomError);
    });

    it('will wraps non error throw in Error class', () => {
      const goRes = goSync(() => {
        throw 'string-error';
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<Error>(err);
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('go', () => {
    it('error handling', async () => {
      const goRes = await go(() => {
        throw new CustomError('custom');
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<Error>(err);
      // Check that "err" is not assignable to CustomError
      // eslint-disable-next-line deprecation/deprecation
      assertType.isFalse(false as IsEqual<CustomError, typeof err>);
      expect(err).toBeInstanceOf(CustomError);
    });

    it('can specify custom error type', async () => {
      const goRes = await go<never, CustomError>(() => {
        throw new CustomError('custom');
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<CustomError>(err);
      expect(err).toBeInstanceOf(CustomError);
    });

    it('will wraps non error throw in Error class', async () => {
      const goRes = await go(() => {
        throw 'string-error';
      });
      assertGoError(goRes);
      const err = goRes.error;

      assertType<Error>(err);
      expect(err).toBeInstanceOf(Error);
    });
  });
});

describe('the "this" limitation', () => {
  class Test {
    constructor() {}
    sync() {
      return this._sync();
    }
    _sync() {
      return '123';
    }

    async() {
      return this._async();
    }
    _async() {
      return Promise.resolve('123');
    }
  }

  // The error message for when reading a property of undefined has changed between major node versions
  const expectReadPropertyOfUndefined = (res: unknown, prop: string) => {
    // process.version returns the version as the string: 'v[major].[minor].[patch]'
    const majorVersion = process.version.split('.')[0]!.slice(1);
    if (Number(majorVersion) >= 16) {
      expect(res).toStrictEqual(fail(new TypeError(`Cannot read properties of undefined (reading '${prop}')`)));
    } else {
      expect(res).toStrictEqual(fail(new TypeError(`Cannot read property '${prop}' of undefined`)));
    }
  };

  it('fails for sync version', () => {
    const test = new Test();

    // eslint-disable-next-line jest/unbound-method -- intentionally passing an unbound method to demonstrate the `this` limitation
    const res = goSync(test.sync);

    expectReadPropertyOfUndefined(res, '_sync');
  });

  it('fails for async version', async () => {
    const test = new Test();

    // eslint-disable-next-line jest/unbound-method -- intentionally passing an unbound method to demonstrate the `this` limitation
    const res = await go(test.async);

    expectReadPropertyOfUndefined(res, '_async');
  });
});

describe('assertGoSuccess', () => {
  it('works for success', () => {
    const res = goSync(() => 123);

    assertGoSuccess(res);

    // The "data" property should now be inferred since the success was asserted
    const { data } = res;
    expect(data).toBe(data);
  });

  it('works for failure (rethrows the go error)', () => {
    const res = goSync(() => {
      throw new Error('my bad');
    });

    expect(() => assertGoSuccess(res)).toThrow('my bad');
  });
});

describe('assertGoError', () => {
  it('works for success', () => {
    const res = goSync(() => 123);

    expect(() => assertGoError(res)).toThrow('Assertion failed. Expected error, but no error was thrown');
  });

  it('works for failure', () => {
    const res = goSync(() => {
      throw new Error('error');
    });

    assertGoError(res);

    // The "error" property should now be inferred since the success was asserted
    const err = res.error;
    expect(err).toBe(err);
  });
});

test('has access to native error', async () => {
  const throwingFn = async () => {
    throw { message: 'an error', data: 'some data' };
  };

  const goRes = await go<Promise<never>, GoWrappedError>(throwingFn);

  assertGoError(goRes);
  // The error message is the  not very useful stringified data
  expect(goRes.error).toStrictEqual(new GoWrappedError({ message: 'an error', data: 'some data' }));
  expect(goRes.error instanceof GoWrappedError).toBeTruthy();
  expect(goRes.error.reason).toStrictEqual({ message: 'an error', data: 'some data' });
});

// NOTE: Keep in sync with README
describe('documentation snippets are valid', () => {
  const fetchData = (_path: string) => {
    if (_path.startsWith('throw')) return Promise.reject('unexpected error');
    return Promise.resolve('some data');
  };

  it('success usage', async () => {
    const goFetchData = await go(() => fetchData('users'));
    assertGoSuccess(goFetchData);
    const { data } = goFetchData;

    assertType<string>(data);
    expect(data).toBe('some data');
  });

  it('error usage', async () => {
    const goFetchData = await go(() => fetchData('throw'));
    assertGoError(goFetchData);
    const { error } = goFetchData;

    expect(error).toStrictEqual(new GoWrappedError('unexpected error'));
  });

  it('sync usage', () => {
    const someData = { key: 123 };
    const parseData = (rawData: typeof someData) => ({ ...rawData, parsed: true });
    const goParseData = goSync(() => parseData(someData));
    assertGoSuccess(goParseData);
    const { data } = goParseData;

    expect(data.parsed).toBe(true);
  });

  it('shows limitation', () => {
    class MyClass {
      constructor() {}
      get() {
        return this._get();
      }
      _get() {
        return '123';
      }
    }

    const myClass = new MyClass();
    const resWorks = goSync(() => myClass.get()); // This works
    assertGoSuccess(resWorks);
    // eslint-disable-next-line jest/unbound-method
    const resFails = goSync(myClass.get); // This doesn't work
    assertGoError(resFails);
  });

  it('verbosity of try catch', async () => {
    class MyError extends Error {
      reason: string;
      constructor(m: string) {
        super(m);
        this.reason = m;
      }
    }
    const someAsyncCall = () => Promise.reject(new MyError('custom error'));
    const logError = (mess: string) => expect(mess).toStrictEqual(expect.any(String));

    // Verbose try catch
    // eslint-disable-next-line functional/no-try-statements
    try {
      const data = await someAsyncCall();
      assertType<never>(data); // The function above should throw
    } catch (error) {
      logError((error as MyError).reason);
      return;
    }

    // Compare it to simpler version using go
    type MyData = Promise<never>;
    const goRes = await go<MyData, MyError>(someAsyncCall);
    // eslint-disable-next-line jest/no-conditional-in-test
    if (!goRes.success) {
      logError(goRes.error.reason);
      return;
    }
    // At this point TypeScript infers that the error was handled and goRes must be a success response
    const { data } = goRes;
    assertType<MyData>(data);
  });
});

describe('delay', () => {
  it('only delays on retries', async () => {
    const goRes = await go(async () => 123, { delay: { type: 'static', delayMs: 2000 } });
    expect(goRes).toStrictEqual(success(123));
  }, 20); // Make the test timeout smaller then the delay

  describe('random', () => {
    it('waits for a random period of time before retry', async () => {
      const now = Date.now();
      const ticks: number[] = [];

      jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.5);
      jest.spyOn(global.Math, 'random').mockReturnValueOnce(1);

      await go(
        async () => {
          ticks.push(Date.now() - now);
          throw new Error();
        },
        { delay: { type: 'random', minDelayMs: 0, maxDelayMs: 100 }, retries: 2 }
      );

      expect(ticks).toHaveLength(3);
      expectToBeAround(ticks[0]!, 0);
      expectToBeAround(ticks[1]!, 50);
      expectToBeAround(ticks[2]!, 150);
    });
  });

  describe('static', () => {
    it('waits for a fixed period of time before retry', async () => {
      const now = Date.now();
      const ticks: number[] = [];

      await go(
        async () => {
          ticks.push(Date.now() - now);
          throw new Error();
        },
        { delay: { type: 'static', delayMs: 50 }, retries: 2 }
      );

      expect(ticks).toHaveLength(3);
      expectToBeAround(ticks[0]!, 0);
      expectToBeAround(ticks[1]!, 50);
      expectToBeAround(ticks[2]!, 100);
    });
  });
});

describe('totalTimeoutMs', () => {
  it('stops retying after the full timeout is exceeded', async () => {
    const now = Date.now();
    const ticks: number[] = [];

    await go(
      async () => {
        ticks.push(Date.now() - now);
        throw new Error();
      },
      { delay: { type: 'static', delayMs: 50 }, retries: 150, totalTimeoutMs: 150 }
    );

    expect(ticks).toHaveLength(3);
    expectToBeAround(ticks[0]!, 0);
    expectToBeAround(ticks[1]!, 50);
    expectToBeAround(ticks[2]!, 100);
  });

  it('runs the go callback at least once independently of full timeout', async () => {
    const now = Date.now();
    const ticks: number[] = [];

    await go(
      async () => {
        ticks.push(Date.now() - now);
        throw new Error();
      },
      { delay: { type: 'static', delayMs: 50 }, retries: 10, totalTimeoutMs: 0 }
    );

    expect(ticks).toHaveLength(1);
    expectToBeAround(ticks[0]!, 0);
  });

  it('resolves the value immediately after the timeout has exceeded', async () => {
    const now = Date.now();

    const goRes = await go(
      async () => {
        await resolveAfter(50);
      },
      { delay: { type: 'static', delayMs: 50 }, retries: 1, totalTimeoutMs: 20 }
    );

    const delta = Date.now() - now;
    expectToBeAround(delta, 20);
    expect(goRes).toStrictEqual(fail(new Error('Full timeout exceeded')));
  });
});

describe('onAttemptError', () => {
  it('calls the function after every unsuccessfull attempt except last', async () => {
    const onAttemptError = jest.fn();

    let counter = 0;
    const goRes = await go(
      async () => {
        counter++;
        throw new Error(`fail${counter}`);
      },
      { retries: 3, onAttemptError }
    );

    expect(onAttemptError).toHaveBeenCalledTimes(3);
    expect(onAttemptError).toHaveBeenNthCalledWith(1, fail(new Error('fail1')));
    expect(onAttemptError).toHaveBeenNthCalledWith(2, fail(new Error('fail2')));
    expect(onAttemptError).toHaveBeenNthCalledWith(3, fail(new Error('fail3')));
    expect(goRes).toStrictEqual(fail(new Error('fail4')));
  });

  it('does not trigger the callback after total timeout has been exceeded', async () => {
    const onAttemptError = jest.fn();

    const goRes = await go(
      async () => {
        await resolveAfter(50);
      },
      { retries: 3, totalTimeoutMs: 20, onAttemptError }
    );

    expect(onAttemptError).toHaveBeenCalledTimes(0);
    expect(goRes).toStrictEqual(fail(new Error('Full timeout exceeded')));
  });

  it('does not call the callback after successful attempt', async () => {
    const onAttemptError = jest.fn();

    await go(async () => 123, { onAttemptError });

    expect(onAttemptError).toHaveBeenCalledTimes(0);
  });

  describe('does not call for last unsuccessfull attempt', () => {
    it('and attempt timeout', async () => {
      const onAttemptError = jest.fn();

      const goRes = await go(
        async () => {
          await resolveAfter(20);
        },
        { attemptTimeoutMs: 10, onAttemptError }
      );
      // Make sure the attempt inside the go function above is completed
      await resolveAfter(30);

      expect(onAttemptError).toHaveBeenCalledTimes(0);
      expect(goRes).toStrictEqual(fail(new GoWrappedError('Operation timed out')));
    });

    it('and total timeout', async () => {
      const onAttemptError = jest.fn();

      const goRes = await go(
        async () => {
          await resolveAfter(20);
        },
        { totalTimeoutMs: 10, onAttemptError }
      );
      // Make sure the attempt inside the go function above is completed
      await resolveAfter(30);

      expect(onAttemptError).toHaveBeenCalledTimes(0);
      expect(goRes).toStrictEqual(fail(new Error('Full timeout exceeded')));
    });

    it('both attemp timeout and total timeout', async () => {
      const onAttemptError = jest.fn();

      const goRes = await go(
        async () => {
          await resolveAfter(20);
        },
        { retries: 2, attemptTimeoutMs: 10, totalTimeoutMs: 25, onAttemptError }
      );
      // Make sure the attempt inside the go function above is completed
      await resolveAfter(50);

      expect(onAttemptError).toHaveBeenCalledTimes(2);
      expect(onAttemptError).toHaveBeenNthCalledWith(1, fail(new GoWrappedError('Operation timed out')));
      expect(onAttemptError).toHaveBeenNthCalledWith(2, fail(new GoWrappedError('Operation timed out')));
      expect(goRes).toStrictEqual(fail(new Error('Full timeout exceeded')));
    });
  });

  // eslint-disable-next-line jest/prefer-ending-with-an-expect -- assertions run inside the onAttemptError callback
  it('is automatically typed', async () => {
    class CustomError extends Error {
      custom: string;

      constructor(message: string) {
        super(message);
        this.custom = '123';
      }
    }

    await go<Promise<never>, CustomError>(
      async () => {
        throw new CustomError('fail');
      },
      {
        retries: 3,
        onAttemptError: (goRes) => {
          expect(goRes).toStrictEqual(success(123));

          assertGoError(goRes);
          assertType<CustomError>(goRes.error);
        },
      }
    );
  });

  it('accepts, but does not wait for async callback finish', async () => {
    const log: string[] = [];
    let counter = 0;

    const goRes = await go(
      async () => {
        counter++;
        const m = `fail${counter}`;
        log.push(`go callback: ${m}`);
        throw new Error(m);
      },
      {
        retries: 1,
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onAttemptError: async (goRes) => {
          log.push(`onAttemptError: ${JSON.stringify(goRes)}`);

          await resolveAfter(20);

          log.push(`onAttemptError (after sleep): ${JSON.stringify(goRes)}`);
        },
      }
    );

    expect(goRes).toStrictEqual(fail(new Error('fail2')));
    expect(log).toStrictEqual([
      'go callback: fail1',
      'onAttemptError: {"success":false,"error":{}}',
      'go callback: fail2',
    ]);
    await resolveAfter(50); // We need to wait for unfinished onAttemptError callbacks
    expect(log).toStrictEqual([
      'go callback: fail1',
      'onAttemptError: {"success":false,"error":{}}',
      'go callback: fail2',
      'onAttemptError (after sleep): {"success":false,"error":{}}',
    ]);
  });

  it('handles nested promises correctly', async () => {
    const x = Promise.resolve('123') as any as Promise<Promise<string>>;

    const goRes = await go(() => x);
    assertGoSuccess(goRes);

    assertType<string>(goRes.data);
  });

  // eslint-disable-next-line jest/prefer-ending-with-an-expect
  it('allows you to access both error and success properties', async () => {
    const { success, error, data } = goSync(() => 123);
    // @ts-expect-error should not work
    const _x: number = data;
    assertType<number | undefined>(data);
    assertType<Error | undefined>(error);

    // eslint-disable-next-line jest/no-conditional-in-test -- verifies discriminated-union narrowing in both directions
    if (success) {
      assertType<number>(data);
      assertType<undefined>(error);
    } else {
      assertType<undefined>(data);
      assertType<Error>(error);
    }
  });

  it('does not delay after last attempt', async () => {
    const start = performance.now();

    await go(() => Promise.reject('error'), { delay: { type: 'static', delayMs: 100 }, retries: 2 });

    expect(performance.now() - start).toBeLessThan(2 * 100 + 50);
  });
});
