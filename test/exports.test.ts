import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@jest/globals';

const getExports = (filename: string) => {
  return readFileSync(join(__dirname, '../src', filename), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('export * from'))
    .map((line) => line.split("'./")[1]!.split("';")[0]!);
};

test('all modules are exported', () => {
  const srcModules = readdirSync(join(__dirname, '../src'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .sort();
  const universalExports = getExports('universal-index.ts');
  // Node imports all universal exports, so it needs to be excluded.
  const nodeExports = getExports('node-index.ts').filter((exp) => exp !== 'universal-index');
  const allExports = [...nodeExports, ...universalExports].sort();

  expect(srcModules).toStrictEqual(allExports);
});
