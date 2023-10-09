/* eslint-disable jest/prefer-strict-equal */ // Because the errors are thrown from the "vm" module (different context), they are not strictly equal.
import { createEndpoint } from '../../test/fixtures';

import {
  addReservedParameters,
  postProcessApiCallResponse,
  preProcessApiCallParameters,
  removeReservedParameters,
} from './processing';

describe(preProcessApiCallParameters.name, () => {
  it('valid processing code', async () => {
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

    const result = await preProcessApiCallParameters(endpoint, parameters);

    expect(result).toEqual({
      _path: 'price',
      _type: 'int256',
      from: 'ETH',
      newProp: 'airnode',
    });
  });

  it('invalid processing code', async () => {
    const endpoint = createEndpoint({
      preProcessingSpecifications: [
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
      ],
    });
    const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };

    const throwingFunc = async () => preProcessApiCallParameters(endpoint, parameters);

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });

  it('demonstrates access to endpointParameters, but reserved parameters are inaccessible', async () => {
    const parameters = { _type: 'int256', _path: 'price', to: 'USD' };
    const endpoint = createEndpoint({
      preProcessingSpecifications: [
        {
          environment: 'Node',
          // pretend the user is trying to 1) override _path and 2) set a new parameter based on
          // the presence of the reserved parameter _type (which is inaccessible)
          value:
            'const output = {...input, from: "ETH", _path: "price.newpath", myVal: input._type ? "123" : "456", newTo: endpointParameters.to };',
          timeoutMs: 5000,
        },
      ],
    });

    const result = await preProcessApiCallParameters(endpoint, parameters);

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
    const endpoint = createEndpoint({
      preProcessingSpecifications: [
        {
          environment: 'Node',
          value: `
          const randomValue = crypto.randomBytes(4).toString('hex');
          const output = {...input, randomValue};
        `,
          timeoutMs: 5000,
        },
      ],
    });
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessApiCallParameters(endpoint, parameters);

    // Check that the result contains the original parameters and a valid 8-character hex random value.
    expect(result).toMatchObject({
      _path: 'price',
      _type: 'int256',
    });
    expect(result.randomValue).toHaveLength(8);
    expect(/^[\da-f]{8}$/i.test(result.randomValue)).toBe(true);
  });

  it('throws error due to processing timeout', async () => {
    const endpoint = createEndpoint({
      preProcessingSpecifications: [
        {
          environment: 'Node async',
          value: `
          const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
          delay(5000);
          const output = {...input, from: 'ETH'};
        `,
          timeoutMs: 100, // This timeout is shorter than the delay in the processing code.
        },
      ],
    });
    const parameters = { _type: 'int256', _path: 'price' };

    const throwingFunc = async () => preProcessApiCallParameters(endpoint, parameters);

    await expect(throwingFunc).rejects.toThrow('Timeout exceeded');
  });
});

describe(postProcessApiCallResponse.name, () => {
  it('processes valid code', async () => {
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

    const result = await postProcessApiCallResponse({ price: 1000 }, endpoint, parameters);

    expect(result).toBe(4000);
  });

  it('demonstrates access to endpointParameters, but reserved parameters are inaccessible', async () => {
    const myMultiplier = 10;
    const parameters = { _type: 'int256', _path: 'price', myMultiplier };
    const endpoint = createEndpoint({
      postProcessingSpecifications: [
        {
          environment: 'Node',
          value: `
            const reservedMultiplier = endpointParameters._times ? 1 : 2;
            const output = parseInt(input.price) * endpointParameters.myMultiplier * reservedMultiplier
          `,
          timeoutMs: 5000,
        },
      ],
    });

    const price = 1000;
    const result = await postProcessApiCallResponse({ price }, endpoint, parameters);

    // reserved parameters (_times) should be inaccessible to post-processing for the
    // http-gateway, hence multiplication by 2 instead of 1
    expect(result).toEqual(price * myMultiplier * 2);
  });

  it('throws on invalid code', async () => {
    const parameters = { _type: 'int256', _path: 'price' };
    const endpoint = createEndpoint({
      postProcessingSpecifications: [
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
      ],
    });

    const throwingFunc = async () => postProcessApiCallResponse({ price: 1000 }, endpoint, parameters);

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
