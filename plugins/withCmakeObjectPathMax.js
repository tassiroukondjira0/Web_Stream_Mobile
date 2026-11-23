const { withGradleProperties } = require('@expo/config-plugins');

const PROPERTY_KEY = 'expo.android.cmakeObjectPathMax';
// CMake requires a value >= 128. Using 128 (minimum valid) to keep object paths short
// and avoid exceeding Windows MAX_PATH (260 chars) for projects in deep directories.
const PROPERTY_VALUE = '128';

/**
 * Réduit la longueur maximale des chemins d'objets CMake sous Windows.
 *
 * Sans ça, un projet situé dans un dossier profond (ex:
 * C:\Users\<user>\Downloads\Programs\<app>) génère des chemins de la forme
 * `.../.cxx/Debug/<hash>/arm64-v8a/CMakeFiles/worklets.dir/C_/Users/...` qui
 * dépassent MAX_PATH, et ninja échoue avec :
 *   ninja: error: mkdir(...): No such file or directory
 *
 * @type {import('@expo/config-plugins').ConfigPlugin}
 */
module.exports = function withCmakeObjectPathMax(config) {
  if (process.platform !== 'win32') {
    return config;
  }

  return withGradleProperties(config, (cfg) => {
    const properties = cfg.modResults;
    const existing = properties.find(
      (item) => item.type === 'property' && item.key === PROPERTY_KEY
    );

    if (existing) {
      existing.value = PROPERTY_VALUE;
    } else {
      properties.push({
        type: 'property',
        key: PROPERTY_KEY,
        value: PROPERTY_VALUE,
      });
    }

    return cfg;
  });
};
