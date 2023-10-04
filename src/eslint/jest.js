module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  files: ['**/*.test.ts', '**/*.test.tsx'],
  extends: ['plugin:jest/all', 'plugin:jest-formatting/recommended'],
  plugins: ['jest'],
  rules: {
    'jest/prefer-expect-assertions': 'off', // Enabling this option would result in excessively verbose code.
    'jest/prefer-each': 'off', // We prefer the traditional for loop.
    'jest/require-top-level-describe': 'off', // This is not a good pattern. There is nothing wrong with having multiple top level describe blocks or tests.
    'jest/max-expects': 'off', // It's good to limit the number of expects in a test, but this rule is too strict.
    'jest/valid-title': 'off', // Prevents using "<function-name>.name" as a test name
  },
};
