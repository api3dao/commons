/* eslint-disable jest/prefer-strict-equal */ // Because the errors are thrown from the "vm" module (different context), they are not strictly equal.
import * as fixtures from '../../test/fixtures';

import {
  addReservedParameters,
  postProcessApiCallResponse,
  preProcessApiCallParameters,
  removeReservedParameters,
} from './processing';

// TODO: Remove the not needed fixtures for processing
// TODO: Add a bit more tests
describe(preProcessApiCallParameters.name, () => {
  it('valid processing code', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = {...input, from: "ETH"};',
        timeoutMs: 5000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5000,
      },
    ];
    config.ois[0]!.endpoints[0] = { ...config.ois[0]!.endpoints[0]!, preProcessingSpecifications };
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await preProcessApiCallParameters(config.ois[0]!.endpoints[0]!, parameters);

    expect(result).toEqual({
      _path: 'price',
      _type: 'int256',
      from: 'ETH',
      newProp: 'airnode',
    });
  });

  it('invalid processing code', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'something invalid; const output = {...input, from: `ETH`};',
        timeoutMs: 5000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = {...input, newProp: "airnode"};',
        timeoutMs: 5000,
      },
    ];
    config.ois[0]!.endpoints[0] = { ...config.ois[0]!.endpoints[0]!, preProcessingSpecifications };
    const parameters = { _type: 'int256', _path: 'price', from: 'TBD' };

    const throwingFunc = async () => preProcessApiCallParameters(config.ois[0]!.endpoints[0]!, parameters);

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });

  it('demonstrates access to endPointParameters, but reserved parameters are inaccessible', async () => {
    const config = fixtures.buildConfig();
    const preProcessingSpecifications = [
      {
        environment: 'Node' as const,
        // pretend the user is trying to 1) override _path and 2) set a new parameter based on
        // the presence of the reserved parameter _type (which is inaccessible)
        value:
          'const output = {...input, from: "ETH", _path: "price.newpath", myVal: input._type ? "123" : "456", newTo: endpointParameters.to };',
        timeoutMs: 5000,
      },
    ];
    config.ois[0]!.endpoints[0] = { ...config.ois[0]!.endpoints[0]!, preProcessingSpecifications };
    const parameters = { _type: 'int256', _path: 'price', to: 'USD' };

    const result = await preProcessApiCallParameters(config.ois[0]!.endpoints[0]!, parameters);

    expect(result).toEqual({
      _path: 'price', // is not overridden
      _type: 'int256',
      from: 'ETH', // originates from the processing code
      to: 'USD', // should be unchanged from the original parameters
      myVal: '456', // is set to "456" because _type is not present in the environment
      newTo: 'USD', // demonstrates access to endpointParameters
    });
  });
});

describe(postProcessApiCallResponse.name, () => {
  it('processes valid code', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input.price)*2;',
        timeoutMs: 5000,
      },
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input)*2;',
        timeoutMs: 5000,
      },
    ];
    const endpoint = { ...config.ois[0]!.endpoints[0]!, postProcessingSpecifications };
    const parameters = { _type: 'int256', _path: 'price' };

    const result = await postProcessApiCallResponse({ price: 1000 }, endpoint, parameters);

    expect(result).toBe(4000);
  });

  it('demonstrates access to endPointParameters, but reserved parameters are inaccessible', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value:
          'const reservedMultiplier = endpointParameters._times ? 1 : 2; const output = parseInt(input.price) * endpointParameters.myMultiplier * reservedMultiplier;',
        timeoutMs: 5000,
      },
    ];
    const endpoint = { ...config.ois[0]!.endpoints[0]!, postProcessingSpecifications };
    const myMultiplier = 10;
    const parameters = { _type: 'int256', _path: 'price', myMultiplier };

    const price = 1000;
    const result = await postProcessApiCallResponse({ price }, endpoint, parameters);

    // reserved parameters (_times) should be inaccessible to post-processing for the
    // http-gateway, hence multiplication by 2 instead of 1
    expect(result).toEqual(price * myMultiplier * 2);
  });

  it('throws on invalid code', async () => {
    const config = fixtures.buildConfig();
    const postProcessingSpecifications = [
      {
        environment: 'Node' as const,
        value: 'const output = parseInt(input.price)*1000;',
        timeoutMs: 5000,
      },
      {
        environment: 'Node' as const,
        value: 'Something Unexpected; const output = parseInt(input)*2;',
        timeoutMs: 5000,
      },
    ];
    const endpoint = { ...config.ois[0]!.endpoints[0]!, postProcessingSpecifications };
    const parameters = { _type: 'int256', _path: 'price' };

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
