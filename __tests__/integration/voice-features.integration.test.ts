/**
 * Integration test for voice features
 * This test verifies the overall functionality without relying on React Native UI components
 */

import VoiceRecordingService from '@/services/voiceRecording'
import VoicePlaybackService from '@/services/voicePlayback'
import { VoiceRecording, VoiceRecordingStats, VoiceLibrarySettings } from '@/types/scripture'

// Mock the dependencies
const mockAsyncStorage = global.testUtils.mockAsyncStorage()
const mockFileSystem = {
    documentDirectory: '/mock/document/directory/',
    copyAsync: jest.fn(),
    deleteAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
}

jest.mock('expo-file-system', () => mockFileSystem)

describe('Voice Features Integration Test', () => {
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks()

        // Reset AsyncStorage mock data
        Object.keys(mockAsyncStorage).forEach(key => delete mockAsyncStorage[key])

        // Setup default mocks
        mockFileSystem.getInfoAsync.mockResolvedValue(global.testUtils.createMockFileInfo(false))
        mockFileSystem.makeDirectoryAsync.mockResolvedValue(undefined)
        mockFileSystem.copyAsync.mockResolvedValue(undefined)
        mockFileSystem.deleteAsync.mockResolvedValue(undefined)
    })

    describe('Voice Recording Lifecycle', () => {
        it('should handle the complete recording lifecycle: save, retrieve, and delete', async () => {
            // Initialize the service
            await VoiceRecordingService.initialize()

            // Save a recording
            const recording = await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                95,
                5.2
            )

            expect(recording).not.toBeNull()
            expect(recording?.accuracy).toBe(95)

            // Retrieve the recording
            const retrievedRecording = await VoiceRecordingService.getRecordingForScripture('john_3_16')
            expect(retrievedRecording).not.toBeNull()
            expect(retrievedRecording?.scriptureId).toBe('john_3_16')

            // Get all recordings
            const allRecordings = await VoiceRecordingService.getAllRecordings()
            expect(allRecordings.length).toBe(1)

            // Get stats
            const stats = await VoiceRecordingService.getStorageStats()
            expect(stats.totalRecordings).toBe(1)

            // Delete the recording
            const deleteResult = await VoiceRecordingService.deleteRecording(recording!.id)
            expect(deleteResult).toBe(true)

            // Verify it's deleted
            const recordingsAfterDelete = await VoiceRecordingService.getAllRecordings()
            expect(recordingsAfterDelete.length).toBe(0)
        })

        it('should handle settings management correctly', async () => {
            await VoiceRecordingService.initialize()

            // Get default settings
            const defaultSettings = await VoiceRecordingService.getSettings()
            expect(defaultSettings.autoSaveEnabled).toBe(true)
            expect(defaultSettings.minimumAccuracy).toBe(90)

            // Update settings
            const updateResult = await VoiceRecordingService.updateSettings({
                minimumAccuracy: 85,
                useRecordedVoice: true
            })
            expect(updateResult).toBe(true)

            // Verify settings are updated
            const updatedSettings = await VoiceRecordingService.getSettings()
            expect(updatedSettings.minimumAccuracy).toBe(85)
            expect(updatedSettings.useRecordedVoice).toBe(true)
        })
    })

    describe('Voice Playback Integration', () => {
        it('should toggle between recorded voice and TTS', async () => {
            // Initialize services
            await VoiceRecordingService.initialize()

            // Save a recording
            await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                95,
                5.2
            )

            // Enable recorded voice usage
            await VoiceRecordingService.updateSettings({ useRecordedVoice: true })

            // Check if should use recorded voice
            const shouldUseRecorded = await VoiceRecordingService.shouldUseRecordedVoice('john_3_16')
            expect(shouldUseRecorded).toBe(true)

            // Disable recorded voice usage
            await VoiceRecordingService.updateSettings({ useRecordedVoice: false })

            const shouldNotUseRecorded = await VoiceRecordingService.shouldUseRecordedVoice('john_3_16')
            expect(shouldNotUseRecorded).toBe(false)
        })

        it('should handle playback service integration', async () => {
            // Mock the Audio.Sound
            const mockSound = {
                loadAsync: jest.fn(),
                playAsync: jest.fn(),
                setOnPlaybackStatusUpdate: jest.fn(),
            }

            const Audio = require('expo-av').Audio
            Audio.Sound.mockImplementation(() => mockSound)

            // Test playback service methods
            const isUsingRecorded = await VoicePlaybackService.isUsingRecordedVoice()
            expect(typeof isUsingRecorded).toBe('boolean')

            // Test toggle
            const newSetting = await VoicePlaybackService.toggleUseRecordedVoice()
            expect(typeof newSetting).toBe('boolean')
        })
    })

    describe('Storage Management', () => {
        it('should handle storage limits and cleanup', async () => {
            await VoiceRecordingService.initialize()

            // Create multiple recordings
            const now = Date.now()
            const oldRecording = global.testUtils.createMockRecording({
                timestamp: now - (40 * 24 * 60 * 60 * 1000), // 40 days old
            })
            const newRecording = global.testUtils.createMockRecording({
                timestamp: now - (10 * 24 * 60 * 60 * 1000), // 10 days old
            })

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [oldRecording, newRecording]

            // Set storage limit to trigger cleanup
            await VoiceRecordingService.updateSettings({ maxStorageDays: 30 })

            // Trigger maintenance by saving a new recording
            await VoiceRecordingService.saveRecording(
                'test',
                'Test',
                '/temp/test.m4a',
                95,
                3.0
            )

            // Old recording should be deleted
            expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(oldRecording.fileUri, { idempotent: true })
        })
    })

    describe('Error Handling', () => {
        it('should handle errors gracefully during recording operations', async () => {
            await VoiceRecordingService.initialize()

            // Test error handling for file operations
            mockFileSystem.copyAsync.mockRejectedValueOnce(new Error('Copy failed'))

            const result = await VoiceRecordingService.saveRecording(
                'test',
                'Test',
                '/temp/test.m4a',
                95,
                3.0
            )

            expect(result).toBeNull()

            // Test error handling for AsyncStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage')
            AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'))

            const recordings = await VoiceRecordingService.getAllRecordings()
            expect(recordings).toEqual([])
        })
    })
})