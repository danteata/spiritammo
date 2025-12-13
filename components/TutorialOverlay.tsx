import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    StyleSheet,
    Platform,
    findNodeHandle,
    Easing,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window')

export interface TutorialStep {
    id: string
    title: string
    description: string
    targetRef?: React.RefObject<any>
    targetPosition?: { x: number; y: number; width: number; height: number }
    position: 'top' | 'bottom' | 'left' | 'right' | 'center'
    arrowDirection?: 'up' | 'down' | 'left' | 'right'
    highlightPadding?: number
    actionText?: string
    canSkip?: boolean
    autoAdvance?: boolean
    delay?: number
}

interface TutorialOverlayProps {
    isVisible: boolean
    steps: TutorialStep[]
    currentStep: number
    onStepChange: (step: number) => void
    onComplete: () => void
    onSkip?: () => void
    theme?: 'military' | 'neutral'
}

interface StepIndicatorProps {
    total: number
    current: number
    theme: 'military' | 'neutral'
}

const TacticalProgress: React.FC<StepIndicatorProps> = ({ total, current, theme }) => {
    return (
        <View style={styles.tacticalProgress}>
            <View style={styles.progressLabelRow}>
                <Text style={styles.progressLabel}>OBJ {current + 1}/{total}</Text>
                <Text style={styles.progressLabel}>SEQ-{(current + 1).toString().padStart(2, '0')}</Text>
            </View>
            <View style={styles.progressTrack}>
                {Array.from({ length: total }, (_, index) => (
                    <View
                        key={index}
                        style={[
                            styles.progressSegment,
                            {
                                backgroundColor: index <= current
                                    ? '#FFD700'
                                    : 'rgba(255, 215, 0, 0.2)',
                                flex: 1,
                            },
                        ]}
                    />
                ))}
            </View>
        </View>
    )
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
    isVisible,
    steps,
    currentStep,
    onStepChange,
    onComplete,
    onSkip,
    theme = 'military',
}) => {
    const { isDark } = useAppStore()
    const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
    const [tooltipLayout, setTooltipLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null)

    const fadeAnim = useRef(new Animated.Value(0)).current
    const scaleAnim = useRef(new Animated.Value(0.9)).current
    const highlightAnim = useRef(new Animated.Value(0)).current
    const rotateAnim = useRef(new Animated.Value(0)).current

    const currentStepData = steps[currentStep]
    const isLastStep = currentStep === steps.length - 1

    // Calculate tooltip position based on target and screen constraints
    const calculateTooltipPosition = () => {
        if (!targetLayout || !tooltipLayout) return { top: 0, left: 0 }

        const { x, y, width, height } = targetLayout
        const tooltipHeight = tooltipLayout.height || 150
        const tooltipWidth = tooltipLayout.width || 300
        const padding = 20

        let top = 0
        let left = 0

        switch (currentStepData.position) {
            case 'top':
                top = Math.max(padding, y - tooltipHeight - 20)
                left = Math.max(padding, Math.min(x + width / 2 - tooltipWidth / 2, SCREEN_WIDTH - tooltipWidth - padding))
                break
            case 'bottom':
                top = Math.min(SCREEN_HEIGHT - tooltipHeight - padding, y + height + 20)
                left = Math.max(padding, Math.min(x + width / 2 - tooltipWidth / 2, SCREEN_WIDTH - tooltipWidth - padding))
                break
            case 'left':
                top = y + height / 2 - tooltipHeight / 2
                left = Math.max(padding, x - tooltipWidth - 20)
                break
            case 'right':
                top = y + height / 2 - tooltipHeight / 2
                left = Math.min(SCREEN_WIDTH - tooltipWidth - padding, x + width + 20)
                break
            case 'center':
            default:
                top = SCREEN_HEIGHT / 2 - tooltipHeight / 2
                left = SCREEN_WIDTH / 2 - tooltipWidth / 2
                break
        }

        return { top: Math.max(0, top), left: Math.max(0, left) }
    }

    // Measure target element position
    useEffect(() => {
        if (currentStepData?.targetRef?.current) {
            const node = findNodeHandle(currentStepData.targetRef.current)
            if (node && Platform.OS === 'ios') {
                currentStepData.targetRef.current.measure((x: number, y: number, width: number, height: number) => {
                    setTargetLayout({ x, y, width, height })
                })
            } else if (currentStepData.targetPosition) {
                setTargetLayout(currentStepData.targetPosition)
            }
        } else if (currentStepData?.targetPosition) {
            setTargetLayout(currentStepData.targetPosition)
        }
    }, [currentStep, currentStepData])

    // Animate in/out
    useEffect(() => {
        if (isVisible) {
            // Target Lock Haptic
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { })

            // Start rotation loop
            Animated.loop(
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 8000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start()

            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.spring(highlightAnim, {
                    toValue: 1,
                    tension: 40,
                    friction: 5,
                    useNativeDriver: true,
                }),
            ]).start()
        } else {
            rotateAnim.setValue(0)
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 0.9,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(highlightAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }, [isVisible])

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
        if (isLastStep) {
            handleComplete()
        } else {
            onStepChange(currentStep + 1)
        }
    }

    const handlePrevious = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
        if (currentStep > 0) {
            onStepChange(currentStep - 1)
        }
    }

    const handleComplete = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { })
        try {
            await AsyncStorage.setItem('tutorialCompleted', 'true')
        } catch (error) {
            console.error('Failed to save tutorial completion:', error)
        }
        onComplete()
    }

    const handleSkipTutorial = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
        try {
            await AsyncStorage.setItem('tutorialSkipped', 'true')
        } catch (error) {
            console.error('Failed to save tutorial skip:', error)
        }
        onSkip?.()
    }

    const tooltipPosition = calculateTooltipPosition()
    const highlightPadding = currentStepData?.highlightPadding || 12

    const spin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    })

    const reverseSpin = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg']
    })

    if (!isVisible) return null

    return (
        <Modal
            visible={isVisible}
            transparent={true}
            animationType="none"
            onRequestClose={handleSkipTutorial}
        >
            <View style={styles.overlay}>
                {/* Darken background */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: fadeAnim }
                    ]}
                />

                {/* Reticle / Target Highlight */}
                {targetLayout && (
                    <Animated.View
                        style={[
                            styles.reticleContainer,
                            {
                                top: targetLayout.y - highlightPadding - 20,
                                left: targetLayout.x - highlightPadding - 20,
                                width: targetLayout.width + highlightPadding * 2 + 40,
                                height: targetLayout.height + highlightPadding * 2 + 40,
                                opacity: highlightAnim,
                            },
                        ]}
                    >
                        {/* Rotating Outer Ring */}
                        <Animated.View style={[
                            styles.reticleRingOuter,
                            { transform: [{ rotate: spin }] }
                        ]}>
                            <View style={styles.reticleTickTop} />
                            <View style={styles.reticleTickRight} />
                            <View style={styles.reticleTickBottom} />
                            <View style={styles.reticleTickLeft} />
                        </Animated.View>

                        {/* Counter-Rotating Inner Ring */}
                        <Animated.View style={[
                            styles.reticleRingInner,
                            { transform: [{ rotate: reverseSpin }] }
                        ]} />

                        {/* Corner Brackets */}
                        <View style={styles.cornerTL} />
                        <View style={styles.cornerTR} />
                        <View style={styles.cornerBL} />
                        <View style={styles.cornerBR} />
                    </Animated.View>
                )}

                {/* Tooltip HUD */}
                <Animated.View
                    style={[
                        styles.tooltip,
                        {
                            ...tooltipPosition,
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            borderColor: isDark ? 'rgba(255, 215, 0, 0.4)' : 'rgba(203, 213, 225, 1)',
                        },
                    ]}
                    onLayout={(event) => {
                        const { x, y, width, height } = event.nativeEvent.layout
                        setTooltipLayout({ x, y, width, height })
                    }}
                >
                    {/* HUD Decorative Corners */}
                    <View style={styles.hudCornerTL} />
                    <View style={styles.hudCornerTR} />
                    <View style={styles.hudCornerBL} />
                    <View style={styles.hudCornerBR} />

                    {/* Header */}
                    <View style={styles.tooltipHeader}>
                        <TacticalProgress
                            total={steps.length}
                            current={currentStep}
                            theme={theme}
                        />
                    </View>

                    {/* Content */}
                    <View style={styles.tooltipContent}>
                        <ThemedText variant="heading" style={styles.tooltipTitle}>
                            {currentStepData.title}
                        </ThemedText>
                        <ThemedText variant="body" style={[styles.tooltipDescription, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                            {currentStepData.description}
                        </ThemedText>

                        {currentStepData.actionText && (
                            <View style={styles.actionHint}>
                                <FontAwesome5
                                    name="crosshairs"
                                    size={12}
                                    color="#FFD700"
                                />
                                <Text style={styles.actionText}>
                                    {currentStepData.actionText.toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Actions */}
                    <View style={styles.tooltipActions}>
                        <TouchableOpacity
                            style={styles.textBtn}
                            onPress={handleSkipTutorial}
                        >
                            <Text style={[styles.textBtnLabel, { color: isDark ? '#64748b' : '#94a3b8' }]}>ABORT</Text>
                        </TouchableOpacity>

                        <View style={styles.navBtns}>
                            {currentStep > 0 && (
                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={handlePrevious}
                                >
                                    <FontAwesome5 name="caret-left" size={14} color={isDark ? '#e2e8f0' : '#334155'} />
                                    <Text style={[styles.secondaryButtonText, { color: isDark ? '#e2e8f0' : '#334155' }]}>PREV</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    {
                                        backgroundColor: '#FFD700',
                                    },
                                ]}
                                onPress={handleNext}
                            >
                                <Text style={styles.primaryButtonText}>
                                    {isLastStep ? 'CONFIRM' : 'NEXT'}
                                </Text>
                                {!isLastStep && (
                                    <FontAwesome5
                                        name="caret-right"
                                        size={14}
                                        color="#000"
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    // Reticle Styles
    reticleContainer: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
        pointerEvents: 'none',
    },
    reticleRingOuter: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        borderRadius: 999,
        borderStyle: 'dashed',
    },
    reticleRingInner: {
        width: '85%',
        height: '85%',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.5)',
        borderRadius: 999,
        borderStyle: 'dotted',
    },
    reticleTickTop: {
        position: 'absolute',
        top: -5,
        left: '50%',
        width: 2,
        height: 10,
        backgroundColor: '#FFD700',
    },
    reticleTickBottom: {
        position: 'absolute',
        bottom: -5,
        left: '50%',
        width: 2,
        height: 10,
        backgroundColor: '#FFD700',
    },
    reticleTickLeft: {
        position: 'absolute',
        left: -5,
        top: '50%',
        width: 10,
        height: 2,
        backgroundColor: '#FFD700',
    },
    reticleTickRight: {
        position: 'absolute',
        right: -5,
        top: '50%',
        width: 10,
        height: 2,
        backgroundColor: '#FFD700',
    },
    // Corner Brackets for Target
    cornerTL: {
        position: 'absolute',
        top: 10,
        left: 10,
        width: 15,
        height: 15,
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#FFD700',
    },
    cornerTR: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 15,
        height: 15,
        borderTopWidth: 2,
        borderRightWidth: 2,
        borderColor: '#FFD700',
    },
    cornerBL: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        width: 15,
        height: 15,
        borderBottomWidth: 2,
        borderLeftWidth: 2,
        borderColor: '#FFD700',
    },
    cornerBR: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        width: 15,
        height: 15,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderColor: '#FFD700',
    },

    // Tooltip HUD Styles
    tooltip: {
        position: 'absolute',
        minWidth: 300,
        maxWidth: SCREEN_WIDTH - 40,
        borderWidth: 1,
        padding: 0,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 15,
    },
    hudCornerTL: {
        position: 'absolute',
        top: -1,
        left: -1,
        width: 10,
        height: 10,
        backgroundColor: '#FFD700',
    },
    hudCornerTR: {
        position: 'absolute',
        top: -1,
        right: -1,
        width: 10,
        height: 10,
        backgroundColor: '#FFD700',
    },
    hudCornerBL: {
        position: 'absolute',
        bottom: -1,
        left: -1,
        width: 10,
        height: 10,
        backgroundColor: '#FFD700',
    },
    hudCornerBR: {
        position: 'absolute',
        bottom: -1,
        right: -1,
        width: 10,
        height: 10,
        backgroundColor: '#FFD700',
    },
    tooltipHeader: {
        padding: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    tacticalProgress: {
        gap: 6,
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    progressLabel: {
        fontSize: 10,
        color: '#FFD700',
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    progressTrack: {
        flexDirection: 'row',
        height: 4,
        gap: 4,
    },
    progressSegment: {
        borderRadius: 1,
    },
    tooltipContent: {
        padding: 20,
        paddingVertical: 16,
    },
    tooltipTitle: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    tooltipDescription: {
        fontSize: 14,
        lineHeight: 20,
    },
    actionHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderLeftWidth: 2,
        borderLeftColor: '#FFD700',
        gap: 8,
    },
    actionText: {
        flex: 1,
        fontSize: 11,
        fontWeight: '700',
        color: '#FFD700',
        letterSpacing: 0.5,
    },
    tooltipActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    textBtn: {
        padding: 8,
    },
    textBtnLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    navBtns: {
        flexDirection: 'row',
        gap: 8,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        borderRadius: 4,
    },
    secondaryButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        gap: 6,
        borderRadius: 2,
        minWidth: 90,
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#000',
        letterSpacing: 0.5,
    },
})

export default TutorialOverlay
