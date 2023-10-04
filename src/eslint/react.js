// eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/unbound-method
const { merge } = require('lodash');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { universalRestrictedImportsConfig, universalImportOrderConfig } = require('./internal');

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
  extends: ['plugin:react/recommended'],
  plugins: ['react', '@typescript-eslint', 'import'],
  rules: {
    'import/order': [
      'error',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      merge({}, universalImportOrderConfig, {
        // Make react import first
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
        ],
      }),
    ],

    /* Rule overrides for "react" plugin */
    'react/destructuring-assignment': ['error', 'always', { destructureInSignature: 'ignore' }],
    'react/function-component-definition': 'off', // Arrow functions are enforced globally by different rules.
    'react/hook-use-state': 'error',
    'react/jsx-boolean-value': 'error',
    'react/jsx-child-element-spacing': 'error',
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-fragments': 'error',
    'react/jsx-no-useless-fragment': 'error',
    'react/jsx-sort-props': 'off', // Event though it has an automatic fixer, it's not bulletproof and does not handle inline comments (written above the jsx prop). In practice, sorting the JSX props is not an issue, since components rarely have too many props.
    'react/no-object-type-as-default-prop': 'error',
    'react/no-unescaped-entities': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/self-closing-comp': [
      'error',
      {
        component: true,
        html: true,
      },
    ],
    'react/void-dom-elements-no-children': 'error',

    /* Rule overrides for "@typescript-eslint" plugin */
    '@typescript-eslint/no-restricted-imports': [
      'error',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      merge({}, universalRestrictedImportsConfig, {
        paths: [
          {
            name: 'react',
            importNames: ['default'],
            message:
              'There is no need to import React globally starting from version 17. Use named imports when a specific React API is needed.',
          },
        ],
      }),
    ],
  },
};
