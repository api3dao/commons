// eslint-disable-next-line @typescript-eslint/no-var-requires
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
  extends: ['plugin:react/all', 'plugin:react-hooks/recommended'],
  plugins: ['react', '@typescript-eslint', 'import'],
  rules: {
    'import/order': [
      'error',
       
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
    'react/forbid-component-props': ['error', { forbid: [] }], // Prefer using Material UI component and "sx" prop for static styles, use "style" for dynamic ones. See: https://stackoverflow.com/a/72527462.
    'react/forbid-dom-props': ['error', { forbid: [] }], // Prefer using Material UI component and "sx" prop for static styles, use "style" for dynamic ones. See: https://stackoverflow.com/a/72527462.
    'react/function-component-definition': 'off', // Arrow functions are enforced globally by different rules.
    'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never', propElementValues: 'always' }],
    'react/jsx-curly-newline': 'off', // Conflicts with prettier.
    'react/jsx-filename-extension': 'off', // We use .tsx files and this rule does not support that.
    'react/jsx-handler-names': 'off', // Too restrictive.
    'react/jsx-indent': 'off', // Conflicts with prettier.
    'react/jsx-indent-props': 'off', // Conflicts with prettier.
    'react/jsx-max-depth': 'off', // Conflicts with prettier.
    'react/jsx-max-props-per-line': 'off', // Conflicts with prettier.
    'react/jsx-newline': 'off', // Conflicts with prettier.
    'react/jsx-no-bind': 'off', // Conflicts with prettier.
    'react/jsx-no-leaked-render': 'off', // The rule is too restrictive (and leads to more verbose code) and reports many false positives.
    'react/jsx-no-literals': 'off', // Too verbose.
    'react/jsx-one-expression-per-line': 'off', // Conflicts with prettier.
    'react/jsx-props-no-spreading': 'off', // Too restrictive.
    'react/jsx-sort-props': 'off', // Event though it has an automatic fixer, it's not bulletproof and does not handle inline comments (written above the jsx prop). In practice, sorting the JSX props is not an issue, since components rarely have too many props.
    'react/no-multi-comp': 'off', // Too restrictive.
    'react/no-unescaped-entities': 'off',
    'react/no-unused-prop-types': 'off', // Reports false positives.
    'react/prefer-read-only-props': 'off', // Too verbose.
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/require-default-props': 'off', // Too restrictive.
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
