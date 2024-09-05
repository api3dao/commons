import { tagAndRelease } from '../src/release-scripts';

const main = async () => {
  await tagAndRelease('commons');
};

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.info(error);
    process.exitCode = 1;
  });
