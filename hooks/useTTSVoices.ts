import { useState, useEffect, useCallback } from 'react'
import elevenLabsTTSService, { ElevenLabsVoice } from '@/services/elevenLabsTTS'
import chatterboxTTSService, { ChatterboxVoice } from '@/services/chatterboxTTS'
import TTSCache from '@/services/ttsCache'
import VoicePlaybackService from '@/services/voicePlayback'
import { useZustandStore } from '@/hooks/zustandStore'
import { TTSEngineType } from '@/types/scripture'

interface TTSVoicesState {
    voices: ElevenLabsVoice[]
    chatterboxVoices: ChatterboxVoice[]
    chatterboxReferenceFiles: string[]
    isLoadingVoices: boolean
    voicesError: string | null
    isCloningVoice: boolean
    cloneProgress: string
    cacheSizeMB: number
    cacheEntryCount: number
    isAvailable: boolean
    chatterboxConnected: boolean
}

export function useTTSVoices() {
    const userSettings = useZustandStore((s) => s.userSettings)
    const saveUserSettings = useZustandStore((s) => s.saveUserSettings)

    const [state, setState] = useState<TTSVoicesState>({
        voices: [],
        chatterboxVoices: [],
        chatterboxReferenceFiles: [],
        isLoadingVoices: false,
        voicesError: null,
        isCloningVoice: false,
        cloneProgress: '',
        cacheSizeMB: 0,
        cacheEntryCount: 0,
        isAvailable: elevenLabsTTSService.isAvailable(),
        chatterboxConnected: false,
    })

    useEffect(() => {
        const syncSettings = () => {
            const isClonedVoice = userSettings.ttsEngine === 'elevenlabs' && userSettings.useClonedVoice && userSettings.clonedVoiceId
            VoicePlaybackService.configureTTS({
                engine: userSettings.ttsEngine || 'native',
                voiceId: isClonedVoice ? userSettings.clonedVoiceId || undefined : userSettings.elevenLabsVoiceId || undefined,
                isClonedVoice: !!isClonedVoice,
                apiKey: userSettings.elevenLabsApiKey,
                voiceRate: userSettings.voiceRate,
                voicePitch: userSettings.voicePitch,
                language: userSettings.language,
                chatterboxServerUrl: userSettings.chatterboxServerUrl,
                chatterboxVoiceId: userSettings.chatterboxVoiceId,
                chatterboxVoiceMode: userSettings.chatterboxVoiceMode,
                chatterboxReferenceAudio: userSettings.chatterboxReferenceAudio,
            })
        }
        syncSettings()
    }, [userSettings.ttsEngine, userSettings.elevenLabsVoiceId, userSettings.elevenLabsApiKey, userSettings.useClonedVoice, userSettings.clonedVoiceId, userSettings.voiceRate, userSettings.voicePitch, userSettings.language, userSettings.chatterboxServerUrl, userSettings.chatterboxVoiceId, userSettings.chatterboxVoiceMode, userSettings.chatterboxReferenceAudio])

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

    const checkChatterboxConnection = useCallback(async () => {
        const serverUrl = userSettings.chatterboxServerUrl
        if (serverUrl) {
            chatterboxTTSService.setServerUrl(serverUrl)
        }
        const connected = await chatterboxTTSService.checkConnection()
        setState((s) => ({
            ...s,
            chatterboxConnected: connected,
            chatterboxVoices: connected ? chatterboxTTSService.getVoices() : [],
            chatterboxReferenceFiles: connected ? chatterboxTTSService.getReferenceAudioFiles() : [],
        }))
        return connected
    }, [userSettings.chatterboxServerUrl])

    const setChatterboxServerUrl = useCallback(async (url: string) => {
        const updated = { ...userSettings, chatterboxServerUrl: url }
        await saveUserSettings(updated)
        chatterboxTTSService.setServerUrl(url)
        if (url) {
            const connected = await chatterboxTTSService.checkConnection()
            setState((s) => ({
                ...s,
                chatterboxConnected: connected,
                chatterboxVoices: connected ? chatterboxTTSService.getVoices() : [],
                chatterboxReferenceFiles: connected ? chatterboxTTSService.getReferenceAudioFiles() : [],
            }))
        } else {
            setState((s) => ({ ...s, chatterboxConnected: false, chatterboxVoices: [], chatterboxReferenceFiles: [] }))
        }
    }, [userSettings, saveUserSettings])

    const setChatterboxVoiceId = useCallback(async (voiceId: string) => {
        const updated = { ...userSettings, chatterboxVoiceId: voiceId }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setChatterboxVoiceMode = useCallback(async (mode: 'predefined' | 'clone') => {
        const updated = { ...userSettings, chatterboxVoiceMode: mode }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const setChatterboxReferenceAudio = useCallback(async (filename: string) => {
        const updated = { ...userSettings, chatterboxReferenceAudio: filename, chatterboxVoiceMode: 'clone' as const }
        await saveUserSettings(updated)
    }, [userSettings, saveUserSettings])

    const uploadChatterboxReferenceAudio = useCallback(async (localFileUri: string, filename: string): Promise<string | null> => {
        try {
            setState((s) => ({ ...s, isCloningVoice: true, cloneProgress: 'Uploading voice sample to Chatterbox...' }))
            const uploadedName = await chatterboxTTSService.uploadReferenceAudio(localFileUri, filename)
            const updated = {
                ...userSettings,
                chatterboxReferenceAudio: uploadedName,
                chatterboxVoiceMode: 'clone' as const,
            }
            await saveUserSettings(updated)
            await chatterboxTTSService.checkConnection()
            setState((s) => ({
                ...s,
                isCloningVoice: false,
                cloneProgress: '',
                chatterboxConnected: true,
                chatterboxVoices: chatterboxTTSService.getVoices(),
                chatterboxReferenceFiles: chatterboxTTSService.getReferenceAudioFiles(),
            }))
            return uploadedName
        } catch (error) {
            console.error('Chatterbox reference audio upload failed:', error)
            setState((s) => ({ ...s, isCloningVoice: false, cloneProgress: '' }))
            throw error
        }
    }, [userSettings, saveUserSettings])

    const deleteChatterboxReferenceAudio = useCallback(async (filename: string) => {
        const deleted = await chatterboxTTSService.deleteReferenceAudio(filename)
        if (deleted) {
            const updated = { ...userSettings }
            if (userSettings.chatterboxReferenceAudio === filename) {
                updated.chatterboxReferenceAudio = undefined
                await saveUserSettings(updated)
            }
            await chatterboxTTSService.checkConnection()
            setState((s) => ({
                ...s,
                chatterboxVoices: chatterboxTTSService.getVoices(),
                chatterboxReferenceFiles: chatterboxTTSService.getReferenceAudioFiles(),
            }))
        }
        return deleted
    }, [userSettings, saveUserSettings])

    const renameChatterboxReferenceAudio = useCallback(async (filename: string, newName: string) => {
        const newFilename = await chatterboxTTSService.renameReferenceAudio(filename, newName)
        if (newFilename) {
            const updated = { ...userSettings }
            if (userSettings.chatterboxReferenceAudio === filename) {
                updated.chatterboxReferenceAudio = newFilename
                await saveUserSettings(updated)
            }
            await chatterboxTTSService.checkConnection()
            setState((s) => ({
                ...s,
                chatterboxVoices: chatterboxTTSService.getVoices(),
                chatterboxReferenceFiles: chatterboxTTSService.getReferenceAudioFiles(),
            }))
        }
        return newFilename
    }, [userSettings, saveUserSettings])

    const previewChatterboxVoice = useCallback(async (voiceId: string) => {
        try {
            const audioUri = await chatterboxTTSService.speak(
                'The Lord is my shepherd, I shall not want.',
                { voiceId, voiceMode: 'predefined' }
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
            console.error('Chatterbox voice preview failed:', error)
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
        chatterboxServerUrl: userSettings.chatterboxServerUrl || '',
        chatterboxVoiceId: userSettings.chatterboxVoiceId || 'Emily.wav',
        chatterboxVoiceMode: userSettings.chatterboxVoiceMode || 'predefined',
        chatterboxReferenceAudio: userSettings.chatterboxReferenceAudio || '',
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
        checkChatterboxConnection,
        setChatterboxServerUrl,
        setChatterboxVoiceId,
        setChatterboxVoiceMode,
        setChatterboxReferenceAudio,
        uploadChatterboxReferenceAudio,
        deleteChatterboxReferenceAudio,
        renameChatterboxReferenceAudio,
        previewChatterboxVoice,
    }
}