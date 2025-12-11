import React, { useEffect, useState } from 'react'
import {
    StyleSheet,
    View,
    TouchableOpacity,
    Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { streakManager, getStreakFlavorText, getDailyChallengeFlavorText, DailyChallenge, StreakData } from '@/services/streakManager'
import { errorHandler } from '@/services/errorHandler'

const { width } = Dimensions.get('window')

interface StreakChallengeProps {
    onStreakPress?: () => void
    compact?: boolean
}

export default function StreakChallenge({ onStreakPress, compact = false }: StreakChallengeProps) {
    const { theme, isDark } = useAppStore()
    const [streakData, setStreakData] = useState<StreakData | null>(null)
    const [dailyChallenge, setDailyChallenge] = useState<DailyChallenge | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            setLoading(true)
            const [streak, challenge] = await Promise.all([
                streakManager.getStreakData(),
                streakManager.getDailyChallenge()
            ])
            setStreakData(streak)
            setDailyChallenge(challenge)
        } catch (error) {
            console.error('Failed to load streak data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading || !streakData) {
        return (
            <ThemedCard style={styles.loadingCard}>
                <View style={styles.loadingContent}>
                    <MaterialCommunityIcons name="loading" size={20} color={theme.textSecondary} />
                    <ThemedText variant="caption" style={{ color: theme.textSecondary }}>
                        Loading mission status...
                    </ThemedText>
                </View>
            </ThemedCard>
        )
    }

    if (compact) {
        return (
            <TouchableOpacity
                style={[styles.compactCard, { borderColor: theme.border }]}
                onPress={onStreakPress}
                activeOpacity={0.9}
            >
                <View style={styles.compactRow}>
                    <View style={styles.flameIcon}>
                        <MaterialCommunityIcons
                            name="fire"
                            size={16}
                            color={streakData.currentStreak > 0 ? '#FF6B35' : theme.textSecondary}
                        />
                    </View>
                    <View style={styles.compactText}>
                        <ThemedText variant="subheading" style={styles.compactStreak}>
                            {streakData.currentStreak}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.compactLabel}>
                            day streak
                        </ThemedText>
                    </View>
                    {dailyChallenge && (
                        <View style={styles.challengeDot}>
                            {dailyChallenge.completed && (
                                <MaterialCommunityIcons name="check-circle" size={12} color={theme.success} />
                            )}
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        )
    }

    const progressPercent = dailyChallenge ? (dailyChallenge.currentValue / dailyChallenge.targetValue) * 100 : 0

    return (
        <TouchableOpacity
            onPress={onStreakPress}
            activeOpacity={0.9}
        >
            <ThemedCard variant="glass" style={styles.mainCard}>
                {/* Streak Header */}
                <View style={styles.streakHeader}>
                    <View style={styles.flameSection}>
                        <View style={[styles.flameContainer, { backgroundColor: streakData.currentStreak > 0 ? '#FF6B35' : theme.surfaceHighlight }]}>
                            <MaterialCommunityIcons
                                name="fire"
                                size={24}
                                color={streakData.currentStreak > 0 ? 'white' : theme.textSecondary}
                            />
                        </View>
                        <View style={styles.streakInfo}>
                            <ThemedText variant="heading" style={styles.streakNumber}>
                                {streakData.currentStreak}
                            </ThemedText>
                            <ThemedText variant="caption" style={styles.streakLabel}>
                                Day Streak
                            </ThemedText>
                            <ThemedText variant="code" style={styles.streakTitle}>
                                {getStreakFlavorText(streakData.currentStreak)}
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.rankBadge}>
                        <MaterialCommunityIcons name="medal" size={20} color={theme.accent} />
                    </View>
                </View>

                {/* Daily Challenge */}
                {dailyChallenge && (
                    <View style={styles.challengeSection}>
                        <View style={styles.challengeHeader}>
                            <ThemedText variant="subheading" style={styles.challengeTitle}>
                                {dailyChallenge.title}
                            </ThemedText>
                            {dailyChallenge.completed && (
                                <View style={styles.completedBadge}>
                                    <MaterialCommunityIcons name="check-circle" size={16} color={theme.success} />
                                </View>
                            )}
                        </View>

                        <ThemedText variant="body" style={styles.challengeDescription}>
                            {dailyChallenge.description}
                        </ThemedText>

                        <View style={styles.progressContainer}>
                            <LinearGradient
                                colors={dailyChallenge.completed ?
                                    [theme.success, '#10B981'] :
                                    [theme.accent, '#7C3AED']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={[styles.progressBar, {
                                    width: `${Math.min(progressPercent, 100)}%`,
                                    opacity: dailyChallenge.completed ? 1 : 0.8
                                }]}
                            />
                            <View style={[styles.progressBg, { backgroundColor: theme.surfaceHighlight }]} />
                        </View>

                        <View style={styles.progressText}>
                            <ThemedText variant="caption">
                                {dailyChallenge.currentValue} / {dailyChallenge.targetValue}
                            </ThemedText>
                            <ThemedText variant="caption" style={styles.rewardText}>
                                REWARD: {dailyChallenge.reward}
                            </ThemedText>
                        </View>
                    </View>
                )}

                {/* Stats Footer */}
                <View style={styles.statsBar}>
                    <View style={styles.statItem}>
                        <ThemedText variant="code" style={styles.statValue}>
                            {streakData.longestStreak}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            Best Streak
                        </ThemedText>
                    </View>
                    <View style={styles.statSeparator} />
                    <View style={styles.statItem}>
                        <ThemedText variant="code" style={styles.statValue}>
                            {streakData.totalPracticeDays}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            Days
                        </ThemedText>
                    </View>
                    <View style={styles.statSeparator} />
                    <View style={styles.statItem}>
                        <ThemedText variant="code" style={styles.statValue}>
                            {streakData.totalPracticesToday}
                        </ThemedText>
                        <ThemedText variant="caption" style={styles.statLabel}>
                            Today
                        </ThemedText>
                    </View>
                </View>
            </ThemedCard>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    loadingCard: {
        marginHorizontal: 16,
        padding: 20,
        borderRadius: 16,
    },
    loadingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    compactCard: {
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        marginHorizontal: 16,
        marginVertical: 8,
    },
    compactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    flameIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 107, 53, 0.1)',
    },
    compactText: {
        alignItems: 'center',
    },
    compactStreak: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    compactLabel: {
        fontSize: 10,
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    challengeDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    mainCard: {
        marginHorizontal: 16,
        marginVertical: 8,
        padding: 20,
    },
    streakHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    flameSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    flameContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakInfo: {
        alignItems: 'flex-start',
    },
    streakNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        lineHeight: 32,
    },
    streakLabel: {
        fontSize: 12,
        opacity: 0.7,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    streakTitle: {
        fontSize: 10,
        opacity: 0.5,
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    rankBadge: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    challengeSection: {
        marginBottom: 16,
    },
    challengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    completedBadge: {
        padding: 4,
    },
    challengeDescription: {
        fontSize: 13,
        opacity: 0.8,
        lineHeight: 18,
        marginBottom: 12,
    },
    progressContainer: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    progressBg: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.3,
    },
    progressText: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rewardText: {
        opacity: 0.6,
        fontSize: 11,
    },
    statsBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    statLabel: {
        fontSize: 10,
        opacity: 0.6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statSeparator: {
        width: 1,
        height: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
    }
})
