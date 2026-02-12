import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    Text,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    Platform,
} from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'

const { width, height } = Dimensions.get('window')

interface WelcomeModalProps {
    isVisible: boolean
    onClose: () => void
}



interface TypewriterTextProps {
    text: string
    style?: any
    delay?: number
    onComplete?: () => void
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ text, style, delay = 0, onComplete }) => {
    const [displayedText, setDisplayedText] = useState('')
    const [started, setStarted] = useState(false)

    useEffect(() => {
        const startTimer = setTimeout(() => {
            setStarted(true)
        }, delay)
        return () => clearTimeout(startTimer)
    }, [delay])

    useEffect(() => {
        if (!started) return

        let currentIndex = 0
        const interval = setInterval(() => {
            if (currentIndex <= text.length) {
                setDisplayedText(text.slice(0, currentIndex))
                if (currentIndex > 0 && currentIndex < text.length) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { })
                }
                currentIndex++
            } else {
                clearInterval(interval)
                onComplete?.()
            }
        }, 30) // Typing speed

        return () => clearInterval(interval)
    }, [started, text])

    return <ThemedText style={style}>{displayedText}</ThemedText>
}

export default function WelcomeModal({ isVisible, onClose }: WelcomeModalProps) {
    const { isDark } = useAppStore()
    const scaleAnim = React.useRef(new Animated.Value(0.95)).current
    const fadeAnim = React.useRef(new Animated.Value(0)).current

    // Mission Status State
    const [missionAccepted, setMissionAccepted] = useState(false)
    const [briefingComplete, setBriefingComplete] = useState(false)

    React.useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 20,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 400,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }, [isVisible])

    const handleAcceptMission = async () => {
        setMissionAccepted(true)
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { })
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }

        // Add a small delay for the "Accepted" animation before closing
        setTimeout(() => {
            onClose()
        }, 800)
    }

    const handleSkip = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { })
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }
        onClose()
    }

    const features = [
        {
            icon: "book",
            title: "ARMORY ACCESS",
            description: "Build your scripture ammunition bank. Extract verses from PDF/EPUB files or organize existing collections."
        },
        {
            icon: "crosshairs",
            title: "COMBAT MISSIONS",
            description: "Deploy into territory battles. Conquer nodes through accuracy-based scripture challenges."
        },
        {
            icon: "microphone",
            title: "VOICE OPS",
            description: "Engage targets by reciting scripture. Live AI analysis tracks your recitation accuracy."
        },
    ]

    return (
        <Modal
            visible={isVisible}
            animationType="none"
            transparent={true}
            onRequestClose={handleSkip}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.modalWrapper,
                        {
                            opacity: fadeAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <View style={[
                        styles.modalContainer,
                        {
                            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                            borderColor: isDark ? 'rgba(255,215,0,0.3)' : 'rgba(0,0,0,0.2)',
                        }
                    ]}>
                        {/* Tactical Borders */}
                        <View style={styles.borderTopLeft} />
                        <View style={styles.borderTopRight} />
                        <View style={styles.borderBottomLeft} />
                        <View style={styles.borderBottomRight} />

                        {/* Top Secret Stamp */}
                        <View style={styles.stampContainer}>
                            <View style={styles.stamp}>
                                <Text style={styles.stampText}>CLASSIFIED</Text>
                            </View>
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerIcon}>
                                <FontAwesome5 name="shield-alt" size={32} color="#FFD700" />
                            </View>
                            <View style={styles.headerText}>
                                <ThemedText style={styles.topLabel}>MISSION DOSSIER // 001</ThemedText>
                                <ThemedText variant="heading" style={styles.title}>
                                    MISSION BRIEFING
                                </ThemedText>
                            </View>
                        </View>

                        <View style={styles.separator}>
                            <View style={[styles.separatorLine, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />
                            <FontAwesome5 name="star" size={10} color="#FFD700" style={styles.separatorIcon} />
                            <View style={[styles.separatorLine, { backgroundColor: isDark ? '#334155' : '#cbd5e1' }]} />
                        </View>

                        {/* Content */}
                        <ScrollView
                            style={styles.contentScroll}
                            contentContainerStyle={styles.contentContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            <View style={styles.recruitMessage}>
                                <ThemedText style={[styles.greeting, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                                    GREETINGS, SOLDIER.
                                </ThemedText>
                                <TypewriterText
                                    text="You have been selected for elite spiritual warfare training. Your objective is to internalize the Word of God and deploy it in combat scenarios."
                                    style={[styles.briefingText, { color: isDark ? '#e2e8f0' : '#334155' }]}
                                    delay={600}
                                    onComplete={() => setBriefingComplete(true)}
                                />
                            </View>

                            <View style={styles.objectivesContainer}>
                                <ThemedText style={styles.sectionLabel}>MISSION PARAMETERS</ThemedText>
                                {features.map((feature, index) => (
                                    <View key={index} style={[
                                        styles.objectiveRow,
                                        {
                                            backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : 'rgba(241, 245, 249, 0.8)',
                                            borderColor: isDark ? 'rgba(255,215,0,0.1)' : 'rgba(0,0,0,0.05)'
                                        }
                                    ]}>
                                        <View style={styles.objectiveIcon}>
                                            <FontAwesome5 name={feature.icon} size={16} color="#FFD700" />
                                        </View>
                                        <View style={styles.objectiveContent}>
                                            <ThemedText style={styles.objectiveTitle}>{feature.title}</ThemedText>
                                            <ThemedText style={[styles.objectiveDesc, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                                                {feature.description}
                                            </ThemedText>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Actions */}
                        <View style={styles.actions}>
                            {!missionAccepted ? (
                                <>
                                    <TouchableOpacity
                                        style={styles.declineButton}
                                        onPress={handleSkip}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={styles.declineText}>DECLINE OP</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.acceptButton}
                                        onPress={handleAcceptMission}
                                        activeOpacity={0.8}
                                    >
                                        <LinearGradient
                                            colors={['#FFD700', '#D97706']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.acceptGradient}
                                        >
                                            <Text style={styles.acceptText}>ACCEPT MISSION</Text>
                                            <FontAwesome5 name="chevron-right" size={14} color="#000" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                <View style={styles.acceptedContainer}>
                                    <FontAwesome5 name="check-circle" size={24} color="#10B981" />
                                    <Text style={[styles.acceptedText, { color: isDark ? '#10B981' : '#059669' }]}>
                                        MISSION CONFIRMED
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Status Bar */}
                        <View style={styles.statusBar}>
                            <Text style={styles.statusText}>
                                STATUS: {missionAccepted ? 'ACTIVE' : 'PENDING AUTHORIZATION'}
                            </Text>
                            <Text style={styles.statusId}>ID: RECRUIT-{(Math.random() * 10000).toFixed(0)}</Text>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalWrapper: {
        width: '100%',
        maxWidth: 400,
        height: '85%',
        maxHeight: 700,
    },
    modalContainer: {
        flex: 1,
        borderRadius: 4,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
    },
    // Tactical Corners
    borderTopLeft: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 20,
        height: 20,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderColor: '#FFD700',
        zIndex: 10,
    },
    borderTopRight: {
        position: 'absolute',
        top: 0,
        right: 0,
        width: 20,
        height: 20,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderColor: '#FFD700',
        zIndex: 10,
    },
    borderBottomLeft: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: 20,
        height: 20,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderColor: '#FFD700',
        zIndex: 10,
    },
    borderBottomRight: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 20,
        height: 20,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderColor: '#FFD700',
        zIndex: 10,
    },
    stampContainer: {
        position: 'absolute',
        top: 40,
        right: -10,
        transform: [{ rotate: '15deg' }],
        zIndex: 5,
        opacity: 0.15,
        pointerEvents: 'none',
    },
    stamp: {
        borderWidth: 4,
        borderColor: '#FFD700',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    stampText: {
        color: '#FFD700',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
        paddingBottom: 16,
        gap: 16,
    },
    headerIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    headerText: {
        flex: 1,
    },
    topLabel: {
        fontSize: 10,
        color: '#FFD700',
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 4,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    separator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
        opacity: 0.5,
    },
    separatorLine: {
        flex: 1,
        height: 1,
    },
    separatorIcon: {
        marginHorizontal: 8,
    },
    contentScroll: {
        flex: 1,
    },
    contentContainer: {
        padding: 24,
        paddingTop: 0,
    },
    recruitMessage: {
        marginBottom: 32,
    },
    greeting: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    briefingText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    objectivesContainer: {
        gap: 12,
    },
    sectionLabel: {
        fontSize: 11,
        color: '#FFD700',
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 8,
    },
    objectiveRow: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        gap: 16,
    },
    objectiveIcon: {
        marginTop: 2,
    },
    objectiveContent: {
        flex: 1,
        gap: 4,
    },
    objectiveTitle: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    objectiveDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
    actions: {
        flexDirection: 'row',
        padding: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
        gap: 12,
        alignItems: 'center',
    },
    declineButton: {
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    declineText: {
        color: '#64748b',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    acceptButton: {
        flex: 1,
        borderRadius: 4,
        overflow: 'hidden',
    },
    acceptGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    acceptText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 1,
    },
    acceptedContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        paddingVertical: 14,
    },
    acceptedText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 1,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#000',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    statusText: {
        color: '#FFD700',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statusId: {
        color: '#64748b',
        fontSize: 9,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
})