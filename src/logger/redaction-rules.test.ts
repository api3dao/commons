import { commonJsonRedaction, createJsonReplacer } from './index.js';

const replacer = createJsonReplacer({ jsonRedaction: commonJsonRedaction });
const redact = (value: string) => replacer('', value);

const apiKey = 'a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6';
const infuraKey = '0123456789abcdef'.repeat(2);
const ankrToken = '0123456789abcdef'.repeat(4);

test.each([
  [
    'a QuickNode URL',
    `https://summer-few-sun.base-mainnet.quiknode.pro/${apiKey}/`,
    'https://summer-few-sun.base-mainnet.quiknode.pro/********/',
  ],
  [
    'a QuickNode URL on Ethereum mainnet',
    `https://summer-few-sun.quiknode.pro/${apiKey}/`,
    'https://summer-few-sun.quiknode.pro/********/',
  ],
  [
    'a QuickNode URL with a path after the API key',
    `https://summer-few-sun.avalanche-mainnet.quiknode.pro/${apiKey}/ext/bc/C/rpc`,
    'https://summer-few-sun.avalanche-mainnet.quiknode.pro/********/ext/bc/C/rpc',
  ],
  [
    'a QuickNode WebSocket URL',
    `wss://summer-few-sun.quiknode.pro/${apiKey}/`,
    'wss://summer-few-sun.quiknode.pro/********/',
  ],
  ['an Infura URL', `https://mainnet.infura.io/v3/${infuraKey}`, 'https://mainnet.infura.io/v3/********'],
  [
    'an Infura URL of an older API version',
    `https://polygon-mainnet.infura.io/v2/${infuraKey}`,
    'https://polygon-mainnet.infura.io/v2/********',
  ],
  ['an Infura URL without a version', `https://mainnet.infura.io/${infuraKey}`, 'https://mainnet.infura.io/********'],
  [
    'an Infura URL with the API secret before the host',
    `https://:${apiKey}@mainnet.infura.io/v3/${infuraKey}`,
    'https://********@mainnet.infura.io/v3/********',
  ],
  [
    'an Infura URL with a port',
    `https://mainnet.infura.io:443/v3/${infuraKey}`,
    'https://mainnet.infura.io:443/v3/********',
  ],
  ['an Infura WebSocket URL', `wss://mainnet.infura.io/ws/v3/${infuraKey}`, 'wss://mainnet.infura.io/ws/v3/********'],
  [
    'an Infura Gas API URL',
    `https://gas.api.infura.io/v3/${infuraKey}/networks/1/suggestedGasFees`,
    'https://gas.api.infura.io/v3/********/networks/1/suggestedGasFees',
  ],
  ['an Alchemy URL', `https://eth-mainnet.g.alchemy.com/v2/${apiKey}`, 'https://eth-mainnet.g.alchemy.com/v2/********'],
  [
    'an Alchemy WebSocket URL',
    `wss://base-mainnet.g.alchemy.com/v2/${apiKey}`,
    'wss://base-mainnet.g.alchemy.com/v2/********',
  ],
  [
    'an Alchemy NFT API URL',
    `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner?owner=0x1`,
    'https://eth-mainnet.g.alchemy.com/nft/v3/********/getNFTsForOwner?owner=0x1',
  ],
  [
    'only the API key of an Alchemy URL with a long method name',
    `https://eth-mainnet.g.alchemy.com/nft/v3/${apiKey}/getNFTMetadataBatch`,
    'https://eth-mainnet.g.alchemy.com/nft/v3/********/getNFTMetadataBatch',
  ],
  [
    'an Alchemy Prices API URL',
    `https://api.g.alchemy.com/prices/v1/${apiKey}/tokens/by-symbol?symbols=ETH`,
    'https://api.g.alchemy.com/prices/v1/********/tokens/by-symbol?symbols=ETH',
  ],
  [
    'an Alchemy URL of an API with another name and version',
    `https://api.g.alchemy.com/transactions/v2/${apiKey}/history?address=0x1`,
    'https://api.g.alchemy.com/transactions/v2/********/history?address=0x1',
  ],
  [
    'an Alchemy URL without a version',
    `https://api.g.alchemy.com/transactions/${apiKey}/history`,
    'https://api.g.alchemy.com/transactions/********/history',
  ],
  [
    'a legacy Alchemy URL',
    `https://eth-mainnet.alchemyapi.io/v2/${apiKey}`,
    'https://eth-mainnet.alchemyapi.io/v2/********',
  ],
  [
    'a dRPC URL with the API key in the path',
    `https://lb.drpc.live/ethereum/${apiKey}`,
    'https://lb.drpc.live/ethereum/********',
  ],
  [
    'a dRPC URL with the API key in the path on the old domain',
    `wss://lb.drpc.org/ethereum/${apiKey}`,
    'wss://lb.drpc.org/ethereum/********',
  ],
  [
    'a dRPC Data API URL',
    `https://lb.drpc.live/lambda/${apiKey}/v2/wallets/0x1/balances`,
    'https://lb.drpc.live/lambda/********/v2/wallets/0x1/balances',
  ],
  ['an Ankr URL', `https://rpc.ankr.com/eth/${ankrToken}`, 'https://rpc.ankr.com/eth/********'],
  ['an Ankr WebSocket URL', `wss://rpc.ankr.com/eth/${ankrToken}`, 'wss://rpc.ankr.com/eth/********'],
  ['an Ankr WebSocket URL with "/ws"', `wss://rpc.ankr.com/eth/ws/${ankrToken}`, 'wss://rpc.ankr.com/eth/ws/********'],
  [
    'an Ankr REST URL',
    `https://rpc.ankr.com/premium-http/eth_beacon/${ankrToken}/eth/v1/beacon/genesis`,
    'https://rpc.ankr.com/premium-http/eth_beacon/********/eth/v1/beacon/genesis',
  ],
  [
    'an Ankr Advanced API URL',
    `https://rpc.ankr.com/multichain/${ankrToken}`,
    'https://rpc.ankr.com/multichain/********',
  ],
  [
    'an Ankr URL with the API key deeper in the path',
    `https://rpc.ankr.com/premium-http/eth/beacon/${ankrToken}/eth/v1/node/version`,
    'https://rpc.ankr.com/premium-http/eth/beacon/********/eth/v1/node/version',
  ],
  ['a Tenderly URL', `https://mainnet.gateway.tenderly.co/${apiKey}`, 'https://mainnet.gateway.tenderly.co/********'],
  ['a Reblok URL', `https://rpc.reblok.io/ethereum?apikey=${apiKey}`, 'https://rpc.reblok.io/ethereum?apikey=********'],
  [
    'a Reblok URL with a longer path',
    `https://rpc.reblok.io/ethereum/mev-protected?apikey=${apiKey}`,
    'https://rpc.reblok.io/ethereum/mev-protected?apikey=********',
  ],
  [
    'a Reblok URL with the API key after another parameter',
    `https://rpc.reblok.io/ethereum?chainId=1&apikey=${apiKey}`,
    'https://rpc.reblok.io/ethereum?chainId=1&apikey=********',
  ],
  [
    'a dRPC URL',
    `https://lb.drpc.org/ogrpc?network=arbitrum-sepolia&dkey=${apiKey}`,
    'https://lb.drpc.org/ogrpc?network=arbitrum-sepolia&dkey=********',
  ],
  [
    'an API key in the x-apikey parameter',
    `https://evm-rpc.sei-apis.com/?x-apikey=${apiKey}`,
    'https://evm-rpc.sei-apis.com/?x-apikey=********',
  ],
  [
    'an Etherscan API URL',
    `https://api.etherscan.io/api?module=account&action=balance&address=0x1&apikey=${apiKey}`,
    'https://api.etherscan.io/api?module=account&action=balance&address=0x1&apikey=********',
  ],
  [
    'an Etherscan V2 API URL',
    `https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x1&apikey=${apiKey}`,
    'https://api.etherscan.io/v2/api?chainid=1&module=account&action=balance&address=0x1&apikey=********',
  ],
  [
    'an API token in the api_token parameter',
    `https://api.example.com/v1/quote?symbol=ETH&api_token=${apiKey}`,
    'https://api.example.com/v1/quote?symbol=ETH&api_token=********',
  ],
  ['credentials in a URL', `https://user:${apiKey}@rpc.example.com/`, 'https://********@rpc.example.com/'],
  [
    'credentials in a database URL',
    `postgresql://user:${apiKey}@db.example.com:5432/main`,
    'postgresql://********@db.example.com:5432/main',
  ],
])('redacts %s', (_description, url, redactedUrl) => {
  expect(redact(url)).toBe(redactedUrl);
});

