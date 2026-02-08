/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },

  // Blindagem: roda apenas unit tests em src
  testMatch: ['<rootDir>/src/**/*.spec.ts'],

  // Blindagem extra
  testPathIgnorePatterns: ['<rootDir>/test/', '<rootDir>/dist/'],
};
