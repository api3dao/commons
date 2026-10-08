# Logger

> Configurable BE-only logger.

Backend-only logger for Node.js packages based on Winston logger.

## Getting started

Create the logger with `createLogger`. To configure it with environment variables, add `loggerEnvSchema` to the
environment schema of your service and pass the parsed values to `createLogConfigFromEnv`:

```ts
import { createLogConfigFromEnv, createLogger, loggerEnvSchema } from '@api3/commons';
import { z } from 'zod';

const envSchema = z.object({ ...loggerEnvSchema.shape, RPC_URL: z.url() });
const env = envSchema.parse(process.env);

export const logger = createLogger(createLogConfigFromEnv(env));
```

`createLogger` does not validate its configuration at runtime and relies on the `LogConfig` type. Parse the values that
come from outside of the code, such as environment variables, with `loggerEnvSchema` first.

## Environment variables

`loggerEnvSchema` parses these environment variables to the [configuration](#configuration) options:

| Variable                  | Option             | Default   |
| ------------------------- | ------------------ | --------- |
| `LOGGER_ENABLED`          | `enabled`          | `true`    |
| `LOG_COLORIZE`            | `colorize`         | `false`   |
| `LOG_FORMAT`              | `format`           | `json`    |
| `LOG_LEVEL`               | `minLevel`         | `info`    |
| `LOG_MAX_HEX_DATA_LENGTH` | `maxHexDataLength` | (not set) |

The boolean variables accept the values of the `z.stringbool` schema of Zod, such as `true` and `false`. The
`redactionRules` option is code rather than deployment configuration, so it has no environment variable. See
[`redactionRules`](#redactionrules) for how to turn on redaction.

The schema rejects empty values, such as the `LOG_LEVEL=` line of a `.env` file. To treat them as unset instead, so that
they get the defaults, remove them before you parse the environment:

```ts
const env = envSchema.parse(Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== '')));
```

## Logging errors

Pass the error as the second argument of `logger.error`, for example
`logger.error('Failed to fetch data', error, { chainId })`. The error is logged in a separate `error` field with its
`message`, `name`, `stack` and any additional fields that the error carries. This way, the error cannot override the
fields of the log entry, such as the log message.

## Configuration

Logger configuration allows specifying log format, styling and level.

### `enabled`

Enables or disables logging. Options:

- `true` - Enables logging.
- `false` - Disables logging.

### `format`

- `json` - Specifies JSON log format. This is suitable when running in production and streaming logs to other services.
- `pretty` - Logs are formatted in a human-friendly "pretty" way. Ideal, when running the service locally and in
  development.

### `colorize`

Enables or disables colors in the log output. Options:

- `true` - Enables colors in the log output. The output has special color setting characters that are parseable by CLI.
  Recommended when running locally and in development.
- `false` - Disables colors in the log output. Recommended for production.

### `minLevel`

Defines the minimum level of logs. Logs with smaller level (severity) will be silenced. Options:

- `debug` - Enables all logs.
- `info` - Enables logs with level `info`, `warn` and `error`.
- `warn` - Enables logs with level `warn` and `error`.
- `error` - Enables logs with level `error`.

### `redactionRules`

Optional list of rules that redact sensitive data (for example API keys in RPC URLs) from the logs. Each rule has a
`pattern` regular expression and a `replacement` string, which the logger passes to `String.prototype.replace` for every
string value in the log entry. Use the `g` flag to replace all occurrences in a value. The rules apply to the JSON log
entry, which the `json` format prints and [additional transports](#additional-transports) receive. The `pretty` format
prints the log entry without redaction.

Redaction is off by default. To turn it on, add the rules to the configuration. The package exports `urlRedactionRules`,
which redact secrets in URLs:

- The values of query parameters named like an API key, token, secret or password: `apikey` (as in Reblok RPC URLs and
  the Etherscan API), `api_key`, `dkey` (as in dRPC RPC URLs), `key`, `token`, `api_token`, `access_token`,
  `auth_token`, `secret`, `client_secret` or `password`, also with an `x-` prefix. Other parameters, such as `sellToken`
  or `publicKey`, stay in the logs.
- The API keys in the paths of the RPC URLs of QuickNode, Infura, Alchemy, dRPC, Ankr and Tenderly, including their
  WebSocket URLs. Infura, Alchemy and Ankr put the key after paths of different lengths, so for them the first path
  segment that looks like a key is redacted: a hex token of at least 32 characters for Infura and Ankr, and a segment of
  at least 16 characters for Alchemy. When the key is sent in a header instead, a long Alchemy method name can be
  redacted.
- Credentials before the host, such as in `postgresql://user:password@host`.

Add your own rules for the secrets that only your service uses:

```ts
export const logger = createLogger({
  ...createLogConfigFromEnv(env),
  redactionRules: [
    ...urlRedactionRules,
    { pattern: /(?<prefix>https:\/\/rpc\.example\.com\/)[\w-]+/g, replacement: '$<prefix>********' },
  ],
});
```

### `maxHexDataLength`

Optional positive integer that limits the length of hex data (such as transaction calldata) in the logs. Every `0x`
prefixed hex string that has more than `maxHexDataLength` characters (including the `0x` prefix) is truncated to its
first 12 characters followed by its original length, for example `0xababababab...<1024 chars>`. Like `redactionRules`,
it applies to the JSON log entry, but not to the output of the `pretty` format.

## Additional transports

To send the logs somewhere else as well, add a Winston transport (built on the `winston-transport` package) to the base
logger. For example, a transport that reports warnings and errors to Sentry:

```ts
import { createBaseLogger, wrapper } from '@api3/commons';
import * as Sentry from '@sentry/node';
import Transport from 'winston-transport';

class SentryTransport extends Transport {
  override log(info: any, next: () => void) {
    const { level, message, ctx } = JSON.parse(info[Symbol.for('message')]);
    Sentry.captureMessage(message, {
      level: level === 'warn' ? 'warning' : 'error',
      tags: { serviceId: ctx?.serviceId },
    });
    next();
  }
}

const baseLogger = createBaseLogger(logConfig);
baseLogger.add(new SentryTransport({ level: 'warn' }));
export const logger = wrapper(baseLogger);
```

Every transport receives the JSON log entry in `info[Symbol.for('message')]` (exported as `MESSAGE` by the `triple-beam`
package), with `redactionRules` and `maxHexDataLength` applied and with the context of `runWithContext` in `ctx`. Read
the data from there, because the other fields of `info` are not redacted. When `enabled` is `false`, the additional
transports are disabled too.

A transport that serializes the fields of `info` itself can apply the same redaction with `createJsonReplacer`, which
takes `redactionRules` and `maxHexDataLength` and returns a `JSON.stringify` replacer. For example, use it as the
`replacer` option of the `Http` transport of Winston or of `winston.format.json`:

```ts
baseLogger.add(new winston.transports.Http({ host: 'logs.example.com', replacer: createJsonReplacer(logConfig) }));
```
