/* eslint-disable jest/prefer-strict-equal */ // Because the errors are thrown from the "vm" module (different context), they are not strictly equal.
import { ZodError } from 'zod';

import { createEndpoint } from '../../test/fixtures';

import {
  addReservedParameters,
  postProcessResponse,
  postProcessResponseV1,
  postProcessResponseV2,
  preProcessEndpointParameters,
  preProcessEndpointParametersV1,
  preProcessEndpointParametersV2,
  removeReservedParameters,
} from './processing';
import type { ProcessingSpecificationV2, ProcessingSpecifications } from './schema';

describe(preProcessEndpointParametersV1.name, () => {
  it('valid processing code', async () => {
    const preProcessingSpecifications = [
      {
        environment: 'Node',
        value: 'const output = {...input, from: "ETH"};',
        timeoutMs: 5000,
      },
      {
        environment: 'Node',
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessEndpointParametersV1(preProcessingSpecifications, parameters);

    expect(result).toEqual({
      _path: 'price',
      _type: 'int256',
      from: 'ETH',
      newProp: 'airnode',
    });
  });

  it('invalid processing code', async () => {
    const preProcessingSpecifications = [
      {
        environment: 'Node',
        value: 'something invalid; const output = {...input, from: `ETH`};',
        timeoutMs: 5000,
      },
      {
        environment: 'Node',
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;
    const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };

    const throwingFunc = async () => preProcessEndpointParametersV1(preProcessingSpecifications, parameters);

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });

  it('demonstrates access to endpointParameters, but reserved parameters are inaccessible', async () => {
    const parameters = { _type: 'int256', _path: 'price', to: 'USD' };
    const preProcessingSpecifications = [
      {
        environment: 'Node',
        // pretend the user is trying to 1) override _path and 2) set a new parameter based on
        // the presence of the reserved parameter _type (which is inaccessible)
        value:
          'const output = {...input, from: "ETH", _path: "price.newpath", myVal: input._type ? "123" : "456", newTo: endpointParameters.to };',
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;

    const result = await preProcessEndpointParametersV1(preProcessingSpecifications, parameters);

    expect(result).toEqual({
      _path: 'price', // is not overridden
      _type: 'int256',
      from: 'ETH', // originates from the processing code
      to: 'USD', // should be unchanged from the original parameters
      myVal: '456', // is set to "456" because _type is not present in the environment
      newTo: 'USD', // demonstrates access to endpointParameters
    });
  });

  it('uses native modules for processing', async () => {
    const preProcessingSpecifications = [
      {
        environment: 'Node',
        value: `
          const randomValue = crypto.randomBytes(4).toString('hex');
          const output = {...input, randomValue};
        `,
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessEndpointParametersV1(preProcessingSpecifications, parameters);

    // Check that the result contains the original parameters and a valid 8-character hex random value.
    expect(result).toMatchObject({
      _path: 'price',
      _type: 'int256',
    });
    expect(result.randomValue).toHaveLength(8);
    expect(/^[\da-f]{8}$/i.test(result.randomValue)).toBe(true);
  });

  it('throws error due to processing timeout', async () => {
    const preProcessingSpecifications = [
      {
        environment: 'Node async',
        value: `
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          delay(5000);
          const output = {...input, from: 'ETH'};
        `,
        timeoutMs: 100, // This timeout is shorter than the delay in the processing code.
      },
    ] as ProcessingSpecifications;
    const parameters = { _type: 'int256', _path: 'price' };

    const throwingFunc = async () => preProcessEndpointParametersV1(preProcessingSpecifications, parameters);

    await expect(throwingFunc).rejects.toThrow('Timeout exceeded');
  });
});

describe(postProcessResponseV1.name, () => {
  it('processes valid code', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const postProcessingSpecifications = [
      {
        environment: 'Node',
        value: 'const output = parseInt(input.price)*2;',
        timeoutMs: 5000,
      },
      {
        environment: 'Node',
        value: 'const output = parseInt(input)*2;',
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;

    const result = await postProcessResponseV1({ price: 1000 }, postProcessingSpecifications, parameters);

    expect(result).toBe(4000);
  });

  it('demonstrates access to endpointParameters, but reserved parameters are inaccessible', async () => {
    const myMultiplier = 10;
    const parameters = { _type: 'int256', _path: 'price', myMultiplier };
    const postProcessingSpecifications = [
      {
        environment: 'Node',
        value: `
            const reservedMultiplier = endpointParameters._times ? 1 : 2;
            const output = parseInt(input.price) * endpointParameters.myMultiplier * reservedMultiplier
          `,
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;

    const price = 1000;
    const result = await postProcessResponseV1({ price }, postProcessingSpecifications, parameters);

    // reserved parameters (_times) should be inaccessible to post-processing hence multiplication by 2 instead of 1
    expect(result).toEqual(price * myMultiplier * 2);
  });

  it('throws on invalid code', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const postProcessingSpecifications = [
      {
        environment: 'Node',
        value: 'const output = parseInt(input.price)*1000;',
        timeoutMs: 5000,
      },
      {
        environment: 'Node',
        value: `
            Something Unexpected;
            const output = parseInt(input)*2;
          `,
        timeoutMs: 5000,
      },
    ] as ProcessingSpecifications;

    const throwingFunc = async () => postProcessResponseV1({ price: 1000 }, postProcessingSpecifications, parameters);

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });
});

describe(removeReservedParameters.name, () => {
  it('removes all reserved parameters', () => {
    const parameters = {
      normalParam1: 'value1',
      _type: 'int256',
      _path: 'price',
      normalParam2: 'value2',
    };

    const result = removeReservedParameters(parameters);

    expect(result).toEqual({
      normalParam1: 'value1',
      normalParam2: 'value2',
    });
  });

  it('returns same object if no reserved parameters found', () => {
    const parameters = {
      normalParam1: 'value1',
      normalParam2: 'value2',
    };

    const result = removeReservedParameters(parameters);

    expect(result).toEqual(parameters);
  });
});

describe(addReservedParameters.name, () => {
  it('adds reserved parameters from initial to modified parameters', () => {
    const initialParameters = {
      _type: 'int256',
      _path: 'price',
    };
    const modifiedParameters = {
      normalParam1: 'value1',
      normalParam2: 'value2',
    };

    const result = addReservedParameters(initialParameters, modifiedParameters);

    expect(result).toEqual({
      normalParam1: 'value1',
      normalParam2: 'value2',
      _type: 'int256',
      _path: 'price',
    });
  });

  it('does not modify modifiedParameters if no reserved parameters in initialParameters', () => {
    const initialParameters = {
      normalParam3: 'value3',
    };
    const modifiedParameters = {
      normalParam1: 'value1',
      normalParam2: 'value2',
    };

    const result = addReservedParameters(initialParameters, modifiedParameters);

    expect(result).toEqual(modifiedParameters);
  });
});

describe(preProcessEndpointParametersV2.name, () => {
  describe('migration from v1 processing', () => {
    it('valid processing code', async () => {
      const preProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
              async (payload) => {
                const { endpointParameters } = payload;
                return { endpointParameters: {...endpointParameters, from: 'ETH', newProp: 'airnode'} };
              }
            `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;
      const parameters = { _type: 'int256', _path: 'price' };

      const result = await preProcessEndpointParametersV2(preProcessingSpecificationV2, parameters);

      expect(result).toEqual({
        endpointParameters: {
          _path: 'price',
          _type: 'int256',
          from: 'ETH',
          newProp: 'airnode',
        },
      });
    });

    it('invalid processing code', async () => {
      const preProcessingSpecificationV2 = {
        environment: 'Node',
        value: 'something invalid; const output = {...input, from: `ETH`};',
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;
      const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };

      const throwingFunc = async () => preProcessEndpointParametersV2(preProcessingSpecificationV2, parameters);

      await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
    });

    it('reserved parameters are inaccessible', async () => {
      const parameters = { _type: 'int256', _path: 'price', to: 'USD' };
      const preProcessingSpecificationV2 = {
        environment: 'Node',
        // pretend the user is trying to 1) override _path and 2) set a new parameter based on
        // the presence of the reserved parameter _type (which is inaccessible)
        value: `
            async ({endpointParameters}) => {
              return {endpointParameters: {...endpointParameters, from: "ETH", _path: "price.newpath", myVal: endpointParameters._type ? "123" : "456", newTo: endpointParameters.to } };
            }
            `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;

      const result = await preProcessEndpointParametersV2(preProcessingSpecificationV2, parameters);

      expect(result).toEqual({
        endpointParameters: {
          _path: 'price', // is not overridden
          _type: 'int256',
          from: 'ETH', // originates from the processing code
          to: 'USD', // should be unchanged from the original parameters
          myVal: '456', // is set to "456" because _type is not present in the environment
          newTo: 'USD', // demonstrates access to endpointParameters
        },
      });
    });

    it('uses native modules for processing', async () => {
      const preProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
          async ({endpointParameters}) => {
            const randomValue = crypto.randomBytes(4).toString('hex');
            return {endpointParameters: {...endpointParameters, randomValue}};
          }
          `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;
      const parameters = { _type: 'int256', _path: 'price' };

      const result = await preProcessEndpointParametersV2(preProcessingSpecificationV2, parameters);

      // Check that the result contains the original parameters and a valid 8-character hex random value.
      expect(result.endpointParameters).toEqual({
        _path: 'price',
        _type: 'int256',
        randomValue: expect.any(String),
      });
      expect(/^[\da-f]{8}$/i.test(result.endpointParameters.randomValue)).toBe(true);
    });

    it('throws error due to processing timeout', async () => {
      const preProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
          async ({endpointParameters}) => {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(5000);
            return {endpointParameters: {...endpointParameters, from: 'ETH'}};
          }`,
        timeoutMs: 100, // This timeout is shorter than the delay in the processing code.
      } as ProcessingSpecificationV2;
      const parameters = { _type: 'int256', _path: 'price' };

      const throwingFunc = async () => preProcessEndpointParametersV2(preProcessingSpecificationV2, parameters);

      await expect(throwingFunc).rejects.toThrow('Full timeout exceeded');
    });
  });
});

describe(postProcessResponseV2.name, () => {
  describe('migration from v1 processing', () => {
    it('processes valid code', async () => {
      const parameters = { _type: 'int256', _path: 'price' };
      const postProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
          async (payload) => {
            const { response } = payload;
            return { response: parseInt(response.price) * 4 };
          }
          `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;

      const result = await postProcessResponseV2({ price: 1000 }, postProcessingSpecificationV2, parameters);

      expect(result).toEqual({ response: 4000 });
    });

    it('throws when the code is of incorrect shape', async () => {
      const parameters = { _type: 'int256', _path: 'price' };
      const postProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
            async (payload) => {
              const { response } = payload;
              return  parseInt(response.price) * 4;
            }
            `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;

      await expect(async () =>
        postProcessResponseV2({ price: 1000 }, postProcessingSpecificationV2, parameters)
      ).rejects.toEqual(
        new ZodError([
          {
            code: 'invalid_type',
            expected: 'object',
            received: 'number',
            path: [],
            message: 'Expected object, received number',
          },
        ])
      );
    });

    it('demonstrates access to endpointParameters, but reserved parameters are inaccessible', async () => {
      const myMultiplier = 10;
      const parameters = { _type: 'int256', _path: 'price', myMultiplier };
      const postProcessingSpecificationV2 = {
        environment: 'Node',
        value: `
            async (payload) => {
              const {response, endpointParameters} = payload;
              const reservedMultiplier = endpointParameters._times ? 1 : 2;
              return {response: parseInt(response.price) * endpointParameters.myMultiplier * reservedMultiplier}
            }
          `,
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;

      const price = 1000;
      const result = await postProcessResponseV2({ price }, postProcessingSpecificationV2, parameters);

      // reserved parameters (_times) should be inaccessible to post-processing hence multiplication by 2 instead of 1
      expect(result).toEqual({ response: price * myMultiplier * 2 });
    });

    it('throws on invalid code', async () => {
      const parameters = { _type: 'int256', _path: 'price' };
      const postProcessingSpecificationV2 = {
        environment: 'Node',
        value: 'Something Unexpected;',
        timeoutMs: 5000,
      } as ProcessingSpecificationV2;

      const throwingFunc = async () =>
        postProcessResponseV2({ price: 1000 }, postProcessingSpecificationV2, parameters);

      await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
    });
  });

  it('can post-process timestamp', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const postProcessingSpecificationV2 = {
      environment: 'Node',
      value: `
              async (payload) => {
                const { response } = payload;
                return { response, timestamp: response.timestamp };
              }
            `,
      timeoutMs: 5000,
    } as ProcessingSpecificationV2;

    const currentTimestamp = Math.floor(Date.now() / 1000);
    const result1 = await postProcessResponseV2(
      { price: 1000, timestamp: currentTimestamp },
      postProcessingSpecificationV2,
      parameters
    );
    expect(result1).toEqual({
      response: { price: 1000, timestamp: currentTimestamp },
      timestamp: currentTimestamp,
    });

    const result2 = await postProcessResponseV2({ price: 1000 }, postProcessingSpecificationV2, parameters);
    expect(result2).toEqual({ response: { price: 1000 }, timestamp: undefined });
  });
});

describe(preProcessEndpointParameters.name, () => {
  it('returns v2 processing result', async () => {
    const endpoint = createEndpoint({
      preProcessingSpecificationV2: {
        environment: 'Node',
        value: `
            async (payload) => {
              const { endpointParameters } = payload;
              return { endpointParameters: {...endpointParameters, from: 'ETH', newProp: 'airnode'} };
            }
          `,
        timeoutMs: 5000,
      },
    });
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessEndpointParameters(endpoint, parameters);

    expect(result).toEqual({
      endpointParameters: {
        _path: 'price',
        _type: 'int256',
        from: 'ETH',
        newProp: 'airnode',
      },
    });
  });

  it('converts v1 pre-processing to v2', async () => {
    const endpoint = createEndpoint({
      preProcessingSpecifications: [
        {
          environment: 'Node',
          value: 'const output = {...input, from: "ETH"};',
          timeoutMs: 5000,
        },
        {
          environment: 'Node',
          value: 'const output = {...input, newProp: "airnode"};',
          timeoutMs: 5000,
        },
      ],
    });
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessEndpointParameters(endpoint, parameters);

    expect(result).toEqual({
      endpointParameters: {
        _path: 'price',
        _type: 'int256',
        from: 'ETH',
        newProp: 'airnode',
      },
    });
  });
});

describe(postProcessResponse.name, () => {
  it('returns v2 processing result', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const endpoint = createEndpoint({
      postProcessingSpecificationV2: {
        environment: 'Node',
        value: `
        async (payload) => {
          const { response } = payload;
          return { response: parseInt(response.price) * 4 };
        }
        `,
        timeoutMs: 5000,
      },
    });

    const result = await postProcessResponse({ price: 1000 }, endpoint, parameters);

    expect(result).toEqual({ response: 4000 });
  });

  it('converts v1 post-processing to v2', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const endpoint = createEndpoint({
      postProcessingSpecifications: [
        {
          environment: 'Node',
          value: 'const output = parseInt(input.price)*2;',
          timeoutMs: 5000,
        },
        {
          environment: 'Node',
          value: 'const output = parseInt(input)*2;',
          timeoutMs: 5000,
        },
      ],
    });

    const result = await postProcessResponse({ price: 1000 }, endpoint, parameters);

    expect(result).toStrictEqual({ response: 4000 });
  });
});
