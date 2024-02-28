module.exports = {
  extends: ['./src/eslint/universal', './src/eslint/jest'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
  rules: {
    // Because some of the modules might be used in browser, prefer import-scope method.
    'lodash/import-scope': ['error', 'method'],
  },
};
