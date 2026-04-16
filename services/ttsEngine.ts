import * as Speech from 'expo-speech'
import { AudioPlayer, createAudioPlayer } from 'expo-audio'
import elevenLabsTTSService, { ElevenLabsTTSService } from './elevenLabsTTS'
import chatterboxTTSService, { ChatterboxTTSService } from './chatterboxTTS'
import TTSCache from './ttsCache'
import convexTTSService from './convexTTS'

export type TTSEngineType = 'elevenlabs' | 'native' | 'chatterbox'

export interface TTSOptions {
    text: string
    scriptureId?: string
    voiceId?: string
    rate?: number
    pitch?: number
    language?: string
    ttsEngine?: TTSEngineType
    elevenLabsApiKey?: string
    chatterboxServerUrl?: string
    chatterboxVoiceId?: string
    chatterboxVoiceMode?: 'predefined' | 'clone'
    chatterboxReferenceAudio?: string
    onStart?: () => void
    onDone?: () => void
    onError?: (error: Error) => void
}

class TTSEngine {
    private static currentPlayer: AudioPlayer | null = null
    private static isSpeaking = false
    private static isOnline = true

    static setOnlineStatus(online: boolean): void {
        this.isOnline = online
    }

    static speaking(): boolean {
        return this.isSpeaking
    }

    static async speak(options: TTSOptions): Promise<void> {
        await this.stop()

        if (options.elevenLabsApiKey) {
            elevenLabsTTSService.setApiKey(options.elevenLabsApiKey)
        }

        if (options.chatterboxServerUrl) {
            chatterboxTTSService.setServerUrl(options.chatterboxServerUrl)
        }

        const engine = options.ttsEngine || 'native'

        if (engine === 'chatterbox') {
            try {
                await this.speakWithChatterbox(options)
                return
            } catch (error) {
                const readableError = ChatterboxTTSService.getHumanReadableError(error)
                console.warn('[TTSEngine] Chatterbox failed:', readableError)
                options.onError?.(new Error(readableError))
                if (readableError.includes('Cannot connect') || readableError.includes('still loading')) {
                    return
                }
                await this.speakWithNative(options)
            }
        } else if (engine === 'elevenlabs') {
            const useElevenLabs = this.isOnline
                && elevenLabsTTSService.isAvailable()

            if (useElevenLabs) {
                try {
                    await this.speakWithElevenLabs(options)
                    return
                } catch (error) {
                    const readableError = ElevenLabsTTSService.getHumanReadableError(error)
                    console.warn('[TTSEngine] ElevenLabs failed:', readableError)
                    if (ElevenLabsTTSService.isPaymentRequiredError(error)) {
                        options.onError?.(new Error(readableError))
                        return
                    }
                    await this.speakWithNative(options)
                }
            } else {
                await this.speakWithNative(options)
            }
        } else if (options.scriptureId && this.isOnline) {
            try {
                const played = await this.tryCommunityVoice(options)
                if (played) return
            } catch (error) {
                console.warn('[TTSEngine] Community voice fallback failed:', error)
            }
            await this.speakWithNative(options)
        } else {
            await this.speakWithNative(options)
        }
    }

    static async stop(): Promise<void> {
        try {
            if (this.currentPlayer) {
                this.currentPlayer.pause()
                this.currentPlayer.release()
                this.currentPlayer = null
            }
            await Speech.stop()
            this.isSpeaking = false
        } catch (error) {
            console.error('Failed to stop TTS:', error)
        }
    }

    private static async tryCommunityVoice(options: TTSOptions): Promise<boolean> {
        const scriptureId = options.scriptureId!
        const communityVoiceId = convexTTSService.getCommunityVoiceId()

        const cachedUri = await TTSCache.get(scriptureId, communityVoiceId)
        if (cachedUri) {
            await this.playAudioFile(cachedUri, options)
            return true
        }

        const convexUrl = await convexTTSService.getCommunityAudio(scriptureId, communityVoiceId)
        if (convexUrl) {
            await this.playAudioFile(convexUrl, options)
            this.cacheConvexAudioInBackground(scriptureId, communityVoiceId, convexUrl)
            return true
        }

        if (convexTTSService.isAvailable()) {
            try {
                const generatedUrl = await convexTTSService.generateAndCache(
                    scriptureId,
                    options.text,
                    communityVoiceId
                )
                if (generatedUrl) {
                    await this.playAudioFile(generatedUrl, options)
                    this.cacheConvexAudioInBackground(scriptureId, communityVoiceId, generatedUrl)
                    return true
                }
            } catch (error) {
                console.warn('[TTSEngine] Convex generateAndCache failed:', error)
            }
        }

        return false
    }

