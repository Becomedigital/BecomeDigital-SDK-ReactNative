module.exports = {
  preset: 'react-native',
  transformIgnorePatterns: ['node_modules/(?!((@)?react-native|react-native-safe-area-context)/)'],
  modulePathIgnorePatterns: ['<rootDir>/ios/', '<rootDir>/android/', '<rootDir>/artifacts/', '<rootDir>/vendor/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  watchman: false,
};
