# commons

> Common utilities, modules and configurations used in API3 projects.

The commons library is meant to stop "reinventing the wheel". It holds the canonical implementations that can be
imported in other packages. This way we ensure that all package use the same logic, simplify bug fixes and avoid code
duplication.

The commons library is a single repo and a collection of multiple modules:

- [`eslint`](./src/eslint/README.md) - The configrations for ESLint.

Read the documentation of each module for more information.

## Related repositories

- [promise-utils](https://github.com/api3dao/promise-utils)
- [ois](https://github.com/api3dao/ois)
- [chains](https://github.com/api3dao/chains)
- [contracts](https://github.com/api3dao/contracts)

## Getting started

```sh
# Feel free to use your favorite package manager
pnpm add @api3/commons
```

Read the documentation of each module how to use it in the project.

### Import paths

We want the consumers to import common utilities like this:

```ts
import { createLogger } from '@api3/commons/logger';
// and not like this
import { createLogger } from '@api3/commons/dist/logger';
```

This is done via `package.json` field called [exports](https://nodejs.org/api/packages.html#package-entry-points). This
field works for both CJS and ESM starting from Node version 12. In order for TS to support this, you need to make sure
you use `moduleResolution` and `module` set to `Node16` inside `tsconfig.json`.

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "Node16",
    "moduleResolution": "Node16"
  }
}
```

## Release

To release a new version follow these steps:

1. `git checkout main` - Always publish from `main` branch. Also, ensure that the working directory is clean (has no
   uncommitted changes).
2. `pnpm version [major|minor|patch]` - Choose the right version bump. This will bump the version, create a git tag and
   commit it.
3. `pnpm publish --access public` - Publish the new version to NPM.
4. `git push --follow-tags` - Push the tagged commit upstream.

## Development notes

### Adding new common utility

1. Create a new directory in `src` with the name of the utility.
2. Create `index.ts` file in the directory. This file will be the entry point for the utility.
3. Add the new utility to `package.json` `exports` field. See
   [exports](https://nodejs.org/api/packages.html#package-entry-points) for more information.
4. Create a `README.md` with documentation.

### Working with verdaccio

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
