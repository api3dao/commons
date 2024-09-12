import { join } from 'node:path';

import { tagAndRelease } from '../src/release-scripts';

const main = async () => {
  await tagAndRelease('commons', join(__dirname, '../package.json'));
};

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.info(error);
    process.exitCode = 1;
  });
