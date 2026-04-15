import React, { useState, useEffect, useCallback } from 'react'
import {
    StyleSheet,
    View,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Text,
} from 'react-native'
import { FontAwesome5, FontAwesome, Ionicons } from '@expo/vector-icons'
import ContextualTooltip from '@/components/ui/ContextualTooltip'
import { useRouter, useFocusEffect } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { useZustandStore, TrainingMode } from '@/hooks/zustandStore'
import { SRSDailySummary } from '@/types/srs'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import ScreenHeader from '@/components/ScreenHeader'
import { SkeletonHomeScreen } from '@/components/ui/Skeleton'
import { useScreenTracking, useAnalytics } from '@/hooks/useAnalytics'
import { AnalyticsEventType } from '@/services/analytics'

const { width } = Dimensions.get('window')

export default function TrainingScreen() {
    const { isLoading, theme, isDark, userStats, scriptures, collections, startTraining } = useAppStore()
    const srsDailySummary = useZustandStore((s) => s.srsDailySummary)
    const router = useRouter()
    const { trackEvent } = useAnalytics()

    useScreenTracking('training')

    // When this screen gains focus, check if another screen (e.g. Home)
    // queued a pending training mode via the store. We dismiss any screens
    // above the index first (from previous cross-tab navigations), then
    // replace the index itself with the target — this makes the target the
    // stack root so NativeTabs can't pop it, and avoids stacking stale screens.
    useFocusEffect(
        useCallback(() => {
            const intent = useZustandStore.getState().consumeTrainingIntent()
            if (intent.mode) {
                const target = intent.mode === 'voice' ? '/train/voice' : '/train/practice'
                try {
                    router.dismissAll()
                } catch {}
                requestAnimationFrame(() => {
                    router.replace({
                        pathname: target,
                        params: {
                            mode: intent.mode,
                            collectionId: intent.collectionId ?? undefined,
                            chapterIds: intent.chapterIds ?? undefined,
                        },
                    })
                })
            }
        }, [router])
    )

    const handleModeSelect = (mode: TrainingMode) => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'training_mode_selected',
            mode_selected: mode,
        })
        router.push({
            pathname: mode === 'voice' ? '/train/voice' : '/train/practice',
            params: { mode },
        })
    }

    const handleCollectionPractice = () => {
        trackEvent(AnalyticsEventType.PRACTICE_START, {
            practice_type: 'collection_training',
            source: 'training_screen'
        })
        router.push('/train/drill')
    }

    const verseCount = scriptures?.length || 0
    const collectionCount = collections?.length || 0

    const totalSessions = userStats?.totalPracticed || 0

    if (isLoading) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader
                    title="ENGAGEMENT RANGE"
                    subtitle="COMBAT READINESS TRAINING"
                />
                <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                    <SkeletonHomeScreen />
                </ScrollView>
            </ThemedContainer>
        )
    }

    if (verseCount === 0) {
        return (
            <ThemedContainer style={styles.container}>
                <ScreenHeader
                    title="ENGAGEMENT RANGE"
                    subtitle="COMBAT READINESS TRAINING"
                />
                <View style={styles.emptyStateContainer}>
                    <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <FontAwesome5 name="box-open" size={48} color={isDark ? '#64748b' : '#94a3b8'} />
                    </View>
                    <ThemedText variant="heading" style={styles.emptyTitle}>
                        No Verses Yet
                    </ThemedText>
                    <ThemedText variant="body" style={styles.emptySubtitle}>
                        You need verses in your Arsenal before you can train. Add verses to start practicing.
                    </ThemedText>
                    <TouchableOpacity
                        style={[styles.emptyCtaButton, { backgroundColor: theme.accent }]}
                        onPress={() => router.push('/(tabs)/arsenal')}
                        activeOpacity={0.8}
                    >
                        <FontAwesome5 name="plus" size={16} color={isDark ? '#000' : '#fff'} style={{ marginRight: 8 }} />
                        <Text style={[styles.emptyCtaText, { color: isDark ? '#000' : '#fff' }]}>
                            Go to Arsenal
                        </Text>
                    </TouchableOpacity>
                </View>
            </ThemedContainer>
        )
    }

    return (
        <ThemedContainer style={styles.container}>
            <ScreenHeader
                title="ENGAGEMENT RANGE"
                subtitle="COMBAT READINESS TRAINING"
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Info Banner */}
                <View style={[styles.infoBanner, { backgroundColor: isDark ? `${theme.accent}15` : theme.surface, borderColor: isDark ? 'transparent' : theme.border, borderWidth: isDark ? 0 : 1.5 }]}>
                    <Ionicons name="information-circle" size={18} color={isDark ? theme.accent : theme.textSecondary} />
                    <ThemedText variant="caption" style={[styles.infoText, { color: isDark ? theme.accent : theme.textSecondary }]}>
                        Practice mode is pressure-free. Learn at your own pace without affecting your stats.
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

                {/* Low verse count banner */}
                {verseCount > 0 && verseCount < 5 && (
                    <TouchableOpacity
                        style={[styles.lowVerseBanner, { backgroundColor: isDark ? `${theme.warning}15` : `${theme.warning}10`, borderColor: `${theme.warning}40` }]}
                        onPress={() => router.push('/(tabs)/arsenal')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="add-circle" size={18} color={theme.warning} />
                        <ThemedText variant="caption" style={[styles.lowVerseBannerText, { color: theme.warning }]}>
                            Add more verses to unlock Live Fire Drill
                        </ThemedText>
                    </TouchableOpacity>
                )}

                <ContextualTooltip
                    id="train_modes"
                    title="Choose a Drill"
                    message="Start with Focused Drill for deep memorization, or Auto Pilot to listen passively. More modes unlock as you practice."
                />

                {/* Training Mode Selection */}
                <View style={[styles.modesSection, { marginTop: 10 }]}>
                    <ThemedText variant="caption" style={styles.sectionTitle}>
                        CHOOSE DRILL
                    </ThemedText>

                    {/* Focused Drill - Always available */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('single')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, styles.primaryMode, !isDark && { borderColor: theme.accent }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.accent}15` }]}>
                                    <Ionicons name="shuffle" size={28} color={theme.accent} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.accent }]}>FOCUSED DRILL</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                    Randomize verses and practice at your own pace. Scope to any collection.
                                </ThemedText>
                                <View style={[styles.modeTag, { backgroundColor: `${theme.accent}15` }]}>
                                    <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.accent }]}>Best for starting</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={isDark ? theme.textSecondary : '#6B7B3A'} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Auto Pilot - Always available */}
                    <TouchableOpacity
                        style={styles.modeCard}
                        onPress={() => handleModeSelect('automatic')}
                        activeOpacity={0.9}
                    >
                        <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: theme.warning }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: `${theme.warning}15` }]}>
                                    <Ionicons name="infinite" size={28} color={theme.warning} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.warning }]}>AUTO PILOT</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                    Verses read aloud automatically. Just listen and absorb.
                                </ThemedText>
                                <View style={[styles.modeTag, { backgroundColor: `${theme.warning}15` }]}>
                                    <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.warning }]}>Hands-free</ThemedText>
                                </View>
                            </View>
                            <View style={styles.modeArrow}>
                                <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                            </View>
                        </ThemedCard>
                    </TouchableOpacity>

                    {/* Daily Deployment - Intelligent review of due verses */}
                    {totalSessions >= 2 && srsDailySummary.dueCount > 0 && (
                        <TouchableOpacity
                            style={styles.modeCard}
                            onPress={() => {
                                trackEvent(AnalyticsEventType.PRACTICE_START, {
                                    practice_type: 'daily_deployment',
                                    due_count: srsDailySummary.dueCount,
                                })
                                startTraining('single')
                                router.push({
                                    pathname: '/train/practice',
                                    params: { mode: 'srs' },
                                })
                            }}
                            activeOpacity={0.9}
                        >
                            <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success }]}>
                                <View style={styles.modeIconContainer}>
                                    <View style={[styles.modeIcon, { backgroundColor: `${srsDailySummary.overdueCount > 0 ? theme.warning : theme.success}15` }]}>
                                        <FontAwesome5 name="crosshairs" size={28} color={srsDailySummary.overdueCount > 0 ? theme.warning : theme.success} />
                                    </View>
                                </View>
                                <View style={styles.modeContent}>
                                    <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success }]}>DAILY DEPLOYMENT</ThemedText>
                                    <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                        {srsDailySummary.overdueCount > 0
                                            ? `${srsDailySummary.overdueCount} verse${srsDailySummary.overdueCount === 1 ? '' : 's'} overdue — deploy now before you lose them.`
                                            : `${srsDailySummary.dueCount} verse${srsDailySummary.dueCount === 1 ? '' : 's'} due for review today.`
                                        }
                                    </ThemedText>
                                    <View style={[styles.modeTag, { backgroundColor: `${srsDailySummary.overdueCount > 0 ? theme.warning : theme.success}15` }]}>
                                        <ThemedText variant="caption" style={[styles.modeTagText, { color: srsDailySummary.overdueCount > 0 ? theme.warning : theme.success }]}>
                                            {srsDailySummary.overdueCount > 0 ? `${srsDailySummary.overdueCount} OVERDUE` : `${srsDailySummary.dueCount} DUE`}
                                        </ThemedText>
                                    </View>
                                </View>
                                <View style={styles.modeArrow}>
                                    <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>
                    )}

                    {/* Voice Ops - Unlocked after 3 sessions */}
                    {totalSessions >= 3 ? (
                        <TouchableOpacity
                            style={styles.modeCard}
                            onPress={() => handleModeSelect('voice')}
                            activeOpacity={0.9}
                        >
                            <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: theme.info }]}>
                                <View style={styles.modeIconContainer}>
                                    <View style={[styles.modeIcon, { backgroundColor: `${theme.info}15` }]}>
                                        <Ionicons name="mic" size={28} color={theme.info || '#4dabf7'} />
                                    </View>
                                </View>
                                <View style={styles.modeContent}>
                                    <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.info || '#4dabf7' }]}>VOICE OPS</ThemedText>
                                    <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                        Listen to the verse and recite it aloud from memory.
                                    </ThemedText>
                                    <View style={[styles.modeTag, { backgroundColor: `${theme.info || '#4dabf7'}15` }]}>
                                        <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.info || '#4dabf7' }]}>Speech Recognition</ThemedText>
                                    </View>
                                </View>
                                <View style={styles.modeArrow}>
                                    <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.lockedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                    <Ionicons name="mic" size={28} color={isDark ? '#475569' : '#94a3b8'} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: isDark ? '#475569' : '#94a3b8' }]}>VOICE OPS</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: isDark ? '#334155' : '#94a3b8' }]}>
                                    Complete {3 - totalSessions} more drill{3 - totalSessions !== 1 ? 's' : ''} to unlock
                                </ThemedText>
                            </View>
                            <FontAwesome5 name="lock" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </View>
                    )}

                    {/* Live Fire Drill - Unlocked after 5 sessions */}
                    {totalSessions >= 5 ? (
                        <TouchableOpacity
                            style={styles.modeCard}
                            onPress={handleCollectionPractice}
                            activeOpacity={0.9}
                        >
                            <ThemedCard variant="glass" style={[styles.modeCardInner, !isDark && { borderColor: theme.accent }]}>
                                <View style={styles.modeIconContainer}>
                                    <View style={[styles.modeIcon, { backgroundColor: `${theme.accent}15` }]}>
                                        <Ionicons name="folder" size={28} color={theme.accent} />
                                    </View>
                                </View>
                                <View style={styles.modeContent}>
                                    <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: theme.accent }]}>LIVE FIRE DRILL</ThemedText>
                                    <ThemedText variant="body" style={[styles.modeDescription, { color: theme.textSecondary }]}>
                                        Practice specific collections with recording or a quiz.
                                    </ThemedText>
                                    <View style={[styles.modeTag, { backgroundColor: `${theme.accent}15` }]}>
                                        <ThemedText variant="caption" style={[styles.modeTagText, { color: theme.accent }]}>Tactical Drill</ThemedText>
                                    </View>
                                </View>
                                <View style={styles.modeArrow}>
                                    <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} />
                                </View>
                            </ThemedCard>
                        </TouchableOpacity>
                    ) : (
                        <View style={[styles.lockedCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                            <View style={styles.modeIconContainer}>
                                <View style={[styles.modeIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                                    <Ionicons name="folder" size={28} color={isDark ? '#475569' : '#94a3b8'} />
                                </View>
                            </View>
                            <View style={styles.modeContent}>
                                <ThemedText variant="heading" style={[styles.modeTitle, { letterSpacing: 1.5, color: isDark ? '#475569' : '#94a3b8' }]}>LIVE FIRE DRILL</ThemedText>
                                <ThemedText variant="body" style={[styles.modeDescription, { color: isDark ? '#334155' : '#94a3b8' }]}>
                                    Complete {5 - totalSessions} more drill{5 - totalSessions !== 1 ? 's' : ''} to unlock
                                </ThemedText>
                            </View>
                            <FontAwesome5 name="lock" size={16} color={isDark ? '#475569' : '#94a3b8'} />
                        </View>
                    )}
                </View>

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
        padding: 20,
        paddingBottom: 40,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 20,
        gap: 10,
    },
    infoText: {
        flex: 1,
        opacity: 0.9,
        lineHeight: 18,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 25,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        gap: 5,
    },
    statNumber: {
        fontSize: 22,
        fontWeight: '700',
    },
    statLabel: {
        opacity: 0.6,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    collectionSection: {
        marginBottom: 25,
    },
    sectionTitle: {
        letterSpacing: 2,
        marginBottom: 12,
        opacity: 0.6,
        fontWeight: '700',
        paddingLeft: 4,
    },
    modesSection: {
        gap: 16,
    },
    modeCard: {
        marginBottom: 4,
    },
    lockedCard: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 4,
        opacity: 0.6,
    },
    modeCardInner: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    primaryMode: {
        borderWidth: 1.5,
    },
    modeIconContainer: {
        marginRight: 16,
    },
    modeIcon: {
        width: 56,
        height: 56,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeContent: {
        flex: 1,
    },
    modeTitle: {
        fontSize: 16,
        marginBottom: 4,
        fontWeight: '800',
    },
    modeDescription: {
        fontSize: 13,
        lineHeight: 18,
        opacity: 0.8,
        marginBottom: 8,
    },
    modeTag: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
    modeTagText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    modeArrow: {
        marginLeft: 8,
        opacity: 0.5,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.7,
        marginBottom: 32,
    },
    emptyCtaButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 16,
        borderRadius: 14,
    },
    emptyCtaText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    lowVerseBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 12,
        gap: 8,
    },
    lowVerseBannerText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '600',
    },
})
