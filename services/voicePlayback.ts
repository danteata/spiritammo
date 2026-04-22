import { AudioPlayer, createAudioPlayer } from 'expo-audio'
import VoiceRecordingService from './voiceRecording'
import TTSEngine, { TTSOptions, TTSEngineType, TTSSegment } from './ttsEngine'

class VoicePlaybackService {
    private static currentPlayer: AudioPlayer | null = null
    private static isPlaying = false
    private static ttsSettings: {
        engine?: TTSEngineType
        voiceId?: string
        apiKey?: string
        voiceRate?: number
        voicePitch?: number
        language?: string
        chatterboxServerUrl?: string
        chatterboxVoiceId?: string
        chatterboxVoiceMode?: 'predefined' | 'clone'
        chatterboxReferenceAudio?: string
        isClonedVoice?: boolean
    } = {}

    static configureTTS(settings: {
        engine?: TTSEngineType
        voiceId?: string
        apiKey?: string
        voiceRate?: number
        voicePitch?: number
        language?: string
        chatterboxServerUrl?: string
        chatterboxVoiceId?: string
        chatterboxVoiceMode?: 'predefined' | 'clone'
        chatterboxReferenceAudio?: string
        isClonedVoice?: boolean
    }): void {
        this.ttsSettings = { ...this.ttsSettings, ...settings }
    }

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
            await this.stopPlayback()

            const useRecordedVoice = await VoiceRecordingService.shouldUseRecordedVoice(scriptureId)

            if (useRecordedVoice) {
                await this.playRecordedVoice(scriptureId, settings)
            } else {
                await this.playTextToSpeech(scriptureText, {
                    ...settings,
                    scriptureId,
                })
            }
        } catch (error) {
            console.error('Failed to play scripture:', error)
            if (settings?.onError) {
                settings.onError(error)
            }
        }
    }

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

            this.currentPlayer = createAudioPlayer({ uri: recordingUri })
            this.currentPlayer.play()

            this.currentPlayer.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    this.isPlaying = false
                    if (settings?.onDone) {
                        settings.onDone()
                    }
                }
            })
        } catch (error) {
            console.error('Failed to play recorded voice:', error)
            this.isPlaying = false
            if (settings?.onError) {
                settings.onError(error)
            }
            throw error
        }
    }

    static async playTextToSpeech(
        text: string,
        settings?: {
            rate?: number
            pitch?: number
            language?: string
            scriptureId?: string
            onStart?: () => void
            onDone?: () => void
            onError?: (error: any) => void
        }
    ): Promise<void> {
        try {
            if (this.isPlaying) {
                await this.stopPlayback()
            }

            this.isPlaying = true

            const ttsOptions: TTSOptions = {
                text,
                scriptureId: settings?.scriptureId,
                rate: settings?.rate ?? this.ttsSettings.voiceRate ?? 0.9,
                pitch: settings?.pitch ?? this.ttsSettings.voicePitch ?? 1.0,
                language: settings?.language ?? this.ttsSettings.language ?? 'en-US',
                ttsEngine: this.ttsSettings.engine ?? 'native',
                voiceId: this.ttsSettings.voiceId,
                elevenLabsApiKey: this.ttsSettings.apiKey,
                chatterboxServerUrl: this.ttsSettings.chatterboxServerUrl,
                chatterboxVoiceId: this.ttsSettings.chatterboxVoiceId,
                chatterboxVoiceMode: this.ttsSettings.chatterboxVoiceMode,
                chatterboxReferenceAudio: this.ttsSettings.chatterboxReferenceAudio,
                isClonedVoice: this.ttsSettings.isClonedVoice,
                onStart: () => {
                    settings?.onStart?.()
                },
                onDone: () => {
                    this.isPlaying = false
                    settings?.onDone?.()
                },
                onError: (error: Error) => {
                    this.isPlaying = false
                    settings?.onError?.(error)
                },
            }

            await TTSEngine.speak(ttsOptions)
        } catch (error) {
            console.error('Failed to play text-to-speech:', error)
            this.isPlaying = false
            if (settings?.onError) {
                settings.onError(error)
            }
            throw error
        }
    }

    static async playSegments(
        segments: TTSSegment[],
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

            this.isPlaying = true

            const baseOptions: Omit<TTSOptions, 'text'> = {
                rate: settings?.rate ?? this.ttsSettings.voiceRate ?? 0.9,
                pitch: settings?.pitch ?? this.ttsSettings.voicePitch ?? 1.0,
                language: settings?.language ?? this.ttsSettings.language ?? 'en-US',
                ttsEngine: this.ttsSettings.engine ?? 'native',
                voiceId: this.ttsSettings.voiceId,
                elevenLabsApiKey: this.ttsSettings.apiKey,
                chatterboxServerUrl: this.ttsSettings.chatterboxServerUrl,
                chatterboxVoiceId: this.ttsSettings.chatterboxVoiceId,
                chatterboxVoiceMode: this.ttsSettings.chatterboxVoiceMode,
                chatterboxReferenceAudio: this.ttsSettings.chatterboxReferenceAudio,
                onStart: () => {
                    settings?.onStart?.()
                },
                onDone: () => {
                    this.isPlaying = false
                    settings?.onDone?.()
                },
                onError: (error: Error) => {
                    this.isPlaying = false
                    settings?.onError?.(error)
                },
            }

            await TTSEngine.speakSegments(segments, baseOptions)
        } catch (error) {
            console.error('Failed to play segments:', error)
            this.isPlaying = false
            if (settings?.onError) {
                settings.onError(error)
            }
            throw error
        }
    }

    static async stopPlayback(): Promise<void> {
        try {
            if (this.currentPlayer) {
                this.currentPlayer.pause()
                this.currentPlayer.release()
                this.currentPlayer = null
            }

            await TTSEngine.stop()
            this.isPlaying = false
        } catch (error) {
            console.error('Failed to stop playback:', error)
        }
    }

    static isCurrentlyPlaying(): boolean {
        return this.isPlaying
    }

    static async toggleUseRecordedVoice(): Promise<boolean> {
        try {
            const settings = await VoiceRecordingService.getSettings()
            const newSetting = !settings.useRecordedVoice

            await VoiceRecordingService.updateSettings({
                useRecordedVoice: newSetting
            })

            return newSetting
        } catch (error) {
            console.error('Failed to toggle use recorded voice setting:', error)
            return false
        }
    }

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
