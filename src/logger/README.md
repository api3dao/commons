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
