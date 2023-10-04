const universalRestrictedImportsConfig = {
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
