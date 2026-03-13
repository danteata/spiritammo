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
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import TargetPractice from '@/components/TargetPractice'
import StealthDrill from '@/components/StealthDrill'
import AmmunitionCard from '@/components/AmmunitionCard'
import VoicePlaybackService from '@/services/voicePlayback'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import { practiceLogService } from '@/services/practiceLogService'
import { generateBattleIntel } from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'
import ValorPointsService from '@/services/valorPoints'

const AUTO_ADVANCE_DELAY = 3000 // ms delay between auto-pilot verses

export default function TrainingPracticeScreen() {
    const {
        scriptures: allScriptures,
        collections,
        isDark,
        theme,
        userSettings,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Determine working set of scriptures based on collection selection
    const scriptures = useMemo(() => {
        const collectionId = params.collectionId as string
        if (!collectionId || !collections) return allScriptures

        const collection = collections.find(c => c.id === collectionId)
        if (!collection) return allScriptures

        // collection.scriptures is an array of IDs. We need to map them back to the actual scripture objects.
        const mappedScriptures = collection.scriptures
            .map(id => allScriptures.find(s => s.id === id))
            .filter((s): s is Scripture => s !== undefined)

        return mappedScriptures.length > 0 ? mappedScriptures : allScriptures
    }, [allScriptures, collections, params.collectionId])

    // Track screen view
    useScreenTracking('training_practice')

    const [currentScripture, setCurrentScripture] = useState<Scripture | null>(null)
    const [practiceMode, setPracticeMode] = useState<'VOICE' | 'STEALTH' | null>(null)
    const [trainingMode] = useState<'single' | 'burst' | 'automatic' | 'collection'>(
        (params.mode as 'single' | 'burst' | 'automatic' | 'collection') || 'single'
    )
    const [showTargetPractice, setShowTargetPractice] = useState(false)
    const [showStealthDrill, setShowStealthDrill] = useState(false)
    const [isLoadingScripture, setIsLoadingScripture] = useState(false)
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

        // Find a random scripture not equal to current if possible
        let nextScripture: Scripture
        if (scriptures.length > 1) {
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
    }, [scriptures, currentScripture, historyIndex])

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
        setPracticeMode(null)
    }, [scriptures])

    const nextBurstVerse = useCallback((wasCorrect: boolean) => {
        const newScore = {
            correct: burstScore.correct + (wasCorrect ? 1 : 0),
            total: burstScore.total + 1,
        }
        setBurstScore(newScore)

        const nextIdx = burstIndex + 1
        if (nextIdx < burstQueue.length) {
            // Animate transition
            Animated.sequence([
                Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
                Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
            ]).start()

            setBurstIndex(nextIdx)
            setCurrentScripture(burstQueue[nextIdx])
            setPracticeMode(null)
        } else {
            // Burst complete
            setIsBurstActive(false)
            Alert.alert(
                'Burst Complete! 🔥',
                `You scored ${newScore.correct}/${newScore.total}!`,
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
        setCurrentScripture(scriptures[randomIndex])
    }, [scriptures])

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
        if (trainingMode === 'burst') {
            initBurstMode()
        } else {
            loadRandomScripture()
        }
    }, [])

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

        setShowTargetPractice(false)
        setShowStealthDrill(false)
        setPracticeMode(null)

        if (trainingMode === 'burst' && isBurstActive) {
            // In burst mode, advance to next verse
            nextBurstVerse(accuracy >= 70)
            return
        }

        // Single mode feedback
        if (accuracy >= 90) {
            Alert.alert('Target Destroyed!', `Excellent marksmanship! ${accuracy}% accuracy`, [
                { text: 'Engage Next Target', onPress: loadRandomScripture },
                { text: 'Try Again', onPress: () => { } },
                { text: 'Ready for Battle', onPress: () => router.push('/battle') },
            ])
        } else if (accuracy >= 70) {
            Alert.alert('Good Progress!', `Keep practicing! ${accuracy}% accuracy`, [
                { text: 'Next Target', onPress: loadRandomScripture },
                { text: 'Try Again', onPress: () => { } },
            ])
        } else {
            Alert.alert('Missed Target!', `Recalibrate and fire again. ${accuracy}% accuracy`, [
                { text: 'Retry Drill', onPress: () => { } },
                { text: 'Next Target', onPress: loadRandomScripture },
            ])
        }
    }

    const handleStartVoicePractice = () => {
        setPracticeMode('VOICE')
        setShowTargetPractice(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'voice_training',
            scripture_id: currentScripture?.id,
        })
    }

    const handleStartStealthPractice = () => {
        setPracticeMode('STEALTH')
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_training',
            scripture_id: currentScripture?.id,
        })
    }

    // ──────────────────────────────────────
    //  MODE TITLE & SUBTITLE
    // ──────────────────────────────────────

    const getModeInfo = () => {
        switch (trainingMode) {
            case 'burst':
                return { title: 'BURST FIRE', subtitle: 'RAPID-FIRE DRILL', icon: 'flash' as const, color: '#22C55E' }
            case 'automatic':
                return { title: 'AUTO PILOT', subtitle: 'HANDS-FREE LEARNING', icon: 'infinite' as const, color: '#A855F7' }
            default:
                return { title: 'SINGLE FOCUS', subtitle: 'DEEP MEMORIZATION', icon: 'eye' as const, color: '#3B82F6' }
        }
    }

    const modeInfo = getModeInfo()

    const handleShowIntel = async () => {
        if (!currentScripture) return

        setIsLoadingScripture(true)
        try {
            const intel = await generateBattleIntel({
                reference: currentScripture.reference,
                text: currentScripture.text
            })

            Alert.alert(
                'BATTLE INTELLIGENCE 📡',
                `MNEMONIC: ${intel.battlePlan}\n\nTACTICAL NOTES: ${intel.tacticalNotes}`,
                [{ text: 'COPY THAT' }]
            )

            // Record intel generation for rank progress
            await militaryRankingService.recordIntelGenerated()
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert('SYSTEM ERROR', 'Failed to retrieve battle intelligence. Check communications.')
        } finally {
            setIsLoadingScripture(false)
        }
    }

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
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name={modeInfo.icon} size={20} color={modeInfo.color} />
                    <ThemedText variant="caption" style={[styles.modeText, { color: modeInfo.color }]}>
                        {trainingMode === 'automatic'
                            ? 'Auto Pilot — Verses read aloud automatically'
                            : trainingMode === 'burst'
                                ? `Burst Fire — ${isBurstActive ? `Target ${burstIndex + 1} of ${burstQueue.length}` : 'Loading Ammunition...'}`
                                : 'Training Mode — No Valor points affected'}
                    </ThemedText>
                </View>

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
                                    Score: {burstScore.correct}/{burstScore.total}
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
                                                        ? '#22C55E'
                                                        : idx === burstIndex
                                                            ? '#FBBF24'
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
                                style={[styles.startAutoButton, { backgroundColor: '#A855F7' }]}
                                onPress={handleStartAutoPilot}
                            >
                                <Ionicons name="play" size={24} color="#FFF" />
                                <ThemedText variant="body" style={styles.startAutoText}>
                                    START AUTO PILOT
                                </ThemedText>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.autoControls}>
                                <View style={styles.autoControlRow}>
                                    {isAutoPaused ? (
                                        <TouchableOpacity
                                            style={[styles.autoControlButton, { backgroundColor: '#A855F7' }]}
                                            onPress={handleResumeAutoPilot}
                                        >
                                            <Ionicons name="play" size={24} color="#FFF" />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            style={[styles.autoControlButton, { backgroundColor: '#A855F7' }]}
                                            onPress={handlePauseAutoPilot}
                                        >
                                            <Ionicons name="pause" size={24} color="#FFF" />
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
                                        <Ionicons name="volume-high" size={14} color="#A855F7" />
                                        <ThemedText variant="caption" style={{ color: '#A855F7', fontWeight: '600' }}>
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

                {/* Combined Scripture Display & Actions (Ammunition Card) */}
                {currentScripture && !practiceMode && (
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
                        <AmmunitionCard
                            scripture={currentScripture}
                            onFire={handleStartVoicePractice}
                            onReload={trainingMode === 'burst' && isBurstActive ? skipBurstVerse : loadRandomScripture}
                            onIntel={handleShowIntel}
                            onStealth={handleStartStealthPractice}
                            isDark={isDark}
                            allowBlur={true}
                        />
                    </Animated.View>
                )}

                {/* Stealth Practice Mode */}
                {practiceMode === 'STEALTH' && currentScripture && (
                    <View style={styles.practiceSection}>
                        <StealthDrill
                            isVisible={showStealthDrill}
                            onClose={() => {
                                setShowStealthDrill(false)
                                setPracticeMode(null)
                            }}
                            onComplete={(accuracy: number) => handlePracticeComplete('', accuracy)}
                            targetVerse={currentScripture.text}
                            reference={currentScripture.reference}
                        />
                    </View>
                )}

                {/* Target Practice Mode */}
                {practiceMode === 'VOICE' && currentScripture && (
                    <View style={styles.practiceSection}>
                        <TargetPractice
                            isVisible={showTargetPractice}
                            onClose={() => {
                                setShowTargetPractice(false)
                                setPracticeMode(null)
                            }}
                            targetVerse={currentScripture.text}
                            reference={currentScripture.reference}
                            scriptureId={currentScripture.id}
                            onRecordingComplete={handlePracticeComplete}
                        />
                    </View>
                )}

                {isLoadingScripture && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                )}
            </ScrollView>

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
        color: '#22C55E',
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
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    startAutoText: {
        color: '#FFF',
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
