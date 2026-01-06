# Release Scripts

The following scripts are exposed for use:

## tagAndRelease

This script creates a Git tag and Github release for a given version. It is expected to be run as part of CI and only
once for the given version defined in `package.json`.

Git tags and releases are created with the following naming scheme: `v1.2.3`. i.e. a `v` is prepended to the version
defined in `package.json`.

### Usage

It is recommended to:

1. Create a script that imports and uses the `tagAndRelease` function as demonstrated below.
2. Define a `package.json` script that triggers the release.
3. Call that script as part of the CI process.

```ts
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
########################################################################################
# The following secrets are required:
#
# 1. GH_ACCESS_TOKEN - A "fine-grained personal access token" generated through the
#    Github UI. It seems like these tokens are scoped to a user, rather than an
#    organisation.
#
#    The following minimum permissions are required:
#      Read - access to metadata
#      Read & write - access to actions and code
# 2. GH_USER_NAME - The name (not username) associated with the Git user. e.g. John Smith
# 3. GH_USER_EMAIL - The email associated with the Git user
########################################################################################
tag-and-release:
  name: Tag and release
  runs-on: ubuntu-latest
  needs: required-checks-passed
  # Only tag and release on pushes to main
  if: github.event_name == 'push' && github.ref == 'refs/heads/main'
  permissions:
    id-token: write # Required for https://docs.npmjs.com/trusted-publishers
    contents: write # Required for pushing tags and making the GitHub releases
  steps:
    - name: Clone repo
      uses: actions/checkout@v6
      with:
        fetch-depth: 0
    - name: Install pnpm
      uses: pnpm/action-setup@v3
    - name: Setup Node
      uses: actions/setup-node@v6
      with:
        node-version: 24
        registry-url: 'https://registry.npmjs.org'
        cache: 'pnpm'
    - name: Configure Git credentials
      run: |
        git config --global user.name '${{ secrets.GH_USER_NAME }}'
        git config --global user.email '${{ secrets.GH_USER_EMAIL }}'
    - name: Install Dependencies
      run: pnpm install --frozen-lockfile
    - name: Build
      run: pnpm run build
    - name: Get package.json version
      id: get-version
      run: echo "version=$(cat package.json | jq -r '.version' | sed 's/^/v/')" >> $GITHUB_OUTPUT
    - name: Validate tag
      id: validate-tag
      run:
        test "$(git tag -l '${{ steps.get-version.outputs.version }}' | awk '{print $NF}')" = "${{
        steps.get-version.outputs.version }}" || echo "new-tag=true" >> $GITHUB_OUTPUT
    - name: Tag and release on Github
      if: ${{ steps.validate-tag.outputs.new-tag }}
      run: pnpm run release:tag
      env:
        GH_ACCESS_TOKEN: ${{ secrets.GH_ACCESS_TOKEN }}
    - name: Publish to npm
      if: ${{ steps.validate-tag.outputs.new-tag }}
      run: pnpm publish --access public
```
