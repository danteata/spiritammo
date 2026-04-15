import { useState, useEffect, useCallback } from 'react'
import elevenLabsTTSService, { ElevenLabsVoice } from '@/services/elevenLabsTTS'
import TTSCache from '@/services/ttsCache'
import VoicePlaybackService from '@/services/voicePlayback'
import { useZustandStore } from '@/hooks/zustandStore'
import { TTSEngineType } from '@/types/scripture'

interface TTSVoicesState {
    voices: ElevenLabsVoice[]
    isLoadingVoices: boolean
    voicesError: string | null
    isCloningVoice: boolean
    cloneProgress: string
    cacheSizeMB: number
    cacheEntryCount: number
    isAvailable: boolean
}

export function useTTSVoices() {
    const userSettings = useZustandStore((s) => s.userSettings)
    const saveUserSettings = useZustandStore((s) => s.saveUserSettings)

    const [state, setState] = useState<TTSVoicesState>({
        voices: [],
        isLoadingVoices: false,
        voicesError: null,
        isCloningVoice: false,
        cloneProgress: '',
        cacheSizeMB: 0,
        cacheEntryCount: 0,
        isAvailable: elevenLabsTTSService.isAvailable(),
    })

    useEffect(() => {
        const syncSettings = () => {
            VoicePlaybackService.configureTTS({
                engine: userSettings.ttsEngine || 'native',
                voiceId: userSettings.elevenLabsVoiceId,
                apiKey: userSettings.elevenLabsApiKey,
                voiceRate: userSettings.voiceRate,
                voicePitch: userSettings.voicePitch,
                language: userSettings.language,
            })
        }
        syncSettings()
    }, [userSettings.ttsEngine, userSettings.elevenLabsVoiceId, userSettings.elevenLabsApiKey, userSettings.voiceRate, userSettings.voicePitch, userSettings.language])

    const loadVoices = useCallback(async () => {
        if (!elevenLabsTTSService.isAvailable()) return
        setState((s) => ({ ...s, isLoadingVoices: true, voicesError: null }))
        try {
            const voices = await elevenLabsTTSService.getVoices()
            setState((s) => ({ ...s, voices, isLoadingVoices: false, voicesError: null }))
        } catch (error: any) {
            const msg = error?.message || String(error)
            console.error('Failed to load voices:', msg)
            setState((s) => ({ ...s, voices: [], isLoadingVoices: false, voicesError: msg }))
        }
    }, [])

    const loadCacheInfo = useCallback(async () => {
        try {
            const [sizeMB, count] = await Promise.all([
                TTSCache.getCacheSizeMB(),
                TTSCache.getEntryCount(),
            ])
            setState((s) => ({ ...s, cacheSizeMB: sizeMB, cacheEntryCount: count }))
        } catch (error) {
            console.error('Failed to load cache info:', error)
        }
    }, [])

    useEffect(() => {
        loadCacheInfo()
    }, [])

    const setTTSEngine = useCallback(async (engine: TTSEngineType) => {
        const updated = { ...userSettings, ttsEngine: engine }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setVoiceId = useCallback(async (voiceId: string) => {
        const updated = { ...userSettings, elevenLabsVoiceId: voiceId }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setApiKey = useCallback(async (apiKey: string) => {
        const trimmed = apiKey.replace(/\s/g, '')
        elevenLabsTTSService.setApiKey(trimmed)
        const ttsEngine: TTSEngineType = trimmed ? 'elevenlabs' : 'native'
        const updated = { ...userSettings, elevenLabsApiKey: trimmed, ttsEngine }
        await saveUserSettings(updated)
        setState((s) => ({ ...s, isAvailable: elevenLabsTTSService.isAvailable() }))
        if (trimmed) {
            loadVoices()
        }
    }, [userSettings, saveUserSettings, loadVoices])

    const setVoiceRate = useCallback(async (rate: number) => {
        const updated = { ...userSettings, voiceRate: rate }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setVoicePitch = useCallback(async (pitch: number) => {
        const updated = { ...userSettings, voicePitch: pitch }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setCacheEnabled = useCallback(async (enabled: boolean) => {
        const updated = { ...userSettings, ttsCacheEnabled: enabled }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const cloneVoice = useCallback(async (name: string, sampleFileUris: string[]) => {
        setState((s) => ({ ...s, isCloningVoice: true, cloneProgress: 'Uploading voice sample...' }))
        try {
            const voiceId = await elevenLabsTTSService.cloneVoice(name, sampleFileUris)
            const updated = {
                ...userSettings,
                useClonedVoice: true,
                clonedVoiceId: voiceId,
                elevenLabsVoiceId: voiceId,
            }
            await saveUserSettings(updated)
            setState((s) => ({ ...s, isCloningVoice: false, cloneProgress: '' }))
            await loadVoices()
            return voiceId
        } catch (error) {
            console.error('Voice cloning failed:', error)
            setState((s) => ({ ...s, isCloningVoice: false, cloneProgress: '' }))
            throw error
        }
    }, [userSettings, saveUserSettings, loadVoices])

    const deleteClonedVoice = useCallback(async () => {
        if (!userSettings.clonedVoiceId) return
        try {
            await elevenLabsTTSService.deleteVoice(userSettings.clonedVoiceId)
            const updated = {
                ...userSettings,
                useClonedVoice: false,
                clonedVoiceId: null,
                elevenLabsVoiceId: 'onwK4e9ZLuTAKqWW03F9',
            }
            await saveUserSettings(updated)
            await loadVoices()
        } catch (error) {
            console.error('Failed to delete cloned voice:', error)
            throw error
        }
    }, [userSettings, saveUserSettings, loadVoices])

    const clearCache = useCallback(async () => {
        await TTSCache.clear()
        await loadCacheInfo()
    }, [loadCacheInfo])

    const previewVoice = useCallback(async (voiceId: string) => {
        try {
            const audioUri = await elevenLabsTTSService.speak(
                'The Lord is my shepherd, I shall not want.',
                { voiceId, modelId: 'eleven_flash_v2_5' }
            )
            const { createAudioPlayer } = await import('expo-audio')
            const player = createAudioPlayer({ uri: audioUri })
            player.play()
            player.addListener('playbackStatusUpdate', (status) => {
                if (status.didJustFinish) {
                    player.release()
                }
            })
        } catch (error) {
            console.error('Voice preview failed:', error)
        }
    }, [])

    return {
        ...state,
        ttsEngine: userSettings.ttsEngine || 'native',
        voiceId: userSettings.elevenLabsVoiceId || 'onwK4e9ZLuTAKqWW03F9',
        voiceRate: userSettings.voiceRate,
        voicePitch: userSettings.voicePitch,
        cacheEnabled: userSettings.ttsCacheEnabled ?? true,
        useClonedVoice: userSettings.useClonedVoice ?? false,
        clonedVoiceId: userSettings.clonedVoiceId,
        loadVoices,
        loadCacheInfo,
        setTTSEngine,
        setVoiceId,
        setApiKey,
        setVoiceRate,
        setVoicePitch,
        setCacheEnabled,
        cloneVoice,
        deleteClonedVoice,
        clearCache,
        previewVoice,
    }
}