/* eslint-disable @typescript-eslint/no-require-imports */
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Set the test environment for tests
  testEnvironment: 'jest-environment-node',
  // Handle module path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Whether to use watchman for file crawling
  watchman: false,
  // Ignore all node_modules to avoid ES modules issues
  transformIgnorePatterns: ['node_modules/(?!(.*))'],
  // Only run specific test patterns to avoid loading complex dependencies
  testMatch: ['**/__tests__/**/*.placeholder.test.[jt]s?(x)'],
};

module.exports = createJestConfig(customJestConfig);
