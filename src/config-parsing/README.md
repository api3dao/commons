# Config parsing

> Node.js module for parsing configuration files with support of interpolating secrets.

## Usage

### Parsing a configuration file and secrets

You can use the following helper functions to read the configuration and secrets file from filesystem:

```ts
const rawConfig = loadConfig(join(__dirname, 'config.json'));
const rawSecrets = loadSecrets(join(__dirname, 'secrets.env'));
```

### Creating the full configuration object

The module defines a `interpolateSecretsIntoConfig` function that takes a config object along with the secrets and
returns the config with the secrets interpolated into it.

Examples:

```ts
// Basic interpolation
const rawConfig = {
  prop: 'value',
  secret: '${SECRET}',
};
const config = interpolateSecretsIntoConfig(rawConfig, { SECRET: 'secretValue' }); // { prop: 'value', secret: 'secretValue' }
```

```ts
// Allows escaping the interpolation syntax
const rawConfig = {
  prop: 'value',
  secret: '\\${SECRET}',
};
const config = interpolateSecretsIntoConfig(rawConfig, { SECRET: 'secretValue' }); // { prop: 'value', secret: '${SECRET}' }
```

```ts
// Throws an error if something is not right
const rawConfig = {
  prop: 'value',
  secret: '${SECRET}',
};
const config = interpolateSecretsIntoConfig(rawConfig); // Error: SECRET is not defined
```