test('redacts all URLs in an error message', () => {
  const message = `server error (requestUrl="https://summer-few-sun.quiknode.pro/${apiKey}/", code=SERVER_ERROR), fallback https://rpc.reblok.io/ethereum?apikey=${apiKey} failed`;

  expect(redact(message)).toBe(
    'server error (requestUrl="https://summer-few-sun.quiknode.pro/********/", code=SERVER_ERROR), fallback https://rpc.reblok.io/ethereum?apikey=******** failed'
  );
});

test.each([
  'https://rpc.ankr.com/eth',
  'wss://rpc.ankr.com/eth/ws',
  'wss://rpc.ankr.com/polygon/',
  'https://rpc.ankr.com/http/kava_api/cosmos/auth/v1beta1/params',
  'https://gas.api.infura.io/networks/1/suggestedGasFees',
  'https://worldchain-mainnet.g.alchemy.com/public',
  'https://eth-mainnet.g.alchemy.com/v2',
  'https://api.g.alchemy.com/prices/v1/tokens/by-symbol?symbols=ETH',
  'https://docs-demo.quiknode.pro/',
  'https://mainnet.gateway.tenderly.co',
  'https://eth.drpc.org',
  'https://lb.drpc.org/ogrpc?network=ethereum',
  'https://rpc.reblok.io/ethereum',
  'https://mainnet.base.org',
  'https://signed-api.api3.org/public/0xc52EeA00154B4fF1EbbF8Ba39FDe37F1AC3B9Fd4',
  'https://api.example.com/data?symbol=ETH&network=mainnet',
  'https://api.0x.org/swap/v1/quote?sellToken=0xA0b86991&buyToken=0xC02aaA39&sellAmount=1000',
  'https://api.example.com/nft?contract=0x1&tokenId=42',
  'https://api.example.com/verify?publicKey=0x04ab',
  'https://api.example.com/search?keyword=oracle',
  'Fetched data (key=abc, token=xyz)',
])('keeps %s', (url) => {
  expect(redact(url)).toBe(url);
});

