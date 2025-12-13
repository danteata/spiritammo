import React from 'react'
import {
    View,
    FlatList,
    Text,
    StyleSheet,
    TouchableOpacity,
    Pressable,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'
import { Collection, Scripture } from '@/types/scripture'
import { CollectionListItem } from './CollectionListItem'
import { BookListItem } from './BookListItem'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { ThemedText } from '@/components/Themed'

interface ArsenalAmmunitionProps {
    filterTab: 'books' | 'chapters'
    setFilterTab: (tab: 'books' | 'chapters') => void
    collections: Collection[]
    books: string[]
    scriptures: Scripture[]
    selectedCollection: Collection | null
    onSelectCollection: (collection: Collection | null) => void
    onShowCollectionDetail: (collection: Collection) => void
    onBookDistributionTap: (bookName: string) => void
    onChapterDistributionTap: (chapterName: string) => void
    onDefaultBookTap: (bookName: string) => void
    onAddCollection: () => void
    isDark: boolean
    theme: any
}

export const ArsenalAmmunition: React.FC<ArsenalAmmunitionProps> = ({
    filterTab,
    setFilterTab,
    collections,
    books,
    scriptures,
    selectedCollection,
    onSelectCollection,
    onShowCollectionDetail,
    onBookDistributionTap,
    onChapterDistributionTap,
    onDefaultBookTap,
    onAddCollection,
    isDark,
    theme,
}) => {

    // Sort logic from original file
    const sortedCollections = [...collections].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    // Helper for book stats
    const getBookStats = (bookName: string) => {
        const bookVerses = scriptures.filter((s) => s.book === bookName)
        return {
            count: bookVerses.length,
            mastered: bookVerses.filter((s) => (s.masteryLevel || 0) > 80).length,
        }
    }

    const renderBookList = () => {
        const hasChapters =
            selectedCollection?.chapters && selectedCollection.chapters.length > 0
        const isChapterMode = filterTab === 'chapters'

        // If in "All Books" mode (no specific collection selected or simple collection)
        if (!selectedCollection || (selectedCollection && !hasChapters)) {
            return (
                <View style={[styles.listContainer, { flex: 1, paddingLeft: 12, paddingRight: 16 }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                            CONTENTS
                        </Text>
                    </View>
                    <FlatList
                        data={books}
                        keyExtractor={(item) => item}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <BookListItem
                                bookName={item}
                                stats={getBookStats(item)}
                                onPress={() => onDefaultBookTap(item)} // Use default handler
                                isDark={isDark}
                                theme={theme}
                            />
                        )}
                        contentContainerStyle={{ paddingRight: 12, paddingBottom: 20 }}
                    />
                </View>
            )
        }

        // Collection with chapters selected
        return (
            <View style={[styles.listContainer, { flex: 1, paddingLeft: 12, paddingRight: 16 }]}>
                {/* Tab Switcher for Books/Chapters */}
                <View style={styles.tabContainer}>
                    <Pressable
                        style={[
                            styles.filterTab,
                            !isChapterMode && {
                                borderBottomColor: theme.accent,
                                borderBottomWidth: 2,
                            },
                        ]}
                        onPress={() => setFilterTab('books')}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                !isChapterMode && { color: theme.accent, fontWeight: '700' },
                                { color: theme.textSecondary }
                            ]}
                        >
                            BOOKS
                        </Text>
                    </Pressable>
                    <Pressable
                        style={[
                            styles.filterTab,
                            isChapterMode && {
                                borderBottomColor: theme.accent,
                                borderBottomWidth: 2,
                            },
                        ]}
                        onPress={() => setFilterTab('chapters')}
                    >
                        <Text
                            style={[
                                styles.filterTabText,
                                isChapterMode && { color: theme.accent, fontWeight: '700' },
                                { color: theme.textSecondary }
                            ]}
                        >
                            CHAPTERS
                        </Text>
                    </Pressable>
                </View>

                {isChapterMode ? (
                    <FlatList
                        data={selectedCollection.chapters}
                        keyExtractor={(item) => item.name || `chapter-${item.id}`}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <BookListItem
                                bookName={item.name || `Chapter ${item.chapterNumber}`}
                                stats={{
                                    count: item.scriptures.length,
                                    mastered: 0, // Simplified for now
                                }}
                                onPress={() => onChapterDistributionTap(item.name || '')} // New handler
                                isDark={isDark}
                                theme={theme}
                            />
                        )}
                        contentContainerStyle={{ paddingRight: 12, paddingBottom: 20 }}
                    />
                ) : (
                    <FlatList
                        data={books.filter((b) =>
                            scriptures.some(
                                (s) =>
                                    s.book === b &&
                                    selectedCollection.scriptures.includes(s.id)
                            )
                        )}
                        keyExtractor={(item) => item}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <BookListItem
                                bookName={item}
                                stats={getBookStats(item)}
                                onPress={() => onBookDistributionTap(item)} // Collection-specific handler
                                isDark={isDark}
                                theme={theme}
                            />
                        )}
                        contentContainerStyle={{ paddingRight: 12, paddingBottom: 20 }}
                    />
                )}
            </View>
        )
    }

    // Drill-down navigation logic
    if (selectedCollection) {
        // Show books/chapters view with back button
        const hasChapters = selectedCollection.chapters && selectedCollection.chapters.length > 0
        const isChapterMode = filterTab === 'chapters'

        return (
            <View style={styles.drillDownContainer}>
                {/* Header with back button */}
                <View style={styles.drillDownHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => onSelectCollection(null)}
                    >
                        <FontAwesome name="arrow-left" size={16} color={theme.accent} />
                        <Text style={[styles.backButtonText, { color: theme.accent }]}>
                            BACK TO COLLECTIONS
                        </Text>
                    </TouchableOpacity>
                    <View style={styles.headerTitle}>
                        <Text style={[styles.headerTitleText, { color: theme.textPrimary }]}>
                            {selectedCollection.name}
                        </Text>
                    </View>
                </View>

                {/* Tab Switcher for Books/Chapters (if collection has chapters) */}
                {hasChapters && (
                    <View style={styles.tabContainer}>
                        <Pressable
                            style={[
                                styles.filterTab,
                                !isChapterMode && {
                                    borderBottomColor: theme.accent,
                                    borderBottomWidth: 2,
                                },
                            ]}
                            onPress={() => setFilterTab('books')}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    !isChapterMode && { color: theme.accent, fontWeight: '700' },
                                    { color: theme.textSecondary }
                                ]}
                            >
                                BOOKS
                            </Text>
                        </Pressable>
                        <Pressable
                            style={[
                                styles.filterTab,
                                isChapterMode && {
                                    borderBottomColor: theme.accent,
                                    borderBottomWidth: 2,
                                },
                            ]}
                            onPress={() => setFilterTab('chapters')}
                        >
                            <Text
                                style={[
                                    styles.filterTabText,
                                    isChapterMode && { color: theme.accent, fontWeight: '700' },
                                    { color: theme.textSecondary }
                                ]}
                            >
                                CHAPTERS
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* Content */}
                <View style={styles.contentContainer}>
                    {isChapterMode && hasChapters ? (
                        <FlatList
                            data={selectedCollection.chapters}
                            keyExtractor={(item) => item.name || `chapter-${item.id}`}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <BookListItem
                                    bookName={item.name || `Chapter ${item.chapterNumber}`}
                                    stats={{
                                        count: item.scriptures.length,
                                        mastered: 0,
                                    }}
                                    onPress={() => onChapterDistributionTap(item.name || '')}
                                    isDark={isDark}
                                    theme={theme}
                                />
                            )}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                        />
                    ) : (
                        <FlatList
                            data={books.filter((b) =>
                                scriptures.some(
                                    (s) =>
                                        s.book === b &&
                                        selectedCollection.scriptures.includes(s.id)
                                )
                            )}
                            keyExtractor={(item) => item}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <BookListItem
                                    bookName={item}
                                    stats={getBookStats(item)}
                                    onPress={() => onBookDistributionTap(item)}
                                    isDark={isDark}
                                    theme={theme}
                                />
                            )}
                            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                        />
                    )}
                </View>
            </View>
        )
    }

    // Show collections list (drill-down root)
    return (
        <View style={styles.collectionsContainer}>
            <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                    AMMUNITION BANK
                </Text>
                <TouchableOpacity onPress={onAddCollection}>
                    <FontAwesome name="plus" size={14} color={theme.accent} />
                </TouchableOpacity>
            </View>

            <FlatList
                data={sortedCollections}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                    <CollectionListItem
                        item={item}
                        isSelected={false}
                        onPress={onSelectCollection}
                        onLongPress={onShowCollectionDetail}
                        theme={theme}
                        isDark={isDark}
                    />
                )}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <FontAwesome name="cubes" size={32} color={theme.textSecondary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                            No Ammunition Collections
                        </Text>
                        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                            Create your first collection to organize scripture ammunition for missions.
                        </Text>
                        <TouchableOpacity
                            style={[styles.addButton, { backgroundColor: theme.accent }]}
                            onPress={onAddCollection}
                        >
                            <FontAwesome name="plus" size={14} color="white" />
                            <Text style={styles.addButtonText}>ADD COLLECTION</Text>
                        </TouchableOpacity>
                    </View>
                }
            />
        </View>
    )
}

const styles = StyleSheet.create({
    // Drill-down styles
    drillDownContainer: {
        flex: 1,
    },
    drillDownHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
    },
    backButtonText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitleText: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
        textAlign: 'center',
    },
    contentContainer: {
        flex: 1,
    },

    // Collections view styles
    collectionsContainer: {
        flex: 1,
    },

    // Empty state styles
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        opacity: 0.8,
        marginBottom: 24,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    addButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.5,
    },

    // Legacy styles (keeping for compatibility)
    splitViewContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    listContainer: {
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 4,
    },
    sectionTitle: {
        ...MILITARY_TYPOGRAPHY.caption,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    filterTab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
    },
    filterTabText: {
        fontSize: 12,
        letterSpacing: 1,
        fontWeight: '600',
    },
})
