import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import useZustandStore from '@/hooks/zustandStore'
import { COLORS } from '@/constants/colors'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import StealthDrill from '@/components/StealthDrill'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import ScriptureScopeBar from '@/components/ScriptureScopeBar'
import VoicePlaybackService from '@/services/voicePlayback'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { Toast } from '@/components/ui/Toast'
import QuickAddCollectionModal from '@/components/QuickAddCollectionModal'
import { useBattleIntel } from '@/hooks/useBattleIntel'
import { useScriptureScope } from '@/hooks/useScriptureScope'
import { usePracticeCompletion } from '@/hooks/usePracticeCompletion'
import { useVerseNavigation } from '@/hooks/useVerseNavigation'

const AUTO_ADVANCE_DELAY = 3000

export default function TrainingPracticeScreen() {
    const {
        scriptures: allScriptures,
        collections,
        isDark,
        theme,
        userSettings,
        userStats,
        versePerformance,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    const initialChapterIds = useMemo(() => {
        const raw = params.chapterIds
        if (!raw) return []
        if (Array.isArray(raw)) {
            return raw.flatMap((id) => id.split(',')).filter(Boolean)
        }
        return raw.split(',').filter(Boolean)
    }, [params.chapterIds])

    const selectedCollection = useMemo(() => {
        const collectionId = params.collectionId as string
        if (!collectionId || !collections) return null
        return collections.find(c => c.id === collectionId) || null
    }, [params.collectionId, collections])

    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>(() => {
        if (initialChapterIds.length > 0) return initialChapterIds
        const collectionId = params.collectionId as string
        if (collectionId && collections) {
            const collection = collections.find(c => c.id === collectionId)
            if (collection?.isChapterBased && collection.chapters) {
                return collection.chapters.map((ch) => ch.id)
            }
        }
        return []
    })

    useEffect(() => {
        if (selectedChapterIds.length === 0 && selectedCollection?.isChapterBased && selectedCollection.chapters) {
            setSelectedChapterIds(selectedCollection.chapters.map((ch) => ch.id))
        }
    }, [selectedCollection?.id])

    const { getDueScriptures } = useZustandStore()
    const trainingMode = (params.mode as 'single' | 'automatic' | 'srs') || 'single'

    const filteredScriptures = useScriptureScope(
        allScriptures,
        selectedCollection,
        selectedChapterIds,
    )

    const scriptures = useMemo(() => {
        if (trainingMode === 'srs') {
            const dueScriptures = getDueScriptures()
            if (dueScriptures.length > 0) return dueScriptures
        }
        return filteredScriptures
    }, [filteredScriptures, trainingMode, getDueScriptures])

    useScreenTracking('training_practice')

    const fadeAnim = useRef(new Animated.Value(1)).current

    const {
        currentScripture,
        setCurrentScripture,
        scriptureRef,
        verseOrder,
        setVerseOrder,
        seqIndex,
        progress,
        isLoading: isLoadingScripture,
        loadNextScripture,
        loadPreviousScripture,
    } = useVerseNavigation({
        scriptures,
        initialOrder: 'random',
        fadeAnim,
    })

    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)
    const [isLooping, setIsLooping] = useState(false)

    useEffect(() => {
        setIsLooping(false)
    }, [currentScripture?.id])

    const {
        isLoadingIntel,
        isListeningIntel,
        intelText,
        handleShowIntel,
        handleListenIntel,
    } = useBattleIntel(() => scriptureRef.current, {
        rate: userSettings?.voiceRate,
        pitch: userSettings?.voicePitch,
        language: userSettings?.language,
    })

    const { totalVP, handleComplete: handleCompletion } = usePracticeCompletion({
        practiceType: 'training',
        isTraining: true,
        awardVP: false,
        saveLog: true,
        updateProfile: true,
        updateSRS: true,
        afterActionBriefing: true,
    })

    // Auto Pilot state
    const [isAutoPlaying, setIsAutoPlaying] = useState(false)
    const [isAutoReading, setIsAutoReading] = useState(false)
    const [autoVersesCount, setAutoVersesCount] = useState(0)
    const [isAutoPaused, setIsAutoPaused] = useState(false)
    const [showQuickAdd, setShowQuickAdd] = useState(false)

    const autoTimerRef = useRef<NodeJS.Timeout | null>(null)
    const isMountedRef = useRef(true)

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
            VoicePlaybackService.stopPlayback()
        }
    }, [])

    // Auto-pilot weighted random advance (uses performance data)
    const autoAdvance = useCallback(() => {
        if (!scriptures || scriptures.length === 0 || !isMountedRef.current) return

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()

        const pickWeighted = () => {
            if (!versePerformance) return null
            const candidates = scriptures.filter(s => !currentScripture || s.id !== currentScripture.id)
            if (candidates.length === 0) return null
            const weights = candidates.map(s => {
                const perf = versePerformance[s.id]
                const weakness = ((perf?.wrong ?? 0) + 1) / ((perf?.seen ?? 0) + 2)
                return Math.max(0.15, Math.min(2.5, weakness * 2.2))
            })
            const total = weights.reduce((sum, w) => sum + w, 0)
            let r = Math.random() * total
            for (let i = 0; i < candidates.length; i++) {
                r -= weights[i]
                if (r <= 0) return candidates[i]
            }
            return candidates[candidates.length - 1]
        }

        const weighted = pickWeighted()
        setCurrentScripture(weighted || scriptures[Math.floor(Math.random() * scriptures.length)])
    }, [scriptures, currentScripture, versePerformance, fadeAnim])

    const playAutoVerse = useCallback(async () => {
        if (!currentScripture || !isMountedRef.current) return

        setIsAutoReading(true)
        try {
            await VoicePlaybackService.playScripture(
                currentScripture.id,
                `${currentScripture.reference}. ${currentScripture.text}`,
                {
                    rate: userSettings.voiceRate || 0.9,
                    pitch: userSettings.voicePitch || 1.0,
                    language: userSettings.language || 'en-US',
                    onStart: () => { if (isMountedRef.current) setIsAutoReading(true) },
                    onDone: () => {
                        if (!isMountedRef.current) return
                        setIsAutoReading(false)
                        setAutoVersesCount(prev => prev + 1)
                        autoTimerRef.current = setTimeout(() => {
                            if (!isMountedRef.current || isAutoPaused) return
                            autoAdvance()
                        }, AUTO_ADVANCE_DELAY)
                    },
                    onError: (error) => {
                        console.error('Auto Pilot playback error:', error)
                        if (isMountedRef.current) setIsAutoReading(false)
                    },
                }
            )
        } catch (error) {
            console.error('Auto Pilot failed:', error)
            setIsAutoReading(false)
        }
    }, [currentScripture, userSettings, isAutoPaused, autoAdvance])

    useEffect(() => {
        if (trainingMode === 'automatic' && isAutoPlaying && !isAutoPaused && currentScripture) {
            playAutoVerse()
        }
    }, [currentScripture, isAutoPlaying, isAutoPaused, trainingMode])

    const handleStartAutoPilot = () => { setIsAutoPlaying(true); setIsAutoPaused(false) }
    const handlePauseAutoPilot = () => {
        setIsAutoPaused(true)
        VoicePlaybackService.stopPlayback()
        setIsAutoReading(false)
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }
    const handleResumeAutoPilot = () => { setIsAutoPaused(false); playAutoVerse() }
    const handleStopAutoPilot = () => {
        setIsAutoPlaying(false); setIsAutoPaused(false); setIsAutoReading(false)
        VoicePlaybackService.stopPlayback()
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }

    // ──────────────────────────────────────
    //  PRACTICE COMPLETE
    // ──────────────────────────────────────

    const handlePracticeComplete = async (transcript: string, accuracy: number) => {
        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'training',
            mode: trainingMode,
            accuracy,
            scripture_id: currentScripture?.id,
            is_training: true,
        })

        if (currentScripture) {
            await handleCompletion(currentScripture, accuracy, transcript)
        }

        setShowStealthDrill(false)

        if (accuracy >= 90) {
            Toast.missionSuccess(`Target Destroyed! ${accuracy.toFixed(1)}% accuracy`)
        } else if (accuracy >= 70) {
            Toast.success('Good Progress!', `${accuracy.toFixed(1)}% accuracy. Keep practicing!`)
        } else {
            Toast.warning('Missed Target!', `${accuracy.toFixed(1)}% accuracy. Recalibrate and try again.`)
        }
    }

    const handleStartStealthPractice = () => {
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_training',
            scripture_id: currentScripture?.id,
        })
    }

    const handleListenVerse = async () => {
        if (!currentScripture) return
        setIsListeningVerse(true)
        try {
            await VoicePlaybackService.playScripture(
                currentScripture.id,
                `${currentScripture.reference}. ${currentScripture.text}`,
                { rate: userSettings.voiceRate || 0.9, pitch: userSettings.voicePitch || 1.0, language: userSettings.language || 'en-US' }
            )
        } finally {
            setIsListeningVerse(false)
        }
    }

    const handleToggleLoop = useCallback(() => {
        setIsLooping(prev => !prev)
    }, [])

    // ──────────────────────────────────────
    //  MODE INFO
    // ──────────────────────────────────────

    const getModeInfo = () => {
        switch (trainingMode) {
            case 'automatic':
                return { title: 'AUTO PILOT', subtitle: 'HANDS-FREE LEARNING', icon: 'infinite' as const, color: theme.accent }
            case 'srs':
                return { title: 'DAILY DEPLOYMENT', subtitle: 'OVERDUE MISSIONS', icon: 'alarm' as const, color: theme.warning }
            default:
                return { title: 'FOCUSED DRILL', subtitle: 'DEEP MEMORIZATION', icon: 'shuffle' as const, color: theme.accent }
        }
    }

    const modeInfo = getModeInfo()
    const showOrderToggle = true

    // ──────────────────────────────────────
    //  RENDER
    // ──────────────────────────────────────

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title={modeInfo.title}
                subtitle={modeInfo.subtitle}
                rightAction={
                    <TouchableOpacity
                        onPress={() => router.replace('/train')}
                        style={styles.headerBackButton}
                    >
                        <Ionicons name="grid" size={20} color={theme.textSecondary} />
                        <ThemedText variant="caption" style={[styles.headerBackText, { color: theme.textSecondary }]}>
                            Modes
                        </ThemedText>
                    </TouchableOpacity>
                }
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Training Mode Indicator */}
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? `${theme.accent}15` : `${theme.accent}10` }]}>
                    <Ionicons name={modeInfo.icon} size={20} color={modeInfo.color} />
                    <ThemedText variant="caption" style={[styles.modeText, { color: modeInfo.color }]}>
                        {trainingMode === 'automatic'
                            ? 'Auto Pilot — Verses read aloud automatically'
                            : trainingMode === 'srs'
                                ? 'Daily Deployment — Review verses due for retention'
                                : 'Focused Drill — Practice at your own pace'}
                    </ThemedText>
                </View>

                {/* Scope Filter + Order Toggle */}
                <ScriptureScopeBar
                    selectedCollection={selectedCollection}
                    selectedChapterIds={selectedChapterIds}
                    onCollectionChange={(collection) => {
                        if (collection) {
                            router.setParams({ collectionId: collection.id })
                        } else {
                            router.setParams({ collectionId: undefined, chapterIds: undefined })
                        }
                    }}
                    onChapterIdsChange={setSelectedChapterIds}
                    verseOrder={verseOrder}
                    onOrderChange={setVerseOrder}
                    isDark={isDark}
                    theme={theme}
                    showOrderToggle={showOrderToggle}
                />

                {/* Sequential Progress */}
                {progress && (
                    <View style={styles.progressRow}>
                        <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                            <View style={[styles.progressFill, { width: `${(progress.current / progress.total) * 100}%`, backgroundColor: COLORS.success }]} />
                        </View>
                        <ThemedText variant="caption" style={styles.progressLabel}>
                            {progress.current} / {progress.total}
                        </ThemedText>
                    </View>
                )}

                {/* ──────── AUTO PILOT UI ──────── */}
                {trainingMode === 'automatic' && (
                    <View style={styles.autoContainer}>
                        {!isAutoPlaying ? (
                            <TouchableOpacity
                                style={[styles.startAutoButton, { backgroundColor: theme.accent }]}
                                onPress={handleStartAutoPilot}
                            >
                                <Ionicons name="play" size={24} color={theme.accentContrastText} />
                                <ThemedText variant="body" style={[styles.startAutoText, { color: theme.accentContrastText }]}>
                                    START AUTO PILOT
                                </ThemedText>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.autoControls}>
                                <View style={styles.autoControlRow}>
                                    {isAutoPaused ? (
                                        <TouchableOpacity
                                            style={[styles.autoControlButton, { backgroundColor: theme.accent }]}
                                            onPress={handleResumeAutoPilot}
                                        >
                                            <Ionicons name="play" size={24} color={theme.accentContrastText} />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.autoControlButton, { backgroundColor: theme.accent }]}
                                            onPress={handlePauseAutoPilot}
                                        >
                                            <Ionicons name="pause" size={24} color={theme.accentContrastText} />
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity
                                        style={[styles.autoControlButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
                                        onPress={() => {
                                            VoicePlaybackService.stopPlayback()
                                            setIsAutoReading(false)
                                            if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
                                            autoAdvance()
                                        }}
                                    >
                                        <Ionicons name="play-skip-forward" size={24} color={theme.text} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.autoControlButton, { borderColor: theme.textSecondary, borderWidth: 1, backgroundColor: 'transparent' }]}
                                        onPress={handleStopAutoPilot}
                                    >
                                        <Ionicons name="stop" size={20} color={theme.textSecondary} />
                                    </TouchableOpacity>
                                </View>
                                {isAutoReading && (
                                    <View style={styles.readingBadge}>
                                        <Ionicons name="volume-high" size={14} color={theme.textSecondary} />
                                        <ThemedText variant="caption" style={{ color: theme.textSecondary, fontWeight: '600' }}>
                                            Reading aloud...
                                        </ThemedText>
                                    </View>
                                )}
                                {autoVersesCount > 0 && (
                                    <ThemedText variant="caption" style={styles.autoStats}>
                                        {autoVersesCount} verse{autoVersesCount !== 1 ? 's' : ''} listened
                                    </ThemedText>
                                )}
                            </View>
                        )}
                    </View>
                )}

                {/* Unified Scripture + Recorder */}
                {currentScripture && (
                    <View style={styles.scriptureSection}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16 }}>
                            <TouchableOpacity
                                disabled={verseOrder === 'sequential' ? seqIndex <= 0 : true}
                                onPress={loadPreviousScripture}
                                style={{ opacity: (verseOrder === 'sequential' && seqIndex <= 0) ? 0.3 : 1, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
                                <ThemedText variant="caption" style={{ marginLeft: 4 }}>{verseOrder === 'sequential' ? 'PREVIOUS' : 'RANDOM'}</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={loadNextScripture}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <ThemedText variant="caption" style={{ marginRight: 4 }}>{verseOrder === 'sequential' ? 'NEXT' : 'NEXT TARGET'}</ThemedText>
                                <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <UnifiedScriptureRecorderCard
                            scripture={currentScripture}
                            onRecordingComplete={(accuracy) => handlePracticeComplete('', accuracy)}
                            onListen={handleListenVerse}
                            isListening={isListeningVerse}
                            intelText={intelText}
                            onIntel={handleShowIntel}
                            onReadIntelAloud={handleListenIntel}
                            isListeningIntel={isListeningIntel}
                            isLoadingIntel={isLoadingIntel}
                            fadeAnim={fadeAnim}
                            isLooping={isLooping}
                            onToggleLoop={handleToggleLoop}
                        />
                        <ScriptureActionRow
                            onStealth={handleStartStealthPractice}
                            onIntel={handleShowIntel}
                            onQuickAddToCollection={() => setShowQuickAdd(true)}
                            isLoadingIntel={isLoadingIntel}
                            accentColor="#EF4444"
                        />
                    </View>
                )}

                {currentScripture && (
                    <StealthDrill
                        isVisible={showStealthDrill}
                        onClose={() => setShowStealthDrill(false)}
                        onComplete={(accuracy: number) => handlePracticeComplete('', accuracy)}
                        targetVerse={currentScripture.text}
                        reference={currentScripture.reference}
                    />
                )}

                {isLoadingScripture && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                )}
            </ScrollView>

            <QuickAddCollectionModal
                isVisible={showQuickAdd}
                scriptureId={currentScripture?.id || null}
                onClose={() => setShowQuickAdd(false)}
            />

        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerBackButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
    headerBackText: { letterSpacing: 1, fontSize: 11 },
    scrollView: { flex: 1 },
    scrollContent: { padding: 16, paddingBottom: 100 },
    modeIndicator: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 16, gap: 8 },
    modeText: { flex: 1 },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 2 },
    progressLabel: { opacity: 0.6, fontWeight: '600', minWidth: 40, textAlign: 'right' },
    scriptureSection: { marginBottom: 24 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    autoContainer: { marginBottom: 20, alignItems: 'center' },
    startAutoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 16, gap: 10, width: '100%', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    startAutoText: { fontWeight: '700', fontSize: 16, letterSpacing: 1 },
    autoControls: { alignItems: 'center', width: '100%' },
    autoControlRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 12 },
    autoControlButton: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
    readingBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    autoStats: { opacity: 0.6 },
})