// This resolver forces Jest to use the CommonJS version of uuid
module.exports = (path, options) => {
  return options.defaultResolver(path, {
    ...options,
    packageFilter: (pkg) => {
      // Workaround for uuid ESM-only structure
      if (pkg.name === 'uuid') {
        delete pkg['exports'];
        delete pkg['module'];
      }
      return pkg;
    },
  });
};
