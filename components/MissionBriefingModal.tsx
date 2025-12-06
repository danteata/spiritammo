import React, { useEffect, useRef } from 'react'
import {
    StyleSheet,
    View,
    Text,
    Modal,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { FontAwesome5, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import {
    TACTICAL_THEME,
    GARRISON_THEME,
    MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { CampaignNode } from '@/types/campaign'
import { Scripture } from '@/types/scripture'

interface MissionBriefingModalProps {
    isVisible: boolean
    onClose: () => void
    onStartMission: (mode: 'VOICE' | 'STEALTH') => void
    node: CampaignNode | null
    scripture: Scripture | null
}

const { width, height } = Dimensions.get('window')

export default function MissionBriefingModal({
    isVisible,
    onClose,
    onStartMission,
    node,
    scripture
}: MissionBriefingModalProps) {
    const { isDark } = useAppStore()
    const theme = isDark ? TACTICAL_THEME : GARRISON_THEME

    // Animations
    const slideAnim = useRef(new Animated.Value(Dimensions.get('window').height)).current
    const fadeAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 15,
                    stiffness: 100,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start()

            // Tactical haptic feedback on open
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start()
            Animated.timing(slideAnim, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }, [isVisible])

    const handleStart = (mode: 'VOICE' | 'STEALTH') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        onStartMission(mode)
    }

    if (!node || !scripture) return null

    return (
        <Modal
            visible={isVisible}
            transparent
            statusBarTranslucent
            animationType="none"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                >
                    <BlurView
                        intensity={20}
                        tint="dark"
                        style={StyleSheet.absoluteFill}
                    />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            borderColor: theme.border
                        }
                    ]}
                >
                    <ScrollView
                        contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24, padding: 24 }}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleContainer}>
                                <View style={{ width: 4, height: 24, backgroundColor: theme.accent, borderRadius: 2 }} />
                                <ThemedText variant="heading" style={styles.headerTitle}>MISSION BRIEFING</ThemedText>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        {/* Intel Card */}
                        <View style={[styles.intelCard, {
                            borderColor: theme.border,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'
                        }]}>
                            <View style={styles.intelRow}>
                                <ThemedText variant="code" style={styles.intelLabel}>TARGET SECTOR</ThemedText>
                                <ThemedText variant="subheading" style={{ color: theme.primary, letterSpacing: 1 }}>{scripture.reference.toUpperCase()}</ThemedText>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.intelRow}>
                                <ThemedText variant="code" style={styles.intelLabel}>PASS REQUIREMENT</ThemedText>
                                <View style={[styles.requirementBadge, { backgroundColor: theme.surfaceHighlight }]}>
                                    <FontAwesome5 name="crosshairs" size={12} color={theme.accent} style={{ marginRight: 6 }} />
                                    <ThemedText variant="body" style={{ fontWeight: 'bold' }}>{node.requiredAccuracy}% ACCURACY</ThemedText>
                                </View>
                            </View>
                        </View>

                        <ThemedText variant="code" style={styles.sectionTitle}>SELECT ENGAGEMENT PROTOCOL</ThemedText>

                        {/* Action Buttons */}
                        <View style={styles.actionsContainer}>
                            <TouchableOpacity
                                style={[styles.protocolCard, { borderColor: theme.border }]}
                                onPress={() => handleStart('STEALTH')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={isDark ? ['#1e293b', '#0f172a'] : ['#f8fafc', '#e2e8f0']}
                                    style={styles.protocolGradient}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
                                        <MaterialCommunityIcons name="incognito" size={28} color={theme.text} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText variant="button" style={{ fontSize: 18 }}>STEALTH OP</ThemedText>
                                        <ThemedText variant="caption" style={{ opacity: 0.6 }}>SILENT DRILL</ThemedText>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={theme.textSecondary} />
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.protocolCard, { borderColor: theme.accent, borderWidth: 1 }]}
                                onPress={() => handleStart('VOICE')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={isDark ? ['#7c2d12', '#431407'] : ['#ffedd5', '#fed7aa']} // Darker orange for dark mode
                                    style={styles.protocolGradient}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: theme.accent }]}>
                                        <Ionicons name="mic" size={28} color="#FFF" />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <ThemedText variant="button" style={{ fontSize: 18, color: isDark ? 'white' : '#7c2d12' }}>LIVE FIRE</ThemedText>
                                        <ThemedText variant="caption" style={{ opacity: 0.8, color: isDark ? 'rgba(255,255,255,0.7)' : '#7c2d12' }}>VOICE RECOGNITION</ThemedText>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-right" size={24} color={isDark ? 'white' : '#7c2d12'} />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                            CONFIRM PROTOCOL TO BEGIN OPERATION
                        </Text>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContainer: {
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        borderTopWidth: 1,
        minHeight: 500,
        maxHeight: '90%',
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 24, // Larger title
        letterSpacing: 1,
    },
    closeButton: {
        padding: 8,
        backgroundColor: 'rgba(128,128,128,0.1)',
        borderRadius: 20,
    },
    intelCard: {
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 32,
    },
    intelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(128,128,128,0.1)',
        marginVertical: 12,
    },
    intelLabel: {
        opacity: 0.5,
        fontSize: 12,
    },
    requirementBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    sectionTitle: {
        marginBottom: 16,
        textAlign: 'center',
        opacity: 0.4,
        letterSpacing: 3,
        fontSize: 10,
    },
    actionsContainer: {
        gap: 16,
        marginBottom: 32,
    },
    protocolCard: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderBottomWidth: 4, // Tactile feel
    },
    protocolGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerText: {
        textAlign: 'center',
        fontSize: 10,
        letterSpacing: 1,
        opacity: 0.3,
        marginTop: 'auto',
    }
})
