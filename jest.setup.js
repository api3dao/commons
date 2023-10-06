// Sometimes Jest can have issues when trying to spy on an internal module. Import
// and use this function as a workaround at the top of your test.
//
// Credit: https://github.com/facebook/jest/issues/6914#issuecomment-654710111
const { defineProperty } = Object;

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
Object.defineProperty = function (object, name, meta) {
  if (meta.get && !meta.configurable) {
    // It might be an ES6 exports object
    return defineProperty(object, name, {
      ...meta,
      configurable: true, // Prevent freezing
    });
  }

  return defineProperty(object, name, meta);
};

// Disable logger if it is not explicitly set to true.
process.env.LOGGER_ENABLED = process.env.LOGGER_ENABLED ?? 'false';
