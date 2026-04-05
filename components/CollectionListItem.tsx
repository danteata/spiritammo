import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { FontAwesome, Feather } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed'
import { Collection } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

type CollectionListItemProps = {
    item: Collection
    isSelected: boolean
    onSelect: (collection: Collection) => void
    onShowDetail?: (collection: Collection) => void
    onDelete?: (collection: Collection) => void
    variant?: 'arsenal' | 'armory'
}

export default function CollectionListItem({
    item,
    isSelected,
    onSelect,
    onShowDetail,
    onDelete,
    variant = 'arsenal',
}: CollectionListItemProps) {
    const { isDark, theme } = useAppStore()

    if (variant === 'armory') {
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
                    onPress={() => onShowDetail?.(item)}
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

    return (
        <ThemedCard
            style={[
                styles.collectionItem,
                {
                    backgroundColor: isDark ? 'rgba(20,20,30,0.6)' : theme.surface,
                    borderColor: theme.border || 'rgba(255,255,255,0.1)'
                },
                isSelected && {
                    borderColor: theme.warning || '#FFD700',
                    backgroundColor: theme.surfaceHighlight
                }
            ]}
            onPress={() => onSelect(item)}
            onLongPress={() => onShowDetail?.(item)}
            testID={`collection-${item.id}`}
            variant="outlined"
        >
            <View style={[styles.statusStripe, { backgroundColor: item.isSystem ? (theme.warning || '#FFD700') : (theme.success || '#4ade80') }]} />

            <View style={[styles.collectionIconContainer, {
                backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.05)',
                borderColor: theme.border || 'rgba(255,255,255,0.1)'
            }]}>
                {item.id === 'favorites' ? (
                    <FontAwesome name="star" size={24} color={theme.warning || "#FFD700"} />
                ) : item.id === 'recents' ? (
                    <FontAwesome name="clock-o" size={24} color={theme.accent} />
                ) : item.isSystem ? (
                    <Feather name="shield" size={24} color={theme.warning || "#FFD700"} />
                ) : (
                    <Feather name="box" size={24} color={theme.text} />
                )}
            </View>

            <View style={styles.collectionInfo}>
                <ThemedText style={styles.collectionName} numberOfLines={1}>
                    {item.name}
                </ThemedText>

                <View style={styles.collectionMeta}>
                    <View style={styles.metaItem}>
                        <FontAwesome name="crosshairs" size={10} color={theme.textSecondary} />
                        <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                            {item.stats?.totalVerses || item.scriptures?.length || 0} ROUNDS
                        </Text>
                    </View>
                </View>
            </View>

            {!item.isSystem && onDelete && (
                <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: theme.error || '#ef4444' }]}
                    onPress={(e) => {
                        e.stopPropagation();
                        onDelete(item);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${item.name} collection`}
                >
                    <Feather name="trash-2" size={14} color="white" />
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={[styles.arrowCircle, { backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.05)' }]}
                onPress={() => onShowDetail?.(item)}
            >
                <FontAwesome name="chevron-right" size={12} color={theme.textSecondary} />
            </TouchableOpacity>
        </ThemedCard>
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
    statusStripe: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 4,
    },
    collectionIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginLeft: 8,
        borderWidth: 1,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 10,
        fontWeight: '600',
    },
    deleteButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
})
