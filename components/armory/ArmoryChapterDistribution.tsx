import { StyleSheet, View, Text } from 'react-native'
import { FontAwesome, Feather } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'

interface ArmoryChapterDistributionProps {
    item: { chapter: string; count: number }
    onPress: (chapterName: string) => void
}

export default function ArmoryChapterDistribution({
    item,
    onPress,
}: ArmoryChapterDistributionProps) {
    const { theme } = useAppStore() // Use dynamic theme

    return (
        <ThemedCard
            style={styles.distributionItem}
            onPress={() => onPress(item.chapter)}
            variant="flat"
        >
            <Feather name="layers" size={16} color={theme.accent} />
            <ThemedText style={styles.distributionBook}>
                {item.chapter}
            </ThemedText>
            <View style={styles.distributionCount}>
                <Text style={[styles.countText, { color: theme.accent }]}>
                    {item.count}
                </Text>
                <ThemedText variant="caption" style={styles.countLabel}>
                    rounds
                </ThemedText>
            </View>
            <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
        </ThemedCard>
    )
}

const styles = StyleSheet.create({
    distributionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    distributionBook: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        fontWeight: '600',
    },
    distributionCount: {
        alignItems: 'flex-end',
    },
    countText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    countLabel: {
        fontSize: 10,
        opacity: 0.7,
        textTransform: 'uppercase',
    },
})
