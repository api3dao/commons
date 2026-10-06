const path = require('node:path');

const commons = require('@api3/eslint-plugin-commons');
const { includeIgnoreFile } = require('eslint/config');

const assertFunctionNames = ['expect*', 'assertGoSuccess', 'assertGoError', 'assertType'];

module.exports = [
  includeIgnoreFile(path.resolve(__dirname, '.gitignore')),
  ...commons.configs.universal,
  ...commons.configs.jest,
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  },
  {
    files: ['**/*.{js,ts}'],
    rules: {
      'lodash/import-scope': ['error', 'method'],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'jest/prefer-ending-with-an-expect': ['error', { assertFunctionNames }],
      'jest/expect-expect': ['warn', { assertFunctionNames }],
    },
  },
  {
    files: ['package.json'],
    rules: {
      // TS consumers using the "node10" module resolution ignore "exports" and find the types via "main".
      'package-json/prefer-exports': 'off',
    },
  },
];
