module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  env: {
    node: true,
    browser: true,
  },
  // Files can only be specified under overrides, so we move the whole configuration there.
  overrides: [
    {
      files: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx'],
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
        'jest/valid-title': 'off', // Prevents using "<function-name>.name" as a test name.
        'jest/no-hooks': [
          'error', // Prefer using setup functions instead of beforeXXX hooks. AfterXyz are sometimes necessary (e.g. to reset Jest timers).
          {
            allow: ['afterEach', 'afterAll'],
          },
        ],
      },
    },
  ],
};
