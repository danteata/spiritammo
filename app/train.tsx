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
import SoldierAvatar from '@/components/SoldierAvatar'
import StreakChallenge from '@/components/StreakChallenge'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const { width } = Dimensions.get('window')

type TrainingMode = 'quick' | 'collection' | 'campaign'

export default function TrainScreen() {
    const { isLoading, theme, isDark, userStats, scriptures, collections } = useAppStore()
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    // Track screen view
    useScreenTracking('train')

    const handleModeSelect = (mode: TrainingMode) => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'training_mode_selected',
            mode_selected: mode
        })

        switch (mode) {
            case 'quick':
                // Navigate to quick drill with a random verse
                router.push({ pathname: '/(tabs)/campaign', params: { mode: 'quick' } })
                break
            case 'collection':
                router.push({ pathname: '/(tabs)/campaign', params: { mode: 'collection' } })
                break
            case 'campaign':
                router.push({ pathname: '/(tabs)/campaign', params: { mode: 'campaign' } })
                break
        }
    }

    const verseCount = scriptures?.length || 0
    const collectionCount = collections?.length || 0

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="TRAINING GROUNDS"
                subtitle="SELECT YOUR DRILL TYPE"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
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
                        <Ionicons name="flame" size={20} color="#FF6B35" />
                        <ThemedText variant="heading" style={styles.statNumber}>{userStats?.streak || 0}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Day Streak</ThemedText>
                    </View>
                </View>

                {/* Training Mode Selection */}
                <View style={styles.modesSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CHOOSE YOUR TRAINING MODE
                    </ThemedText>

                    {/* Quick Drill - Primary CTA */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('quick')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                    <Ionicons name="flash" size={32} color="#3B82F6" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>QUICK DRILL</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Practice a random verse from your collection. Perfect for daily warm-ups.
                                </ThemedText>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Collection Practice */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('collection')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                                    <FontAwesome name="folder-open" size={28} color="#22C55E" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>COLLECTION DRILLS</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Focus on specific verses from your personal collections.
                                </ThemedText>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Campaign Mode */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('campaign')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                                    <Ionicons name="trophy" size={28} color="#FFD700" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>CONQUEST MODE</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Embark on structured scripture challenges and earn rewards.
                                </ThemedText>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>
                </View>

                {/* Progress Section */}
                <View style={styles.progressSection}>
                    <StreakChallenge compact={true} />
                </View>
            </ScrollView>

            <LoadingOverlay visible={isLoading} message="Preparing training grounds..." />
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
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statNumber: {
        fontSize: 24,
        marginTop: 8,
    },
    statLabel: {
        marginTop: 4,
        opacity: 0.7,
    },
    modesSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        marginBottom: 16,
        opacity: 0.7,
        letterSpacing: 1,
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
        marginRight: 16,
    },
    modeIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
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
        fontSize: 13,
        opacity: 0.7,
        lineHeight: 18,
    },
    modeArrow: {
        marginLeft: 8,
        opacity: 0.5,
    },
    progressSection: {
        marginTop: 8,
    },
})
