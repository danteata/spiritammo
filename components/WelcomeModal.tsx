import React, { useState } from 'react'
import {
    StyleSheet,
    View,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
} from 'react-native'
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'

const { width, height } = Dimensions.get('window')

interface WelcomeModalProps {
    isVisible: boolean
    onClose: () => void
}

interface FeatureCardProps {
    icon: React.ReactNode
    title: string
    description: string
    delay: number
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => {
    const { isDark, theme } = useAppStore()
    const fadeAnim = React.useRef(new Animated.Value(0)).current
    const slideAnim = React.useRef(new Animated.Value(30)).current

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay,
                useNativeDriver: true,
            }),
        ]).start()
    }, [])

    return (
        <Animated.View
            style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
            }}
        >
            <ThemedCard variant="glass" style={styles.featureCard}>
                <View style={[styles.featureIconContainer, { backgroundColor: 'rgba(255,215,0,0.1)' }]}>
                    {icon}
                </View>
                <View style={styles.featureContent}>
                    <ThemedText variant="heading" style={styles.featureTitle}>
                        {title}
                    </ThemedText>
                    <ThemedText variant="body" style={styles.featureDescription}>
                        {description}
                    </ThemedText>
                </View>
            </ThemedCard>
        </Animated.View>
    )
}

