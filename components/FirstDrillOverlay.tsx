import React, { useState, useEffect } from 'react'
import {
    View,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Text,
    Animated,
    Dimensions,
} from 'react-native'
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText, ThemedCard } from '@/components/Themed'

const { width, height } = Dimensions.get('window')

interface FirstDrillOverlayProps {
    visible: boolean
    verseText: string
    verseReference: string
    onComplete: () => void
    onSkip?: () => void
}

export const FirstDrillOverlay: React.FC<FirstDrillOverlayProps> = ({
    visible,
    verseText,
    verseReference,
    onComplete,
    onSkip,
}) => {
    const { theme, isDark } = useAppStore()
    const [step, setStep] = useState(0) // 0: intro, 1: read, 2: practice, 3: done
    const [fadeAnim] = useState(new Animated.Value(0))
    const [slideAnim] = useState(new Animated.Value(50))

    useEffect(() => {
        if (visible) {
            setStep(0)
            animateIn()
        }
    }, [visible])

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start()
    }

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
        if (step < 3) {
            setStep(step + 1)
        } else {
            onComplete()
        }
    }

    const handleSkip = async () => {
        await AsyncStorage.setItem('hasSeenWelcome', 'true')
        onSkip?.()
    }

    const steps = [
        {
            icon: 'hand-left' as const,
            title: 'Welcome, Recruit!',
            message: "Let's memorize your first verse together. This will only take a minute.",
            action: "Let's Go!",
        },
        {
            icon: 'book' as const,
            title: 'Read the Verse',
            message: 'Take a moment to read and understand the verse below.',
            action: 'Got it!',
        },
        {
            icon: 'mic' as const,
            title: 'Time to Practice',
            message: "Now tap 'Start Practice' and recite the verse from memory. Don't worry if it's not perfect!",
            action: 'Start Practice',
        },
        {
            icon: 'checkmark-circle' as const,
            title: 'Great Job!',
            message: "You've completed your first drill! Keep practicing daily to build your spiritual arsenal.",
            action: 'Continue',
        },
    ]

    const currentStep = steps[step]

    if (!visible) return null

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={handleSkip}>
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <ThemedCard variant="glass" style={styles.card}>
                        {/* Progress dots */}
                        <View style={styles.progressContainer}>
                            {steps.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.progressDot,
                                        {
                                            backgroundColor: index <= step ? theme.accent : 'rgba(128,128,128,0.3)',
                                        },
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Icon */}
                        <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
                            <Ionicons name={currentStep.icon} size={48} color={theme.accent} />
                        </View>

                        {/* Title */}
                        <ThemedText variant="heading" style={styles.title}>
                            {currentStep.title}
                        </ThemedText>

                        {/* Message */}
                        <ThemedText variant="body" style={styles.message}>
                            {currentStep.message}
                        </ThemedText>

                        {/* Verse display (steps 1-2) */}
                        {(step === 1 || step === 2) && (
                            <View style={[styles.verseContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <ThemedText variant="body" style={styles.verseText}>
                                    "{verseText}"
                                </ThemedText>
                                <ThemedText variant="caption" style={styles.verseReference}>
                                    — {verseReference}
                                </ThemedText>
                            </View>
                        )}

                        {/* Action Button */}
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: theme.accent }]}
                            onPress={handleNext}
                            activeOpacity={0.8}
                        >
                            <ThemedText variant="body" style={styles.actionButtonText}>
                                {currentStep.action}
                            </ThemedText>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>

                        {/* Skip button */}
                        {step < 3 && (
                            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                                <ThemedText variant="caption" style={styles.skipText}>
                                    Skip tutorial
                                </ThemedText>
                            </TouchableOpacity>
                        )}
                    </ThemedCard>
                </Animated.View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width - 48,
        maxWidth: 400,
    },
    card: {
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
    },
    progressContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        textAlign: 'center',
        opacity: 0.8,
        marginBottom: 24,
        lineHeight: 22,
    },
    verseContainer: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    verseText: {
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 8,
        lineHeight: 22,
    },
    verseReference: {
        textAlign: 'center',
        opacity: 0.7,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        gap: 8,
        minWidth: 200,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    skipButton: {
        marginTop: 16,
        padding: 8,
    },
    skipText: {
        opacity: 0.5,
    },
})
