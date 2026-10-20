const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('node:path');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    blockList: ['artifacts', 'vendor', 'ios/Pods', 'ios/DerivedData', 'ios/build', 'android/.gradle', 'android/.kotlin', 'android/build', 'android/app/.cxx', 'android/app/build'].map(dir =>
      new RegExp('^' + path.resolve(__dirname, dir).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[/\\\\]'),
    ),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