export default function WelcomeModal({ isVisible, onClose }: WelcomeModalProps) {
    const { isDark, theme } = useAppStore()
    const scaleAnim = React.useRef(new Animated.Value(0.9)).current
    const fadeAnim = React.useRef(new Animated.Value(0)).current

    React.useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 50,
                    friction: 7,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start()
        }
    }, [isVisible])

    const handleGetStarted = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }
        onClose()
    }

    const handleSkip = async () => {
        try {
            await AsyncStorage.setItem('hasSeenWelcome', 'true')
        } catch (error) {
            console.error('Failed to save welcome preference:', error)
        }
        onClose()
    }

    const features = [
        {
            icon: <Ionicons name="book" size={28} color="#FFD700" />,
            title: "Scripture Arsenal",
            description: "Build your spiritual ammunition bank with verses organized by collections and campaigns."
        },
        {
            icon: <FontAwesome5 name="bullseye" size={28} color="#FFD700" />,
            title: "Combat Missions",
            description: "Deploy into campaigns with accuracy-based challenges. Conquer nodes and secure territory."
        },
        {
            icon: <MaterialCommunityIcons name="microphone" size={28} color="#FFD700" />,
            title: "Voice Combat",
            description: "Engage enemies by reciting scripture. AI tracks your accuracy in real-time combat scenarios."
        },
        {
            icon: <FontAwesome5 name="user-shield" size={28} color="#FFD700" />,
            title: "Soldier Customization",
            description: "Earn Valor Points to unlock helmets, armor, and weapons. Equip your spiritual warrior."
        }
    ]

    return (
        <Modal
            visible={isVisible}
            animationType="fade"
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
                    <View
                        style={[
                            styles.modalContainer,
                            { backgroundColor: isDark ? '#1e293b' : '#ffffff' }
                        ]}
                    >
                        {/* Decorative corner accents */}
                        <View style={[styles.cornerAccent, { borderColor: isDark ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.5)' }]} />
                        <View style={[styles.cornerAccent, styles.cornerAccentBottomRight, { borderColor: isDark ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.5)' }]} />

                        {/* Header with animated logo */}
                        <View style={styles.header}>
                            <LinearGradient
                                colors={['rgba(255,215,0,0.2)', 'rgba(255,215,0,0.05)']}
                                style={styles.logoContainer}
                            >
                                <View style={styles.logoInner}>
                                    <FontAwesome5 name="crosshairs" size={36} color="#FFD700" />
                                </View>
                            </LinearGradient>

                            <ThemedText variant="heading" style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>
                                Welcome, Soldier
                            </ThemedText>
                            <View style={[styles.divider, { backgroundColor: isDark ? '#FFD700' : '#F59E0B' }]} />
                            <ThemedText variant="body" style={[styles.subtitle, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }]}>
                                Enlist in the most important battle:{'\n'}
                                <ThemedText style={[styles.subtitleBold, { color: isDark ? '#FFD700' : '#F59E0B' }]}>Memorizing God's Word</ThemedText>
                            </ThemedText>
                        </View>

                        {/* Features with staggered animation */}
                        <ScrollView
                            style={styles.featuresScroll}
                            contentContainerStyle={styles.featuresContainer}
                            showsVerticalScrollIndicator={false}
                        >
                            {features.map((feature, index) => (
                                <FeatureCard
                                    key={index}
                                    icon={feature.icon}
                                    title={feature.title}
                                    description={feature.description}
                                    delay={300 + index * 100}
                                />
                            ))}

                            {/* Mission briefing box */}
                            <View style={[
                                styles.missionBriefing,
                                {
                                    backgroundColor: isDark ? 'rgba(255,215,0,0.05)' : 'rgba(255,215,0,0.08)',
                                    borderColor: isDark ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.3)'
                                }
                            ]}>
                                <FontAwesome5 name="info-circle" size={16} color={isDark ? '#FFD700' : '#F59E0B'} />
                                <ThemedText variant="caption" style={[styles.briefingText, { color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)' }]}>
                                    Your mission: Master scripture through voice recognition challenges, unlock gear, and advance through campaigns.
                                </ThemedText>
                            </View>
                        </ScrollView>

                        {/* Enhanced bottom actions */}
                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={[
                                    styles.skipButton,
                                    {
                                        backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                                        borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
                                    }
                                ]}
                                onPress={handleSkip}
                                activeOpacity={0.7}
                            >
                                <ThemedText variant="button" style={[styles.skipButtonText, { color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)' }]}>
                                    Skip Briefing
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleGetStarted}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#FFD700', '#FFA500']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.primaryButtonGradient}
                                >
                                    <FontAwesome5 name="shield-alt" size={16} color="#000" />
                                    <ThemedText variant="button" style={styles.primaryButtonText}>
                                        Begin Mission
                                    </ThemedText>
                                    <FontAwesome5 name="arrow-right" size={16} color="#000" />
                                </LinearGradient>
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
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalWrapper: {
        width: '100%',
        maxWidth: 420,
        maxHeight: height * 0.92,
    },
    modalContainer: {
        width: '100%',
        height: '100%',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 15,
    },
    cornerAccent: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 40,
        height: 40,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: 24,
    },
    cornerAccentBottomRight: {
        top: undefined,
        left: undefined,
        bottom: 0,
        right: 0,
        borderTopWidth: 0,
        borderLeftWidth: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderTopLeftRadius: 0,
        borderBottomRightRadius: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    logoContainer: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    logoInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,215,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,215,0,0.3)',
    },
    title: {
        fontSize: 26,
        textAlign: 'center',
        marginBottom: 12,
        letterSpacing: 1,
        fontWeight: '800',
    },
    divider: {
        width: 60,
        height: 2,
        marginBottom: 12,
        borderRadius: 1,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 320,
    },
    subtitleBold: {
        fontWeight: '700',
    },
    featuresScroll: {
        flex: 1,
        width: '100%',
    },
    featuresContainer: {
        gap: 12,
        paddingVertical: 8,
        paddingBottom: 16,
    },
    featureCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        gap: 14,
        marginBottom: 0,
    },
    featureIconContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255,215,0,0.2)',
    },
    featureContent: {
        flex: 1,
        gap: 4,
    },
    featureTitle: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    featureDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    missionBriefing: {
        flexDirection: 'row',
        padding: 14,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
        marginTop: 8,
    },
    briefingText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
    },
    actions: {
        width: '100%',
        marginTop: 20,
        gap: 10,
    },
    skipButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    skipButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    primaryButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    primaryButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
})