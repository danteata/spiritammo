import React, { useState, useEffect } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Text,
    Dimensions,
    Alert,
} from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import CampaignCard from '@/components/CampaignCard'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'
import useZustandStore from '@/hooks/zustandStore'

const { width } = Dimensions.get('window')

export default function BattleScreen() {
    const {
        isLoading,
        theme,
        isDark,
        userStats,
        campaigns,
        activeCampaignId,
        startCampaign
    } = useAppStore()
    const router = useRouter()
    const { trackEvent } = useAnalytics()
    const { squadChallenges } = useZustandStore()

    // Track screen view
    useScreenTracking('battle')

    const handleStartCampaign = (campaignId: string) => {
        trackEvent(AnalyticsEventType.CAMPAIGN_START, {
            campaign_id: campaignId,
            source: 'battle_screen'
        })
        startCampaign(campaignId)
        router.push({ pathname: '/battle/campaign', params: { mode: 'campaign' } })
    }

    const handleQuickBattle = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'quick_battle',
            source: 'battle_screen'
        })
        router.push('/battle/quick')
    }

    const handleCollectionBattle = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'collection_battle',
            source: 'battle_screen'
        })
        router.push('/battle/collection')
    }

    const valorPoints = userStats?.valorPoints || 0
    const rank = userStats?.rank || 'Recruit'
    const streak = userStats?.streak || 0

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="CHALLENGE ARENA"
                subtitle="TEST YOUR PROGRESS"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Valor Points & Rank Display */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="medal" size={20} color="#FFD700" />
                        <ThemedText variant="heading" style={styles.statNumber}>{rank}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Rank</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="coins" size={20} color="#FFD700" />
                        <ThemedText variant="heading" style={styles.statNumber}>{valorPoints}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Valor Points</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <Ionicons name="flame" size={20} color="#FF6B35" />
                        <ThemedText variant="heading" style={styles.statNumber}>{streak}</ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>Day Streak</ThemedText>
                    </View>
                </View>

                {/* Warning Banner */}
                <View style={[styles.warningBanner, { backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.1)' }]}>
                    <Ionicons name="warning" size={20} color="#FF6B35" />
                    <ThemedText variant="caption" style={styles.warningText}>
                        Battles affect your score & earn Valor Points
                    </ThemedText>
                </View>

                {/* Battle Modes */}
                <View style={styles.modesSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CHOOSE YOUR BATTLE
                    </ThemedText>

                    {/* Quick Battle - Primary CTA */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={handleQuickBattle}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                                    <Ionicons name="flash" size={32} color="#EF4444" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>QUICK SKIRMISH</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Random verse battle. Earn VP based on accuracy. No preparation needed.
                                </ThemedText>
                                <View style={styles.rewardBadge}>
                                    <FontAwesome5 name="coins" size={12} color="#FFD700" />
                                    <ThemedText variant="caption" style={styles.rewardText}>+5-25 VP</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Collection Battle */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={handleCollectionBattle}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={styles.modeCardInner}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
                                    <FontAwesome name="folder-open" size={28} color="#22C55E" />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={styles.modeTitle}>COLLECTION ASSAULT</ThemedText>
                                <ThemedText variant="body" style={styles.modeDescription}>
                                    Battle through your collections. Higher accuracy = more Valor Points.
                                </ThemedText>
                                <View style={styles.rewardBadge}>
                                    <FontAwesome5 name="coins" size={12} color="#FFD700" />
                                    <ThemedText variant="caption" style={styles.rewardText}>+10-50 VP</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={16} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Campaign Section */}
                    <ThemedText variant="caption" style={[styles.sectionTitle, { marginTop: 24 }]}>
                        CAMPAIGNS
                    </ThemedText>

                    {campaigns && campaigns.length > 0 ? (
                        campaigns.map((campaign) => (
                            <CampaignCard
                                key={campaign.id}
                                campaign={campaign}
                                onPress={() => handleStartCampaign(campaign.id)}
                            />
                        ))
                    ) : (
                        <ThemedCard variant="glass" style={styles.emptyCard}>
                            <Ionicons name="map-outline" size={48} color={theme.textSecondary} />
                            <ThemedText variant="body" style={styles.emptyText}>
                                No campaigns available. Complete training to unlock campaigns.
                            </ThemedText>
                        </ThemedCard>
                    )}
                </View>

                {/* Squad Challenges */}
                {squadChallenges && squadChallenges.length > 0 && (
                    <View style={styles.squadSection}>
                        <ThemedText variant="caption" style={styles.sectionTitle}>
                            SQUAD OPERATIONS
                        </ThemedText>
                        {squadChallenges.map((challenge: any) => (
                            <ThemedCard key={challenge.id} variant="glass" style={styles.challengeCard}>
                                <View style={styles.challengeHeader}>
                                    <FontAwesome5 name="users" size={16} color={theme.accent} />
                                    <ThemedText variant="heading" style={styles.challengeTitle}>
                                        {challenge.title}
                                    </ThemedText>
                                </View>
                                <ThemedText variant="body" style={styles.challengeDesc}>
                                    {challenge.description}
                                </ThemedText>
                                <View style={styles.challengeProgress}>
                                    <ThemedText variant="caption">
                                        {challenge.currentValue}/{challenge.targetValue}
                                    </ThemedText>
                                </View>
                            </ThemedCard>
                        ))}
                    </View>
                )}
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
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
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
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 20,
        gap: 8,
    },
    warningText: {
        flex: 1,
        color: '#FF6B35',
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
        borderColor: 'rgba(239, 68, 68, 0.3)',
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
    rewardBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    rewardText: {
        color: '#FFD700',
        fontSize: 11,
    },
    modeArrow: {
        marginLeft: 8,
    },
    emptyCard: {
        alignItems: 'center',
        padding: 32,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 12,
        opacity: 0.7,
    },
    squadSection: {
        marginBottom: 24,
    },
    challengeCard: {
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    challengeTitle: {
        fontSize: 14,
    },
    challengeDesc: {
        fontSize: 12,
        opacity: 0.7,
        marginBottom: 8,
    },
    challengeProgress: {
        alignItems: 'flex-end',
    },
})
