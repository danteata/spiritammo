import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { FontAwesome, Feather } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed'
import { Collection } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

interface ArmoryCollectionItemProps {
    item: Collection
    isSelected: boolean
    onSelect: (collection: Collection) => void
    onShowDetail: (collection: Collection) => void
}

export default function ArmoryCollectionItem({
    item,
    isSelected,
    onSelect,
    onShowDetail,
}: ArmoryCollectionItemProps) {
    const { isDark, theme } = useAppStore()

    return (
        <View
            style={[
                styles.collectionItem,
                {
                    backgroundColor: isSelected
                        ? 'transparent'
                        : theme.surface,
                    borderColor: isSelected
                        ? theme.accent
                        : 'transparent',
                    borderWidth: 1,
                }
            ]}
        >
            <TouchableOpacity
                style={styles.collectionMainArea}
                onPress={() => onSelect(item)}
                accessibilityRole="button"
                accessibilityLabel={`Select collection ${item.name}`}
            >
                <View style={styles.collectionInfo}>
                    <View style={styles.collectionHeaderRow}>
                        <ThemedText variant="heading" style={styles.collectionName}>
                            {item.abbreviation || item.name}
                        </ThemedText>
                        {item.isChapterBased && (
                            <View style={styles.chapterBadgeContainer}>
                                <Feather name="layers" size={10} color={theme.accent} />
                                <Text style={[styles.chapterBadgeText, { color: theme.accent }]}>
                                    CHAPTERS
                                </Text>
                            </View>
                        )}
                    </View>

                    <ThemedText variant="body" style={styles.collectionDescription} numberOfLines={1}>
                        {item.name}
                    </ThemedText>

                    <View style={styles.collectionMeta}>
                        <View style={styles.statBadge}>
                            <FontAwesome name="crosshairs" size={10} color={theme.textSecondary} />
                            <ThemedText variant="caption" style={styles.statText}>
                                {item.scriptures.length} ROUNDS
                            </ThemedText>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.collectionArrow}
                onPress={() => onShowDetail(item)}
                accessibilityRole="button"
                accessibilityLabel={`View details for ${item.name}`}
            >
                <View style={styles.arrowCircle}>
                    <FontAwesome name="chevron-right" size={12} color={theme.text} />
                </View>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    collectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 12,
        marginBottom: 2,
        padding: 0,
        minHeight: 80,
    },
    collectionMainArea: {
        flex: 1,
        padding: 10,
    },
    collectionInfo: {
        flex: 1,
    },
    collectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    collectionName: {
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    collectionDescription: {
        fontSize: 12,
        marginBottom: 4,
    },
    chapterBadgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        gap: 4,
    },
    chapterBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
    },
    collectionMeta: {
        flexDirection: 'row',
        gap: 12,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statText: {
        fontSize: 10,
        opacity: 0.7,
    },
    collectionArrow: {
        padding: 10,
        height: '100%',
        justifyContent: 'center',
        borderLeftWidth: 1,
        borderLeftColor: 'rgba(128,128,128,0.1)',
    },
    arrowCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(128,128,128,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
})
