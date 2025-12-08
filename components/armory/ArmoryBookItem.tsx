import { StyleSheet, View, Text } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'

interface ArmoryBookItemProps {
    item: any
    scriptureCount: number
    onPress: (bookName: string) => void
}

export default function ArmoryBookItem({
    item,
    scriptureCount,
    onPress,
}: ArmoryBookItemProps) {
    const { theme } = useAppStore()

    return (
        <ThemedCard
            style={styles.bookItem}
            onPress={() => onPress(item.name)}
            testID={`book-${item.id}`}
            variant="flat"
            accessibilityRole="button"
            accessibilityLabel={`View scriptures in ${item.name}`}
        >
            <View style={styles.bookIconContainer}>
                <FontAwesome name="book" size={18} color={theme.accent} />
            </View>

            <View style={styles.bookInfo}>
                <ThemedText style={styles.bookName}>
                    {item.name}
                </ThemedText>
                <View style={styles.progressBarContainer}>
                    <View style={[styles.progressBar, { width: `${Math.min(scriptureCount * 2, 100)}%`, backgroundColor: theme.accent }]} />
                </View>
            </View>

            <View style={styles.bookStat}>
                <Text style={[styles.bookCount, { color: theme.accent }]}>
                    {scriptureCount}
                </Text>
                <ThemedText variant="caption" style={styles.bookLabel}>
                    RNDS
                </ThemedText>
            </View>
            <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
        </ThemedCard>
    )
}

const styles = StyleSheet.create({
    bookItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    bookIconContainer: {
        width: 32,
        alignItems: 'center',
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    progressBarContainer: {
        height: 4,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 2,
        width: '100%',
        maxWidth: 100,
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    bookStat: {
        alignItems: 'flex-end',
        marginLeft: 12,
    },
    bookCount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookLabel: {
        fontSize: 10,
        opacity: 0.7,
    },
})
