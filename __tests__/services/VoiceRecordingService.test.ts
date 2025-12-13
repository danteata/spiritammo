import VoiceRecordingService from '@/services/voiceRecording'
import { VoiceRecording, VoiceRecordingStats, VoiceLibrarySettings } from '@/types/scripture'

// Mock the dependencies
const mockAsyncStorage = (global as any).testUtils.mockAsyncStorage()
const mockFileSystem = {
    documentDirectory: '/mock/document/directory/',
    copyAsync: jest.fn(),
    deleteAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
}

jest.mock('expo-file-system', () => mockFileSystem)

describe('VoiceRecordingService', () => {
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

    describe('initialize', () => {
        it('should create recordings directory if it does not exist', async () => {
            mockFileSystem.getInfoAsync.mockResolvedValueOnce(global.testUtils.createMockFileInfo(false))

            await VoiceRecordingService.initialize()

            expect(mockFileSystem.makeDirectoryAsync).toHaveBeenCalledWith(
                VoiceRecordingService['RECORDINGS_DIR'],
                { intermediates: true }
            )
        })

        it('should not create directory if it already exists', async () => {
            mockFileSystem.getInfoAsync.mockResolvedValueOnce(global.testUtils.createMockFileInfo(true))

            await VoiceRecordingService.initialize()

            expect(mockFileSystem.makeDirectoryAsync).not.toHaveBeenCalled()
        })

        it('should initialize default settings if not set', async () => {
            await VoiceRecordingService.initialize()

            const settings = await VoiceRecordingService.getSettings()
            expect(settings.autoSaveEnabled).toBe(true)
            expect(settings.minimumAccuracy).toBe(90)
        })

        it('should handle initialization errors gracefully', async () => {
            mockFileSystem.makeDirectoryAsync.mockRejectedValueOnce(new Error('Permission denied'))

            // Should not throw
            await expect(VoiceRecordingService.initialize()).resolves.not.toThrow()
        })
    })

    describe('saveRecording', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should save high-accuracy recording successfully', async () => {
            const mockRecording = global.testUtils.createMockRecording({
                accuracy: 95,
                scriptureId: 'john_3_16',
                scriptureRef: 'John 3:16'
            })

            mockFileSystem.getInfoAsync.mockResolvedValue(global.testUtils.createMockFileInfo(true))
            mockFileSystem.copyAsync.mockResolvedValue(undefined)

            const result = await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                95,
                5.2
            )

            expect(result).toBeTruthy()
            expect(result?.accuracy).toBe(95)
            expect(result?.scriptureId).toBe('john_3_16')
            expect(result?.tags).toContain('high-accuracy')
        })

        it('should not save low-accuracy recordings', async () => {
            const result = await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                85,
                5.2
            )

            expect(result).toBeNull()
        })

        it('should handle file copy errors', async () => {
            mockFileSystem.copyAsync.mockRejectedValueOnce(new Error('Copy failed'))

            const result = await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                95,
                5.2
            )

            expect(result).toBeNull()
        })

        it('should respect auto-save settings', async () => {
            await VoiceRecordingService.updateSettings({ autoSaveEnabled: false })

            const result = await VoiceRecordingService.saveRecording(
                'john_3_16',
                'John 3:16',
                '/temp/recording.m4a',
                95,
                5.2
            )

            expect(result).toBeNull()
        })
    })

    describe('getAllRecordings', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should return empty array when no recordings exist', async () => {
            const recordings = await VoiceRecordingService.getAllRecordings()
            expect(recordings).toEqual([])
        })

        it('should return recordings sorted by timestamp (newest first)', async () => {
            const recording1 = global.testUtils.createMockRecording({
                id: 'rec_1',
                timestamp: 1000,
                scriptureRef: 'John 3:16'
            })
            const recording2 = global.testUtils.createMockRecording({
                id: 'rec_2',
                timestamp: 2000,
                scriptureRef: 'Psalm 23:1'
            })

            // Mock existing recordings
            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [recording1, recording2]

            const recordings = await VoiceRecordingService.getAllRecordings()

            expect(recordings).toHaveLength(2)
            expect(recordings[0].timestamp).toBe(2000) // Newest first
            expect(recordings[1].timestamp).toBe(1000)
        })

        it('should filter out recordings with missing files', async () => {
            const validRecording = global.testUtils.createMockRecording({ id: 'valid' })
            const invalidRecording = global.testUtils.createMockRecording({
                id: 'invalid',
                fileUri: '/missing/file.m4a'
            })

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [validRecording, invalidRecording]
            mockFileSystem.getInfoAsync
                .mockResolvedValueOnce(global.testUtils.createMockFileInfo(true)) // Valid file
                .mockResolvedValueOnce(global.testUtils.createMockFileInfo(false)) // Missing file

            const recordings = await VoiceRecordingService.getAllRecordings()

            expect(recordings).toHaveLength(1)
            expect(recordings[0].id).toBe('valid')
        })
    })

    describe('getRecordingForScripture', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should return the most recent recording for a scripture', async () => {
            const recording1 = global.testUtils.createMockRecording({
                scriptureId: 'john_3_16',
                timestamp: 1000
            })
            const recording2 = global.testUtils.createMockRecording({
                scriptureId: 'john_3_16',
                timestamp: 2000
            })
            const recording3 = global.testUtils.createMockRecording({
                scriptureId: 'psalm_23',
                timestamp: 1500
            })

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [recording1, recording2, recording3]

            const result = await VoiceRecordingService.getRecordingForScripture('john_3_16')

            expect(result?.timestamp).toBe(2000) // Most recent
        })

        it('should return null when no recording exists for scripture', async () => {
            const result = await VoiceRecordingService.getRecordingForScripture('nonexistent')
            expect(result).toBeNull()
        })
    })

    describe('deleteRecording', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should delete recording and file successfully', async () => {
            const recording = global.testUtils.createMockRecording()
            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [recording]

            const result = await VoiceRecordingService.deleteRecording(recording.id)

            expect(result).toBe(true)
            expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(recording.fileUri, { idempotent: true })
            expect(mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']]).toEqual([])
        })

        it('should return false for non-existent recording', async () => {
            const result = await VoiceRecordingService.deleteRecording('nonexistent')
            expect(result).toBe(false)
        })

        it('should handle file deletion errors gracefully', async () => {
            const recording = global.testUtils.createMockRecording()
            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [recording]
            mockFileSystem.deleteAsync.mockRejectedValueOnce(new Error('Delete failed'))

            const result = await VoiceRecordingService.deleteRecording(recording.id)

            expect(result).toBe(false)
        })
    })

    describe('getStorageStats', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should calculate correct statistics', async () => {
            const recordings = [
                global.testUtils.createMockRecording({
                    accuracy: 95,
                    fileSize: 1000000,
                    quality: 'standard',
                    timestamp: 1000
                }),
                global.testUtils.createMockRecording({
                    accuracy: 88,
                    fileSize: 2000000,
                    quality: 'high',
                    timestamp: 2000
                }),
                global.testUtils.createMockRecording({
                    accuracy: 97,
                    fileSize: 1500000,
                    quality: 'premium',
                    timestamp: 1500
                })
            ]

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = recordings

            const stats: VoiceRecordingStats = await VoiceRecordingService.getStorageStats()

            expect(stats.totalRecordings).toBe(3)
            expect(stats.totalStorageUsed).toBe(4500000)
            expect(stats.averageAccuracy).toBeCloseTo(93.33, 1)
            expect(stats.recordingsByQuality).toEqual({
                standard: 1,
                high: 1,
                premium: 1
            })
            expect(stats.oldestRecording).toBe(1000)
            expect(stats.newestRecording).toBe(2000)
        })

        it('should handle empty recordings list', async () => {
            const stats = await VoiceRecordingService.getStorageStats()

            expect(stats.totalRecordings).toBe(0)
            expect(stats.totalStorageUsed).toBe(0)
            expect(stats.averageAccuracy).toBe(0)
        })
    })

    describe('settings management', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should get default settings', async () => {
            const settings = await VoiceRecordingService.getSettings()

            expect(settings.autoSaveEnabled).toBe(true)
            expect(settings.minimumAccuracy).toBe(90)
            expect(settings.maxStorageDays).toBe(30)
            expect(settings.useRecordedVoice).toBe(false)
        })

        it('should update settings successfully', async () => {
            const newSettings: Partial<VoiceLibrarySettings> = {
                minimumAccuracy: 85,
                useRecordedVoice: true
            }

            const result = await VoiceRecordingService.updateSettings(newSettings)
            expect(result).toBe(true)

            const updated = await VoiceRecordingService.getSettings()
            expect(updated.minimumAccuracy).toBe(85)
            expect(updated.useRecordedVoice).toBe(true)
        })

        it('should handle settings update errors', async () => {
            const AsyncStorage = require('@react-native-async-storage/async-storage')
            AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'))

            const result = await VoiceRecordingService.updateSettings({ minimumAccuracy: 85 })
            expect(result).toBe(false)
        })
    })

    describe('shouldUseRecordedVoice', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should return false when useRecordedVoice is disabled', async () => {
            await VoiceRecordingService.updateSettings({ useRecordedVoice: false })

            const result = await VoiceRecordingService.shouldUseRecordedVoice('test_scripture')
            expect(result).toBe(false)
        })

        it('should return true when recording exists and setting is enabled', async () => {
            await VoiceRecordingService.updateSettings({ useRecordedVoice: true })

            const recording = global.testUtils.createMockRecording({ scriptureId: 'test_scripture' })
            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [recording]

            const result = await VoiceRecordingService.shouldUseRecordedVoice('test_scripture')
            expect(result).toBe(true)
        })

        it('should return false when no recording exists', async () => {
            await VoiceRecordingService.updateSettings({ useRecordedVoice: true })

            const result = await VoiceRecordingService.shouldUseRecordedVoice('nonexistent')
            expect(result).toBe(false)
        })
    })

    describe('storage maintenance', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should clean up old recordings based on maxStorageDays', async () => {
            const now = Date.now()
            const oldRecording = global.testUtils.createMockRecording({
                timestamp: now - (40 * 24 * 60 * 60 * 1000), // 40 days old
            })
            const newRecording = global.testUtils.createMockRecording({
                timestamp: now - (10 * 24 * 60 * 60 * 1000), // 10 days old
            })

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = [oldRecording, newRecording]

            // Trigger storage maintenance by saving a new recording
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

        it('should clean up recordings when storage limit exceeded', async () => {
            const recordings = [
                global.testUtils.createMockRecording({
                    fileSize: 30000000, // 30MB
                    timestamp: 1000
                }),
                global.testUtils.createMockRecording({
                    fileSize: 30000000, // 30MB
                    timestamp: 2000
                }),
                global.testUtils.createMockRecording({
                    fileSize: 30000000, // 30MB
                    timestamp: 3000
                })
            ]

            mockAsyncStorage[VoiceRecordingService['STORAGE_KEY']] = recordings

            // Set 50MB limit - total is 90MB so should delete oldest
            await VoiceRecordingService.updateSettings({ maxStorageSize: 50 })

            // Trigger maintenance
            await VoiceRecordingService.saveRecording(
                'test',
                'Test',
                '/temp/test.m4a',
                95,
                3.0
            )

            // Oldest recording should be deleted
            expect(mockFileSystem.deleteAsync).toHaveBeenCalledWith(recordings[0].fileUri, { idempotent: true })
        })
    })

    describe('error handling', () => {
        beforeEach(async () => {
            await VoiceRecordingService.initialize()
        })

        it('should handle AsyncStorage errors gracefully', async () => {
            const AsyncStorage = require('@react-native-async-storage/async-storage')
            AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'))

            const recordings = await VoiceRecordingService.getAllRecordings()
            expect(recordings).toEqual([])
        })

        it('should handle FileSystem errors gracefully', async () => {
            mockFileSystem.getInfoAsync.mockRejectedValueOnce(new Error('File system error'))

            const recordings = await VoiceRecordingService.getAllRecordings()
            // Should still work but filter out problematic files
            expect(recordings).toEqual([])
        })

        it('should call error handler for critical errors', async () => {
            const errorHandler = require('@/services/errorHandler').errorHandler

            mockFileSystem.copyAsync.mockRejectedValueOnce(new Error('Critical copy error'))

            await VoiceRecordingService.saveRecording(
                'test',
                'Test',
                '/temp/test.m4a',
                95,
                3.0
            )

            expect(errorHandler.handleError).toHaveBeenCalled()
        })
    })

    describe('playRecording', () => {
        it('should create and return audio sound object', async () => {
            const mockSound = {
                loadAsync: jest.fn(),
                playAsync: jest.fn(),
                setOnPlaybackStatusUpdate: jest.fn(),
            }

            const Audio = require('expo-av').Audio
            Audio.Sound.mockImplementation(() => mockSound)

            const sound = await VoiceRecordingService.playRecording('/test/recording.m4a')

            expect(Audio.Sound).toHaveBeenCalledWith(
                { uri: '/test/recording.m4a' },
                { shouldPlay: true }
            )
            expect(sound).toBe(mockSound)
        })

        it('should handle playback errors', async () => {
            const Audio = require('expo-av').Audio
            Audio.Sound.mockRejectedValueOnce(new Error('Playback error'))

            await expect(VoiceRecordingService.playRecording('/test/recording.m4a')).rejects.toThrow()
        })
    })
})
