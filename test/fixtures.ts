import type { OIS } from '@api3/ois';

import type { ApiCredentials, Config, RegularAggregatedApiCall } from '../src/processing/schema';

export function buildAggregatedRegularApiCall(params?: Partial<RegularAggregatedApiCall>): RegularAggregatedApiCall {
  return {
    airnodeAddress: '0xA30CA71Ba54E83127214D3271aEA8F5D6bD4Dace',
    cacheResponses: false,
    chainId: '31337',
    endpointId: '0x13dea3311fe0d6b84f4daeab831befbc49e19e6494c41e9e065a09c3c68f43b6',
    endpointName: 'convertToUSD',
    id: '0xf40127616f09d41b20891bcfd326957a0e3d5a5ecf659cff4d8106c04b024374',
    oisTitle: 'Currency Converter API',
    parameters: { from: 'ETH' },
    requestType: 'full',
    requesterAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    sponsorAddress: '0x2479808b1216E998309A727df8A0A98A1130A162',
    sponsorWalletAddress: '0x1C1CEEF1a887eDeAB20219889971e1fd4645b55D',
    templateId: null,

    encodedParameters:
      '0x317373737373000000000000000000000000000000000000000000000000000066726f6d000000000000000000000000000000000000000000000000000000004554480000000000000000000000000000000000000000000000000000000000746f00000000000000000000000000000000000000000000000000000000000055534400000000000000000000000000000000000000000000000000000000005f74797065000000000000000000000000000000000000000000000000000000696e7432353600000000000000000000000000000000000000000000000000005f70617468000000000000000000000000000000000000000000000000000000726573756c7400000000000000000000000000000000000000000000000000005f74696d657300000000000000000000000000000000000000000000000000003130303030300000000000000000000000000000000000000000000000000000',
    fulfillAddress: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    fulfillFunctionId: '0x7c1de7e1',
    metadata: {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      blockNumber: 11,
      currentBlock: 12,
      minConfirmations: 0,
      transactionHash: '0x40b93a1e81c7162460af066be96266ff692515a2f6b54bd622aa9f82ee00670f',
      logIndex: 0,
    },
    requestCount: '1',
    ...params,
  };
}

export function buildApiCredentials(overrides?: Partial<ApiCredentials>): ApiCredentials {
  return {
    securitySchemeName: 'myApiSecurityScheme',
    securitySchemeValue: 'supersecret',
    oisTitle: 'Currency Converter API',
    ...overrides,
  };
}

export function buildOIS(ois?: Partial<OIS>): OIS {
  return {
    oisFormat: '2.2.1',
    version: '1.2.3',
    title: 'Currency Converter API',
    apiSpecifications: {
      servers: [
        {
          url: 'http://localhost:5000',
        },
      ],
      paths: {
        '/convert': {
          get: {
            parameters: [
              {
                in: 'query',
                name: 'from',
              },
              {
                in: 'query',
                name: 'to',
              },
              {
                in: 'query',
                name: 'amount',
              },
            ],
          },
        },
      },
      components: {
        securitySchemes: {
          myApiSecurityScheme: {
            in: 'query',
            type: 'apiKey',
            name: 'access_key',
          },
        },
      },
      security: {
        myApiSecurityScheme: [],
      },
    },
    endpoints: [
      {
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
      },
    ],
    ...ois,
  };
}

export function buildConfig(overrides?: Partial<Config>): Config {
  const rawConfig: Config = {
    ois: [buildOIS()],
    apiCredentials: [buildApiCredentials()],
    ...overrides,
  };

  return rawConfig;
}
