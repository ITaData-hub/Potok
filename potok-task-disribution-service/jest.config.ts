module.exports = {
    moduleFileExtensions: ['js', 'json', 'ts'],
    rootDir: 'src',
    testRegex: '.*\\.spec\\.ts$',
    transform: {
      '^.+\\.(t|j)s$': 'ts-jest',
    },
    collectCoverageFrom: [
      '**/*.(t|j)s',
      '!**/*.module.ts',
      '!**/main.ts',
      '!**/index.ts',
    ],
    coverageDirectory: '../coverage',
    testEnvironment: 'node',
    moduleNameMapper: {
      '^@config/(.*)$': '<rootDir>/config/$1',
      '^@common/(.*)$': '<rootDir>/common/$1',
      '^@modules/(.*)$': '<rootDir>/modules/$1',
      '^@services/(.*)$': '<rootDir>/services/$1',
      '^@utils/(.*)$': '<rootDir>/utils/$1',
    },
  };
  