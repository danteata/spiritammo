import React, { useState, useEffect, useRef, useCallback } from 'react'
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
import VoicePlaybackService from '@/services/voicePlayback'
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const AUTO_ADVANCE_DELAY = 3000 // ms delay between auto-pilot verses

export default function TrainingPracticeScreen() {
    const {
        scriptures,
        isDark,
        theme,
        userSettings,
    } = useAppStore()

    const params = useLocalSearchParams()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

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
        setIsLoadingScripture(true)
        try {
            if (scriptures && scriptures.length > 0) {
                const randomIndex = Math.floor(Math.random() * scriptures.length)
                setCurrentScripture(scriptures[randomIndex])
            }
        } catch (error) {
            console.error('Error loading scripture:', error)
        } finally {
            setIsLoadingScripture(false)
        }
    }, [scriptures])

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

    const handlePracticeComplete = (transcript: string, accuracy: number) => {
        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'training',
            mode: trainingMode,
            accuracy: accuracy,
            scripture_id: currentScripture?.id,
            is_training: true,
        })

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
            Alert.alert('Excellent!', `You're ready for battle! ${accuracy}% accuracy`, [
                { text: 'Practice Again', onPress: loadRandomScripture },
                { text: 'Try Battle Mode', onPress: () => router.push('/battle') },
            ])
        } else if (accuracy >= 70) {
            Alert.alert('Good Progress!', `Keep practicing! ${accuracy}% accuracy`, [
                { text: 'Continue Training', onPress: loadRandomScripture },
            ])
        } else {
            Alert.alert('Keep Going!', `Practice makes perfect! ${accuracy}% accuracy`, [
                { text: 'Try Again', onPress: loadRandomScripture },
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
                return { title: 'BURST FIRE', subtitle: 'RAPID-FIRE PRACTICE', icon: 'flash' as const, color: '#22C55E' }
            case 'automatic':
                return { title: 'AUTO PILOT', subtitle: 'HANDS-FREE LEARNING', icon: 'infinite' as const, color: '#A855F7' }
            default:
                return { title: 'SINGLE FOCUS', subtitle: 'DEEP MEMORIZATION', icon: 'eye' as const, color: '#3B82F6' }
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
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name={modeInfo.icon} size={20} color={modeInfo.color} />
                    <ThemedText variant="caption" style={[styles.modeText, { color: modeInfo.color }]}>
                        {trainingMode === 'automatic'
                            ? 'Auto Pilot — Verses read aloud automatically'
                            : trainingMode === 'burst'
                                ? `Burst Fire — ${isBurstActive ? `Verse ${burstIndex + 1} of ${burstQueue.length}` : 'Preparing...'}`
                                : 'Training Mode — No scores recorded'}
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

                {/* Current Scripture Display */}
                {currentScripture && !practiceMode && (
                    <Animated.View style={[styles.scriptureSection, { opacity: fadeAnim }]}>
                        <ThemedCard variant="glass" style={styles.scriptureCard}>
                            <ThemedText variant="caption" style={styles.reference}>
                                {currentScripture.reference}
                            </ThemedText>
                            <ThemedText variant="body" style={styles.text}>
                                {currentScripture.text}
                            </ThemedText>
                        </ThemedCard>
                    </Animated.View>
                )}

                {/* Practice Options (Single & Burst modes) */}
                {!practiceMode && currentScripture && trainingMode !== 'automatic' && (
                    <View style={styles.practiceOptions}>
                        <ThemedText variant="caption" style={styles.sectionTitle}>
                            CHOOSE PRACTICE TYPE
                        </ThemedText>

                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={handleStartVoicePractice}
                        >
                            <ThemedCard variant="glass" style={styles.optionInner}>
                                <FontAwesome5 name="microphone" size={24} color={theme.accent} />
                                <View style={styles.optionContent}>
                                    <ThemedText variant="heading" style={styles.optionTitle}>VOICE PRACTICE</ThemedText>
                                    <ThemedText variant="body" style={styles.optionDesc}>
                                        Speak the verse and see your accuracy
                                    </ThemedText>
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={handleStartStealthPractice}
                        >
                            <ThemedCard variant="glass" style={styles.optionInner}>
                                <FontAwesome5 name="mask" size={24} color={theme.accent} />
                                <View style={styles.optionContent}>
                                    <ThemedText variant="heading" style={styles.optionTitle}>STEALTH DRILL</ThemedText>
                                    <ThemedText variant="body" style={styles.optionDesc}>
                                        Fill in the blanks from memory
                                    </ThemedText>
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>

                        {/* Next / Skip button */}
                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={trainingMode === 'burst' && isBurstActive ? skipBurstVerse : loadRandomScripture}
                        >
                            <ThemedCard variant="glass" style={styles.optionInner}>
                                <FontAwesome5
                                    name={trainingMode === 'burst' ? 'forward' : 'random'}
                                    size={24}
                                    color={theme.accent}
                                />
                                <View style={styles.optionContent}>
                                    <ThemedText variant="heading" style={styles.optionTitle}>
                                        {trainingMode === 'burst' ? 'SKIP VERSE' : 'NEXT VERSE'}
                                    </ThemedText>
                                    <ThemedText variant="body" style={styles.optionDesc}>
                                        {trainingMode === 'burst' ? 'Skip to next burst verse (counts as incorrect)' : 'Skip to a different scripture'}
                                    </ThemedText>
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>
                    </View>
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

                {isLoadingScripture && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.accent} />
                    </View>
                )}
            </ScrollView>

            {/* Target Practice Modal */}
            {currentScripture && (
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
