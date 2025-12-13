import { jest } from '@jest/globals';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo FileSystem
jest.mock('expo-file-system/legacy', () => ({
    documentDirectory: '/mock/document/directory/',
    copyAsync: jest.fn(),
    deleteAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
}));

// Mock Expo Audio
jest.mock('expo-av', () => ({
    Audio: {
        Sound: jest.fn().mockImplementation(() => ({
            loadAsync: jest.fn(),
            playAsync: jest.fn(),
            pauseAsync: jest.fn(),
            stopAsync: jest.fn(),
            unloadAsync: jest.fn(),
            setOnPlaybackStatusUpdate: jest.fn(),
        })),
    },
}));

// Mock error handler
jest.mock('@/services/errorHandler', () => ({
    errorHandler: {
        handleError: jest.fn(),
    },
}));

// Global test utilities
global.testUtils = {
    // Helper to create mock recordings
    createMockRecording: (overrides = {}) => ({
        id: 'rec_test_123',
        scriptureId: 'scripture_1',
        scriptureRef: 'John 3:16',
        accuracy: 95,
        timestamp: Date.now(),
        duration: 5.2,
        fileUri: '/mock/path/recording.m4a',
        fileSize: 1024000,
        quality: 'standard',
        tags: ['high-accuracy'],
        metadata: {
            appVersion: '1.0.0',
        },
        ...overrides,
    }),

    // Helper to create mock file info
    createMockFileInfo: (exists = true, overrides = {}) => ({
        exists,
        uri: '/mock/path/file.m4a',
        size: exists ? 1024000 : undefined,
        isDirectory: false,
        ...overrides,
    }),

    // Helper to mock AsyncStorage
    mockAsyncStorage: (initialData = {}) => {
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        AsyncStorage.getItem = jest.fn((key) => {
            return Promise.resolve(initialData[key] ? JSON.stringify(initialData[key]) : null);
        });
        AsyncStorage.setItem = jest.fn((key, value) => {
            initialData[key] = JSON.parse(value);
            return Promise.resolve();
        });
        AsyncStorage.removeItem = jest.fn((key) => {
            delete initialData[key];
            return Promise.resolve();
        });
        return initialData;
    },
};
