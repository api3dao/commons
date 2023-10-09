module.exports = {
  extends: ['./src/eslint/universal', './src/eslint/jest'],
  parserOptions: {
    project: ['./tsconfig.json'],
  },
};
