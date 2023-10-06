const universalRestrictedImportsConfig = {
  patterns: [
    {
      group: ['date-fns/*'],
      // The date-fns library is tree-shakeable and it's more convenient to use named imports.
      message: "Please use named imports from 'date-fns'.",
    },
  ],
};

const universalImportOrderConfig = {
  // https://github.com/benmosher/eslint-plugin-import/blob/master/docs/rules/order.md
  groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
  'newlines-between': 'always',
  alphabetize: {
    order: 'asc',
    caseInsensitive: true,
  },
};

module.exports = {
  universalRestrictedImportsConfig,
  universalImportOrderConfig,
};
