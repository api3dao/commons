# Release Scripts

The following scripts are exposed for use:

## tagAndRelease

This script creates a Git tag and Github release when the `version` field of `package.json` is changed. It is expected
to be run as part of a [CI workflow](../../.github/workflows/main.yml) that also publishes to npm.

Git tags and releases are created with the following naming scheme: `v1.2.3`. i.e. a `v` is prepended to the version
defined in `package.json`.

### Usage

It is recommended to 1) create a script that imports and uses the `tagAndRelease` function as demonstrated below, 2)
define a script in `package.json`, and then 3) call that script as part of the CI process.

```ts
// The following environment variable is expected. See the script itself for more details
//
//   GH_ACCESS_TOKEN - created through the Github UI with relevant permissions to the repo. See the tag-and-release source for more information

// scripts/tag-and-release.ts
import { join } from 'node:path';

import { tagAndRelease } from '@api3/commons';

const main = async () => {
  const packageJsonPath = join(__dirname, '../package.json'); // the script is one level deep in the repo
  await tagAndRelease('my-repo-name', packageJsonPath, 'optional-branch-name-if-not-main');
};

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.info(error);
    process.exitCode = 1;
  });

// package.json
{
  "scripts": {
    "release:tag": "ts-node scripts/tag-and-release.ts",
  }
}
```

It's also recommended to setup a step in CI that checks if the Git tag already exists before executing.

```yml
# NOTE: irrelevant names and steps have been omitted such cloning, installing dependencies etc.
tag-and-release:
  # Only tag and release on pushes to main (or the release branch)
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  steps:
    - name: Clone repo
    - name: Install pnpm
    - name: Setup Node
    - name: Install Dependencies
    # Configure the Git user
    - name: Configure Git credentials
      run: |
        git config --global user.name '${{ secrets.GH_USER_NAME }}'
        git config --global user.email '${{ secrets.GH_USER_EMAIL }}'
    # Get the version as defined in package.json
    - name: Get package.json version
      id: get-version
      run: echo "version=$(cat package.json | jq -r '.version' | sed 's/^/v/')" >> $GITHUB_OUTPUT
    # Check if a Git tag already exists with the pattern: `v{version}`
    - name: Validate tag
      id: validate-tag
      run:
        test "$(git tag -l '${{ steps.get-version.outputs.version }}' | awk '{print $NF}')" = "${{
        steps.get-version.outputs.version }}" || echo "new-tag=true" >> $GITHUB_OUTPUT
    # Run the tag-and-release script only if the tag does *not* already exist
    - name: Tag and release on Github
      if: ${{ steps.validate-tag.outputs.new-tag }}
      run: pnpm run release:tag
      env:
        GH_ACCESS_TOKEN: ${{ secrets.GH_ACCESS_TOKEN }}
```
