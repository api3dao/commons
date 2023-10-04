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
eslint --report-unused-disable-directives --cache --ext js,ts,tsx . --max-warnings 0
```
