import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Dimensions,
} from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const { width } = Dimensions.get('window')

type TrainingMode = 'single' | 'burst' | 'automatic'

export default function TrainingScreen() {
    const { isLoading, theme, isDark, userStats, scriptures, collections } = useAppStore()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('training')

    const handleModeSelect = (mode: TrainingMode) => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'training_mode_selected',
            mode_selected: mode
        })
        // Navigate to training practice screen
        router.push({ pathname: '/train/practice', params: { mode } })
    }

    const handleCollectionPractice = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'collection_training',
            source: 'training_screen'
        })
        router.push({ pathname: '/train/practice', params: { mode: 'collection' } })
    }

    const verseCount = scriptures?.length || 0
    const collectionCount = collections?.length || 0

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="TRAINING RANGE"
                subtitle="PRACTICE WITHOUT PRESSURE"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Ionicons name="information-circle" size={20} color="#3B82F6" />
                    <ThemedText variant="caption" style={styles.infoText}>
                        Training mode is pressure-free. No scores recorded, no VP at stake.
                    </ThemedText>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="book" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{verseCount}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Verses</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome name="folder" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{collectionCount}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Collections</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <Ionicons name="time" size={20} color={theme.accent} />
                        <ThemedText variant="heading" style={styles.statNumber}>{userStats?.totalPracticed || 0}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Sessions</ThemedText>
                    </View>
                </View>

                {/* Training Mode Selection */}
                <View style={styles.modesSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        TRAINING MODES
                    </ThemedText>

                    {/* Single Mode - Focus on one verse */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('single')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                    <Ionicons name="eye" size={32} color="#3B82F6" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>SINGLE FOCUS</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Deep memorization on one verse at a time. Perfect for learning new scriptures.
                                </ThemedText>
                                <View style={styles.modeTag}>
                                    <ThemedText variant="caption" style={styles.modeTagText}>No Pressure</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Burst Mode - Rapid fire */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('burst')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                                    <Ionicons name="flash" size={28} color="#22C55E" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>BURST FIRE</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Rapid-fire practice for quick recall. Great for reviewing familiar verses.
                                </ThemedText>
                                <View style={styles.modeTag}>
                                    <ThemedText variant="caption" style={styles.modeTagText}>Quick Review</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Automatic Mode - Hands-free */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('automatic')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                                    <Ionicons name="infinite" size={28} color="#A855F7" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>AUTO PILOT</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Continuous, hands-free practice. Listen and repeat at your own pace.
                                </ThemedText>
                                <View style={styles.modeTag}>
                                    <ThemedText variant="caption" style={styles.modeTagText}>Passive Learning</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>
                </View>

                {/* Collection Practice Section */}
                <View style={styles.collectionSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        COLLECTION PRACTICE
                    </ThemedText>

                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={handleCollectionPractice}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                                    <FontAwesome name="folder-open" size={28} color="#FBBF24" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>COLLECTION DRILL</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Practice verses from your personal collections. Focus on specific topics or chapters.
                                </ThemedText>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>
                </View>

                {/* Tips Section */}
                <View style={styles.tipsSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        TRAINING TIPS
                    </ThemedText>
                    <ThemedCard variant="glass" style={styles.tipCard}>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                            <ThemedText variant="body" style={styles.tipText}>
                                Use Single Focus for new verses you're memorizing
                            </ThemedText>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                            <ThemedText variant="body" style={styles.tipText}>
                                Switch to Burst Fire for verses you know well
                            </ThemedText>
                        </View>
                        <View style={styles.tipItem}>
                            <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                            <ThemedText variant="body" style={styles.tipText}>
                                Ready for a challenge? Try Battle mode!
                            </ThemedText>
                        </View>
                    </ThemedCard>
                </View>
            </ScrollView>

            {isLoading && <LoadingOverlay />}
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    infoText: {
        flex: 1,
        color: '#3B82F6',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        marginHorizontal: 4,
    },
    statNumber: {
        fontSize: 20,
        marginTop: 4,
    },
    statLabel: {
        fontSize: 10,
        opacity: 0.7,
        marginTop: 2,
    },
    modesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        letterSpacing: 1.5,
        opacity: 0.7,
        marginBottom: 12,
    },
    modeCard: {
        marginBottom: 12,
    },
    modeCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
    },
    primaryMode: {
        borderWidth: 2,
        borderColor: 'rgba(59, 130, 246, 0.3)',
    },
    modeIconContainer: {
        marginRight: 12,
    },
    modeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeContent: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        marginBottom: 4,
    },
    modeDescription: {
        fontSize: 12,
        opacity: 0.7,
        lineHeight: 18,
    },
    modeTag: {
        marginTop: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        alignSelf: 'flex-start',
    },
    modeTagText: {
        color: '#3B82F6',
        fontSize: 10,
    },
    modeArrow: {
        marginLeft: 8,
    },
    collectionSection: {
        marginBottom: 24,
    },
    tipsSection: {
        marginBottom: 24,
    },
    tipCard: {
        padding: 16,
        borderRadius: 12,
    },
    tipItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
    },
})
