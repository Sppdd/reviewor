module.exports = {
  testEnvironment: 'jsdom',
  testMatch: [
    '**/src/inline-checker/tests/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/src/inline-checker/tests/setup.js'],
  collectCoverageFrom: [
    'src/inline-checker/core/**/*.js',
    '!src/inline-checker/tests/**'
  ],
  verbose: true
};