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
import { FontAwesome5, Ionicons } from '@expo/vector-icons'
import ContextualTooltip from '@/components/ui/ContextualTooltip'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { SkeletonHomeScreen } from '@/components/ui/Skeleton'
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
        startCampaign,
        scriptures,
        generateAutoCampaign,
        generateThematicCampaign,
        findAvailableThemes,
        deleteCampaign,
        resetCampaignProgress,
        escalateCampaign,
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

    const handleBattle = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'battle',
            source: 'battle_screen'
        })
        router.push({ pathname: '/battle/collection', params: { mode: 'random' } })
    }

    const valorPoints = userStats?.valorPoints || 0
    const rank = userStats?.rank || 'Recruit'
    const streak = userStats?.streak || 0

    if (isLoading) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader
                    title="CHALLENGE ARENA"
                    subtitle="TEST YOUR PROGRESS"
                />
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <SkeletonHomeScreen />
                </ScrollView>
            </ThemedContainer>
        )
    }

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
                <ContextualTooltip
                    id="battle"
                    title="Test Your Memory"
                    message="Battles test your memory under pressure. You earn Valor Points based on accuracy."
                />

                {/* Valor Points & Rank Display */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                        <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FFD700' : '#C8A951' }]} />
                        <FontAwesome5 name="medal" size={18} color={isDark ? '#FFD700' : '#C8A951'} />
                        <ThemedText variant="heading" style={[styles.statNumber, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{rank}</ThemedText>
                        <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Rank</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                        <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FFD700' : '#C8A951' }]} />
                        <FontAwesome5 name="coins" size={18} color={isDark ? '#FFD700' : '#C8A951'} />
                        <ThemedText variant="heading" style={[styles.statNumber, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{valorPoints}</ThemedText>
                        <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Valor Points</ThemedText>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', borderColor: isDark ? 'rgba(255,255,255,0.08)' : '#D4CBAB', borderWidth: isDark ? 0 : 1.5 }]}>
                        <View style={[styles.statsAccentBar, { backgroundColor: isDark ? '#FF6B35' : '#B45309' }]} />
                        <Ionicons name="flame" size={18} color={isDark ? '#FF6B35' : '#B45309'} />
                        <ThemedText variant="heading" style={[styles.statNumber, { color: isDark ? '#F8FAFC' : '#1A2309' }]}>{streak}</ThemedText>
                        <ThemedText variant="caption" style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>Day Streak</ThemedText>
                    </View>
                </View>

                {/* Warning Banner */}
                <View style={[styles.warningBanner, { backgroundColor: isDark ? `${theme.warning}15` : theme.surface, borderColor: isDark ? 'transparent' : `${theme.warning}40`, borderWidth: isDark ? 0 : 1.5 }]}>
                    <Ionicons name="warning" size={18} color={theme.warning} />
                    <ThemedText variant="caption" style={[styles.warningText, { color: theme.warning }]}>
                        Battles affect your score & earn Valor Points
                    </ThemedText>
                </View>

                {/* Battle Modes */}
                <View style={styles.modesSection}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CHOOSE YOUR BATTLE
                    </ThemedText>

                    {/* Combat — Single card with random/sequential toggle inside */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={handleBattle}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode, { borderColor: isDark ? `${theme.accent}30` : theme.accent }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.accent}15` }]}>
                                    <Ionicons name="flash" size={28} color={theme.accent} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.accent }]}>ENTER COMBAT</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: isDark ? theme.textSecondary : '#6B7B3A' }]}>
                                    Battle verses for Valor Points. Toggle between random and sequential mode inside.
                                </ThemedText>
                                <View style={{ flexDirection: 'row', gap: 6 }}>
                                    <View style={styles.rewardBadge}>
                                        <FontAwesome5 name="coins" size={12} color={theme.accent} />
                                        <ThemedText variant="caption" style={[styles.rewardText, { color: theme.accent }]}>+5-25 VP</ThemedText>
                                    </View>
                                    <View style={styles.rewardBadge}>
                                        <FontAwesome5 name="list" size={12} color={theme.success} />
                                        <ThemedText variant="caption" style={[styles.rewardText, { color: theme.success }]}>Sequential</ThemedText>
                                    </View>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : '#6B7B3A'} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Adaptive Operations */}
                    <View style={styles.adaptiveSection}>
                        <View style={styles.adaptiveHeader}>
                            <FontAwesome5 name="robot" size={12} color={theme.warning} />
                            <ThemedText variant="caption" style={{ letterSpacing: 2, marginLeft: 8, opacity: 0.7 }}>ADAPTIVE OPERATIONS</ThemedText>
                        </View>
                        <ThemedText variant="caption" style={{ opacity: 0.55, marginBottom: 14, lineHeight: 18 }}>
                            Procedurally generated campaigns that adapt to your performance.
                        </ThemedText>

                        <TouchableOpacity
                            style={[styles.adaptiveButton, { borderColor: theme.accent }]}
                            onPress={() => {
                                const campaign = generateAutoCampaign()
                                if (campaign) {
                                    handleStartCampaign(campaign.id)
                                } else {
                                    Alert.alert('ALL CLEAR', 'No weak areas detected. Keep up the good work, soldier!', [{ text: 'Understood' }])
                                }
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.adaptiveIcon, { backgroundColor: `${theme.accent}15` }]}>
                                <FontAwesome5 name="crosshairs" size={20} color={theme.accent} />
                            </View>
                            <View style={styles.adaptiveText}>
                                <ThemedText variant="body" style={{ fontWeight: '700' }}>AUTO OPERATION</ThemedText>
                                <ThemedText variant="caption" style={{ opacity: 0.6 }}>Targets your weakest verses</ThemedText>
                            </View>
                            <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                        </TouchableOpacity>

                        {findAvailableThemes().length > 0 && (
                            <TouchableOpacity
                                style={[styles.adaptiveButton, { borderColor: theme.warning, marginTop: 10 }]}
                                onPress={() => {
                                    const themes = findAvailableThemes()
                                    if (themes.length > 0) {
                                        const campaign = generateThematicCampaign(themes[0])
                                        if (campaign) {
                                            handleStartCampaign(campaign.id)
                                        } else {
                                            Alert.alert('INSUFFICIENT DATA', 'Practice more verses to unlock thematic operations.', [{ text: 'Understood' }])
                                        }
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.adaptiveIcon, { backgroundColor: `${theme.warning}15` }]}>
                                    <FontAwesome5 name="link" size={20} color={theme.warning} />
                                </View>
                                <View style={styles.adaptiveText}>
                                    <ThemedText variant="body" style={{ fontWeight: '700' }}>THEMATIC OPERATION</ThemedText>
                                    <ThemedText variant="caption" style={{ opacity: 0.6 }}>Connects verses by theme ({findAvailableThemes().slice(0, 3).join(', ')})</ThemedText>
                                </View>
                                <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>

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
                                onDelete={(id) => deleteCampaign(id)}
                                onReset={(id) => resetCampaignProgress(id)}
                                onEscalate={(id) => {
                                    const escalated = escalateCampaign(id)
                                    if (escalated) {
                                        handleStartCampaign(escalated.id)
                                    }
                                }}
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
        borderRadius: 8,
        marginHorizontal: 4,
        overflow: 'hidden',
        position: 'relative',
    },
    statsAccentBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
    },
    statNumber: {
        fontSize: 20,
        marginTop: 4,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 10,
        opacity: 0.7,
        marginTop: 2,
        fontWeight: '600',
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
        fontSize: 11,
        letterSpacing: 2,
        opacity: 0.7,
        marginBottom: 12,
        fontWeight: '700',
    },
    modeCard: {
        marginBottom: 10,
    },
    modeCardInner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 8,
    },
    primaryMode: {
        borderWidth: 2,
    },
    modeIconContainer: {
        marginRight: 12,
    },
    modeIcon: {
        width: 52,
        height: 52,
        borderRadius: 8,
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
        borderRadius: 8,
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
    adaptiveSection: {
        marginTop: 24,
        gap: 12,
    },
    adaptiveHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    adaptiveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 12,
    },
    adaptiveIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    adaptiveText: {
        flex: 1,
    },
})