    private static cacheConvexAudioInBackground(
        scriptureId: string,
        voiceId: string,
        remoteUrl: string
    ): void {
        (async () => {
            try {
                const { default: FileSystem } = await import('expo-file-system/legacy')
                const filename = `tts_${scriptureId}_${voiceId}_convex.mp3`
                const localUri = `${FileSystem.documentDirectory || ''}tts_cache/${filename}`

                const dirInfo = await FileSystem.getInfoAsync(
                    `${FileSystem.documentDirectory || ''}tts_cache/`
                )
                if (!dirInfo.exists) {
                    await FileSystem.makeDirectoryAsync(
                        `${FileSystem.documentDirectory || ''}tts_cache/`,
                        { intermediates: true }
                    )
                }

                const downloadResult = await FileSystem.downloadAsync(remoteUrl, localUri)
                if (downloadResult.uri) {
                    await TTSCache.set(scriptureId, voiceId, downloadResult.uri)
                    console.log('[TTSEngine] Cached community audio locally:', scriptureId)
                }
            } catch (error) {
                console.warn('[TTSEngine] Background cache failed:', error)
            }
        })()
    }

    private static async speakWithNative(options: TTSOptions): Promise<void> {
        return new Promise<void>((resolve) => {
            const rate = options.rate ?? 0.9
            const pitch = options.pitch ?? 1.0
            const language = options.language ?? 'en-US'

            this.isSpeaking = true
            options.onStart?.()

            Speech.speak(options.text, {
                rate,
                pitch,
                language,
                onStart: () => {},
                onDone: () => {
                    this.isSpeaking = false
                    options.onDone?.()
                    resolve()
                },
                onStopped: () => {
                    this.isSpeaking = false
                    resolve()
                },
                onError: (error) => {
                    this.isSpeaking = false
                    options.onError?.(new Error(String(error)))
                    resolve()
                },
            })
        })
    }

    private static async speakWithElevenLabs(options: TTSOptions): Promise<void> {
        const voiceId = options.voiceId || 'onwK4e9ZLuTAKqWW03F9'
        const scriptureId = options.scriptureId

        if (scriptureId) {
            const cachedUri = await TTSCache.get(scriptureId, voiceId)
            if (cachedUri) {
                await this.playAudioFile(cachedUri, options)
                return
            }
        }

        const audioUri = await elevenLabsTTSService.speak(options.text, {
            voiceId,
            modelId: 'eleven_flash_v2_5',
        })

        if (scriptureId) {
            try {
                await TTSCache.set(scriptureId, voiceId, audioUri)
            } catch (cacheError) {
                console.warn('Failed to cache TTS audio:', cacheError)
            }

            if (convexTTSService.isAvailable()) {
                convexTTSService.uploadFromLocal(scriptureId, voiceId, audioUri).catch((err) => {
                    console.warn('[TTSEngine] Convex upload failed:', err)
                })
            }
        }

        await this.playAudioFile(audioUri, options)
    }

    private static async speakWithChatterbox(options: TTSOptions): Promise<void> {
        const cacheKey = `cb_${options.chatterboxVoiceId || 'default'}`
        const scriptureId = options.scriptureId

        if (scriptureId) {
            const cachedUri = await TTSCache.get(scriptureId, cacheKey)
            if (cachedUri) {
                await this.playAudioFile(cachedUri, options)
                return
            }
        }

        const audioUri = await chatterboxTTSService.speak(options.text, {
            voiceId: options.chatterboxVoiceId || 'Emily.wav',
            voiceMode: options.chatterboxVoiceMode || 'predefined',
            referenceAudioFilename: options.chatterboxReferenceAudio,
            speed: options.rate,
            language: options.language?.split('-')[0],
        })

        if (scriptureId) {
            try {
                await TTSCache.set(scriptureId, cacheKey, audioUri)
            } catch (cacheError) {
                console.warn('Failed to cache Chatterbox audio:', cacheError)
            }
        }

        await this.playAudioFile(audioUri, options)
    }

    private static async playAudioFile(uri: string, options: TTSOptions): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.isSpeaking = true
            options.onStart?.()

            const player = createAudioPlayer({ uri })
            this.currentPlayer = player

            let resolved = false
            const cleanup = () => {
                if (resolved) return
                resolved = true
                this.isSpeaking = false
                this.currentPlayer = null
                options.onDone?.()
                resolve()
            }

            player.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    cleanup()
                }
            })

            player.play()

            setTimeout(() => {
                if (this.isSpeaking && this.currentPlayer === player) {
                    cleanup()
                }
            }, 60000)
        })
    }
}

convexTTSService.initialize()

export default TTSEngine