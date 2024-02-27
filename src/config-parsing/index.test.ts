import { ZodError } from 'zod';

import { interpolateSecretsIntoConfig } from './index';

const rawConfig = {
  property: 'value',
  secretB: '${SECRET_B}',
  secretA: '${SECRET_A}',
};

describe(interpolateSecretsIntoConfig.name, () => {
  it('interpolates secrets into config', () => {
    const config = interpolateSecretsIntoConfig(rawConfig, {
      SECRET_A: 'secretValueA',
      SECRET_B: 'secretValueB',
    });

    expect(config).toStrictEqual({
      property: 'value',
      secretA: 'secretValueA',
      secretB: 'secretValueB',
    });
  });

  it('allows empty secrets by default', () => {
    const config = interpolateSecretsIntoConfig(rawConfig, {
      SECRET_A: '',
      SECRET_B: '',
    });

    expect(config).toStrictEqual({
      property: 'value',
      secretA: '',
      secretB: '',
    });
  });

  it('disallows empty secrets when configured so', () => {
    expect(() => {
      interpolateSecretsIntoConfig(
        rawConfig,
        {
          SECRET_A: '',
          SECRET_B: '',
        },
        { allowBlankSecretValue: false }
      );
    }).toThrow('Secret cannot be blank');
  });

  it('can use "\\" to escape interpolation', () => {
    const escapedConfig = {
      ...rawConfig,
      secretA: '\\${SECRET_A}',
    };
    const config = interpolateSecretsIntoConfig(escapedConfig, {
      SECRET_A: 'secretValueA',
      SECRET_B: 'secretValueB',
    });

    expect(config).toStrictEqual({
      property: 'value',
      secretA: '${SECRET_A}',
      secretB: 'secretValueB',
    });
  });

  it('allows extraneous secrets', () => {
    const config = interpolateSecretsIntoConfig(rawConfig, {
      SECRET_A: 'secretValueA',
      SECRET_B: 'secretValueB',
      SECRET_C: 'secretValueC',
    });

    expect(config).toStrictEqual({
      property: 'value',
      secretA: 'secretValueA',
      secretB: 'secretValueB',
    });
  });

  it('throws an error when a secret is missing', () => {
    expect(() => {
      interpolateSecretsIntoConfig(rawConfig, {
        SECRET_A: 'secretValueA',
      });
    }).toThrow('SECRET_B is not defined');
  });

  it('allows no secrets', () => {
    const noSecretsConfig = { value: 'no secrets' };

    expect(interpolateSecretsIntoConfig(noSecretsConfig, {})).toStrictEqual(noSecretsConfig);
  });

  it('throws when secret name is invalid', () => {
    expect(() => {
      interpolateSecretsIntoConfig(rawConfig, {
        SECRET_A: 'secretValueA',
        '0_SECRET_STARTING_WITH_NUMBER': 'invalid',
      });
    }).toThrow(
      new ZodError([
        {
          validation: 'regex',
          code: 'invalid_string',
          message: 'Secret name is not a valid. Secret name must match /^[A-Z][\\dA-Z_]*$/',
          path: ['0_SECRET_STARTING_WITH_NUMBER'],
        },
      ])
    );

    expect(() => {
      interpolateSecretsIntoConfig(rawConfig, {
        SECRET_A: 'secretValueA',
        'CANNOT-CONTAIN-HYPHEN': 'invalid',
      });
    }).toThrow(
      new ZodError([
        {
          validation: 'regex',
          code: 'invalid_string',
          message: 'Secret name is not a valid. Secret name must match /^[A-Z][\\dA-Z_]*$/',
          path: ['CANNOT-CONTAIN-HYPHEN'],
        },
      ])
    );
  });

  it('provides up to date README examples', () => {
    // Basic interpolation
    const basicInterpolationConfig = {
      prop: 'value',
      secret: '${SECRET}',
    };
    expect(interpolateSecretsIntoConfig(basicInterpolationConfig, { SECRET: 'secretValue' })).toStrictEqual({
      prop: 'value',
      secret: 'secretValue',
    });

    // Allows escaping the interpolation syntax
    const escapingInterpolationConfig = {
      prop: 'value',
      secret: '\\${SECRET}',
    };
    expect(interpolateSecretsIntoConfig(escapingInterpolationConfig, { SECRET: 'secretValue' })).toStrictEqual({
      prop: 'value',
      secret: '${SECRET}',
    });

    // Throws an error if something is not right
    const missingSecretConfig = {
      prop: 'value',
      secret: '${SECRET}',
    };
    expect(() => interpolateSecretsIntoConfig(missingSecretConfig, {})).toThrow('SECRET is not defined');
  });
});
