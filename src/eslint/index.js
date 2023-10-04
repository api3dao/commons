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
    'plugin:@typescript-eslint/recommended-type-checked',
    'plugin:@typescript-eslint/stylistic-type-checked',
    'plugin:react/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'next/core-web-vitals', // https://nextjs.org/docs/basic-features/eslint
    'plugin:unicorn/recommended',
    'plugin:promise/recommended',
  ],
  plugins: [
    '@typescript-eslint',
    'react',
    'deprecation',
    'functional',
    'prefer-arrow',
    'unicorn',
    'check-file',
    'promise',
  ],
  rules: {
    /* Rule definitions and overrides for standard eslint rules */
    camelcase: 'error',
    'capitalized-comments': ['error', 'always', { ignoreConsecutiveComments: true }],
    curly: ['error', 'multi-line', 'consistent'],
    eqeqeq: 'error',
    'multiline-comment-style': ['error', 'separate-lines'],
    // There are two (imho equally valid) ways to add a short comment. Either inline or directly above the code. The
    // former is nicer when the comment is short, the latter reads better when the comment is longer and is split into
    // multiple lines.
    'no-await-in-loop': 'off', // Too restrictive, often false yields to more verbose code.
    'no-console': ['error', { allow: ['info', 'groupCollapsed', 'groupEnd'] }],
    'no-constant-condition': 'off', // Writing a while(true) loop is often the most readable way to express the intent.
    'no-fallthrough': 'off', // Does not work well with typescript exhaustive enums.
    'no-inline-comments': 'off',
    'no-lonely-if': 'error',
    'no-nested-ternary': 'error',
    'no-new-wrappers': 'error',
    'no-return-await': 'off', // Superceded by @typescript-eslint/return-await
    'no-unused-expressions': 'off', // Superceded by @typescript-eslint/no-unused-expressions
    'object-shorthand': 'error',
    'prefer-destructuring': [
      'error',
      {
        array: false, // For arrays it is often confusing to use destructuring.
        object: true,
      },
      {
        enforceForRenamedProperties: false,
      },
    ],
    'prefer-exponentiation-operator': 'error',
    'prefer-named-capture-group': 'error',
    'prefer-object-spread': 'error',
    'prefer-spread': 'error',
    'prefer-template': 'error',
    radix: 'error',
    // Sort keys does not have a fixer, but sorting lines can be trivially done by IDE (or some plugin). This rule has a
    // nice configuration option "minKeys" which can specify how many keys should be present in an object before sorting
    // is enforced. This is useful for small objects, where sorting is not necessary. Also, it allows creating groups
    // (separated by newlines) which are sorted independently.
    'sort-keys': ['error', 'asc', { caseSensitive: true, natural: true, minKeys: 10, allowLineSeparatedGroups: true }],
    'spaced-comment': [
      'error',
      'always',
      {
        line: {
          markers: ['/'],
        },
      },
    ],

    /* Rules to setup enforcement of arrow functions over regular functions */
    'prefer-arrow/prefer-arrow-functions': [
      'error',
      {
        disallowPrototype: true,
        singleReturnOnly: false,
        classPropertiesAllowed: false,
      },
    ],

    /* Rules to enforce kebab-case folder structure */
    'check-file/folder-naming-convention': [
      'error',
      {
        '**/': 'KEBAB_CASE',
        'mocks/*/': 'KEBAB_CASE',
      },
    ],
    'unicorn/filename-case': [
      'error',
      {
        case: 'kebabCase',
        ignore: [],
      },
    ],

    /* Rule overrides for "unicorn" plugin */
    'unicorn/no-abusive-eslint-disable': 'off', // Already covered by different ruleset.
    'unicorn/no-array-reduce': 'off', // We are OK with using reduce occasionally, but I agree with the author that the code using reduce can easily get complex.
    'unicorn/no-nested-ternary': 'off', // This rule is smarter than the standard eslint rule, but conflicts with prettier so it needs to be turned off. Nested ternaries are very unreadable so it's OK if all of them are flagged.
    'unicorn/no-null': 'off', // We use both null and undefined for representing three state objects. We could use a string union instead, but using combination of null and undefined is less verbose.
    'unicorn/no-useless-undefined': ['error', { checkArguments: false }], // We need to disable "checkArguments", because if a function expects a value of type "T | undefined" the undefined value needs to be passed explicitly.
    'unicorn/prefer-module': 'off', // We use CJS for configuration files and tests. There is no rush to migrate to ESM and the configuration files are probably not yet ready for ESM yet.
    'unicorn/prevent-abbreviations': 'off', // This rule reports many false positives and leads to more verbose code.

    /* Rule overrides for "import" plugin */
    'import/no-default-export': 'error',
    'import/no-duplicates': 'error',
    'import/no-named-as-default': 'off',
    'import/order': [
      'error',
      {
        // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/order.md
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
        // Make react first
        pathGroups: [
          {
            pattern: 'react',
            group: 'builtin',
            position: 'before',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
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
    '@typescript-eslint/comma-dangle': 'off', // Conflicts with prettier.
    '@typescript-eslint/consistent-type-exports': [
      'error',
      {
        fixMixedExportsWithInlineTypeSpecifier: true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': [
      'error',
      {
        prefer: 'type-imports',
        disallowTypeAnnotations: false, // It is quite common to do so. See: https://typescript-eslint.io/rules/consistent-type-imports/#disallowtypeannotations.
        fixStyle: 'inline-type-imports',
      },
    ],
    '@typescript-eslint/explicit-function-return-type': 'off', // Prefer inferring types to explicit annotations.
    '@typescript-eslint/explicit-module-boundary-types': 'off', // We export lot of functions in order to test them. Typing them all is not a good idea.
    '@typescript-eslint/indent': 'off', // Conflicts with prettier.
    '@typescript-eslint/init-declarations': 'off', // Too restrictive, TS is able to infer if value is initialized or not. This pattern does not work with declaring a variable and then initializing it conditionally (or later).
    '@typescript-eslint/lines-around-comment': 'off', // Do not agree with this rule.
    '@typescript-eslint/member-delimiter-style': 'off', // Conflicts with prettier.
    '@typescript-eslint/member-ordering': 'off', // Does not have a fixer. Also, sometimes it's beneficial to group related members together.
    '@typescript-eslint/naming-convention': 'off',
    '@typescript-eslint/no-confusing-void-expression': [
      'error',
      {
        ignoreArrowShorthand: true, // See: https://typescript-eslint.io/rules/no-confusing-void-expression/#ignorearrowshorthand
      },
    ],
    '@typescript-eslint/no-empty-function': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/no-explicit-any': 'off', // Using any is sometimes necessary.
    '@typescript-eslint/no-extra-parens': 'off', // Conflicts with prettier.
    '@typescript-eslint/no-magic-numbers': 'off', // Too restrictive. There is often nothing wrong with inlining numbers.
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          arguments: false, // It's common to pass async function where one expects a function returning void.
          attributes: false, // It's common to pass async function where one expects a function returning void.
        },
      },
    ],
    '@typescript-eslint/no-non-null-assertion': 'off', // Too restrictive. The inference is often not powerful enough or there is not enough context.
    '@typescript-eslint/no-require-imports': 'off', // We use a similar rule called "@typescript-eslint/no-var-imports" which bans require imports alltogether.
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'react',
            importNames: ['default'],
            message:
              'There is no need to import React globally starting from version 17. Use named imports when a specific React API is needed.',
          },
        ],
        patterns: [
          {
            group: ['lodash/*'],
            message: "Please use named imports from 'lodash'.",
          },
          {
            group: ['date-fns/*'],
            message: "Please use named imports from 'date-fns'.",
          },
        ],
      },
    ],
    '@typescript-eslint/no-shadow': 'off', // It is often valid to shadow variable (e.g. for the lack of a better name).
    '@typescript-eslint/no-unnecessary-condition': 'off', // Suggests removing useful conditionals for index signatures and arrays. Would require enabling additional strict checks in TS, which is hard to ask.
    '@typescript-eslint/no-unsafe-argument': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/no-unsafe-assignment': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/no-unsafe-member-access': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/no-unsafe-return': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', vars: 'all' }],
    '@typescript-eslint/no-use-before-define': 'off', // Too restrictive, does not have a fixer and is not important.
    '@typescript-eslint/object-curly-spacing': 'off', // Conflicts with prettier.
    '@typescript-eslint/prefer-nullish-coalescing': [
      'error',
      {
        ignoreConditionalTests: true, // Its more intuitive to use logical operators in conditionals.
      },
    ],
    '@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too restrictive, often false yields to more verbose code.
    '@typescript-eslint/quotes': 'off', // Conflicts with prettier.
    '@typescript-eslint/semi': 'off', // Conflicts with prettier.
    '@typescript-eslint/space-before-function-paren': 'off', // Conflicts with prettier.
    '@typescript-eslint/strict-boolean-expressions': 'off', // While the rule is reasonable, it is often convenient and intended to just check whether the value is not null or undefined. Enabling this rule would make the code more verbose. See: https://typescript-eslint.io/rules/strict-boolean-expressions/

    /* Rule overrides for "functional" plugin */
    'functional/no-classes': 'error', // Functions are all we need.
    'functional/no-promise-reject': 'error',
    'functional/no-try-statements': 'error', // Use go utils instead.
    'functional/prefer-tacit': 'error',

    /* Rule overrides for other plugins and rules */
    // This rule unfortunately does not detect deprecated properties. See:
    // https://github.com/gund/eslint-plugin-deprecation/issues/13/
    'deprecation/deprecation': 'error',
  },
  overrides: [
    // Next.js expects default exports in pages directory. See: https://stackoverflow.com/a/73470605.
    {
      files: ['pages/**/*'],
      rules: {
        'import/no-default-export': 'off',
        'import/prefer-default-export': 'error',
      },
    },
    // Overrides for Jest tests.
    {
      files: ['**/*.test.ts', '**/*.test.tsx'],
      env: {
        jest: true,
      },
      plugins: ['jest'],
      extends: ['plugin:jest/all', 'plugin:jest-formatting/recommended'],
      rules: {
        'jest/prefer-expect-assertions': 'off', // Enabling this option would result in excessively verbose code.
        'jest/prefer-each': 'off', // We prefer the traditional for loop.
        'jest/require-top-level-describe': 'off', // This is not a good pattern. There is nothing wrong with having multiple top level describe blocks or tests.
        'jest/max-expects': 'off', // It's good to limit the number of expects in a test, but this rule is too strict.
        'jest/valid-title': 'off', // Prevents using "<function-name>.name" as a test name
      },
    },
  ],
};
