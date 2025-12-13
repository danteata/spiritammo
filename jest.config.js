module.exports = {
    preset: 'jest-expo',
    setupFilesAfterEnv: ['<rootDir>/jest.setup.react-native.js'],
    testPathIgnorePatterns: [
        '<rootDir>/.expo/',
        '<rootDir>/.expo-shared/',
        '<rootDir>/dist/',
        '<rootDir>/node_modules/',
        '<rootDir>/android/',
        '<rootDir>/ios/',
    ],
    transformIgnorePatterns: [
        'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg))',
    ],
    collectCoverageFrom: [
        '**/*.{ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/.expo/**',
        '!**/android/**',
        '!**/ios/**',
        '!**/dist/**',
    ],
    coverageReporters: ['text', 'lcov', 'html'],
    coverageDirectory: 'coverage',
    testEnvironment: 'node',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/$1',
    },
}
