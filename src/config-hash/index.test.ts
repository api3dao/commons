import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createSha256Hash, serializePlainObject, sortObjectKeysRecursively } from '.';

describe(sortObjectKeysRecursively.name, () => {
  it('should sort the keys alphabetically', () => {
    const plainObject = {
      c: 3,
      a: 1,
      b: 2,
    };

    expect(sortObjectKeysRecursively(plainObject)).toStrictEqual({ a: 1, b: 2, c: 3 });
  });

  it('should handle nested objects', () => {
    const plainObject = {
      c: 3,
      a: 1,
      b: {
        e: 5,
        d: 4,
      },
    };

    expect(sortObjectKeysRecursively(plainObject)).toStrictEqual({ a: 1, b: { d: 4, e: 5 }, c: 3 });
  });

  it('handles other primitive values', () => {
    const plainObject = {
      c: 'c-val',
      a: 1,
      F: null,
      B: false,
      b: [2, null, 1],
    };

    expect(sortObjectKeysRecursively(plainObject)).toStrictEqual({
      B: false,
      F: null,
      a: 1,
      b: [2, null, 1],
      c: 'c-val',
    });
  });
});

describe(serializePlainObject.name, () => {
  it('creates the same serialization string for equal objects', () => {
    const plainObject = {
      c: 'c-val',
      a: 1,
      F: null,
      B: false,
      b: [2, null, 1],
    };
    const otherPlainObject = {
      a: 1,
      F: null,
      B: false,
      c: 'c-val',
      b: [2, null, 1],
    };

    expect(serializePlainObject(plainObject)).toBe(serializePlainObject(otherPlainObject));
  });
});

describe(createSha256Hash.name, () => {
  it('should create same hash as SubtleCrypto in browser', () => {
    // https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#converting_a_digest_to_a_hex_string
    const text = 'An obscure body in the S-K System, your majesty. The inhabitants refer to it as the planet Earth.';

    expect(createSha256Hash(text)).toBe('0x6efd383745a964768989b9df420811abc6e5873f874fc22a76fe9258e020c2e1');
  });
});

test('can produce the same hash on UNIX', () => {
  const fixturePath = join(__dirname, '../../test/fixtures/config-hash/file.json');

  // Compute the hash using this module
  const rawConfig = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const serializedConfig = serializePlainObject(rawConfig);
  const hash = createSha256Hash(serializedConfig);

  // Compute the hash using UNIX commands
  const unixCommand = `jq --sort-keys --compact-output . ${fixturePath} | tr -d '\n' | sha256sum | awk '{ print "0x"$1 }'`;
  const unixCommandHash = execSync(unixCommand, { encoding: 'utf8' }).trim();

  expect(hash).toBe(unixCommandHash);
});
