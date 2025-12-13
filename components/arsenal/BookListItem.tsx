import React from 'react'
import { View, StyleSheet, Text } from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { ThemedCard, ThemedText } from '@/components/Themed'

type BookListItemProps = {
    bookName: string
    stats: { count: number; mastered: number }
    onPress: (bookName: string) => void
    isDark?: boolean
    theme: any
}

export const BookListItem: React.FC<BookListItemProps> = ({
    bookName,
    stats,
    onPress,
    theme
}) => {
    return (
        <ThemedCard
            style={styles.bookItem}
            onPress={() => onPress(bookName)}
            testID={`book-${bookName}`}
            variant="flat"
            accessibilityRole="button"
            accessibilityLabel={`View scriptures in ${bookName}`}
        >
            <View style={[styles.bookIconContainer, { backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.05)' }]}>
                <FontAwesome name="book" size={18} color={theme.accent} />
            </View>

            <View style={styles.bookInfo}>
                <ThemedText style={styles.bookName} numberOfLines={1} adjustsFontSizeToFit>
                    {bookName}
                </ThemedText>
                <View style={[styles.progressBarContainer, { backgroundColor: theme.surfaceHighlight || 'rgba(255,255,255,0.1)' }]}>
                    <View style={[styles.progressBar, { width: `${Math.min(stats.count * 2, 100)}%`, backgroundColor: theme.accent }]} />
                </View>
            </View>

            <View style={styles.bookStat}>
                <Text style={[styles.bookCount, { color: theme.accent }]}>
                    {stats.count}
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
        padding: 12, // Compact
        borderRadius: 12,
        marginBottom: 8,
    },
    bookIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 8,
        // backgroundColor handled inline
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    bookInfo: {
        flex: 1,
    },
    bookName: {
        fontSize: 14, // Reduced slightly for better fit
        fontWeight: '600',
        marginBottom: 4,
    },
    progressBarContainer: {
        height: 3,
        // backgroundColor handled inline
        borderRadius: 1.5,
        width: '60%',
    },
    progressBar: {
        height: '100%',
        borderRadius: 1.5,
    },
    bookStat: {
        alignItems: 'flex-end',
    },
    bookCount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookLabel: {
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
})
