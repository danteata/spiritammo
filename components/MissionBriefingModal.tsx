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
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableOpacity>

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ translateY: slideAnim }],
                            backgroundColor: isDark ? '#1A1A1A' : '#F0F0F0',
                            borderColor: theme.border
                        }
                    ]}
                >
                    <LinearGradient
                        colors={isDark ? ['#2A2A2A', '#1A1A1A'] : ['#FFFFFF', '#F5F5F5']}
                        style={styles.gradient}
                    >
                        <ScrollView
                            contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 40 : 24 }}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {/* Header */}
                            <View style={styles.header}>
                                <View style={styles.headerTitleContainer}>
                                    <MaterialCommunityIcons name="file-document-outline" size={24} color={theme.accent} />
                                    <ThemedText variant="heading" style={styles.headerTitle}>MISSION BRIEFING</ThemedText>
                                </View>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={theme.textSecondary} />
                                </TouchableOpacity>
                            </View>

                            {/* Intel Card */}
                            <View style={[styles.intelCard, { borderColor: theme.border, backgroundColor: theme.surface }]}>
                                <View style={styles.intelRow}>
                                    <ThemedText variant="caption" style={styles.intelLabel}>TARGET SECTOR</ThemedText>
                                    <ThemedText variant="subheading" style={{ color: theme.primary }}>{scripture.reference.toUpperCase()}</ThemedText>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.intelRow}>
                                    <ThemedText variant="caption" style={styles.intelLabel}>PASS REQUIREMENT</ThemedText>
                                    <View style={styles.requirementBadge}>
                                        <FontAwesome5 name="crosshairs" size={12} color={theme.text} style={{ marginRight: 6 }} />
                                        <ThemedText variant="body" style={{ fontWeight: 'bold' }}>{node.requiredAccuracy}% ACCURACY</ThemedText>
                                    </View>
                                </View>
                            </View>

                            <ThemedText variant="caption" style={styles.sectionTitle}>SELECT ENGAGEMENT PROTOCOL</ThemedText>

                            {/* Action Buttons */}
                            <View style={styles.actionsContainer}>
                                <TouchableOpacity
                                    style={[styles.missionButton, styles.stealthButton]}
                                    onPress={() => handleStart('STEALTH')}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={['#4E5D6C', '#37474F']}
                                        style={styles.buttonGradient}
                                    >
                                        <MaterialCommunityIcons name="incognito" size={32} color="#FFF" style={styles.buttonIcon} />
                                        <View>
                                            <Text style={[MILITARY_TYPOGRAPHY.heading, styles.buttonTitle]}>STEALTH OP</Text>
                                            <Text style={[MILITARY_TYPOGRAPHY.caption, styles.buttonSubtitle]}>SILENT DRILL</Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.5)" style={styles.chevron} />
                                    </LinearGradient>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.missionButton, styles.voiceButton, { borderColor: theme.accent }]}
                                    onPress={() => handleStart('VOICE')}
                                    activeOpacity={0.9}
                                >
                                    <LinearGradient
                                        colors={[theme.accent, '#D84315']} // Orange gradient
                                        style={styles.buttonGradient}
                                    >
                                        <Ionicons name="mic" size={32} color="#FFF" style={styles.buttonIcon} />
                                        <View>
                                            <Text style={[MILITARY_TYPOGRAPHY.heading, styles.buttonTitle]}>LIVE FIRE</Text>
                                            <Text style={[MILITARY_TYPOGRAPHY.caption, styles.buttonSubtitle]}>VOICE RECOGNITION</Text>
                                        </View>
                                        <MaterialCommunityIcons name="chevron-right" size={24} color="rgba(255,255,255,0.5)" style={styles.chevron} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>

                            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
                                CONFIRM PROTOCOL TO BEGIN OPERATION
                            </Text>
                        </ScrollView>
                    </LinearGradient>
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
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContainer: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        overflow: 'hidden',
        borderTopWidth: 1,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        minHeight: 450,
        maxHeight: '90%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    gradient: {
        flex: 1,
        padding: 24,
        paddingBottom: 0, // Handled by ScrollView
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    headerTitle: {
        fontSize: 20,
        letterSpacing: 1,
    },
    closeButton: {
        padding: 8,
    },
    intelCard: {
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 32,
    },
    intelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    divider: {
        height: 1,
        backgroundColor: 'rgba(128,128,128,0.2)',
        marginVertical: 4,
    },
    intelLabel: {
        opacity: 0.7,
        letterSpacing: 1,
    },
    requirementBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(128,128,128,0.1)',
        borderRadius: 12,
    },
    sectionTitle: {
        marginBottom: 16,
        textAlign: 'center',
        opacity: 0.6,
        letterSpacing: 2,
    },
    actionsContainer: {
        gap: 16,
        marginBottom: 24,
    },
    missionButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    stealthButton: {
        // base
    },
    voiceButton: {
        // base
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
    },
    buttonIcon: {
        marginRight: 16,
        opacity: 0.9,
    },
    buttonTitle: {
        color: '#FFF',
        fontSize: 18,
        letterSpacing: 1,
        marginBottom: 2,
    },
    buttonSubtitle: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 12,
    },
    chevron: {
        marginLeft: 'auto',
    },
    footerText: {
        textAlign: 'center',
        fontSize: 10,
        letterSpacing: 1,
        opacity: 0.5,
        marginTop: 'auto',
    }
})
