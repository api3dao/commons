# commons

## Release

TODO: verify

To release a new version follow these steps:

1. `pnpm install && pnpm run build`
2. `pnpm version` and choose the version to be released
3. `pnpm publish --access public`
4. `git push --follow-tags`
