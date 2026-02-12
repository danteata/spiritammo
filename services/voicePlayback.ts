import { AudioPlayer, createAudioPlayer } from 'expo-audio'
import * as Speech from 'expo-speech'
import VoiceRecordingService from './voiceRecording'

class VoicePlaybackService {
    private static currentPlayer: AudioPlayer | null = null
    private static isPlaying = false

    /**
     * Play a scripture verse using either recorded voice or TTS
     * @param scriptureId The ID of the scripture to play
     * @param scriptureText The text of the scripture to play
     * @param settings Optional voice settings
     */
    static async playScripture(
        scriptureId: string,
        scriptureText: string,
        settings?: {
            rate?: number
            pitch?: number
            language?: string
            onStart?: () => void
            onDone?: () => void
            onError?: (error: any) => void
        }
    ): Promise<void> {
        try {
            // Stop any currently playing audio
            await this.stopPlayback()

            console.log(`🎵 VoicePlayback: Attempting to play scripture: ${scriptureId}`)

            // Check if we should use recorded voice
            const useRecordedVoice = await VoiceRecordingService.shouldUseRecordedVoice(scriptureId)
            console.log(`🎵 VoicePlayback: Should use recorded voice for ${scriptureId}: ${useRecordedVoice}`)

            if (useRecordedVoice) {
                // Use recorded voice if available and preferred
                console.log(`🎵 VoicePlayback: Using recorded voice for ${scriptureId}`)
                await this.playRecordedVoice(scriptureId, settings)
            } else {
                // Fall back to TTS
                console.log(`🎵 VoicePlayback: Using TTS for ${scriptureId}`)
                await this.playTextToSpeech(scriptureText, settings)
            }
        } catch (error) {
            console.error('Failed to play scripture:', error)
            if (settings?.onError) {
                settings.onError(error)
            }
        }
    }

    /**
     * Play a recorded voice for a scripture
     */
    private static async playRecordedVoice(
        scriptureId: string,
        settings?: {
            onStart?: () => void
            onDone?: () => void
            onError?: (error: any) => void
        }
    ): Promise<void> {
        try {
            if (this.isPlaying) {
                await this.stopPlayback()
            }

            const recordingUri = await VoiceRecordingService.getRecordedVoiceUri(scriptureId)

            if (!recordingUri) {
                throw new Error('No recording found for this scripture')
            }

            if (settings?.onStart) {
                settings.onStart()
            }

            this.isPlaying = true

            // Create audio player with the recording URI
            this.currentPlayer = createAudioPlayer({ uri: recordingUri })
            this.currentPlayer.play()

            // Listen for playback state changes
            this.currentPlayer.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    this.isPlaying = false
                    if (settings?.onDone) {
                        settings.onDone()
                    }
                }
            })

            console.log(`🎙️ Playing recorded voice for scripture: ${scriptureId}`)
        } catch (error) {
            console.error('Failed to play recorded voice:', error)
            this.isPlaying = false
            if (settings?.onError) {
                settings.onError(error)
            }
            throw error
        }
    }

    /**
     * Play text using TTS
     */
    static async playTextToSpeech(
        text: string,
        settings?: {
            rate?: number
            pitch?: number
            language?: string
            onStart?: () => void
            onDone?: () => void
            onError?: (error: any) => void
        }
    ): Promise<void> {
        try {
            if (this.isPlaying) {
                await this.stopPlayback()
            }

            if (settings?.onStart) {
                settings.onStart()
            }

            this.isPlaying = true

            await Speech.speak(text, {
                rate: settings?.rate || 0.9,
                pitch: settings?.pitch || 1.0,
                language: settings?.language || 'en-US',
                onStart: settings?.onStart,
                onDone: () => {
                    this.isPlaying = false
                    if (settings?.onDone) {
                        settings.onDone()
                    }
                },
                onStopped: () => {
                    this.isPlaying = false
                },
                onError: (error) => {
                    this.isPlaying = false
                    if (settings?.onError) {
                        settings.onError(error)
                    }
                }
            })

            console.log('🎙️ Playing text-to-speech')
        } catch (error) {
            console.error('Failed to play text-to-speech:', error)
            this.isPlaying = false
            if (settings?.onError) {
                settings.onError(error)
            }
            throw error
        }
    }

    /**
     * Stop any currently playing audio
     */
    static async stopPlayback(): Promise<void> {
        try {
            if (this.currentPlayer) {
                this.currentPlayer.pause()
                this.currentPlayer.release()
                this.currentPlayer = null
            }

            await Speech.stop()
            this.isPlaying = false

            console.log('🎙️ Stopped voice playback')
        } catch (error) {
            console.error('Failed to stop playback:', error)
        }
    }

    /**
     * Check if voice is currently playing
     */
    static isCurrentlyPlaying(): boolean {
        return this.isPlaying
    }

    /**
     * Toggle between using recorded voice and TTS
     */
    static async toggleUseRecordedVoice(): Promise<boolean> {
        try {
            const settings = await VoiceRecordingService.getSettings()
            const newSetting = !settings.useRecordedVoice

            await VoiceRecordingService.updateSettings({
                useRecordedVoice: newSetting
            })

            console.log(`🎙️ Use recorded voice setting toggled to: ${newSetting}`)
            return newSetting
        } catch (error) {
            console.error('Failed to toggle use recorded voice setting:', error)
            return false
        }
    }

    /**
     * Check if recorded voice is currently enabled
     */
    static async isUsingRecordedVoice(): Promise<boolean> {
        try {
            const settings = await VoiceRecordingService.getSettings()
            return settings.useRecordedVoice
        } catch (error) {
            console.error('Failed to check use recorded voice setting:', error)
            return false
        }
    }
}

export default VoicePlaybackService
