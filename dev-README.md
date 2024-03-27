# Developer instructions

This document contains instructions for developers working on the `@api3/commons` package.

## Getting started

```sh
# To install dependencies
pnpm i
# To run tests
pnpm test
```

Inspect the `package.json` for more scripts.

## Release

To release a new version follow these steps:

1. `git checkout main && git pull` - Always publish from up to date `main` branch. Also, ensure that the working
   directory is clean (has no uncommitted changes).
2. `pnpm version [major|minor|patch]` - Choose the right version bump. This will bump the version, create a git tag and
   commit it.
3. `pnpm publish --access public` - Build the package and publish the new version to NPM.
4. `git push --follow-tags` - Push the tagged commit upstream. If you don't have access to push directly to main branch,
   create a separate branch and open a PR. This PR must be merged using the "Rebase and merge" strategy to preserve the
   git tag.
5. Create a new [release on GitHub](https://github.com/api3dao/commons/releases). Use the "Generate release notes"
   feature to generate the release notes from the PR titles.

## Adding new common utility

1. Create a new directory in `src` with the name of the utility.
2. Create `index.ts` file in the directory. This file will be the entry point for the utility.
3. Re-export the new utility from `universal-index.ts` or `node-index.ts` file.
4. Create a `README.md` with documentation.

## Testing the package locally

It is preferred (simpler and faster) to test the package using the `file:` protocol.

1. Implement some changes and run `pnpm run build` to build the commons package.
2. In some other project, specify `file:<RELATIVE_PATH_TO_COMMONS>`. For example: `"@api3/commons": "file:../commons"`.
3. Re-install the dependencies in the project (doesn't matter what package manager you use). For example: `pnpm i`.

You can repeat the above steps as many times as you want. The package will be re-installed from the local directory with
the locally built content.

### Using Verdaccio

The common pattern is to move some part of implementation to commons and then use it in some other repo. It is valuable
to see whether nothing broke in the process (before publishing the package). You can use
[verdaccio](https://verdaccio.org/).

1. Start verdaccio (either as a docker service or directly on host machine). See:
   https://verdaccio.org/docs/installation.
2. Implement and commit your changes. You should have a clean working tree.
3. `pnpm version minor --no-git-tag-version` - Will bump the `package.json` version. Feel free to replace `minor` with a
   `path` or `major` if necessary.
4. `pnpm publish --access public --registry http://localhost:4873 --no-git-checks` - Will do the publishing to the local
   registry. It will disable git checks (which ensure that the working tree is clean).
5. You can now install the package in the target repository. Use
   `pnpm add @api3/commons --registry http://localhost:4873`.

Tip: To unpublish a package from the local registry, you can just remove verdaccio storage. On my machine it can be done
via `rm -rf $HOME/.local/share/verdaccio/storage`.
