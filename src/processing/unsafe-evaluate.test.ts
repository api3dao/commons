/* eslint-disable jest/prefer-strict-equal */ // Because the errors are thrown from the "vm" module (different context), they are not strictly equal.
import { unsafeEvaluate, unsafeEvaluateAsync, unsafeEvaluateAsyncV2 } from './unsafe-evaluate';

describe('unsafe evaluate - sync', () => {
  it('executes harmless code', () => {
    const result = unsafeEvaluate("const output = {...input, c: 'some-value'}", { input: { a: true, b: 123 } }, 5000);

    expect(result).toEqual({ a: true, b: 123, c: 'some-value' });
  });

  it('throws on exception', () => {
    expect(() => unsafeEvaluate("throw new Error('unexpected')", {}, 5000)).toThrow('unexpected');
  });
});

describe('unsafe evaluate - async', () => {
  it('executes harmless code', async () => {
    const result = unsafeEvaluateAsync(
      "const output = {...input, c: 'some-value'}; resolve(output);",
      { input: { a: true, b: 123 } },
      5000
    );

    await expect(result).resolves.toEqual({ a: true, b: 123, c: 'some-value' });
  });

  it('can use setTimeout and setInterval', async () => {
    const result = unsafeEvaluateAsync(
      `
      const fn = async () => {
        const output = input;
        output.push('start')

        const tickMs = 35
        const bufferMs = 25
        setInterval(() => output.push('ping interval'), tickMs)
        await new Promise((res) => setTimeout(res, tickMs * 4 + bufferMs));

        output.push('end')
        resolve(output);
      };

      fn()
      `,
      { input: [] },
      200
    );

    await expect(result).resolves.toEqual([
      'start',
      'ping interval',
      'ping interval',
      'ping interval',
      'ping interval',
      'end',
    ]);
  });

  it('applies timeout when using setTimeout', async () => {
    await expect(async () =>
      unsafeEvaluateAsync(
        `
        const fn = () => {
          setTimeout(() => console.log('ping timeout'), 100)
        };

        fn()
        `,
        {},
        50
      )
    ).rejects.toEqual(new Error('Timeout exceeded'));
  });

  it('applies timeout when using setInterval', async () => {
    await expect(async () =>
      unsafeEvaluateAsync(
        `
        const fn = () => {
          const someFn = () => {}
          setInterval(someFn, 10)
        };

        fn()
        `,
        {},
        50
      )
    ).rejects.toEqual(new Error('Timeout exceeded'));
  });

  it('processing can call reject', async () => {
    await expect(async () =>
      unsafeEvaluateAsync(`reject(new Error('Rejected by processing snippet.'))`, {}, 50)
    ).rejects.toEqual(new Error('Rejected by processing snippet.'));
  });

  it('throws on exception', async () => {
    await expect(async () => unsafeEvaluateAsync("throw new Error('unexpected')", {}, 5000)).rejects.toEqual(
      new Error('unexpected')
    );
  });
});

describe(unsafeEvaluateAsyncV2.name, () => {
  it('has access to node modules and vm context', async () => {
    const res = await unsafeEvaluateAsyncV2(
      `
      async () => {
        return Object.keys(this);
      }
      `,
      {},
      100
    );

    expect(res).toEqual([
      'assert',
      'async_hooks',
      'buffer',
      'child_process',
      'cluster',
      'console',
      'constants',
      'crypto',
      'dgram',
      'dns',
      'events',
      'fs',
      'http',
      'http2',
      'https',
      'inspector',
      'module',
      'net',
      'os',
      'path',
      'perf_hooks',
      'process',
      'readline',
      'repl',
      'stream',
      'string_decoder',
      'timers',
      'tls',
      'trace_events',
      'tty',
      'url',
      'util',
      'v8',
      'vm',
      'worker_threads',
      'zlib',
      'setTimeout',
      'setInterval',
      'clearTimeout',
      'clearInterval',
      '__payload',
    ]);
  });

  it('can access vm context values as global variables', async () => {
    const res = await unsafeEvaluateAsyncV2(
      `
      async (payload) => {
        return [this.__payload, payload];
      }
      `,
      123,
      100
    );

    expect(res).toEqual([123, 123]);
  });

  it('works with sync function as well', async () => {
    const res = await unsafeEvaluateAsyncV2(
      `
      (payload) => {
        return payload + 500;
      }
      `,
      123,
      100
    );

    expect(res).toBe(623);
  });

  it('can use setTimeout and setInterval', async () => {
    const res = await unsafeEvaluateAsyncV2(
      `
      async (payload) => {
        const intervalId = setInterval(() => payload++, 50);
        setTimeout(() => payload++, 50);
        await new Promise((resolve) => {
          clearInterval(intervalId);
          setTimeout(resolve, 120);
        });
        return payload;
      }
      `,
      0,
      250
    );

    expect(res).toBe(3);
  });

  it('applies timeout', async () => {
    await expect(async () =>
      unsafeEvaluateAsyncV2(
        `
        async () => {
          await new Promise((res) => setTimeout(res, 100));
        }
        `,
        0,
        50
      )
    ).rejects.toEqual(new Error('Full timeout exceeded'));
  });

  it('rejects on sync error', async () => {
    await expect(async () =>
      unsafeEvaluateAsyncV2(
        `
        () => {
          return nonDefinedPayload + 500;
        }
        `,
        {},
        100
      )
    ).rejects.toEqual(new ReferenceError('nonDefinedPayload is not defined'));

    await expect(async () =>
      unsafeEvaluateAsyncV2(
        `
        () => {
          throw new Error('some error');
        }
        `,
        {},
        100
      )
    ).rejects.toEqual(new Error('some error'));

    await expect(async () =>
      unsafeEvaluateAsyncV2(
        `
        () => {
          throw 'non-error-value';
        }
        `,
        {},
        100
      )
    ).rejects.toBe('non-error-value');
  });

  it('allows using closures for modular code', async () => {
    const res = await unsafeEvaluateAsyncV2(
      `
        async (payload) => {
          const isDivisible = (n, k) => n % k === 0;

          const isPrime = (n) => {
            for (let i = 2; i < n; i++) {
              if (isDivisible(n, i)) return false;
            }
            return true;
          }

          const ans = []
          for (let i = 2; i < payload; i++) {
            if (isPrime(i)) ans.push(i);
          }
          return ans;
        }
        `,
      50,
      1000
    );

    expect(res).toEqual([2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]);
  });

  it('can use any async function syntax', async () => {
    const anonymousArrowFnResult = await unsafeEvaluateAsyncV2(
      `
      async (payload) => {
        return await Promise.resolve(payload + 500);
      }
      `,
      123,
      100
    );
    const regularFnResult = await unsafeEvaluateAsyncV2(
      `
      async function(payload) {
        return await Promise.resolve(payload + 500);
      }
      `,
      123,
      100
    );

    expect(anonymousArrowFnResult).toBe(623);
    expect(regularFnResult).toBe(623);
  });
});
