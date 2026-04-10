import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Animated,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { COLORS } from '@/constants/colors'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import StealthDrill from '@/components/StealthDrill'
import UnifiedScriptureRecorderCard from '@/components/UnifiedScriptureRecorderCard'
import ScriptureActionRow from '@/components/ScriptureActionRow'
import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import VoicePlaybackService from '@/services/voicePlayback'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { practiceLogService } from '@/services/practiceLogService'
import { generateBattleIntel } from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'
import ValorPointsService from '@/services/valorPoints'
import { Toast } from '@/components/ui/Toast'
import QuickAddCollectionModal from '@/components/QuickAddCollectionModal'

const AUTO_ADVANCE_DELAY = 3000 // ms delay between auto-pilot verses

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

    // Initialize selectedChapterIds directly from params or all chapters if collection is chapter-based
    const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>(() => {
        // If chapter IDs were explicitly passed, use them
        if (initialChapterIds.length > 0) {
            return initialChapterIds
        }
        // Otherwise, if we have a collection ID, try to get all chapter IDs
        const collectionId = params.collectionId as string
        if (collectionId && collections) {
            const collection = collections.find(c => c.id === collectionId)
            if (collection?.isChapterBased && collection.chapters) {
                return collection.chapters.map((ch) => ch.id)
            }
        }
        return []
    })
    
    // Update selectedChapterIds when collection loads (for when no chapterIds were passed and collections weren't available at init)
    useEffect(() => {
        if (selectedChapterIds.length === 0 && selectedCollection?.isChapterBased && selectedCollection.chapters) {
            setSelectedChapterIds(selectedCollection.chapters.map((ch) => ch.id))
        }
    }, [selectedCollection?.id])
    const [showChapterSelector, setShowChapterSelector] = useState(false)

    // Determine working set of scriptures based on collection selection
    const scriptures = useMemo(() => {
        if (!selectedCollection) return allScriptures

        // collection.scriptures is an array of IDs. We need to map them back to the actual scripture objects.
        const mappedScriptures = selectedCollection.scriptures
            .map(id => allScriptures.find(s => s.id === id))
            .filter((s): s is Scripture => s !== undefined)

        if (
            selectedCollection.isChapterBased &&
            selectedCollection.chapters &&
            selectedChapterIds.length > 0
        ) {
            const selectedIds = new Set(
                selectedCollection.chapters
                    .filter((ch) => selectedChapterIds.includes(ch.id))
                    .flatMap((ch) => ch.scriptures)
            )
            const filtered = mappedScriptures.filter(s => selectedIds.has(s.id))
            return filtered.length > 0 ? filtered : mappedScriptures
        }

        return mappedScriptures.length > 0 ? mappedScriptures : allScriptures
    }, [allScriptures, selectedCollection, selectedChapterIds])

    // Track screen view
    useScreenTracking('training_practice')

    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [trainingMode] = useState<'single' | 'burst' | 'automatic' | 'collection'>(
        (params.mode as 'single' | 'burst' | 'automatic' | 'collection') || 'single'
    )
    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isLoadingScripture, setIsLoadingScripture] = useState(false)
    const [isLoadingIntel, setIsLoadingIntel] = useState(false)
    const [isListeningVerse, setIsListeningVerse] = useState(false)
    const [isListeningIntel, setIsListeningIntel] = useState(false)
    const [tacticalIntel, setTacticalIntel] = useState<{ battlePlan: string; tacticalNotes: string } | null>(null)
    const [history, setHistory] = useState<Scripture[]>([])
    const [historyIndex, setHistoryIndex] = useState(-1)

    // Burst mode state
    const [burstQueue, setBurstQueue] = useState<Scripture[]>([])
    const [burstIndex, setBurstIndex] = useState(0)
    const [isBurstActive, setIsBurstActive] = useState(false)
    const [burstScore, setBurstScore] = useState({ correct: 0, total: 0 })

    // Auto Pilot state
    const [isAutoPlaying, setIsAutoPlaying] = useState(false)
    const [isAutoReading, setIsAutoReading] = useState(false)
    const [autoVersesCount, setAutoVersesCount] = useState(0)
    const [isAutoPaused, setIsAutoPaused] = useState(false)
    const [showQuickAdd, setShowQuickAdd] = useState(false)

    // Refs
    const burstTimerRef = useRef<NodeJS.Timeout | null>(null)
    const autoTimerRef = useRef<NodeJS.Timeout | null>(null)
    const fadeAnim = useRef(new Animated.Value(1)).current
    const isMountedRef = useRef(true)

    // Cleanup on unmount
    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            if (burstTimerRef.current) clearTimeout(burstTimerRef.current)
            if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
            VoicePlaybackService.stopPlayback()
        }
    }, [])

    // Load a random scripture for practice
    const loadRandomScripture = useCallback(() => {
        if (!scriptures || scriptures.length === 0 || !isMountedRef.current) return

        setIsLoadingScripture(true)

        const pickWeighted = () => {
            // Prefer weak verses in automatic/collection modes
            if (!(trainingMode === 'automatic' || trainingMode === 'collection')) return null
            if (!versePerformance) return null

            const candidates = scriptures.filter(s => !currentScripture || s.id !== currentScripture.id)
            if (candidates.length === 0) return null

            const weights = candidates.map(s => {
                const perf = versePerformance[s.id]
                const seen = perf?.seen ?? 0
                const wrong = perf?.wrong ?? 0
                const weakness = (wrong + 1) / (seen + 2) // 0..1-ish, higher = weaker
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
        let nextScripture: Scripture
        if (weighted) {
            nextScripture = weighted
        } else if (scriptures.length > 1) {
            let randomIndex = Math.floor(Math.random() * scriptures.length)
            while (currentScripture && scriptures[randomIndex].id === currentScripture.id) {
                randomIndex = Math.floor(Math.random() * scriptures.length)
            }
            nextScripture = scriptures[randomIndex]
        } else {
            nextScripture = scriptures[0]
        }

        // Animated transition
        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()

        setCurrentScripture(nextScripture)
        setHistory(prev => [...prev.slice(0, historyIndex + 1), nextScripture])
        setHistoryIndex(prev => prev + 1)
        setIsLoadingScripture(false)
    }, [scriptures, currentScripture, historyIndex, trainingMode, versePerformance])

    const loadPreviousScripture = useCallback(() => {
        if (historyIndex <= 0) return

        const prevScripture = history[historyIndex - 1]

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()

        setCurrentScripture(prevScripture)
        setHistoryIndex(prev => prev - 1)
    }, [history, historyIndex])

    // ──────────────────────────────────────
    //  BURST MODE
    // ──────────────────────────────────────

    const initBurstMode = useCallback(() => {
        if (!scriptures || scriptures.length === 0) return

        const shuffled = [...scriptures].sort(() => Math.random() - 0.5)
        const burstCount = Math.min(7, shuffled.length)
        const selectedVerses = shuffled.slice(0, burstCount)

        setBurstQueue(selectedVerses)
        setBurstIndex(0)
        setCurrentScripture(selectedVerses[0])
        setIsBurstActive(true)
        setBurstScore({ correct: 0, total: 0 })
        setTacticalIntel(null)
    }, [scriptures])

    const nextBurstVerse = useCallback((wasCorrect: boolean) => {
        const newScore = {
            correct: burstScore.correct + (wasCorrect ? 1 : 0),
            total: burstScore.total + 1,
        }
        setBurstScore(newScore)
        setTacticalIntel(null)

        const nextIdx = burstIndex + 1
        if (nextIdx < burstQueue.length) {
            // Animate transition
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start()

            setBurstIndex(nextIdx)
            setCurrentScripture(burstQueue[nextIdx])
        } else {
            // Burst complete
            setIsBurstActive(false)
            Alert.alert(
                'Burst Complete! 🔥',
                `You scored ${newScore.correct}/${burstQueue.length}!`,
                [
                    { text: 'New Burst', onPress: initBurstMode },
                    { text: 'Exit', onPress: () => router.back() },
                ]
            )
        }
    }, [burstScore, burstIndex, burstQueue, initBurstMode, router])

    const skipBurstVerse = useCallback(() => {
        nextBurstVerse(false)
    }, [nextBurstVerse])

    // ──────────────────────────────────────
    //  AUTO PILOT MODE
    // ──────────────────────────────────────

    const playAutoVerse = useCallback(async () => {
        if (!currentScripture || !isMountedRef.current) return

        setIsAutoReading(true)

        try {
            const textToRead = `${currentScripture.reference}. ${currentScripture.text}`

            await VoicePlaybackService.playScripture(
                currentScripture.id,
                textToRead,
                {
                    rate: userSettings.voiceRate || 0.9,
                    pitch: userSettings.voicePitch || 1.0,
                    language: userSettings.language || 'en-US',
                    onStart: () => {
                        if (isMountedRef.current) setIsAutoReading(true)
                    },
                    onDone: () => {
                        if (!isMountedRef.current) return
                        setIsAutoReading(false)
                        setAutoVersesCount(prev => prev + 1)

                        // Auto-advance after delay
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
    }, [currentScripture, userSettings, isAutoPaused])


    const autoAdvance = useCallback(() => {
        if (!scriptures || scriptures.length === 0 || !isMountedRef.current) return

        Animated.sequence([
            Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        ]).start()

        const randomIndex = Math.floor(Math.random() * scriptures.length)
        const nextScripture = scriptures[randomIndex]
        
        setCurrentScripture(nextScripture)
        setHistory(prev => [...prev.slice(0, historyIndex + 1), nextScripture])
        setHistoryIndex(prev => prev + 1)
    }, [scriptures, historyIndex])

    // Start auto-play when scripture changes in auto mode
    useEffect(() => {
        if (trainingMode === 'automatic' && isAutoPlaying && !isAutoPaused && currentScripture) {
            playAutoVerse()
        }
    }, [currentScripture, isAutoPlaying, isAutoPaused, trainingMode])

    const handleStartAutoPilot = () => {
        setIsAutoPlaying(true)
        setIsAutoPaused(false)
    }

    const handlePauseAutoPilot = () => {
        setIsAutoPaused(true)
        VoicePlaybackService.stopPlayback()
        setIsAutoReading(false)
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }

    const handleResumeAutoPilot = () => {
        setIsAutoPaused(false)
        playAutoVerse()
    }

    const handleStopAutoPilot = () => {
        setIsAutoPlaying(false)
        setIsAutoPaused(false)
        setIsAutoReading(false)
        VoicePlaybackService.stopPlayback()
        if (autoTimerRef.current) clearTimeout(autoTimerRef.current)
    }

    // ──────────────────────────────────────
    //  INITIALIZATION
    // ──────────────────────────────────────

    useEffect(() => {
        if (!scriptures || scriptures.length === 0) return

        if (trainingMode === 'burst') {
            initBurstMode()
            return
        }

        const randomIndex = Math.floor(Math.random() * scriptures.length)
        const nextScripture = scriptures[randomIndex]
        setCurrentScripture(nextScripture)
        setHistory([nextScripture])
        setHistoryIndex(0)
    }, [scriptures, trainingMode, initBurstMode])

    // ──────────────────────────────────────
    //  PRACTICE COMPLETE HANDLER
    // ──────────────────────────────────────

    const handlePracticeComplete = async (transcript: string, accuracy: number) => {
        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'training',
            mode: trainingMode,
            accuracy: accuracy,
            scripture_id: currentScripture?.id,
            is_training: true,
        })

        // Save mission log
        if (currentScripture) {
            await practiceLogService.saveLog({
                scriptureId: currentScripture.id,
                accuracy: accuracy,
                transcription: transcript,
            })

            // Update military profile with session stats
            await militaryRankingService.updateProfile({
                versesMemorized: userStats?.totalPracticed || 0,
                averageAccuracy: userStats?.averageAccuracy || 0,
                consecutiveDays: userStats?.streak || 0,
                lastSessionAccuracy: accuracy,
                lastSessionWordCount: currentScripture.text.split(' ').length
            })
        }

        setShowStealthDrill(false)

        if (trainingMode === 'burst' && isBurstActive) {
            // In burst mode, advance to next verse
            nextBurstVerse(accuracy >= 70)
            return
        }

        // Single mode feedback
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
                {
                    rate: userSettings.voiceRate || 0.9,
                    pitch: userSettings.voicePitch || 1.0,
                    language: userSettings.language || 'en-US',
                }
            )
        } finally {
            setIsListeningVerse(false)
        }
    }

    const handleListenIntel = async () => {
        if (!currentScripture) return
        setIsListeningIntel(true)
        try {
            let intel = tacticalIntel
            if (!intel) {
                setIsLoadingIntel(true)
                intel = await generateBattleIntel({
                    reference: currentScripture.reference,
                    text: currentScripture.text
                })
                setTacticalIntel(intel)
                setIsLoadingIntel(false)
                await militaryRankingService.recordIntelGenerated()
            }
            await VoicePlaybackService.playTextToSpeech(`${intel.battlePlan}. ${intel.tacticalNotes}`, {
                rate: userSettings.voiceRate || 0.9,
                pitch: userSettings.voicePitch || 1.0,
                language: userSettings.language || 'en-US',
            })
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsListeningIntel(false)
            setIsLoadingIntel(false)
        }
    }

    const handleShowIntel = async () => {
        if (!currentScripture) return

        setIsLoadingIntel(true)
        try {
            const intel = await generateBattleIntel({
                reference: currentScripture.reference,
                text: currentScripture.text
            })
            setTacticalIntel(intel)
            await militaryRankingService.recordIntelGenerated()
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsLoadingIntel(false)
        }
    }

    // ──────────────────────────────────────
    //  MODE TITLE & SUBTITLE
    // ──────────────────────────────────────

    const getModeInfo = () => {
        switch (trainingMode) {
            case 'burst':
                return { title: 'BURST FIRE', subtitle: 'RAPID-FIRE DRILL', icon: 'flash' as const, color: COLORS.success }
            case 'automatic':
                return { title: 'AUTO PILOT', subtitle: 'HANDS-FREE LEARNING', icon: 'infinite' as const, color: theme.accent }
            default:
                return { title: 'SINGLE FOCUS', subtitle: 'DEEP MEMORIZATION', icon: 'eye' as const, color: theme.textSecondary }
        }
    }

    const modeInfo = getModeInfo()

    // ──────────────────────────────────────
    //  RENDER
    // ──────────────────────────────────────

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title={modeInfo.title}
                subtitle={modeInfo.subtitle}
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Training Mode Indicator */}
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? `${theme.accent}15` : `${theme.accent}10` }]}>
                    <Ionicons name={modeInfo.icon} size={20} color={modeInfo.color} />
                    <ThemedText variant="caption" style={[styles.modeText, { color: modeInfo.color }]}>
                        {trainingMode === 'automatic'
                            ? 'Auto Pilot — Verses read aloud automatically'
                            : trainingMode === 'burst'
                                ? `Burst Fire — ${isBurstActive ? `Target ${burstIndex + 1} of ${burstQueue.length}` : 'Loading Ammunition...'}`
                                : 'Training Mode — No Valor points affected'}
                    </ThemedText>
                </View>

                {selectedCollection && (
                    <View style={styles.collectionMeta}>
                        <View style={[styles.collectionHeader, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                            <Ionicons name="book" size={16} color={theme.accent} />
                            <ThemedText variant="body" style={styles.collectionName}>
                                {selectedCollection.name}
                            </ThemedText>
                        </View>

                        {selectedCollection.isChapterBased && selectedCollection.chapters && (
                            <TouchableOpacity
                                style={[styles.chapterFilter, { backgroundColor: theme.surface, borderColor: theme.border }]}
                                onPress={() => setShowChapterSelector(true)}
                            >
                                <Ionicons name="layers" size={14} color={theme.textSecondary} />
                                <ThemedText variant="caption" style={styles.chapterFilterText}>
                                    {selectedChapterIds.length === selectedCollection.chapters.length
                                        ? 'All Chapters'
                                        : `${selectedChapterIds.length} Chapter${selectedChapterIds.length !== 1 ? 's' : ''} Selected`}
                                </ThemedText>
                                <Ionicons name="chevron-forward" size={12} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* ──────── BURST MODE UI ──────── */}
                {trainingMode === 'burst' && isBurstActive && (
                    <View style={styles.burstContainer}>
                        {/* Burst Progress Bar */}
                        <View style={styles.burstProgress}>
                            <View style={styles.burstProgressHeader}>
                                <ThemedText variant="caption" style={styles.burstProgressLabel}>
                                    PROGRESS
                                </ThemedText>
                                <ThemedText variant="caption" style={styles.burstScoreLabel}>
                                    Score: {burstScore.correct}/{burstQueue.length}
                                </ThemedText>
                            </View>
                            <View style={[styles.burstProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
                                <View
                                    style={[
                                        styles.burstProgressFill,
                                        {
                                            width: `${((burstIndex + 1) / burstQueue.length) * 100}%`,
                                            backgroundColor: '#22C55E',
                                        },
                                    ]}
                                />
                            </View>
                            {/* Dot indicators */}
                            <View style={styles.burstDots}>
                                {burstQueue.map((_, idx) => (
                                    <View
                                        key={idx}
                                        style={[
                                            styles.burstDot,
                                            {
                                                backgroundColor:
                                                    idx < burstIndex
                                                        ? theme.success
                                                        : idx === burstIndex
                                                            ? theme.warning
                                                            : isDark
                                                                ? 'rgba(255,255,255,0.2)'
                                                                : 'rgba(0,0,0,0.1)',
                                            },
                                        ]}
                                    />
                                ))}
                            </View>
                        </View>
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
                    <Animated.View style={[styles.scriptureSection, { opacity: fadeAnim }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 16 }}>
                            <TouchableOpacity
                                disabled={historyIndex <= 0}
                                onPress={loadPreviousScripture}
                                style={{ opacity: historyIndex <= 0 ? 0.3 : 1, flexDirection: 'row', alignItems: 'center' }}
                            >
                                <Ionicons name="arrow-back" size={16} color={theme.textSecondary} />
                                <ThemedText variant="caption" style={{ marginLeft: 4 }}>PREVIOUS TARGET</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={loadRandomScripture}
                                style={{ flexDirection: 'row', alignItems: 'center' }}
                            >
                                <ThemedText variant="caption" style={{ marginRight: 4 }}>NEXT TARGET</ThemedText>
                                <Ionicons name="arrow-forward" size={16} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <UnifiedScriptureRecorderCard
                            scripture={currentScripture}
                            onRecordingComplete={(accuracy) => handlePracticeComplete('', accuracy)}
                            onListen={handleListenVerse}
                            isListening={isListeningVerse}
                            intelText={tacticalIntel ? `${tacticalIntel.battlePlan}\n\n${tacticalIntel.tacticalNotes}` : undefined}
                            onIntel={handleShowIntel}
                            onReadIntelAloud={handleListenIntel}
                            isListeningIntel={isListeningIntel}
                        />
                        <ScriptureActionRow
                            onStealth={handleStartStealthPractice}
                            onIntel={handleShowIntel}
                            onQuickAddToCollection={() => setShowQuickAdd(true)}
                            isLoadingIntel={isLoadingIntel}
                            accentColor="#EF4444"
                        />
                    </Animated.View>
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

            {selectedCollection?.isChapterBased && selectedCollection.chapters && (
                <CollectionChapterSelector
                    isVisible={showChapterSelector}
                    collection={selectedCollection}
                    onClose={() => setShowChapterSelector(false)}
                    initialSelectedChapterIds={selectedChapterIds}
                    actionLabel="APPLY SELECTION"
                    onStartPractice={(chapterIds) => {
                        setSelectedChapterIds(chapterIds)
                        chapterIds.forEach((chapterId) => {
                            const chapter = selectedCollection.chapters?.find((ch) => ch.id === chapterId)
                            trackEvent(AnalyticsEventType.CHAPTER_SELECTED, {
                                chapter_id: chapterId,
                                collection_id: selectedCollection.id,
                                verse_count: chapter?.scriptures.length,
                            })
                        })
                    }}
                />
            )}

        </ThemedContainer>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    modeText: {
        flex: 1,
    },
    collectionMeta: {
        gap: 10,
        marginBottom: 16,
    },
    collectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    collectionName: {
        flex: 1,
        fontWeight: '600',
    },
    chapterFilter: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
    },
    chapterFilterText: {
        flex: 1,
        opacity: 0.8,
    },
    scriptureSection: {
        marginBottom: 24,
    },
    scriptureCard: {
        padding: 20,
        borderRadius: 16,
    },
    reference: {
        fontSize: 14,
        opacity: 0.7,
        marginBottom: 8,
    },
    text: {
        fontSize: 16,
        lineHeight: 24,
    },
    sectionTitle: {
        fontSize: 12,
        letterSpacing: 1.5,
        opacity: 0.7,
        marginBottom: 12,
    },
    practiceOptions: {
        marginBottom: 24,
    },
    optionCard: {
        marginBottom: 12,
    },
    optionInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 16,
    },
    optionContent: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 14,
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 12,
        opacity: 0.7,
    },
    practiceSection: {
        marginBottom: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },

    // ── Burst Mode ──
    burstContainer: {
        marginBottom: 16,
    },
    burstProgress: {
        marginBottom: 8,
    },
    burstProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    burstProgressLabel: {
        letterSpacing: 1,
        opacity: 0.7,
    },
    burstScoreLabel: {
        fontWeight: '700',
    },
    burstProgressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    burstProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    burstDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
    },
    burstDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },

    // ── Auto Pilot Mode ──
    autoContainer: {
        marginBottom: 20,
        alignItems: 'center',
    },
    startAutoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 16,
        gap: 10,
        width: '100%',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    startAutoText: {
        fontWeight: '700',
        fontSize: 16,
        letterSpacing: 1,
    },
    autoControls: {
        alignItems: 'center',
        width: '100%',
    },
    autoControlRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
        marginBottom: 12,
    },
    autoControlButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    readingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    autoStats: {
        opacity: 0.6,
    },
})
