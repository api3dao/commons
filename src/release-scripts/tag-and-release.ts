// ########################################################################################
// This script uses the version defined in the root package.json to determine if a
// new Git tag and Github release should be created. The Github release notes are
// generated automatically using the commit information
//
// The following secrets are required:
//
//  1. GH_ACCESS_TOKEN - A "fine-grained personal access token" generated through the
//     Github UI. It seems like these tokens are scoped to a user, rather than an
//     organisation.
//
//     The following minimum permissions are required:
//       Read - access to metadata
//       Read & write - access to actions and code
// #######################################################################################

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

import { go } from '@api3/promise-utils';
import { Octokit } from '@octokit/rest';

const execSyncWithErrorHandling = (command: string) => {
  // eslint-disable-next-line functional/no-try-statements
  try {
    return execSync(command).toString();
  } catch (error: any) {
    console.info(error.message);
    console.info('STDOUT', error.stdout.toString());
    console.info('STDERR', error.stderr.toString());
    process.exit(1);
  }
};

const createGithubRelease = async (repo: string, tagName: `v${string}`) => {
  if (!process.env.GH_ACCESS_TOKEN) {
    console.info(`GH_ACCESS_TOKEN not set. Skipping release creation`);
    return null;
  }
  // Ensure the GH_ACCESS_TOKEN secret is set on Github and has the relevant permissions
  const octokit = new Octokit({ auth: process.env.GH_ACCESS_TOKEN });
  const createRelease = async () =>
    octokit.rest.repos.createRelease({
      owner: 'api3dao',
      repo,
      tag_name: tagName, // eslint-disable-line camelcase
      generate_release_notes: true, // eslint-disable-line camelcase
    });
  console.info(`Creating Github release...`);
  const goRes = await go(createRelease, { totalTimeoutMs: 15_000 });
  if (!goRes.success) {
    // We don't want to fail CI if the release fails to create. This can be done manually through Github's UI
    console.info(`Unable to create Github release`);
    console.info(goRes.error.message);
    return null;
  }
  return goRes.data;
};

export const tagAndRelease = async (repo: string, packageJsonPath: string, branch: string = 'main') => {
  console.info('Ensuring working directory is clean...');
  const gitStatus = execSyncWithErrorHandling('git status --porcelain');
  if (gitStatus !== '') throw new Error('Working directory is not clean');

  console.info(`Ensuring we are on the ${branch} branch...`);
  const currentBranch = execSyncWithErrorHandling('git branch --show-current');
  if (currentBranch !== `${branch}\n`) throw new Error(`Not on the ${branch} branch`);

  console.info('Ensuring we are up to date with the remote...');
  execSyncWithErrorHandling('git fetch');

  const gitDiff = execSyncWithErrorHandling(`git diff origin/${branch}`);
  if (gitDiff !== '') throw new Error('Not up to date with the remote');

  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as any;
  const { version } = packageJson;
  console.info(`Version set to ${version}...`);

  const gitTag = execSyncWithErrorHandling(`git tag -l '*v${version}*'`);
  if (gitTag !== '') throw new Error(`git tag v${version} already exists`);

  console.info('Creating new annotated git tag...');
  execSyncWithErrorHandling(`git tag -a v${version} -m "v${version}"`);

  console.info('Pushing git tag...');
  // NOTE: in order to push, a valid access token is expected as GH_ACCESS_TOKEN
  execSyncWithErrorHandling(`git push origin v${version} --no-verify`);

  await createGithubRelease(repo, `v${version}`);

  console.info(`Done!`);
};
