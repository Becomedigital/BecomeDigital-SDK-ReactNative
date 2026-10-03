module.exports = {
  preset: 'react-native',
  modulePathIgnorePatterns: ['<rootDir>/ios/DerivedData/'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  watchman: false,
};
