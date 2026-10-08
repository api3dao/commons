# Logger

> Configurable BE-only logger.

Backend-only logger for Node.js packages based on Winston logger.

## Getting started

Import `createLogger` function to create a logger instance.

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

```ts
const logger = createLogger({
  colorize: false,
  enabled: true,
  format: 'json',
  minLevel: 'info',
  redactionRules: [
    { pattern: /(?<prefix>https:\/\/[\w-]+\.infura\.io\/v3\/)[\w-]+/g, replacement: '$<prefix>********' },
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
