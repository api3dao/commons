# eslint

The config suppport universal ESlint linting with the following targets:

- nodejs services
- react web apps
- nextjs
- jest

By default prefer named exports. It is often common for react applications to use default exports. So feel free to
override this:

```jsonc
{
  "rules": {
    "import/no-default-export": "off",
    "import/prefer-default-export": "error"
  }
}
```

TODO:

Use:

```sh
eslint --report-unused-disable-directives --cache --ext js,ts,tsx,jsx . --max-warnings 0
```

// NOTE: The file is intentionally written in JS so it can be used to lint the project itself.

TODO: add a note about config overrides

TODO: need to set:

```
  parserOptions: {
    project: ['./tsconfig.json'],
  }
```

TODO: Mentioon that we need to load plugins via relative paths from node_modules, because of

https://github.com/eslint/eslintrc/blob/242d569020dfe4f561e4503787b99ec016337457/lib/config-array-factory.js#L920
