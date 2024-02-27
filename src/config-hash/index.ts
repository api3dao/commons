import { createHash } from 'node:crypto';

import { isObject } from 'lodash';

// We need to make sure the object is stringified in the same way every time, so we sort the keys alphabetically.
export const sortObjectKeysRecursively = (value: any) => {
  if (value === null) return null;
  if (!isObject(value) || Array.isArray(value)) return value;

  const sortedKeys = Object.keys(value).sort();
  const sortedObject: any = {};

  for (const key of sortedKeys) {
    sortedObject[key] = sortObjectKeysRecursively((value as any)[key]);
  }

  return sortedObject;
};

export const serializePlainObject = (plainObject: any) => {
  const sortedObject = sortObjectKeysRecursively(plainObject);
  return JSON.stringify(sortedObject);
};

export const createSha256Hash = (value: string) => createHash('sha256').update(value).digest('hex');
