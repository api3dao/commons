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

## Release

To release a new version follow these steps:

1. `git checkout main` - Always publish from `main` branch. Also, ensure that the working directory is clean (has no
   uncommitted changes).
2. `pnpm version [major|minor|patch]` - Choose the right version bump. This will bump the version, create a git tag and
   commit it.
3. `pnpm publish --access public` - Publish the new version to NPM.
4. `git push --follow-tags` - Push the tagged commit upstream.