test.each([
  ['hex data', `0x${'ab'.repeat(100_000)}`],
  ['a long value with many dashes', 'a-'.repeat(100_000)],
  ['a URL with a long host', `https://${'a.'.repeat(100_000)}`],
  ['a URL with many path segments', `https://eth-mainnet.g.alchemy.com/${'a/'.repeat(100_000)}`],
])('redacts %s in linear time', (_description, value) => {
  const start = performance.now();

  redact(value);

  expect(performance.now() - start).toBeLessThan(500);
});

test.each([
  'AIRNODE_SECRET_OMDB_API_KEY',
  'ALLOCATOR_PRIVATE_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'Authorization',
  'DATABASE_PASSWORD',
  'Drpc-Key',
  'GH_TOKEN',
  'GRAFANA_LOKI_AUTH',
  'HOT_WALLET_MNEMONIC',
  'KEYCARD_PAIRING_KEY',
  'SLACK_API_TOKEN',
  'ZEROEX_API_KEY',
  'accessToken',
  'airnodeWalletMnemonic',
  'apiKey',
  'authToken',
  'authTokens',
  'clientSecret',
  'cookie',
  'drpcKey',
  'password',
  'privateKey',
  'x-api-key',
])('redacts the value of the "%s" key', (key) => {
  expect(JSON.parse(JSON.stringify({ [key]: 'secret-value' }, replacer))).toStrictEqual({ [key]: '********' });
});

test.each([
  'author',
  'collateralToken',
  'keyword',
  'promptTokens',
  'publicKey',
  'sellToken',
  'tokenId',
  'tokenIn',
  'tokens',
])('keeps the value of the "%s" key', (key) => {
  expect(JSON.parse(JSON.stringify({ [key]: 'value' }, replacer))).toStrictEqual({ [key]: 'value' });
});

test('redacts the values of secret keys', () => {
  const config = {
    allowedAirnodes: [
      { address: '0xc52EeA00154B4fF1EbbF8Ba39FDe37F1AC3B9Fd4', authTokens: ['ab'.repeat(32)], isCertified: true },
    ],
    endpoints: [{ authTokens: null, delaySeconds: 15, urlPath: '/delayed' }],
    keyword: 'oracle',
    publicKey: '0x04ab',
    sellToken: '0xA0b86991',
    signedApis: [{ authToken: 'signed-api-token', url: 'https://signed-api.example.com' }],
    tokenId: 42,
    wallet: { mnemonic: 'test test test test test test test test test test test junk', privateKey: '0x0123' },
  };

  expect(JSON.parse(JSON.stringify(config, replacer))).toStrictEqual({
    allowedAirnodes: [
      { address: '0xc52EeA00154B4fF1EbbF8Ba39FDe37F1AC3B9Fd4', authTokens: '********', isCertified: true },
    ],
    endpoints: [{ authTokens: null, delaySeconds: 15, urlPath: '/delayed' }],
    keyword: 'oracle',
    publicKey: '0x04ab',
    sellToken: '0xA0b86991',
    signedApis: [{ authToken: '********', url: 'https://signed-api.example.com' }],
    tokenId: 42,
    wallet: { mnemonic: '********', privateKey: '********' },
  });
});
