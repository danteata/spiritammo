import { StyleSheet, View } from 'react-native'
import { FontAwesome, Ionicons } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'

interface SquadChallengeCardProps {
    challenge: any
    onShare: (challenge: any) => void
}

export default function SquadChallengeCard({
    challenge,
    onShare
}: SquadChallengeCardProps) {
    const { isDark, theme } = useAppStore()

    const progressPercent = Math.min((challenge.currentValue / challenge.targetValue) * 100, 100)

    return (
        <ThemedCard style={[styles.challengeCard, { borderColor: theme.warning }]} variant="default">
            <View style={styles.challengeHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name="flag" size={20} color={theme.warning} />
                    <ThemedText variant="heading" style={[styles.challengeTitle, { color: theme.warning }]}>{challenge.title}</ThemedText>
                </View>
                <Ionicons
                    name="share-outline"
                    size={20}
                    color={theme.accent}
                    onPress={() => onShare(challenge)}
                    style={{ padding: 4 }}
                />
            </View>
            <ThemedText variant="body" style={styles.challengeDesc}>
                {challenge.description}
            </ThemedText>
            <View style={[styles.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: theme.warning }]} />
            </View>
            <View style={styles.challengeStats}>
                <ThemedText variant="caption" style={styles.progressText}>
                    {challenge.currentValue} / {challenge.targetValue} {challenge.type}
                </ThemedText>
                <ThemedText variant="caption" style={[styles.rewardText, { color: theme.accent }]}>
                    REWARD: {challenge.reward}
                </ThemedText>
            </View>
        </ThemedCard>
    )
}

const styles = StyleSheet.create({
    challengeCard: {
        padding: 16,
        borderWidth: 1,
        borderColor: 'transparent', // Will be overridden by inline styles
        marginBottom: 12,
    },
    challengeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    challengeTitle: {
        color: 'transparent', // Will be overridden by inline styles
        fontWeight: 'bold',
        fontSize: 14,
    },
    challengeDesc: {
        fontSize: 12,
        marginBottom: 12,
        opacity: 0.8,
    },
    progressBarBg: {
        height: 6,
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: 'transparent', // Will be overridden by inline styles
        borderRadius: 3,
    },
    challengeStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    rewardText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'transparent', // Will be overridden by inline styles
    },
})
