import React from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import { FontAwesome, Feather } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed' // Assuming these exist based on arsenal.tsx usage
import { Collection } from '@/types/scripture'

type CollectionListItemProps = {
    item: Collection
    isSelected: boolean
    onPress: (item: Collection) => void
    onLongPress: (item: Collection) => void
    theme: any
    isDark?: boolean
}

export const CollectionListItem: React.FC<CollectionListItemProps> = ({
    item,
    isSelected,
    onPress,
    onLongPress,
    theme,
    isDark
}) => {
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
                    backgroundColor: theme.surfaceHighlight // Subtle highlight
                }
            ]}
            onPress={() => onPress(item)}
            onLongPress={() => onLongPress(item)}
            testID={`collection-${item.id}`}
            variant="outlined"
        >
            {/* Status Stripe */}
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

            <TouchableOpacity
                style={[styles.arrowCircle, { backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.05)' }]}
                onPress={() => onLongPress(item)}
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
        paddingVertical: 12, // Compacted
        paddingHorizontal: 12,
        borderWidth: 1,
        // borderColor handled inline
        minHeight: 56, // Compacted
        overflow: 'hidden',
    },
    activeCollection: {
        // borderColor handled inline
        // backgroundColor handled inline
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
        // backgroundColor handled inline
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginLeft: 8, // Space for stripe
        borderWidth: 1,
        // borderColor handled inline
    },
    collectionInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    collectionName: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 2,
        letterSpacing: 0.5,
        fontFamily: 'Courier', // Military mono feel
    },
    collectionMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
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
    arrowCircle: {
        width: 24, // Smaller
        height: 24,
        borderRadius: 12,
        // backgroundColor handled inline
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
})
