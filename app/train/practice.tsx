import React, { useState, useEffect, useRef } from 'react'
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
import { Scripture } from '@/types/scripture'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

export default function TrainingPracticeScreen() {
    const {
        scriptures,
        isDark,
        theme,
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
    const [burstQueue, setBurstQueue] = useState<Scripture[]>([])
    const [burstIndex, setBurstIndex] = useState(0)
    const [isBurstActive, setIsBurstActive] = useState(false)
    const [burstScore, setBurstScore] = useState({ correct: 0, total: 0 })
    const burstTimerRef = useRef<NodeJS.Timeout | null>(null)
    const fadeAnim = useRef(new Animated.Value(1)).current

    // Load a random scripture for practice
    const loadRandomScripture = () => {
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
    }

    // Initialize burst mode with multiple verses
    const initBurstMode = () => {
        if (!scriptures || scriptures.length === 0) return

        // Shuffle and pick 5-10 verses for burst mode
        const shuffled = [...scriptures].sort(() => Math.random() - 0.5)
        const burstCount = Math.min(7, shuffled.length)
        const selectedVerses = shuffled.slice(0, burstCount)

        setBurstQueue(selectedVerses)
        setBurstIndex(0)
        setCurrentScripture(selectedVerses[0])
        setIsBurstActive(true)
        setBurstScore({ correct: 0, total: 0 })
    }

    // Move to next verse in burst mode
    const nextBurstVerse = (wasCorrect: boolean) => {
        setBurstScore(prev => ({
            correct: prev.correct + (wasCorrect ? 1 : 0),
            total: prev.total + 1
        }))

        const nextIndex = burstIndex + 1
        if (nextIndex < burstQueue.length) {
            // Animate transition
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 150,
                    useNativeDriver: true,
                })
            ]).start()

            setBurstIndex(nextIndex)
            setCurrentScripture(burstQueue[nextIndex])
        } else {
            // Burst complete
            const finalScore = {
                correct: burstScore.correct + (wasCorrect ? 1 : 0),
                total: burstScore.total + 1
            }
            setIsBurstActive(false)
            Alert.alert(
                'Burst Complete!',
                `You got ${finalScore.correct}/${finalScore.total} correct!`,
                [
                    { text: 'New Burst', onPress: initBurstMode },
                    { text: 'Exit', onPress: () => router.back() }
                ]
            )
        }
    }

    useEffect(() => {
        if (trainingMode === 'burst') {
            initBurstMode()
        } else {
            loadRandomScripture()
        }

        return () => {
            if (burstTimerRef.current) {
                clearTimeout(burstTimerRef.current)
            }
        }
    }, [])

    const handlePracticeComplete = (transcript: string, accuracy: number) => {
        // In training mode, we don't record scores - just show feedback
        trackEvent(AnalyticsEventType.PRACTICE_COMPLETE, {
            practice_type: 'training',
            mode: trainingMode,
            accuracy: accuracy,
            scripture_id: currentScripture?.id,
            is_training: true
        })

        setShowTargetPractice(false)
        setPracticeMode(null)

        // Show encouraging feedback
        if (accuracy >= 90) {
            Alert.alert('Excellent!', `You're ready for battle! ${accuracy}% accuracy`, [
                { text: 'Practice Again', onPress: loadRandomScripture },
                { text: 'Try Battle Mode', onPress: () => router.push('/battle') }
            ])
        } else if (accuracy >= 70) {
            Alert.alert('Good Progress!', `Keep practicing! ${accuracy}% accuracy`, [
                { text: 'Continue Training', onPress: loadRandomScripture }
            ])
        } else {
            Alert.alert('Keep Going!', `Practice makes perfect! ${accuracy}% accuracy`, [
                { text: 'Try Again', onPress: loadRandomScripture }
            ])
        }
    }

    const handleStartVoicePractice = () => {
        setPracticeMode('VOICE')
        setShowTargetPractice(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'voice_training',
            scripture_id: currentScripture?.id
        })
    }

    const handleStartStealthPractice = () => {
        setPracticeMode('STEALTH')
        setShowStealthDrill(true)
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'stealth_training',
            scripture_id: currentScripture?.id
        })
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="TRAINING PRACTICE"
                subtitle="NO PRESSURE - JUST LEARNING"
            />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Training Mode Indicator */}
                <View style={[styles.modeIndicator, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="school" size={20} color="#3B82F6" />
                    <ThemedText variant="caption" style={styles.modeText}>
                        Training Mode - No scores recorded
                    </ThemedText>
                </View>

                {/* Current Scripture */}
                {currentScripture && !practiceMode && (
                    <View style={styles.scriptureSection}>
                        <ThemedCard variant="glass" style={styles.scriptureCard}>
                            <ThemedText variant="caption" style={styles.reference}>
                                {currentScripture.reference}
                            </ThemedText>
                            <ThemedText variant="body" style={styles.text}>
                                {currentScripture.text}
                            </ThemedText>
                        </ThemedCard>
                    </View>
                )}

                {/* Practice Options */}
                {!practiceMode && currentScripture && (
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

                        <TouchableOpacity
                            style={styles.optionCard}
                            onPress={loadRandomScripture}
                        >
                            <ThemedCard variant="glass" style={styles.optionInner}>
                                <FontAwesome5 name="random" size={24} color={theme.accent} />
                                <View style={styles.optionContent}>
                                    <ThemedText variant="heading" style={styles.optionTitle}>NEXT VERSE</ThemedText>
                                    <ThemedText variant="body" style={styles.optionDesc}>
                                        Skip to a different scripture
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
        color: '#3B82F6',
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
})
