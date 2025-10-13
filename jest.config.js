export default {
  testEnvironment: 'jsdom',
  transform: {},
  moduleFileExtensions: ['js', 'json'],
  testMatch: ['**/__tests__/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/app.js',
    '!jest.config.js',
    '!coverage/**'
  ],
  coverageThreshold: {
    global: {
      branches: 95,
      functions: 70,
      lines: 80,
      statements: 80
    }
  }
};
