module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022, // Allows for the parsing of modern ECMAScript features
    ecmaFeatures: {
      jsx: true,
    },
    sourceType: 'module', // Allows for the use of imports
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    node: true,
    browser: true,
  },
  extends: [
    'next/core-web-vitals', // https://nextjs.org/docs/basic-features/eslint
  ],
  overrides: [
    // Next.js expects default exports in pages directory. See: https://stackoverflow.com/a/73470605.
    {
      files: ['pages/**/*'],
      rules: {
        'import/no-default-export': 'off',
        'import/prefer-default-export': 'error',
      },
    },
  ],
};
