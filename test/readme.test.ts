import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

test('provides README links to all modules', () => {
  // Parse the README file and extract the list of modules
  const readme = readFileSync(join(__dirname, '../README.md'), 'utf8');
  const readmeModules = readme.split('## Modules')[1]!.split('## Using the package in universal context')[0]!.trim();

  // Parse the source code and extract the list of modules
  const srcModules = readdirSync(join(__dirname, '../src'), { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
  const expectedReadmeLinks = srcModules.map((module) => `- [${module}](./src/${module}/README.md)`).join('\n');

  expect(readmeModules).toStrictEqual(expectedReadmeLinks);
});
