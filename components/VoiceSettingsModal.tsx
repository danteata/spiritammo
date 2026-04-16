import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
    View, StyleSheet, ScrollView, TouchableOpacity, Text,
    Modal, ActivityIndicator, Alert, TextInput,
} from 'react-native'
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons'
import { ThemedText, ThemedCard } from './Themed'
import { useTTSVoices } from '@/hooks/useTTSVoices'
import { useAudioRecorder, RecordingPresets } from 'expo-audio'
import * as FileSystem from 'expo-file-system/legacy'
import elevenLabsTTSService from '@/services/elevenLabsTTS'
import { TTSEngineType } from '@/types/scripture'

interface VoiceSettingsModalProps {
    visible: boolean
    onClose: () => void
    isDark: boolean
    theme: any
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
    visible, onClose, isDark, theme,
}) => {
    const tts = useTTSVoices()
    const [showApiKeyInput, setShowApiKeyInput] = useState(false)
    const [apiKeyValue, setApiKeyValue] = useState('')
    const [apiKeyError, setApiKeyError] = useState<string | null>(null)
    const [subscriptionTier, setSubscriptionTier] = useState<string | null>(null)
    const [chatterboxUrlInput, setChatterboxUrlInput] = useState(tts.chatterboxServerUrl || 'http://192.168.100.193:8004')
    const [chatterboxConnectionStatus, setChatterboxConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle')
    const [isRecording, setIsRecording] = useState(false)
    const [recordingDuration, setRecordingDuration] = useState(0)
    const [renamingFile, setRenamingFile] = useState<string | null>(null)
    const [renameValue, setRenameValue] = useState('')
    const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)

    useEffect(() => {
        if (visible && tts.ttsEngine === 'chatterbox' && tts.chatterboxServerUrl) {
            tts.checkChatterboxConnection()
        }
    }, [visible])

    useEffect(() => {
        if (visible && tts.isAvailable) {
            tts.loadVoices()
        }
    }, [visible, tts.isAvailable])

    useEffect(() => {
        if (visible && tts.isAvailable) {
            elevenLabsTTSService.getSubscriptionInfo().then((info) => {
                setSubscriptionTier(info.tier)
            }).catch(() => {})
        }
    }, [visible, tts.isAvailable])

    const handleCloneVoice = () => {
        Alert.alert(
            'Clone Your Voice',
            'This will upload a voice sample to create a custom TTS voice. Record a passage first, then it will be uploaded.\n\nThis feature requires an ElevenLabs API key.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Proceed',
                    onPress: () => {
                        Alert.alert('Coming Soon', 'Voice cloning recording flow will be available in a future update. For now, you can set a voice ID manually.')
                    },
                },
            ]
        )
    }

    const handleClearCache = () => {
        Alert.alert(
            'Clear TTS Cache',
            `Delete ${tts.cacheEntryCount} cached audio files (${tts.cacheSizeMB.toFixed(1)} MB)?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => tts.clearCache(),
                },
            ]
        )
    }

    const startChatterboxRecording = useCallback(async () => {
        try {
            const { requestRecordingPermissionsAsync } = await import('expo-audio')
            const { status } = await requestRecordingPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Microphone access is needed to record your voice.')
                return
            }

            await recorder.prepareToRecordAsync()
            await recorder.record()

            setIsRecording(true)
            setRecordingDuration(0)
            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration((d: number) => d + 1)
            }, 1000)
        } catch (error) {
            console.error('Failed to start recording:', error)
            Alert.alert('Recording Error', 'Could not start recording. Please check microphone permissions.')
        }
    }, [recorder])

    const stopChatterboxRecording = useCallback(async () => {
        try {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current)
                recordingTimerRef.current = null
            }

            await recorder.stop()
            setIsRecording(false)

            const uri = recorder.uri
            console.log('[ChatterboxClone] Recording stopped, uri:', uri)
            if (!uri) {
                Alert.alert('Recording Failed', 'No audio was recorded. Please try again.')
                return
            }

            const existingCount = tts.chatterboxReferenceFiles.length
            const filename = existingCount > 0 ? `My Voice ${existingCount + 1}.m4a` : `My Voice.m4a`
            console.log('[ChatterboxClone] Uploading file:', uri, 'as:', filename)

            try {
                const uploadedName = await tts.uploadChatterboxReferenceAudio(uri, filename)
                if (uploadedName) {
                    await tts.setChatterboxReferenceAudio(uploadedName)
                    Alert.alert('Voice Uploaded', 'Your voice clone is ready. Switch to it by tapping the name in the list.')
                }
            } catch (uploadError) {
                console.error('Upload to Chatterbox failed:', uploadError)
                const errMsg = uploadError instanceof Error ? uploadError.message : String(uploadError)
                Alert.alert(
                    'Upload Failed',
                    `Could not upload your recording: ${errMsg}`,
                )
            }
        } catch (error) {
            console.error('Failed to stop recording:', error)
            setIsRecording(false)
        }
    }, [recorder, tts])

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }]}>
                <View style={styles.header}>
                    <ThemedText variant="heading" style={styles.headerTitle}>
                        VOICE SETTINGS
                    </ThemedText>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Feather name="x" size={24} color={theme.text} />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    {/* TTS Engine Selection */}
                    <ThemedCard style={styles.card} variant="default">
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="account-voice" size={20} color={theme.accent} />
                            <ThemedText variant="subheading" style={styles.cardTitle}>
                                VOICE ENGINE
                            </ThemedText>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                tts.ttsEngine === 'native' && styles.selectedOption,
                                { borderColor: tts.ttsEngine === 'native' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' },
                            ]}
                            onPress={() => tts.setTTSEngine('native')}
                        >
                            <View style={styles.optionHeader}>
                                <View style={styles.optionTitleRow}>
                                    <MaterialCommunityIcons name="robot" size={18} color={tts.ttsEngine === 'native' ? theme.accent : (isDark ? '#888' : '#666')} />
                                    <ThemedText variant="body" style={styles.optionTitle}>Device Voice</ThemedText>
                                </View>
                                {tts.ttsEngine === 'native' && <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />}
                            </View>
                            <ThemedText variant="caption" style={styles.optionDescription}>
                                Built-in text-to-speech. Works offline, no API key needed. Robotic sounding.
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                tts.ttsEngine === 'elevenlabs' && styles.selectedOption,
                                { borderColor: tts.ttsEngine === 'elevenlabs' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' },
                            ]}
                            onPress={() => tts.setTTSEngine('elevenlabs')}
                        >
                            <View style={styles.optionHeader}>
                                <View style={styles.optionTitleRow}>
                                    <MaterialCommunityIcons name="waveform" size={18} color={tts.ttsEngine === 'elevenlabs' ? theme.accent : (isDark ? '#888' : '#666')} />
                                    <ThemedText variant="body" style={styles.optionTitle}>Natural Voice</ThemedText>
                                </View>
                                {tts.ttsEngine === 'elevenlabs' && <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />}
                            </View>
                            <ThemedText variant="caption" style={styles.optionDescription}>
                                Neural text-to-speech via ElevenLabs. Humanlike voices with local + community cloud caching.
                            </ThemedText>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.optionButton,
                                tts.ttsEngine === 'chatterbox' && styles.selectedOption,
                                { borderColor: tts.ttsEngine === 'chatterbox' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)' },
                            ]}
                            onPress={() => tts.setTTSEngine('chatterbox')}
                        >
                            <View style={styles.optionHeader}>
                                <View style={styles.optionTitleRow}>
                                    <MaterialCommunityIcons name="access-point" size={18} color={tts.ttsEngine === 'chatterbox' ? theme.accent : (isDark ? '#888' : '#666')} />
                                    <ThemedText variant="body" style={styles.optionTitle}>Self-Hosted (Chatterbox)</ThemedText>
                                </View>
                                {tts.ttsEngine === 'chatterbox' && <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />}
                            </View>
                            <ThemedText variant="caption" style={styles.optionDescription}>
                                Free, self-hosted TTS with voice cloning. Runs locally via Chatterbox server. No API key needed.
                            </ThemedText>
                        </TouchableOpacity>
                    </ThemedCard>

                    {/* Voice Selection (ElevenLabs) */}
                    {tts.ttsEngine === 'elevenlabs' && (
                        <ThemedCard style={styles.card} variant="default">
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="tune-vertical" size={20} color={theme.accent} />
                                <ThemedText variant="subheading" style={styles.cardTitle}>
                                    VOICE SELECTION
                                </ThemedText>
                                {subscriptionTier && (
                                    <View style={[styles.tierBadge, { backgroundColor: subscriptionTier === 'free_tier' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)' }]}>
                                        <ThemedText variant="caption" style={{ color: subscriptionTier === 'free_tier' ? '#ef4444' : '#22c55e', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 }}>
                                            {subscriptionTier === 'free_tier' ? 'FREE' : 'PRO'}
                                        </ThemedText>
                                    </View>
                                )}
                            </View>

                            {subscriptionTier === 'free_tier' && (
                                <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(234,179,8,0.1)' : 'rgba(234,179,8,0.08)', borderColor: 'rgba(234,179,8,0.3)' }]}>
                                    <MaterialCommunityIcons name="information-outline" size={16} color="#eab308" />
                                    <ThemedText variant="caption" style={styles.infoBoxText}>
                                        Free plan: only premade voices are available. Library voices require a paid subscription.
                                    </ThemedText>
                                </View>
                            )}

                            {!tts.isAvailable && (
                                <View style={styles.apiKeySection}>
                                    <ThemedText variant="body" style={styles.sectionText}>
                                        An ElevenLabs API key is required for natural voices. Enter your key below:
                                    </ThemedText>
                                    <TextInput
                                        style={[styles.apiKeyInput, {
                                            backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                            color: theme.text,
                                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                        }]}
                                        value={apiKeyValue}
                                        onChangeText={(text) => { setApiKeyValue(text); setApiKeyError(null) }}
                                        placeholder="xi-xxxxxxxxxxxxxxxxxxxx"
                                        placeholderTextColor={theme.textSecondary}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        secureTextEntry
                                    />
                                    <TouchableOpacity
                                        style={[styles.saveButton, { backgroundColor: theme.accent }]}
                                        onPress={async () => {
                                            const trimmed = apiKeyValue.trim().replace(/\s/g, '')
                                            if (!trimmed) return
                                            if (!trimmed.startsWith('xi_') && !trimmed.startsWith('sk_')) {
                                                setApiKeyError('Key should start with xi_ or sk_')
                                                return
                                            }
                                            setApiKeyError(null)
                                            await tts.setApiKey(trimmed)
                                            setApiKeyValue('')
                                        }}
                                    >
                                        <ThemedText variant="body" style={styles.saveButtonText}>SAVE API KEY</ThemedText>
                                    </TouchableOpacity>
                                    {apiKeyError && (
                                        <ThemedText variant="caption" style={[styles.errorText, { color: theme.error || '#ef4444' }]}>
                                            {apiKeyError}
                                        </ThemedText>
                                    )}
                                </View>
                            )}

                            {tts.isAvailable && (
                                <>
                                    {tts.isLoadingVoices ? (
                                        <ActivityIndicator size="small" color={theme.accent} style={styles.loader} />
                                    ) : tts.voicesError ? (
                                        <View style={[styles.errorBox, { borderColor: theme.error || '#ef4444', backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)' }]}>
                                            <ThemedText variant="caption" style={[styles.errorBoxText, { color: theme.error || '#ef4444' }]}>
                                                {tts.voicesError}
                                            </ThemedText>
                                            <TouchableOpacity onPress={() => tts.loadVoices()} style={[styles.retryButton, { borderColor: theme.error || '#ef4444' }]}>
                                                <ThemedText variant="caption" style={{ color: theme.error || '#ef4444', fontWeight: '700' }}>RETRY</ThemedText>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <View style={styles.voiceList}>
                                            {tts.voices.slice(0, 20).map((voice) => (
                                                <TouchableOpacity
                                                    key={voice.voice_id}
                                                    style={[
                                                        styles.voiceItem,
                                                        {
                                                            backgroundColor: tts.voiceId === voice.voice_id
                                                                ? (isDark ? 'rgba(255,165,0,0.1)' : 'rgba(255,165,0,0.05)')
                                                                : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                                                            borderColor: tts.voiceId === voice.voice_id ? theme.accent : 'transparent',
                                                        },
                                                    ]}
                                                    onPress={() => tts.setVoiceId(voice.voice_id)}
                                                >
                                                    <View style={styles.voiceInfo}>
                                                        <ThemedText variant="body" style={styles.voiceName}>{voice.name}</ThemedText>
                                                        <ThemedText variant="caption" style={styles.voiceCategory}>
                                                            {voice.category}
                                                        </ThemedText>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.previewButton, { borderColor: theme.accent }]}
                                                        onPress={() => tts.previewVoice(voice.voice_id)}
                                                    >
                                                        <MaterialCommunityIcons name="play" size={14} color={theme.accent} />
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    {tts.useClonedVoice && tts.clonedVoiceId && (
                                        <View style={[styles.clonedBadge, { borderColor: theme.accent }]}>
                                            <MaterialCommunityIcons name="account-voice" size={16} color={theme.accent} />
                                            <ThemedText variant="caption" style={[styles.clonedText, { color: theme.accent }]}>
                                                Using your cloned voice
                                            </ThemedText>
                                        </View>
                                    )}

                                    <TouchableOpacity
                                        style={[styles.cloneButton, { borderColor: theme.accent }]}
                                        onPress={handleCloneVoice}
                                    >
                                        <MaterialCommunityIcons name="microphone-plus" size={18} color={theme.accent} />
                                        <ThemedText variant="body" style={{ color: theme.accent }}>
                                            Clone Your Voice
                                        </ThemedText>
                                    </TouchableOpacity>
                                </>
                            )}
                        </ThemedCard>
                    )}

                    {/* Chatterbox Configuration */}
                    {tts.ttsEngine === 'chatterbox' && (
                        <ThemedCard style={styles.card} variant="default">
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="access-point" size={20} color={theme.accent} />
                                <ThemedText variant="subheading" style={styles.cardTitle}>
                                    CHATTERBOX SERVER
                                </ThemedText>
                                <View style={[styles.statusDot, { backgroundColor: tts.chatterboxConnected ? '#22c55e' : '#ef4444' }]} />
                            </View>

                            <View style={styles.apiKeySection}>
                                <ThemedText variant="body" style={styles.sectionText}>
                                    Enter your Chatterbox TTS server URL. The server must be running locally or on your network.
                                </ThemedText>
                                <TextInput
                                    style={[styles.apiKeyInput, {
                                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                        color: theme.text,
                                        borderColor: chatterboxConnectionStatus === 'error' ? '#ef4444' : (chatterboxConnectionStatus === 'connected' ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')),
                                    }]}
                                    value={chatterboxUrlInput}
                                    onChangeText={(text) => { setChatterboxUrlInput(text); setChatterboxConnectionStatus('idle') }}
                                    placeholder="http://192.168.100.193:8004"
                                    placeholderTextColor={theme.textSecondary}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    keyboardType="url"
                                />
                                <TouchableOpacity
                                    style={[styles.saveButton, { backgroundColor: theme.accent }]}
                                    onPress={async () => {
                                        setChatterboxConnectionStatus('checking')
                                        try {
                                            await tts.setChatterboxServerUrl(chatterboxUrlInput)
                                            const connected = await tts.checkChatterboxConnection()
                                            setChatterboxConnectionStatus(connected ? 'connected' : 'error')
                                        } catch {
                                            setChatterboxConnectionStatus('error')
                                        }
                                    }}
                                >
                                    {chatterboxConnectionStatus === 'checking' ? (
                                        <ActivityIndicator size="small" color="#fff" />
                                    ) : (
                                        <ThemedText variant="body" style={styles.saveButtonText}>CONNECT</ThemedText>
                                    )}
                                </TouchableOpacity>
                                {chatterboxConnectionStatus === 'connected' && (
                                    <ThemedText variant="caption" style={[styles.statusText, { color: '#22c55e' }]}>
                                        Connected to Chatterbox server
                                    </ThemedText>
                                )}
                                {chatterboxConnectionStatus === 'error' && (
                                    <ThemedText variant="caption" style={[styles.statusText, { color: '#ef4444' }]}>
                                        Cannot connect. Make sure the server is running.
                                    </ThemedText>
                                )}
                            </View>

                            {tts.chatterboxConnected && (
                                <>
                                    <View style={styles.sectionSpacer} />
                                    <View style={styles.cardHeader}>
                                        <MaterialCommunityIcons name="tune-vertical" size={20} color={theme.accent} />
                                        <ThemedText variant="subheading" style={styles.cardTitle}>
                                            VOICE SELECTION
                                        </ThemedText>
                                    </View>

                                    {/* Voice Mode Toggle */}
                                    <View style={styles.voiceModeRow}>
                                        <TouchableOpacity
                                            style={[
                                                styles.voiceModeButton,
                                                tts.chatterboxVoiceMode === 'predefined' && styles.voiceModeActive,
                                                { borderColor: tts.chatterboxVoiceMode === 'predefined' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }
                                            ]}
                                            onPress={() => tts.setChatterboxVoiceMode('predefined')}
                                        >
                                            <ThemedText variant="caption" style={{ color: tts.chatterboxVoiceMode === 'predefined' ? theme.accent : theme.textSecondary, fontWeight: '600' }}>
                                                PREDEFINED
                                            </ThemedText>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[
                                                styles.voiceModeButton,
                                                tts.chatterboxVoiceMode === 'clone' && styles.voiceModeActive,
                                                { borderColor: tts.chatterboxVoiceMode === 'clone' ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)') }
                                            ]}
                                            onPress={() => tts.setChatterboxVoiceMode('clone')}
                                        >
                                            <ThemedText variant="caption" style={{ color: tts.chatterboxVoiceMode === 'clone' ? theme.accent : theme.textSecondary, fontWeight: '600' }}>
                                                CLONE
                                            </ThemedText>
                                        </TouchableOpacity>
                                    </View>

                                    {tts.chatterboxVoiceMode === 'predefined' ? (
                                        <View style={styles.voiceList}>
                                            {tts.chatterboxVoices.map((voice) => (
                                                <TouchableOpacity
                                                    key={voice.filename}
                                                    style={[
                                                        styles.voiceItem,
                                                        {
                                                            backgroundColor: tts.chatterboxVoiceId === voice.filename
                                                                ? (isDark ? 'rgba(255,165,0,0.1)' : 'rgba(255,165,0,0.05)')
                                                                : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                                                            borderColor: tts.chatterboxVoiceId === voice.filename ? theme.accent : 'transparent',
                                                        },
                                                    ]}
                                                    onPress={() => tts.setChatterboxVoiceId(voice.filename)}
                                                >
                                                    <View style={styles.voiceInfo}>
                                                        <ThemedText variant="body" style={styles.voiceName}>{voice.name}</ThemedText>
                                                        <ThemedText variant="caption" style={styles.voiceCategory}>
                                                            predefined
                                                        </ThemedText>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.previewButton, { borderColor: theme.accent }]}
                                                        onPress={() => tts.previewChatterboxVoice(voice.filename)}
                                                    >
                                                        <MaterialCommunityIcons name="play" size={14} color={theme.accent} />
                                                    </TouchableOpacity>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        <>
                                            <ThemedText variant="caption" style={styles.sectionText}>
                                                Record a voice sample or use an existing recording as reference audio for voice cloning.
                                            </ThemedText>

                                            {(() => {
                                                const predefinedSet = new Set(tts.chatterboxVoices.map(v => v.filename))
                                                const cloneFiles = tts.chatterboxReferenceFiles.filter(f => !predefinedSet.has(f))
                                                return cloneFiles.length > 0 ? (
                                                    <View style={styles.voiceList}>
                                                        {cloneFiles.map((filename) => (
                                                            <View key={filename} style={[
                                                                styles.voiceItem,
                                                                {
                                                                    backgroundColor: tts.chatterboxReferenceAudio === filename
                                                                        ? (isDark ? 'rgba(255,165,0,0.1)' : 'rgba(255,165,0,0.05)')
                                                                        : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                                                                    borderColor: tts.chatterboxReferenceAudio === filename ? theme.accent : 'transparent',
                                                                },
                                                            ]}>
                                                                <TouchableOpacity
                                                                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                                                                    onPress={() => tts.setChatterboxReferenceAudio(filename)}
                                                                >
                                                                    <View style={styles.voiceInfo}>
                                                                        {renamingFile === filename ? (
                                                                            <TextInput
                                                                                style={[styles.renameInput, {
                                                                                    color: theme.text,
                                                                                    backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                                                                                    borderColor: theme.accent,
                                                                                }]}
                                                                                value={renameValue}
                                                                                onChangeText={setRenameValue}
                                                                                autoFocus
                                                                                selectTextOnFocus
                                                                                returnKeyType="done"
                                                                                onSubmitEditing={async () => {
                                                                                    const trimmed = renameValue.trim()
                                                                                    if (trimmed && trimmed !== filename.replace(/\.(wav|mp3)$/i, '')) {
                                                                                        const result = await tts.renameChatterboxReferenceAudio(filename, trimmed)
                                                                                        if (result) await tts.setChatterboxReferenceAudio(result)
                                                                                    }
                                                                                    setRenamingFile(null)
                                                                                }}
                                                                                onBlur={() => setRenamingFile(null)}
                                                                            />
                                                                        ) : (
                                                                            <ThemedText variant="body" style={styles.voiceName}>{
                                                                                filename.replace(/\.(wav|mp3|m4a)$/i, '')
                                                                                    .replace(/^recording-[a-f0-9-]+/, 'Previous Recording')
                                                                                    .replace(/^clone_\d+/, 'Voice Clone')
                                                                                    .replace(/^voice_clone_\d+/, 'Voice Clone')
                                                                            }</ThemedText>
                                                                        )}
                                                                        <ThemedText variant="caption" style={styles.voiceCategory}>
                                                                            your recording
                                                                        </ThemedText>
                                                                    </View>
                                                                </TouchableOpacity>
                                                                <View style={styles.voiceItemActions}>
                                                                    <TouchableOpacity
                                                                        style={[styles.previewButton, { borderColor: theme.accent }]}
                                                                        onPress={() => tts.previewChatterboxVoice(filename)}
                                                                    >
                                                                        <MaterialCommunityIcons name="play" size={14} color={theme.accent} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={[styles.previewButton, { borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]}
                                                                        onPress={() => {
                                                                            setRenameValue(filename.replace(/\.(wav|mp3|m4a)$/i, ''))
                                                                            setRenamingFile(filename)
                                                                        }}
                                                                    >
                                                                        <MaterialCommunityIcons name="pencil" size={14} color={isDark ? '#aaa' : '#666'} />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity
                                                                        style={[styles.previewButton, { borderColor: '#ef4444' }]}
                                                                        onPress={() => {
                                                                            Alert.alert(
                                                                                'Delete Recording',
                                                                                `Remove "${filename.replace(/\.(wav|mp3|m4a)$/i, '')}"?`,
                                                                                [
                                                                                    { text: 'Cancel', style: 'cancel' },
                                                                                    {
                                                                                        text: 'Delete',
                                                                                        style: 'destructive',
                                                                                        onPress: () => tts.deleteChatterboxReferenceAudio(filename),
                                                                                    },
                                                                                ]
                                                                            )
                                                                        }}
                                                                    >
                                                                        <MaterialCommunityIcons name="delete-outline" size={14} color="#ef4444" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null
                                            })()}

                                            {/* Record New Voice Sample */}
                                            {isRecording ? (
                                                <View style={[styles.recordingContainer, { borderColor: '#ef4444' }]}>
                                                    <View style={styles.recordingIndicator}>
                                                        <View style={styles.recordingDot} />
                                                        <ThemedText variant="body" style={{ color: '#ef4444', fontWeight: '600' }}>
                                                            Recording... {recordingDuration}s
                                                        </ThemedText>
                                                    </View>
                                                    <TouchableOpacity
                                                        style={[styles.stopRecordingButton, { backgroundColor: '#ef4444' }]}
                                                        onPress={stopChatterboxRecording}
                                                    >
                                                        <MaterialCommunityIcons name="stop" size={18} color="#fff" />
                                                        <Text style={styles.stopRecordingText}>STOP</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            ) : (
                                                <View style={styles.cloneActions}>
                                                    <TouchableOpacity
                                                        style={[styles.cloneButton, { borderColor: theme.accent }]}
                                                        onPress={startChatterboxRecording}
                                                    >
                                                        <MaterialCommunityIcons name="microphone" size={18} color={theme.accent} />
                                                        <ThemedText variant="body" style={{ color: theme.accent }}>
                                                            Record Voice Sample
                                                        </ThemedText>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </ThemedCard>
                    )}

                    {/* Voice Rate & Pitch */}
                    <ThemedCard style={styles.card} variant="default">
                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="speedometer" size={20} color={theme.accent} />
                            <ThemedText variant="subheading" style={styles.cardTitle}>
                                VOICE SPEED
                            </ThemedText>
                        </View>

                        <View style={styles.stepperRow}>
                            <TouchableOpacity
                                style={[styles.stepperButton, { borderColor: theme.accent }]}
                                onPress={() => tts.setVoiceRate(Math.max(0.5, Math.round((tts.voiceRate - 0.1) * 10) / 10))}
                            >
                                <Text style={[styles.stepperButtonText, { color: theme.accent }]}>−</Text>
                            </TouchableOpacity>
                            <ThemedText variant="heading" style={styles.stepperValue}>
                                {tts.voiceRate.toFixed(1)}x
                            </ThemedText>
                            <TouchableOpacity
                                style={[styles.stepperButton, { borderColor: theme.accent }]}
                                onPress={() => tts.setVoiceRate(Math.min(2.0, Math.round((tts.voiceRate + 0.1) * 10) / 10))}
                            >
                                <Text style={[styles.stepperButtonText, { color: theme.accent }]}>+</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.separator} />

                        <View style={styles.cardHeader}>
                            <MaterialCommunityIcons name="tune" size={20} color={theme.accent} />
                            <ThemedText variant="subheading" style={styles.cardTitle}>
                                VOICE PITCH
                            </ThemedText>
                        </View>

                        <View style={styles.stepperRow}>
                            <TouchableOpacity
                                style={[styles.stepperButton, { borderColor: theme.accent }]}
                                onPress={() => tts.setVoicePitch(Math.max(0.5, Math.round((tts.voicePitch - 0.1) * 10) / 10))}
                            >
                                <Text style={[styles.stepperButtonText, { color: theme.accent }]}>−</Text>
                            </TouchableOpacity>
                            <ThemedText variant="heading" style={styles.stepperValue}>
                                {tts.voicePitch.toFixed(1)}x
                            </ThemedText>
                            <TouchableOpacity
                                style={[styles.stepperButton, { borderColor: theme.accent }]}
                                onPress={() => tts.setVoicePitch(Math.min(2.0, Math.round((tts.voicePitch + 0.1) * 10) / 10))}
                            >
                                <Text style={[styles.stepperButtonText, { color: theme.accent }]}>+</Text>
                            </TouchableOpacity>
                        </View>
                    </ThemedCard>

                    {/* Cache Management */}
                    {tts.ttsEngine === 'elevenlabs' && (
                        <ThemedCard style={styles.card} variant="default">
                            <View style={styles.cardHeader}>
                                <MaterialCommunityIcons name="database" size={20} color={theme.accent} />
                                <ThemedText variant="subheading" style={styles.cardTitle}>
                                    AUDIO CACHE
                                </ThemedText>
                            </View>

                            <View style={styles.cacheRow}>
                                <View style={styles.cacheInfo}>
                                    <ThemedText variant="body" style={styles.settingLabel}>
                                        Cached Audio
                                    </ThemedText>
                                    <ThemedText variant="caption" style={styles.cacheDetails}>
                                        {tts.cacheEntryCount} files • {tts.cacheSizeMB.toFixed(1)} MB
                                    </ThemedText>
                                </View>
                                <TouchableOpacity
                                    style={[styles.clearButton, { borderColor: theme.error || '#ef4444' }]}
                                    onPress={handleClearCache}
                                    disabled={tts.cacheEntryCount === 0}
                                >
                                    <Text style={[styles.clearButtonText, { color: theme.error || '#ef4444', opacity: tts.cacheEntryCount === 0 ? 0.4 : 1 }]}>
                                        CLEAR
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <ThemedText variant="caption" style={styles.cacheHint}>
                                Local cache: verses play instantly without API quota. Cloud cache: shared community audio for all users.
                            </ThemedText>
                        </ThemedCard>
                    )}
                </ScrollView>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    closeButton: {
        padding: 8,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 60,
    },
    card: {
        marginBottom: 16,
        borderRadius: 12,
        padding: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 10,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginLeft: 'auto',
    },
    statusText: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    sectionSpacer: {
        height: 16,
    },
    voiceModeRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    voiceModeButton: {
        flex: 1,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1.5,
        alignItems: 'center',
    },
    voiceModeActive: {
        backgroundColor: 'rgba(255,165,0,0.08)',
    },
    optionButton: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    selectedOption: {
        backgroundColor: 'rgba(255, 165, 0, 0.05)',
    },
    optionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    optionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    activeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    optionDescription: {
        fontSize: 12,
        lineHeight: 16,
        marginLeft: 26,
        opacity: 0.7,
    },
    apiKeySection: {
        gap: 12,
    },
    sectionText: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.8,
    },
    apiKeyInput: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        fontFamily: 'monospace',
    },
    saveButton: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        fontWeight: '700',
        letterSpacing: 1,
    },
    errorText: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    errorBox: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        gap: 8,
    },
    errorBoxText: {
        fontSize: 12,
        lineHeight: 16,
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1.5,
        alignItems: 'center',
        alignSelf: 'flex-start',
    },
    voiceList: {
        gap: 8,
    },
    voiceItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
    },
    voiceInfo: {
        flex: 1,
    },
    voiceName: {
        fontSize: 14,
        fontWeight: '600',
    },
    voiceCategory: {
        fontSize: 11,
        opacity: 0.6,
        textTransform: 'capitalize',
    },
    previewButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clonedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginTop: 12,
    },
    clonedText: {
        fontWeight: '600',
    },
    cloneButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        marginTop: 12,
    },
    recordingContainer: {
        borderWidth: 1.5,
        borderRadius: 8,
        padding: 16,
        marginTop: 12,
        alignItems: 'center',
        gap: 12,
    },
    recordingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    recordingDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
    },
    stopRecordingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    stopRecordingText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    voiceItemActions: {
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
    },
    renameInput: {
        fontSize: 14,
        borderWidth: 1.5,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 4,
        minWidth: 120,
    },
    cloneActions: {
        gap: 8,
        marginTop: 4,
    },
    loader: {
        marginVertical: 20,
    },
    stepperRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    stepperButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperButtonText: {
        fontSize: 22,
        fontWeight: '700',
    },
    stepperValue: {
        fontSize: 28,
        fontWeight: '800',
        minWidth: 70,
        textAlign: 'center',
    },
    separator: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 12,
    },
    cacheRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cacheInfo: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    cacheDetails: {
        fontSize: 12,
        opacity: 0.7,
    },
    clearButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1.5,
    },
    clearButtonText: {
        fontWeight: '700',
        letterSpacing: 1,
        fontSize: 12,
    },
    cacheHint: {
        fontSize: 11,
        opacity: 0.6,
        lineHeight: 16,
        marginTop: 8,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 12,
    },
    infoBoxText: {
        flex: 1,
        lineHeight: 16,
    },
})