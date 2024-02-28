// eslint-disable-next-line @typescript-eslint/no-var-requires, lodash/import-scope
const { merge } = require('lodash');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { universalRestrictedImportsConfig, universalImportOrderConfig } = require('./internal');

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
      version: 'detect', // Automatically detect the version of React.
    },
  },
  env: {
    node: true,
    browser: true,
  },
  extends: ['plugin:react/all', 'plugin:react-hooks/recommended'],
  plugins: ['react', '@typescript-eslint', 'import', 'lodash'],
  rules: {
    'import/order': [
      'error',
      merge({}, universalImportOrderConfig, {
        // Prioritize react imports.
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
        ],
      }),
    ],
    /* Overrides for "react" plugin */
    'react/destructuring-assignment': ['error', 'always', { destructureInSignature: 'ignore' }],
    'react/forbid-component-props': ['error', { forbid: [] }],
    'react/forbid-dom-props': ['error', { forbid: [] }],
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-curly-newline': 'off', // Conflicts with prettier.
    'react/jsx-filename-extension': 'off', // We use .tsx extension.
    'react/jsx-handler-names': 'off',
    'react/jsx-indent': 'off', // Conflicts with prettier.
    'react/jsx-indent-props': 'off', // Conflicts with prettier.
    'react/jsx-max-depth': 'off', // Conflicts with prettier.
    'react/jsx-max-props-per-line': 'off', // Conflicts with prettier.
    'react/jsx-newline': 'off', // Conflicts with prettier.
    'react/jsx-no-bind': 'off', // Conflicts with prettier.
    'react/jsx-no-leaked-render': 'off',
    'react/jsx-no-literals': 'off',
    'react/jsx-one-expression-per-line': 'off', // Conflicts with prettier.
    'react/jsx-props-no-spreading': 'off',
    'react/jsx-sort-props': 'off',
    'react/no-multi-comp': 'off',
    'react/no-unescaped-entities': 'off',
    'react/no-unused-prop-types': 'off',
    'react/prefer-read-only-props': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/require-default-props': 'off',
    'react/self-closing-comp': ['error', { component: true, html: true }],
    'react/void-dom-elements-no-children': 'error',

    /* Overrides for "@typescript-eslint" plugin */
    '@typescript-eslint/no-restricted-imports': [
      'error',
      merge({}, universalRestrictedImportsConfig, {
        paths: [
          {
            name: 'react',
            importNames: ['default'],
            message:
              'Starting from React version 17, there is no need to globally import React. Use named imports for specific React APIs.',
          },
        ],
      }),
    ],

    /* Overrides for "lodash" plugin */
    'lodash/import-scope': ['error', 'method'],
  },
};
