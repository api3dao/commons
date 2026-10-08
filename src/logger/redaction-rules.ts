import type { RedactionRule } from './index.js';

const redactedValue = '********';

// The start of a URL up to its path, also with credentials before the host or with a port.
const createUrlOriginPattern = (hostPattern: string) =>
  String.raw`\b(?:https?|wss?)://(?:[^\s"#'/?@]*@)?${hostPattern}(?::\d+)?`;

// Redacts the path segment that follows the URL prefix, which is where these RPC providers put the API key.
const createApiKeyAfterUrlPrefixRule = (hostPattern: string, pathPrefixPattern = ''): RedactionRule => ({
  pattern: new RegExp(String.raw`(?<prefix>${createUrlOriginPattern(hostPattern)}/${pathPrefixPattern})[\w-]+`, 'gi'),
  replacement: `$<prefix>${redactedValue}`,
});

// Redacts the first path segment that looks like an API key, for the RPC providers that put it after paths of different
// lengths. The API key comes before the other segments that may look like one, such as method names.
const createFirstApiKeyShapedSegmentRule = (hostPattern: string, apiKeyPattern: string): RedactionRule => ({
  pattern: new RegExp(
    String.raw`(?<prefix>${createUrlOriginPattern(hostPattern)}/(?:[^\s"#'/<>?]*/)*?)${apiKeyPattern}(?![^\s"#'/<>?])`,
    'gi'
  ),
  replacement: `$<prefix>${redactedValue}`,
});

export const urlRedactionRules: RedactionRule[] = [
  // Credentials before the host, such as "https://user:password@host" or "postgresql://user:password@host". Matching
  // from "://" instead of the scheme keeps the cost linear on long values with many dots or dashes.
  {
    pattern: /(?<prefix>:\/\/)[^\s"#'/?@]+(?=@)/g,
    replacement: `$<prefix>${redactedValue}`,
  },
  // Query parameters such as "apikey" (Reblok), "dkey" (dRPC), "x-apikey" (sei-apis), "api_token" or "password". Only
  // these exact names match, so that parameters such as "sellToken" or "publicKey" stay in the logs.
  {
    pattern:
      /(?<prefix>[&?](?:x-)?(?:api[_-]?key|dkey|key|(?:access|api|auth)[_-]?token|token|(?:client[_-])?secret|password)=)[^\s"#&'<>]+/gi,
    replacement: `$<prefix>${redactedValue}`,
  },
  createApiKeyAfterUrlPrefixRule(String.raw`[\w.-]+\.quiknode\.pro`),
  // Infura API keys are hex tokens, which tells them apart from the words of its paths, such as "/ws/v3/<key>".
  createFirstApiKeyShapedSegmentRule(String.raw`[\w.-]+\.infura\.io`, String.raw`[\dA-Fa-f]{32,}`),
  // Alchemy puts the API key after short words, such as "/v2/<key>" or "/prices/v1/<key>", which an API key is longer
  // than.
  createFirstApiKeyShapedSegmentRule(String.raw`[\w.-]+\.(?:g\.alchemy\.com|alchemyapi\.io)`, String.raw`[\w-]{16,}`),
  createApiKeyAfterUrlPrefixRule(String.raw`lb\.drpc\.(?:live|org)`, String.raw`[\w-]+/`),
  // Ankr API keys are hex tokens, which tells them apart from the paths of its public endpoints, such as "/http/<chain>".
  createFirstApiKeyShapedSegmentRule(String.raw`rpc\.ankr\.com`, String.raw`[\dA-Fa-f]{32,}`),
  createApiKeyAfterUrlPrefixRule(String.raw`[\w.-]+\.gateway\.tenderly\.co`),
];
