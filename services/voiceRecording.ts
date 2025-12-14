import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system/legacy'
import { Audio } from 'expo-av'
import { VoiceRecording, VoiceLibrarySettings, VoiceRecordingStats } from '@/types/scripture'
import { errorHandler } from './errorHandler'

class VoiceRecordingService {
    private static readonly STORAGE_KEY = '@voice_recordings'
    private static readonly SETTINGS_KEY = '@voice_library_settings'
    private static readonly RECORDINGS_DIR = `${FileSystem.documentDirectory || ''}voice_recordings/`

    // Default settings
    private static readonly DEFAULT_SETTINGS: VoiceLibrarySettings = {
        autoSaveEnabled: true,
        minimumAccuracy: 90,
        maxStorageDays: 30,
        maxStorageSize: 100, // 100MB
        preferredQuality: 'standard',
        useRecordedVoice: false
    }

    /**
     * Initialize the voice recording service
     */
    static async initialize(): Promise<void> {
        try {
            // Create recordings directory if it doesn't exist
            const dirInfo = await FileSystem.getInfoAsync(this.RECORDINGS_DIR)
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(this.RECORDINGS_DIR, { intermediates: true })
            }

            // Initialize default settings if not set
            const existingSettings = await AsyncStorage.getItem(this.SETTINGS_KEY)
            if (!existingSettings) {
                await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.DEFAULT_SETTINGS))
            }

            console.log('🎙️ Voice Recording Service initialized')
        } catch (error) {
            console.error('Failed to initialize voice recording service:', error)
        }
    }

    /**
     * Save a high-accuracy recording permanently
     */
    static async saveRecording(
        scriptureId: string,
        scriptureRef: string,
        tempUri: string,
        accuracy: number,
        duration: number
    ): Promise<VoiceRecording | null> {
        try {
            // Check if auto-save is enabled and accuracy meets threshold
            const settings = await this.getSettings()
            if (!settings.autoSaveEnabled || accuracy < settings.minimumAccuracy) {
                return null
            }

            // Generate unique filename
            const timestamp = Date.now()
            const filename = `recording_${scriptureId}_${timestamp}.m4a`
            const permanentUri = `${this.RECORDINGS_DIR}${filename}`

            // Copy file to permanent location
            await FileSystem.copyAsync({
                from: tempUri,
                to: permanentUri
            })

            // Get file info
            const fileInfo = await FileSystem.getInfoAsync(permanentUri)

            // Create recording metadata
            const recording: VoiceRecording = {
                id: `rec_${timestamp}_${scriptureId}`,
                scriptureId,
                scriptureRef,
                accuracy,
                timestamp,
                duration,
                fileUri: permanentUri,
                fileSize: fileInfo.exists ? (fileInfo as any).size : 0,
                quality: settings.preferredQuality,
                tags: accuracy >= 95 ? ['high-accuracy'] : [],
                metadata: {
                    appVersion: '1.0.0' // Could get from package.json
                }
            }

            // Save to storage
            await this.saveRecordingToStorage(recording)

            // Clean up old recordings if needed
            await this.performStorageMaintenance()

            console.log(`🎙️ Saved voice recording: ${scriptureRef} (${accuracy}%)`)
            return recording
        } catch (error) {
            console.error('Failed to save voice recording:', error)
            await errorHandler.handleError(error, 'Save Voice Recording')
            return null
        }
    }

    /**
     * Get all saved recordings
     */
    static async getAllRecordings(): Promise<VoiceRecording[]> {
        try {
            const data = await AsyncStorage.getItem(this.STORAGE_KEY)
            if (!data) return []

            const recordings: VoiceRecording[] = JSON.parse(data)

            // Filter out recordings with missing files
            const validRecordings = []
            for (const recording of recordings) {
                const fileExists = await FileSystem.getInfoAsync(recording.fileUri).catch(() => null)
                if (fileExists?.exists) {
                    validRecordings.push(recording)
                } else {
                    // Clean up metadata for missing files
                    await this.deleteRecording(recording.id)
                }
            }

            return validRecordings.sort((a, b) => b.timestamp - a.timestamp)
        } catch (error) {
            console.error('Failed to get recordings:', error)
            return []
        }
    }

    /**
     * Get recording for specific scripture
     */
    static async getRecordingForScripture(scriptureId: string): Promise<VoiceRecording | null> {
        try {
            const recordings = await this.getAllRecordings()
            // Return the most recent recording for this scripture
            return recordings.find(r => r.scriptureId === scriptureId) || null
        } catch (error) {
            console.error('Failed to get recording for scripture:', error)
            return null
        }
    }

    /**
     * Get recordings by accuracy range
     */
    static async getRecordingsByAccuracy(minAccuracy: number = 80): Promise<VoiceRecording[]> {
        try {
            const recordings = await this.getAllRecordings()
            return recordings.filter(r => r.accuracy >= minAccuracy)
        } catch (error) {
            console.error('Failed to get recordings by accuracy:', error)
            return []
        }
    }

    /**
     * Play a saved recording
     */
    static async playRecording(recordingUri: string): Promise<Audio.Sound> {
        try {
            const { sound } = await Audio.Sound.createAsync(
                { uri: recordingUri },
                { shouldPlay: true }
            )
            return sound
        } catch (error) {
            console.error('Failed to play recording:', error)
            throw error
        }
    }

    /**
     * Delete a recording
     */
    static async deleteRecording(recordingId: string): Promise<boolean> {
        try {
            const recordings = await this.getAllRecordings()
            const recording = recordings.find(r => r.id === recordingId)

            if (!recording) return false

            // Delete file
            await FileSystem.deleteAsync(recording.fileUri, { idempotent: true })

            // Remove from storage
            const updatedRecordings = recordings.filter(r => r.id !== recordingId)
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedRecordings))

            console.log(`🗑️ Deleted voice recording: ${recording.scriptureRef}`)
            return true
        } catch (error) {
            console.error('Failed to delete recording:', error)
            return false
        }
    }

    /**
     * Get storage statistics
     */
    static async getStorageStats(): Promise<VoiceRecordingStats> {
        try {
            const recordings = await this.getAllRecordings()

            const stats: VoiceRecordingStats = {
                totalRecordings: recordings.length,
                totalStorageUsed: recordings.reduce((total, r) => total + (r.fileSize || 0), 0),
                averageAccuracy: recordings.length > 0
                    ? recordings.reduce((sum, r) => sum + r.accuracy, 0) / recordings.length
                    : 0,
                recordingsByQuality: {
                    standard: recordings.filter(r => r.quality === 'standard').length,
                    high: recordings.filter(r => r.quality === 'high').length,
                    premium: recordings.filter(r => r.quality === 'premium').length
                }
            }

            if (recordings.length > 0) {
                stats.oldestRecording = Math.min(...recordings.map(r => r.timestamp))
                stats.newestRecording = Math.max(...recordings.map(r => r.timestamp))
            }

            return stats
        } catch (error) {
            console.error('Failed to get storage stats:', error)
            return {
                totalRecordings: 0,
                totalStorageUsed: 0,
                averageAccuracy: 0,
                recordingsByQuality: { standard: 0, high: 0, premium: 0 }
            }
        }
    }

    /**
     * Get voice library settings
     */
    static async getSettings(): Promise<VoiceLibrarySettings> {
        try {
            const data = await AsyncStorage.getItem(this.SETTINGS_KEY)
            return data ? JSON.parse(data) : { ...this.DEFAULT_SETTINGS }
        } catch (error) {
            console.error('Failed to get voice library settings:', error)
            return { ...this.DEFAULT_SETTINGS }
        }
    }

    /**
     * Update voice library settings
     */
    static async updateSettings(settings: Partial<VoiceLibrarySettings>): Promise<boolean> {
        try {
            const currentSettings = await this.getSettings()
            const updatedSettings = { ...currentSettings, ...settings }
            await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(updatedSettings))
            return true
        } catch (error) {
            console.error('Failed to update voice library settings:', error)
            return false
        }
    }

    /**
     * Check if recorded voice should be used instead of TTS
     */
    static async shouldUseRecordedVoice(scriptureId: string): Promise<boolean> {
        try {
            console.log(`🎵 VoiceRecording: Checking if should use recorded voice for: ${scriptureId}`)
            const settings = await this.getSettings()
            console.log(`🎵 VoiceRecording: useRecordedVoice setting: ${settings.useRecordedVoice}`)

            if (!settings.useRecordedVoice) {
                console.log(`🎵 VoiceRecording: useRecordedVoice is disabled`)
                return false
            }

            const recording = await this.getRecordingForScripture(scriptureId)
            console.log(`🎵 VoiceRecording: Found recording for ${scriptureId}: ${recording ? 'YES' : 'NO'}`)
            if (recording) {
                console.log(`🎵 VoiceRecording: Recording details:`, recording)
            }

            return recording !== null
        } catch (error) {
            console.error('Failed to check recorded voice preference:', error)
            return false
        }
    }

    /**
     * Get recorded voice for scripture (if available and preferred)
     */
    static async getRecordedVoiceUri(scriptureId: string): Promise<string | null> {
        try {
            const recording = await this.getRecordingForScripture(scriptureId)
            return recording?.fileUri || null
        } catch (error) {
            console.error('Failed to get recorded voice URI:', error)
            return null
        }
    }

    // Private methods

    private static async saveRecordingToStorage(recording: VoiceRecording): Promise<void> {
        try {
            const recordings = await this.getAllRecordings()
            recordings.push(recording)
            await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(recordings))
        } catch (error) {
            console.error('Failed to save recording to storage:', error)
            throw error
        }
    }

    private static async performStorageMaintenance(): Promise<void> {
        try {
            const settings = await this.getSettings()
            const recordings = await this.getAllRecordings()

            // Remove old recordings
            if (settings.maxStorageDays > 0) {
                const cutoffTime = Date.now() - (settings.maxStorageDays * 24 * 60 * 60 * 1000)
                const recordingsToDelete = recordings.filter(r => r.timestamp < cutoffTime)

                for (const recording of recordingsToDelete) {
                    await this.deleteRecording(recording.id)
                }

                if (recordingsToDelete.length > 0) {
                    console.log(`🧹 Cleaned up ${recordingsToDelete.length} old voice recordings`)
                }
            }

            // Check storage size limit
            if (settings.maxStorageSize > 0) {
                const stats = await this.getStorageStats()
                const maxBytes = settings.maxStorageSize * 1024 * 1024 // Convert MB to bytes

                if (stats.totalStorageUsed > maxBytes) {
                    // Sort by timestamp (oldest first) and delete until under limit
                    const sortedRecordings = [...recordings].sort((a, b) => a.timestamp - b.timestamp)
                    let currentSize = stats.totalStorageUsed

                    for (const recording of sortedRecordings) {
                        if (currentSize <= maxBytes) break
                        await this.deleteRecording(recording.id)
                        currentSize -= recording.fileSize || 0
                    }

                    console.log('🧹 Cleaned up voice recordings to stay within storage limit')
                }
            }
        } catch (error) {
            console.error('Failed to perform storage maintenance:', error)
        }
    }
}

export default VoiceRecordingService
