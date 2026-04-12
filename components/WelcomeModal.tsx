import React, { useState, useEffect, useRef } from 'react'
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    Dimensions,
    Animated,
    Platform,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native'
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'

const { width, height } = Dimensions.get('window')

interface WelcomeModalProps {
    isVisible: boolean
    onClose: (completedOnboarding?: boolean) => void
}

const STEP_ICONS = ['📖', '🎯', '⚔️'] as const

export default function WelcomeModal({ isVisible, onClose }: WelcomeModalProps) {
    const { isDark, theme, saveUserSettings, userSettings, scriptures } = useAppStore()
    const [currentStep, setCurrentStep] = useState(0)
    const [soldierName, setSoldierName] = useState('')
    const [isTransitioning, setIsTransitioning] = useState(false)

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current
    const slideAnim = useRef(new Animated.Value(30)).current
    const stepFadeAnim = useRef(new Animated.Value(1)).current

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.spring(slideAnim, {
                    toValue: 0,
                    tension: 20,
                    friction: 7,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }, [isVisible])

    const animateStepTransition = (nextStep: number, callback?: () => void) => {
        setIsTransitioning(true)
        Animated.timing(stepFadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            callback?.()
            setCurrentStep(nextStep)
            Animated.timing(stepFadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start(() => setIsTransitioning(false))
        })
    }

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})

        if (currentStep === 0 && soldierName.trim()) {
            saveUserSettings({ ...userSettings, soldierName: soldierName.trim() })
        }

        if (currentStep < 2) {
            animateStepTransition(currentStep + 1)
        } else {
            handleFinish()
        }
    }

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {})
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }
        onClose(false)
    }

    const handleFinish = async () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }
        onClose(true)
    }

    const bgColor = isDark ? '#0f172a' : '#f8fafc'
    const textColor = isDark ? '#e2e8f0' : '#1e293b'
    const mutedColor = isDark ? '#94a3b8' : '#64748b'
    const accentColor = isDark ? theme.accent : theme.accent

    return (
        <Modal
            visible={isVisible}
            animationType="none"
            transparent={true}
            onRequestClose={handleSkip}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View
                    style={[
                        styles.modalWrapper,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={[styles.modalContainer, { backgroundColor: bgColor }]}>
                        {/* Skip button */}
                        <View style={styles.skipRow}>
                            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Text style={[styles.skipText, { color: mutedColor }]}>Skip</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Step indicator */}
                        <View style={styles.stepIndicator}>
                            {[0, 1, 2].map((step) => (
                                <View
                                    key={step}
                                    style={[
                                        styles.stepDot,
                                        {
                                            backgroundColor: step === currentStep
                                                ? accentColor
                                                : step < currentStep
                                                    ? (isDark ? '#334155' : '#cbd5e1')
                                                    : (isDark ? '#1e293b' : '#e2e8f0'),
                                        },
                                    ]}
                                />
                            ))}
                        </View>

                        {/* Step content */}
                        <Animated.View style={[styles.stepContent, { opacity: stepFadeAnim }]}>
                            {currentStep === 0 && (
                                <StepOne
                                    isDark={isDark}
                                    textColor={textColor}
                                    mutedColor={mutedColor}
                                    accentColor={accentColor}
                                    soldierName={soldierName}
                                    onNameChange={setSoldierName}
                                />
                            )}
                            {currentStep === 1 && (
                                <StepTwo
                                    isDark={isDark}
                                    textColor={textColor}
                                    mutedColor={mutedColor}
                                    accentColor={accentColor}
                                />
                            )}
                            {currentStep === 2 && (
                                <StepThree
                                    isDark={isDark}
                                    textColor={textColor}
                                    mutedColor={mutedColor}
                                    accentColor={accentColor}
                                />
                            )}
                        </Animated.View>

                        {/* Action button */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.primaryButton, { backgroundColor: accentColor }]}
                                onPress={handleNext}
                                activeOpacity={0.8}
                                disabled={isTransitioning}
                            >
                                <Text style={[styles.primaryButtonText, { color: isDark ? '#000' : '#fff' }]}>
                                    {currentStep === 0
                                        ? 'Next'
                                        : currentStep === 1
                                            ? 'Looks Good!'
                                            : 'Start Training'}
                                </Text>
                                {currentStep === 2 && (
                                    <FontAwesome5 name="chevron-right" size={12} color={isDark ? '#000' : '#fff'} style={{ marginLeft: 8 }} />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    )
}

// ─── Step 1: What the app does + Name input ────────────────────────────────

function StepOne({ isDark, textColor, mutedColor, accentColor, soldierName, onNameChange }: {
    isDark: boolean; textColor: string; mutedColor: string; accentColor: string
    soldierName: string; onNameChange: (name: string) => void
}) {
    return (
        <View style={styles.stepInner}>
            <View style={[styles.heroIcon, { backgroundColor: `${accentColor}15` }]}>
                <FontAwesome5 name="shield-alt" size={40} color={accentColor} />
            </View>

            <Text style={[styles.stepTitle, { color: textColor }]}>
                Memorize Scripture
            </Text>
            <Text style={[styles.stepSubtitle, { color: mutedColor }]}>
                Recite verses aloud. The app listens and scores your accuracy. Build your memory through practice.
            </Text>

            <View style={styles.featuresRow}>
                <View style={[styles.featureChip, { backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)' }]}>
                    <FontAwesome5 name="microphone" size={14} color={accentColor} />
                    <Text style={[styles.featureChipText, { color: textColor }]}>Speak</Text>
                </View>
                <View style={[styles.featureChip, { backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)' }]}>
                    <FontAwesome5 name="puzzle-piece" size={14} color={accentColor} />
                    <Text style={[styles.featureChipText, { color: textColor }]}>Quizzes</Text>
                </View>
                <View style={[styles.featureChip, { backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)' }]}>
                    <FontAwesome5 name="headphones" size={14} color={accentColor} />
                    <Text style={[styles.featureChipText, { color: textColor }]}>Listen</Text>
                </View>
            </View>

            <View style={styles.nameSection}>
                <Text style={[styles.nameLabel, { color: mutedColor }]}>What should we call you?</Text>
                <TextInput
                    style={[styles.nameInput, {
                        color: textColor,
                        backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)',
                        borderColor: isDark ? '#334155' : '#cbd5e1',
                    }]}
                    placeholder="Your name (optional)"
                    placeholderTextColor={isDark ? '#475569' : '#94a3b8'}
                    value={soldierName}
                    onChangeText={onNameChange}
                    maxLength={20}
                    autoCapitalize="words"
                    returnKeyType="done"
                />
            </View>
        </View>
    )
}

// ─── Step 2: Starter Pack Preview ──────────────────────────────────────────

function StepTwo({ isDark, textColor, mutedColor, accentColor }: {
    isDark: boolean; textColor: string; mutedColor: string; accentColor: string
}) {
    const starterVerses = [
        'John 3:16', 'Psalm 23:1', 'Romans 8:28',
        'Philippians 4:13', 'Proverbs 3:5-6',
        'Isaiah 41:10', 'Jeremiah 29:11', 'Romans 6:23',
        'Ephesians 2:8-9', 'Matthew 28:19-20',
    ]

    return (
        <View style={styles.stepInner}>
            <View style={[styles.heroIcon, { backgroundColor: `${accentColor}15` }]}>
                <FontAwesome5 name="book" size={40} color={accentColor} />
            </View>

            <View style={styles.stepTitleRow}>
                <Text style={[styles.stepTitle, { color: textColor }]}>
                    Your Starter Verses
                </Text>
                <View style={[styles.starterBadge, { backgroundColor: `${accentColor}15` }]}>
                    <Text style={[styles.starterBadgeText, { color: accentColor }]}>STARTER</Text>
                </View>
            </View>
            <Text style={[styles.stepSubtitle, { color: mutedColor }]}>
                10 essential scriptures are loaded and ready for practice.
            </Text>

            <View style={[styles.verseList, {
                backgroundColor: isDark ? 'rgba(30,41,59,0.3)' : 'rgba(241,245,249,0.6)',
                borderColor: isDark ? '#334155' : '#e2e8f0',
            }]}>
                {starterVerses.map((ref, i) => (
                    <View key={ref} style={[styles.verseRow, i < starterVerses.length - 1 && styles.verseRowBorder]}>
                        <Text style={[styles.verseIndex, { color: accentColor }]}>{i + 1}</Text>
                        <Text style={[styles.verseRef, { color: textColor }]}>{ref}</Text>
                    </View>
                ))}
            </View>
        </View>
    )
}

// ─── Step 3: Choose Your First Drill ───────────────────────────────────────

function StepThree({ isDark, textColor, mutedColor, accentColor }: {
    isDark: boolean; textColor: string; mutedColor: string; accentColor: string
}) {
    const drills = [
        {
            icon: 'eye' as const,
            title: 'Single Focus',
            subtitle: 'Deep memorization — one verse at a time',
            tag: 'Best for starting',
        },
        {
            icon: 'infinite' as const,
            title: 'Auto Pilot',
            subtitle: 'Listen to verses read aloud passively',
            tag: 'Hands-free',
        },
    ]

    return (
        <View style={styles.stepInner}>
            <View style={[styles.heroIcon, { backgroundColor: `${accentColor}15` }]}>
                <FontAwesome5 name="crosshairs" size={40} color={accentColor} />
            </View>

            <Text style={[styles.stepTitle, { color: textColor }]}>
                Choose Your First Drill
            </Text>
            <Text style={[styles.stepSubtitle, { color: mutedColor }]}>
                You can always try the other modes later. More unlock as you practice.
            </Text>

            <View style={styles.drillCards}>
                {drills.map((drill, i) => (
                    <View
                        key={drill.title}
                        style={[
                            styles.drillCard,
                            {
                                backgroundColor: isDark ? 'rgba(30,41,59,0.5)' : 'rgba(241,245,249,0.8)',
                                borderColor: i === 0 ? accentColor : (isDark ? '#334155' : '#e2e8f0'),
                                borderWidth: i === 0 ? 2 : 1,
                            },
                        ]}
                    >
                        <View style={[styles.drillIcon, { backgroundColor: `${accentColor}15` }]}>
                            <Ionicons name={drill.icon} size={24} color={accentColor} />
                        </View>
                        <View style={styles.drillContent}>
                            <Text style={[styles.drillTitle, { color: textColor }]}>{drill.title}</Text>
                            <Text style={[styles.drillSubtitle, { color: mutedColor }]}>{drill.subtitle}</Text>
                        </View>
                        {i === 0 && (
                            <View style={[styles.drillBadge, { backgroundColor: `${accentColor}15` }]}>
                                <Text style={[styles.drillBadgeText, { color: accentColor }]}>{drill.tag}</Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            <Text style={[styles.unlockHint, { color: mutedColor }]}>
                Burst Fire, Voice Ops, and Live Fire Drill unlock as you practice.
            </Text>
        </View>
    )
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalWrapper: {
        width: '100%',
        maxWidth: 420,
    },
    modalContainer: {
        borderRadius: 20,
        padding: 24,
        paddingTop: 16,
        overflow: 'hidden',
    },
    skipRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    stepIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 28,
    },
    stepDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    stepContent: {
        minHeight: 360,
    },
    stepInner: {
        alignItems: 'center',
    },
    stepTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    starterBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    starterBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    stepSubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    // Step 1
    featuresRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 28,
    },
    featureChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    featureChipText: {
        fontSize: 13,
        fontWeight: '600',
    },
    nameSection: {
        width: '100%',
    },
    nameLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },
    nameInput: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        textAlign: 'center',
    },
    // Step 2
    verseList: {
        width: '100%',
        borderRadius: 12,
        borderWidth: 1,
        padding: 12,
        gap: 0,
    },
    verseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        gap: 10,
    },
    verseRowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(128,128,128,0.2)',
    },
    verseIndex: {
        fontSize: 13,
        fontWeight: '800',
        width: 20,
        textAlign: 'center',
    },
    verseRef: {
        fontSize: 15,
        fontWeight: '600',
    },
    // Step 3
    drillCards: {
        width: '100%',
        gap: 12,
        marginBottom: 16,
    },
    drillCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        gap: 12,
    },
    drillIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    drillContent: {
        flex: 1,
    },
    drillTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    drillSubtitle: {
        fontSize: 12,
        lineHeight: 16,
    },
    drillBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    drillBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    unlockHint: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        fontStyle: 'italic',
    },
    // Actions
    actionRow: {
        marginTop: 20,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 14,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
})
