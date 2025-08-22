module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  // setupFilesAfterEnv: ['./jest.setup.js'],
  verbose: true,
  // Increase timeout for integration tests
  testTimeout: 30000,
  
  // Add module name mapper for the common directory
  moduleNameMapper: {
    '^common/(.*)$': '<rootDir>/../common/$1'
  }
}; 