import { Ionicons } from '@expo/vector-icons'
import { TouchableOpacity, View, StyleSheet } from 'react-native'
import { ThemedText } from '@/components/Themed'
import VerseScopeSelector from '@/components/VerseScopeSelector'
import { Collection } from '@/types/scripture'
import { VerseOrder } from '@/hooks/useVerseNavigation'

interface ScriptureScopeBarProps {
    selectedCollection: Collection | null
    selectedChapterIds: string[]
    onCollectionChange: (collection: Collection | null) => void
    onChapterIdsChange: (ids: string[]) => void
    verseOrder: VerseOrder
    onOrderChange: (order: VerseOrder) => void
    isDark: boolean
    theme: any
    showOrderToggle?: boolean
}

export default function ScriptureScopeBar({
    selectedCollection,
    selectedChapterIds,
    onCollectionChange,
    onChapterIdsChange,
    verseOrder,
    onOrderChange,
    isDark,
    theme,
    showOrderToggle = true,
}: ScriptureScopeBarProps) {
    return (
        <View style={styles.controlRow}>
            <View style={styles.scopeWrapper}>
                <VerseScopeSelector
                    selectedCollection={selectedCollection}
                    selectedChapterIds={selectedChapterIds}
                    onCollectionChange={onCollectionChange}
                    onChapterIdsChange={onChapterIdsChange}
                    isDark={isDark}
                    theme={theme}
                    compact
                />
            </View>
            {showOrderToggle && (
                <TouchableOpacity
                    style={[styles.orderToggle, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
                    onPress={() => onOrderChange(verseOrder === 'random' ? 'sequential' : 'random')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={verseOrder === 'random' ? 'shuffle' : 'list'}
                        size={14}
                        color={theme.accent}
                    />
                    <ThemedText variant="caption" style={{ fontSize: 10, color: theme.accent, fontWeight: '700', letterSpacing: 1 }}>
                        {verseOrder === 'random' ? 'RANDOM' : 'SEQ'}
                    </ThemedText>
                </TouchableOpacity>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    controlRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    scopeWrapper: {
        flex: 1,
        flexShrink: 1,
    },
    orderToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(128,128,128,0.08)',
        gap: 6,
        flexShrink: 0,
    },
})