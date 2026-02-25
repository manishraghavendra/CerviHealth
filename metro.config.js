// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);
defaultConfig.resolver.sourceExts.push('cjs');

// This is the critical line that fixes the "Component auth has not been registered yet" error
defaultConfig.resolver.unstable_enablePackageExports = false;

module.exports = defaultConfig;