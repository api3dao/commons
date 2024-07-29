# commons

> Common utilities, modules and configurations used in API3 projects.

The commons library is meant to stop "reinventing the wheel". It holds the canonical implementations that can be
imported in other packages. This way we ensure that all package use the same logic, simplify bug fixes and avoid code
duplication. The package is cross platform and can be used in Node.js and browser.

The commons library is a collection of multiple modules, with each module having its own README that you can refer to.

## Getting started

```sh
# Feel free to use your favorite package manager
pnpm i @api3/commons
```

Read the documentation and sources of each module how to use it in the project.

## Modules

- [blockchain-utilities](./src/blockchain-utilities/README.md)
- [config-hash](./src/config-hash/README.md)
- [config-parsing](./src/config-parsing/README.md)
- [http](./src/http/README.md)
- [logger](./src/logger/README.md)
- [processing](./src/processing/README.md)
- [run-in-loop](./src/run-in-loop/README.md)
- [utils](./src/utils/README.md)

## Using the package in universal context

Some modules may be used only in both browser and Node.js context and some are Node.js only. To support this
requirement, we use different entrypoints for each context. Note, there is no support for browser-only modules.

The bundler or Node.js picks up the right entrypoint automatically, but bear in mind that only a subset of modules is
available when using universal modules. If you use TypeScript, it may not pick up the correct types. You can set these
manually, by adding the following to your `tsconfig.json`:

```json
"compilerOptions": {
  "paths": {
    "@api3/commons": ["./node_modules/@api3/commons/dist/universal-index.d.ts"]
  }
}
```

## Related repositories

- [chains](https://github.com/api3dao/chains)
- [contracts](https://github.com/api3dao/contracts)
- [eslint-plugin-commons](https://github.com/api3dao/eslint-plugin-commons)
- [ois](https://github.com/api3dao/ois)
- [promise-utils](https://github.com/api3dao/promise-utils)

## For developers

Please refer to the [developer instructions](./dev-README.md) for details.
