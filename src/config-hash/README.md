# Config hashing

> Small Node.js module that allows creating a hash from a config object.

This module uses Node.js built-in `crypto` module to access the `sha256` hashing algorithm. A similar functionality can
be achieved in the browser environment using the `SubtleCrypto` API. Open an issue if you need this functionality in
browser.

## Usage

1. Call `serializePlainObject` to uniquely serialize a config file. This functions recursively sorts the properties of
   an object, such that `{a: 1, b: 2}` and `{b: 2, a: 1}` will produce the same result.
2. Call `createSha256Hash` to create a hash from the serialized object.

```ts
const serializedConfig = serializePlainObject(config);
const hash = createSha256Hash(serializedConfig);
```

To simulate the same behavior in UNIX shell, you can use the following command:

```sh
# Assumes jq, tr, sha256sum and awk are available
jq --sort-keys --compact-output . ./file.json | tr -d '\n' | sha256sum | awk '{ print $1 }'
```
