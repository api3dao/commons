module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022, // Enable parsing of modern ECMAScript features.
    ecmaFeatures: {
      jsx: true, // Support JSX syntax.
    },
    sourceType: 'module', // Enable ES6 import/export syntax.
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
    'next/core-web-vitals', // Enforce Next.js performance best practices. See: https://nextjs.org/docs/basic-features/eslint.
  ],
  overrides: [
    {
      files: ['pages/**/*'],
      rules: {
        'import/no-default-export': 'off',
        'import/prefer-default-export': 'error', // Next.js expects default exports in the pages directory.
      },
    },
  ],
};
