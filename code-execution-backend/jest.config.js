module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/config/**',
    '!src/utils/logger.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testPathIgnorePatterns: [
    '/node_modules/'
  ],
  moduleFileExtensions: ['js', 'json'],
  verbose: true,
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.test.js'],
      testTimeout: 10000
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.test.js'],
      testTimeout: 60000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/test/performance/**/*.test.js'],
      testTimeout: 120000
    }
  ]
};