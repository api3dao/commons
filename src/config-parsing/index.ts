import { readFileSync } from 'node:fs';

import dotenv from 'dotenv';
import reduce from 'lodash/reduce';
import template from 'lodash/template';
import { z } from 'zod';

export const strictSecretNamePattern = /^[A-Z][\dA-Z_]*$/;

export const strictSecretNameSchema = z
  .string()
  .regex(
    strictSecretNamePattern,
    `Secret name is not a valid. Secret name must match ${strictSecretNamePattern.toString()}`
  );

export const nonBlankSecretValueSchema = z.string().min(1, { message: 'Secret cannot be blank' });

export type Secrets = Record<string, string>;

// Regular expression that does not match anything, ensuring no escaping or interpolation happens
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L199
// eslint-disable-next-line prefer-named-capture-group
const NO_MATCH_REGEXP = /($^)/;
// Regular expression matching ES template literal delimiter (${}) with escaping
// https://github.com/lodash/lodash/blob/4.17.15/lodash.js#L175
// eslint-disable-next-line prefer-named-capture-group
const ES_MATCH_REGEXP = /(?<!\\)\${([^\\}]*(?:\\.[^\\}]*)*)}/g;
// Regular expression matching the escaped ES template literal delimiter (${}). We need to use "\\\\" (four backslashes)
// because "\\" becomes "\\\\" when converted to string
// eslint-disable-next-line prefer-named-capture-group
const ESCAPED_ES_MATCH_REGEXP = /\\\\(\${([^\\}]*(?:\\.[^\\}]*)*)})/g;

export interface InterpolationOptions {
  allowBlankSecretValue?: boolean;
  validateSecretName?: boolean;
}

export type AnyObject = Record<string, unknown>;

export function interpolateSecretsIntoConfig<T = AnyObject>(
  config: T,
  secrets: unknown,
  options?: InterpolationOptions
) {
  const { allowBlankSecretValue = true, validateSecretName = true } = options ?? {};
  const secretNameSchema = validateSecretName ? strictSecretNameSchema : z.string();
  const secretValueSchema = allowBlankSecretValue ? z.string() : nonBlankSecretValueSchema;
  const validatedSecrets = z.record(secretNameSchema, secretValueSchema).parse(secrets);

  const stringifiedSecrets = reduce(
    validatedSecrets,
    (acc, value, key) => {
      return {
        ...acc,
        // Convert to value to JSON to encode new lines as "\n". The resulting value will be a JSON string with quotes
        // which are sliced off.
        [key]: JSON.stringify(value).slice(1, -1),
      };
    },
    {} as Secrets
  );

  const interpolatedConfig = template(JSON.stringify(config), {
    escape: NO_MATCH_REGEXP,
    evaluate: NO_MATCH_REGEXP,
    interpolate: ES_MATCH_REGEXP,
  })(stringifiedSecrets);
  // Un-escape the escaped config interpolations (e.g. to enable interpolation in processing snippets). Optimistically
  // assume, the config type has not changed.
  return JSON.parse(interpolatedConfig.replaceAll(ESCAPED_ES_MATCH_REGEXP, '$1')) as T;
}

export const loadSecrets = (path: string) => dotenv.parse(readFileSync(path, 'utf8'));

export const loadConfig = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
