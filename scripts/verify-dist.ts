// Verifies that the built package loads in both module systems. The build is the only place where the ESM and CJS
// outputs differ, so this spawns real Node.js processes instead of relying on the test runner.

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const distDirectory = join(__dirname, '../dist');

// A sample of exports from every module of the given entrypoint. If one of these is missing, the module was dropped or
// mangled by the bundler.
const entrypoints = {
  'universal-index': [
    'deriveBeaconId', // blockchain-utilities
    'executeRequest', // http
    'go', // promise-utils
    'runInLoop', // run-in-loop
    'sleep', // utils
  ],
  'node-index': [
    'createLogger', // logger
    'go', // promise-utils (re-exported through universal-index)
    'interpolateSecretsIntoConfig', // config-parsing
    'serializePlainObject', // config-hash
    'tagAndRelease', // release-scripts
    'unsafeEvaluate', // processing
  ],
};

const listExports = (format: 'cjs' | 'esm', entrypoint: string) => {
  const path = join(distDirectory, format, `${entrypoint}.js`);
  const code =
    format === 'cjs'
      ? `console.log(JSON.stringify(Object.keys(require(${JSON.stringify(path)}))))`
      : `const module = await import(${JSON.stringify(pathToFileURL(path).href)}); console.log(JSON.stringify(Object.keys(module)))`;
  const args = format === 'cjs' ? ['-e', code] : ['--input-type=module', '-e', code];

  return (JSON.parse(execFileSync(process.execPath, args, { encoding: 'utf8' })) as string[]).sort();
};

const assert = (condition: boolean, message: string) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  for (const [entrypoint, expectedExports] of Object.entries(entrypoints)) {
    const cjsExports = listExports('cjs', entrypoint);
    const esmExports = listExports('esm', entrypoint);

    for (const expectedExport of expectedExports) {
      assert(cjsExports.includes(expectedExport), `CJS ${entrypoint} is missing the "${expectedExport}" export`);
      assert(esmExports.includes(expectedExport), `ESM ${entrypoint} is missing the "${expectedExport}" export`);
    }
    assert(
      JSON.stringify(cjsExports) === JSON.stringify(esmExports),
      `The CJS and ESM builds of ${entrypoint} do not export the same names`
    );

    console.info(`OK ${entrypoint}: ${cjsExports.length} exports load in both CJS and ESM`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.info(error);
    process.exitCode = 1;
  });
