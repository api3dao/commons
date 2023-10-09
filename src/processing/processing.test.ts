/* eslint-disable jest/prefer-strict-equal */ // Because the errors are thrown from the "vm" module (different context), they are not strictly equal.
import * as fixtures from '../../test/fixtures';

import { postProcessApiSpecifications, preProcessApiSpecifications } from './processing';

// TODO: Remove the not needed fixtures for processing
// TODO: Add a bit more tests
describe('pre-processing', () => {
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

    const result = await preProcessApiSpecifications(config.ois[0]!.endpoints[0]!, parameters);

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

    const throwingFunc = async () => preProcessApiSpecifications(config.ois[0]!.endpoints[0]!, parameters);

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

    const result = await preProcessApiSpecifications(config.ois[0]!.endpoints[0]!, parameters);

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

describe('post-processing', () => {
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
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const result = await postProcessApiSpecifications({ price: 1000 }, endpoint, {
      type: 'http-gateway',
      config,
      aggregatedApiCall,
    });

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
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const price = 1000;
    const result = await postProcessApiSpecifications({ price }, endpoint, {
      type: 'http-gateway',
      config,
      aggregatedApiCall,
    });

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
    const aggregatedApiCall = fixtures.buildAggregatedRegularApiCall({ parameters });

    const throwingFunc = async () =>
      postProcessApiSpecifications({ price: 1000 }, endpoint, {
        type: 'http-gateway',
        config,
        aggregatedApiCall,
      });

    await expect(throwingFunc).rejects.toEqual(new Error('SyntaxError: Unexpected identifier'));
  });
});
