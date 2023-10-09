import type { Endpoint } from '@api3/ois';

export const createEndpoint = (overrides: Partial<Endpoint>): Endpoint => {
  return {
    name: 'convertToUSD',
    operation: {
      method: 'get',
      path: '/convert',
    },
    fixedOperationParameters: [
      {
        operationParameter: {
          in: 'query',
          name: 'to',
        },
        value: 'USD',
      },
    ],
    reservedParameters: [
      { name: '_type' },
      { name: '_path' },
      {
        name: '_times',
        default: '100000',
      },
      { name: '_gasPrice' },
      { name: '_minConfirmations' },
    ],
    parameters: [
      {
        name: 'from',
        default: 'EUR',
        operationParameter: {
          in: 'query',
          name: 'from',
        },
      },
      {
        name: 'amount',
        default: '1',
        operationParameter: {
          name: 'amount',
          in: 'query',
        },
      },
    ],
    ...overrides,
  };
};
