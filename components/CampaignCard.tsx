import { StyleSheet, View, TouchableOpacity } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { Campaign } from '@/types/campaign'

interface CampaignCardProps {
    campaign: Campaign
    isLocked?: boolean
    onPress: (campaignId: string) => void
}

export default function CampaignCard({ campaign, onPress }: CampaignCardProps) {
    const { isDark, theme } = useAppStore()

    return (
        <TouchableOpacity
            style={styles.campaignCardWrapper}
            onPress={() => onPress(campaign.id)}
            activeOpacity={0.9}
        >
            <ThemedCard variant="glass" style={styles.campaignCard}>
                <View style={styles.campaignIcon}>
                    <View style={[
                        styles.iconBox,
                        {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.05)'
                                : 'rgba(0,0,0,0.05)'
                        }
                    ]}>
                        <FontAwesome5 name="globe-americas" size={24} color={theme.accent} />
                    </View>
                </View>
                <View style={styles.campaignInfo}>
                    <ThemedText variant="heading" style={{ fontSize: 18, marginBottom: 4 }}>
                        {campaign.title}
                    </ThemedText>
                    <ThemedText variant="body" numberOfLines={2} style={{ fontSize: 13, opacity: 0.6, lineHeight: 18 }}>
                        {campaign.description}
                    </ThemedText>

                    <View style={styles.campaignStats}>
                        <View style={styles.statBadge}>
                            <FontAwesome5 name="check-circle" size={10} color={theme.success} style={{ marginRight: 6 }} />
                            <ThemedText variant="code" style={{ color: theme.success, fontSize: 10 }}>
                                {campaign.completedNodes}/{campaign.totalNodes} SECURED
                            </ThemedText>
                        </View>
                    </View>
                </View>
                <FontAwesome5 name="chevron-right" size={14} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            </ThemedCard>
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    campaignCardWrapper: {
        marginBottom: 16,
    },
    campaignCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
    },
    campaignIcon: {
        marginRight: 16,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    campaignInfo: {
        flex: 1,
        marginRight: 8,
    },
    campaignStats: {
        marginTop: 10,
        flexDirection: 'row',
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
})
