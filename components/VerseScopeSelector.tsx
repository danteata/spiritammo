import { useState, useCallback } from 'react'
import { View, TouchableOpacity, ScrollView, StyleSheet, Dimensions, Modal, Pressable } from 'react-native'
import { FontAwesome5 } from '@expo/vector-icons'
import { useAppStore } from '@/hooks/useAppStore'
import { ThemedText } from '@/components/Themed'
import { Collection } from '@/types/scripture'

interface VerseScopeSelectorProps {
    selectedCollection: Collection | null
    selectedChapterIds: string[]
    onCollectionChange: (collection: Collection | null) => void
    onChapterIdsChange: (ids: string[]) => void
    isDark: boolean
    theme: any
    compact?: boolean
}

type DropdownMode = 'collection' | 'chapter' | null

export default function VerseScopeSelector({
    selectedCollection,
    selectedChapterIds,
    onCollectionChange,
    onChapterIdsChange,
    isDark,
    theme,
    compact = false,
}: VerseScopeSelectorProps) {
    const { collections } = useAppStore()
    const [dropdownMode, setDropdownMode] = useState<DropdownMode>(null)

    const getVerseCount = () => {
        if (!selectedCollection) return null
        if (selectedCollection.isChapterBased && selectedChapterIds.length > 0) {
            const count = selectedCollection.chapters
                ?.filter(ch => selectedChapterIds.includes(ch.id))
                ?.reduce((sum, ch) => sum + (ch.scriptures?.length ?? 0), 0) ?? 0
            return count || (selectedCollection.scriptures?.length ?? 0)
        }
        return selectedCollection.scriptures?.length ?? 0
    }

    const getCollectionLabel = () => {
        if (!selectedCollection) return 'All Verses'
        return selectedCollection.name
    }

    const getChapterLabel = () => {
        if (!selectedCollection?.isChapterBased || !selectedCollection.chapters) return null
        if (selectedChapterIds.length === 0) return 'All Chapters'
        if (selectedChapterIds.length === selectedCollection.chapters.length) return 'All Chapters'
        return `${selectedChapterIds.length} of ${selectedCollection.chapters.length}`
    }

    const handleSelectCollection = (collection: Collection | null) => {
        onCollectionChange(collection)
        if (collection?.isChapterBased && collection.chapters) {
            onChapterIdsChange(collection.chapters.map(ch => ch.id))
        } else {
            onChapterIdsChange([])
        }
        setDropdownMode(null)
    }

    const handleChapterToggle = (chapterId: string) => {
        if (selectedChapterIds.includes(chapterId)) {
            onChapterIdsChange(selectedChapterIds.filter(id => id !== chapterId))
        } else {
            onChapterIdsChange([...selectedChapterIds, chapterId])
        }
    }

    const handleSelectAllChapters = () => {
        if (selectedCollection?.chapters) {
            onChapterIdsChange(selectedCollection.chapters.map(ch => ch.id))
        }
    }

    const handleClearChapters = () => {
        onChapterIdsChange([])
    }

    const verseCount = getVerseCount()
    const showChapterChip = selectedCollection?.isChapterBased && !!selectedCollection.chapters?.length

    const renderCollectionDropdown = () => (
        <Modal
            visible={dropdownMode === 'collection'}
            animationType="fade"
            transparent
            onRequestClose={() => setDropdownMode(null)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setDropdownMode(null)}>
                <Pressable
                    style={[styles.dropdownSheet, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
                    onPress={() => {}}
                >
                    <View style={styles.dropdownHeader}>
                        <ThemedText variant="heading" style={{ fontSize: 16 }}>Select Collection</ThemedText>
                        <TouchableOpacity onPress={() => setDropdownMode(null)}>
                            <FontAwesome5 name="times" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                        <TouchableOpacity
                            style={[styles.dropdownRow, !selectedCollection && { backgroundColor: `${theme.accent}15` }]}
                            onPress={() => handleSelectCollection(null)}
                        >
                            <FontAwesome5 name="layer-group" size={16} color={!selectedCollection ? theme.accent : theme.textSecondary} />
                            <ThemedText variant="body" style={{ flex: 1, marginLeft: 12, fontWeight: !selectedCollection ? '700' : '400' }}>
                                All Verses
                            </ThemedText>
                            {!selectedCollection && <FontAwesome5 name="check" size={14} color={theme.accent} />}
                        </TouchableOpacity>
                        {collections.map(collection => (
                            <TouchableOpacity
                                key={collection.id}
                                style={[styles.dropdownRow, selectedCollection?.id === collection.id && { backgroundColor: `${theme.accent}15` }]}
                                onPress={() => handleSelectCollection(collection)}
                            >
                                <FontAwesome5 name="folder" size={16} color={selectedCollection?.id === collection.id ? theme.accent : theme.textSecondary} />
                                <ThemedText variant="body" style={{ flex: 1, marginLeft: 12, fontWeight: selectedCollection?.id === collection.id ? '700' : '400' }} numberOfLines={1}>
                                    {collection.name}
                                </ThemedText>
                                <ThemedText variant="caption" style={{ opacity: 0.4, marginLeft: 8 }}>
                                    {collection.scriptures?.length ?? 0}
                                </ThemedText>
                                {selectedCollection?.id === collection.id && <FontAwesome5 name="check" size={14} color={theme.accent} style={{ marginLeft: 6 }} />}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </Pressable>
            </Pressable>
        </Modal>
    )

    const renderChapterDropdown = () => {
        if (!selectedCollection?.isChapterBased || !selectedCollection.chapters) return null
        const chapters = selectedCollection.chapters

        return (
            <Modal
                visible={dropdownMode === 'chapter'}
                animationType="fade"
                transparent
                onRequestClose={() => setDropdownMode(null)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setDropdownMode(null)}>
                    <Pressable
                        style={[styles.dropdownSheet, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}
                        onPress={() => {}}
                    >
                        <View style={styles.dropdownHeader}>
                            <ThemedText variant="heading" style={{ fontSize: 16 }}>Select Chapters</ThemedText>
                            <TouchableOpacity onPress={() => setDropdownMode(null)}>
                                <FontAwesome5 name="times" size={18} color={theme.textSecondary} />
                            </TouchableOpacity>
                        </View>
                        <View style={[styles.chapterControls, { borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]}>
                            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: `${theme.accent}15` }]} onPress={handleSelectAllChapters}>
                                <ThemedText variant="caption" style={{ color: theme.accent, fontWeight: '700', letterSpacing: 1 }}>ALL</ThemedText>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.controlBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]} onPress={handleClearChapters}>
                                <ThemedText variant="caption" style={{ opacity: 0.6, fontWeight: '700', letterSpacing: 1 }}>CLEAR</ThemedText>
                            </TouchableOpacity>
                            <ThemedText variant="caption" style={{ opacity: 0.5 }}>
                                {selectedChapterIds.length} of {chapters.length}
                            </ThemedText>
                        </View>
                        <ScrollView style={styles.dropdownList} keyboardShouldPersistTaps="handled">
                            {chapters.map(chapter => {
                                const isSelected = selectedChapterIds.includes(chapter.id)
                                return (
                                    <TouchableOpacity
                                        key={chapter.id}
                                        style={[styles.dropdownRow, isSelected && { backgroundColor: `${theme.accent}15` }]}
                                        onPress={() => handleChapterToggle(chapter.id)}
                                    >
                                        <View style={[styles.chapterCheck, {
                                            backgroundColor: isSelected ? theme.accent : 'transparent',
                                            borderColor: isSelected ? theme.accent : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                                        }]}>
                                            {isSelected && <FontAwesome5 name="check" size={8} color="#fff" />}
                                        </View>
                                        <ThemedText variant="body" style={{ flex: 1 }} numberOfLines={1}>
                                            {chapter.name}
                                        </ThemedText>
                                        <ThemedText variant="caption" style={{ opacity: 0.4 }}>
                                            {chapter.scriptures?.length ?? 0}
                                        </ThemedText>
                                    </TouchableOpacity>
                                )
                            })}
                        </ScrollView>
                    </Pressable>
                </Pressable>
            </Modal>
        )
    }

    return (
        <View style={compact ? styles.compactRow : styles.row}>
            <TouchableOpacity
                style={[styles.chip, {
                    backgroundColor: selectedCollection ? `${theme.accent}15` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                    borderColor: selectedCollection ? theme.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                }]}
                onPress={() => setDropdownMode('collection')}
                activeOpacity={0.7}
            >
                <FontAwesome5 name={selectedCollection ? 'folder-open' : 'layer-group'} size={11} color={selectedCollection ? theme.accent : theme.textSecondary} />
                <ThemedText variant="caption" style={{ fontSize: 11, color: selectedCollection ? theme.accent : undefined }} numberOfLines={1}>
                    {getCollectionLabel()}
                </ThemedText>
                {verseCount !== null && (
                    <ThemedText variant="caption" style={{ fontSize: 10, opacity: 0.5 }}>
                        {verseCount}
                    </ThemedText>
                )}
                <FontAwesome5 name="chevron-down" size={8} color={theme.textSecondary} />
            </TouchableOpacity>

            {showChapterChip && (
                <TouchableOpacity
                    style={[styles.chip, {
                        backgroundColor: selectedChapterIds.length < (selectedCollection.chapters?.length ?? 0) ? `${theme.warning}15` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'),
                        borderColor: selectedChapterIds.length < (selectedCollection.chapters?.length ?? 0) ? theme.warning : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                    }]}
                    onPress={() => setDropdownMode('chapter')}
                    activeOpacity={0.7}
                >
                    <FontAwesome5 name="filter" size={10} color={selectedChapterIds.length < (selectedCollection.chapters?.length ?? 0) ? theme.warning : theme.textSecondary} />
                    <ThemedText variant="caption" style={{ fontSize: 11 }} numberOfLines={1}>
                        {getChapterLabel()}
                    </ThemedText>
                    <FontAwesome5 name="chevron-down" size={8} color={theme.textSecondary} />
                </TouchableOpacity>
            )}

            {renderCollectionDropdown()}
            {renderChapterDropdown()}
        </View>
    )
}

const { width: screenWidth } = Dimensions.get('window')

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    compactRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        gap: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    dropdownSheet: {
        borderRadius: 16,
        maxHeight: '70%',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(128,128,128,0.15)',
    },
    chapterControls: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 10,
        borderBottomWidth: 1,
    },
    controlBtn: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 6,
    },
    dropdownList: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    dropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 8,
    },
    chapterCheck: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
})