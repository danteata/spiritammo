import { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather } from '@expo/vector-icons';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import BookScripturesModal from '@/components/BookScripturesModal'
import AddVersesModal from '@/components/AddVersesModal'

import { CollectionChapterService } from '@/services/collectionChapters'

export default function ArmoryScreen() {
  const {
    isDark,
    collections,
    books,
    scriptures,
    getScripturesByCollection,
    addCollection,
    addScriptures,
    addScripturesToCollection,
  } = useAppStore()
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showCollectionDetail, setShowCollectionDetail] = useState(false)
  const [filterTab, setFilterTab] = useState<'books' | 'chapters'>('books')
  const [showBookScriptures, setShowBookScriptures] = useState(false)
  const [bookScriptures, setBookScriptures] = useState<Scripture[]>([])
  const [selectedBookName, setSelectedBookName] = useState<string>('')
  const [showAddVerses, setShowAddVerses] = useState(false)

  const handleSelectCollection = (collection: Collection) => {
    console.log('Selecting collection:', collection.name, collection.id)
    setSelectedCollection(collection)
    // Reset to books tab when selecting a new collection
    setFilterTab('books')
    // Don't open modal, just set as active collection for filtering
  }

  const handleShowCollectionDetail = (collection: Collection) => {
    setSelectedCollection(collection)
    setShowCollectionDetail(true)
  }

  const handleBookDistributionTap = (bookName: string) => {
    if (!selectedCollection) return

    const scriptures = getScripturesByCollection(selectedCollection.id)
    const bookScriptures = scriptures.filter((s) => s.book === bookName)

    if (bookScriptures.length > 0) {
      setBookScriptures(bookScriptures)
      setSelectedBookName(bookName)
      setShowBookScriptures(true)
    }
  }

  const handleChapterDistributionTap = (chapterName: string) => {
    if (!selectedCollection) return

    const chapter = selectedCollection.chapters?.find(
      (c) => c.name === chapterName
    )
    if (chapter) {
      const chapterScriptures = scriptures.filter((s) =>
        chapter.scriptures.includes(s.id)
      )

      if (chapterScriptures.length > 0) {
        setBookScriptures(chapterScriptures)
        setSelectedBookName(chapterName)
        setShowBookScriptures(true)
      }
    }
  }

  const handleDefaultBookTap = (bookName: string) => {
    // When no collection is selected, show all scriptures from this book
    const bookScriptures = scriptures.filter((s) => s.book === bookName)

    if (bookScriptures.length > 0) {
      setBookScriptures(bookScriptures)
      setSelectedBookName(bookName)
      setShowBookScriptures(true)
    }
  }

  const handleVersesExtracted = async (extractedVerses: Scripture[], targetCollectionId?: string) => {
    if (extractedVerses.length === 0) {
      Alert.alert('No Verses', 'No verses were extracted from the file.')
      return
    }

    // Add the scriptures to the main store first
    await addScriptures(extractedVerses)

    // If user selected a target collection, add to it directly
    if (targetCollectionId) {
      await addScripturesToCollection(targetCollectionId, extractedVerses.map(v => v.id))
      // Alert is already shown in FileUploader
      return
    }

    // Analyze for chapter organization
    const analysis =
      CollectionChapterService.analyzeScripturesForChapters(extractedVerses)

    let newCollection: Collection = {
      id: `imported_${Date.now()}`,
      name: analysis.sourceBook
        ? `${analysis.sourceBook} Collection`
        : `Imported Collection ${new Date().toLocaleDateString()}`,
      description: `${extractedVerses.length} verses imported from file`,
      scriptures: extractedVerses.map((v) => v.id),
      createdAt: new Date().toISOString(),
      tags: ['imported', 'file-upload'],
    }

    // If it can be chapter-based, offer the option
    if (analysis.canBeChapterBased) {
      Alert.alert(
        'Chapter Organization Available',
        `This collection can be organized by chapters (${analysis.stats.totalChapters
        } chapters from ${analysis.stats.totalBooks} book${analysis.stats.totalBooks > 1 ? 's' : ''
        }). Would you like to enable chapter-based organization?`,
        [
          {
            text: 'Simple Collection',
            onPress: async () => {
              await addCollection(newCollection)
              Alert.alert(
                'Import Successful!',
                `Created collection "${newCollection.name}" with ${extractedVerses.length} verses.`
              )
            },
          },
          {
            text: 'Chapter-Based',
            onPress: async () => {
              try {
                const chapterBasedCollection =
                  await CollectionChapterService.convertToChapterBased(
                    newCollection,
                    extractedVerses
                  )
                await addCollection(chapterBasedCollection)
                Alert.alert(
                  'Import Successful!',
                  `Created chapter-based collection "${chapterBasedCollection.name}" with ${analysis.stats.totalChapters} chapters.`
                )
              } catch (error) {
                console.error(
                  'Failed to create chapter-based collection:',
                  error
                )
                await addCollection(newCollection)
                Alert.alert(
                  'Import Successful!',
                  `Created collection "${newCollection.name}" with ${extractedVerses.length} verses.`
                )
              }
            },
          },
        ]
      )
    } else {
      // Create simple collection
      await addCollection(newCollection)
      Alert.alert(
        'Import Successful!',
        `Created collection "${newCollection.name}" with ${extractedVerses.length} verses.`
      )
    }
  }

  const renderCollectionItem = ({ item }: { item: Collection }) => (
    <View
      style={[
        styles.collectionItem,
        {
          backgroundColor:
            selectedCollection?.id === item.id
              ? isDark
                ? 'rgba(255, 165, 0, 0.15)'
                : 'rgba(255, 165, 0, 0.1)'
              : isDark
                ? 'rgba(255, 255, 255, 0.05)'
                : 'rgba(0, 0, 0, 0.03)',
          borderColor:
            selectedCollection?.id === item.id
              ? TACTICAL_THEME.accent
              : 'rgba(255,255,255,0.1)',
          borderWidth: 1,
        },
      ]}
      testID={`collection-${item.id}`}
    >
      <TouchableOpacity
        style={styles.collectionMainArea}
        onPress={() => handleSelectCollection(item)}
      >
        <View style={styles.collectionInfo}>
          <View style={styles.collectionHeaderRow}>
            <Text
              style={[
                styles.collectionName,
                { color: isDark ? 'white' : 'black' },
              ]}
            >
              {item.abbreviation || item.name}
            </Text>
            {item.isChapterBased && (
              <View style={styles.chapterBadgeContainer}>
                <Feather name="layers" size={10} color={TACTICAL_THEME.accent} />
                <Text style={[styles.chapterBadgeText, { color: TACTICAL_THEME.accent }]}>
                  CHAPTERS
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.collectionDescription, { color: isDark ? '#aaa' : '#666' }]} numberOfLines={1}>
            {item.name}
          </Text>

          <View style={styles.collectionMeta}>
            <View style={styles.statBadge}>
              <FontAwesome name="crosshairs" size={10} color={isDark ? '#888' : '#666'} />
              <Text style={[styles.statText, { color: isDark ? '#ccc' : '#444' }]}>
                {item.scriptures.length} ROUNDS
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.collectionArrow}
        onPress={() => handleShowCollectionDetail(item)}
      >
        <View style={styles.arrowCircle}>
          <FontAwesome name="chevron-right" size={12} color={isDark ? 'white' : 'black'} />
        </View>
      </TouchableOpacity>
    </View>
  )

  // Get scripture distribution by book for selected collection
  const getScriptureDistribution = () => {
    if (!selectedCollection) return []

    const scriptures = getScripturesByCollection(selectedCollection.id)
    const distribution = new Map<string, number>()

    scriptures.forEach((scripture) => {
      const book = scripture.book || 'Unknown'
      distribution.set(book, (distribution.get(book) || 0) + 1)
    })

    return Array.from(distribution.entries())
      .map(([book, count]) => ({ book, count }))
      .sort((a, b) => b.count - a.count) // Sort by count descending
  }

  // Get scripture distribution by chapter for selected collection
  const getChapterDistribution = () => {
    if (
      !selectedCollection ||
      !selectedCollection.isChapterBased ||
      !selectedCollection.chapters
    ) {
      return []
    }

    return selectedCollection.chapters
      .map((chapter) => ({
        chapter: chapter.name || `Chapter ${chapter.chapterNumber}`,
        count: chapter.scriptures.length,
      }))
      .sort((a, b) => a.chapter.localeCompare(b.chapter))
  }

  const renderBookDistribution = ({
    item,
  }: {
    item: { book: string; count: number }
  }) => (
    <TouchableOpacity
      style={[
        styles.distributionItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={() => handleBookDistributionTap(item.book)}
    >
      <FontAwesome name="book" size={16} color={TACTICAL_THEME.accent} />
      <Text
        style={[styles.distributionBook, { color: isDark ? 'white' : 'black' }]}
      >
        {item.book}
      </Text>
      <View style={styles.distributionCount}>
        <Text style={[styles.countText, { color: TACTICAL_THEME.accent }]}>
          {item.count}
        </Text>
        <Text
          style={[
            styles.countLabel,
            {
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            },
          ]}
        >
          rounds
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderChapterDistribution = ({
    item,
  }: {
    item: { chapter: string; count: number }
  }) => (
    <TouchableOpacity
      style={[
        styles.distributionItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={() => handleChapterDistributionTap(item.chapter)}
    >
      <Feather name="layers" size={16} color={TACTICAL_THEME.accent} />
      <Text
        style={[styles.distributionBook, { color: isDark ? 'white' : 'black' }]}
      >
        {item.chapter}
      </Text>
      <View style={styles.distributionCount}>
        <Text style={[styles.countText, { color: TACTICAL_THEME.accent }]}>
          {item.count}
        </Text>
        <Text
          style={[
            styles.countLabel,
            {
              color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)',
            },
          ]}
        >
          rounds
        </Text>
      </View>
    </TouchableOpacity>
  )

  const renderBookItem = ({ item }: { item: any }) => {
    // Count actual scriptures from this book across all collections
    const bookScriptureCount = scriptures.filter(
      (s) => s.book === item.name
    ).length

    return (
      <TouchableOpacity
        style={[
          styles.bookItem,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(0, 0, 0, 0.02)',
            borderColor: 'rgba(255,255,255,0.05)',
            borderWidth: 1,
          },
        ]}
        onPress={() => handleDefaultBookTap(item.name)}
        testID={`book-${item.id}`}
      >
        <View style={styles.bookIconContainer}>
          <FontAwesome name="book" size={18} color={TACTICAL_THEME.accent} />
        </View>

        <View style={styles.bookInfo}>
          <Text style={[styles.bookName, { color: isDark ? 'white' : 'black' }]}>
            {item.name}
          </Text>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(bookScriptureCount * 2, 100)}%`, backgroundColor: TACTICAL_THEME.accent }]} />
          </View>
        </View>

        <View style={styles.bookStat}>
          <Text style={[styles.bookCount, { color: TACTICAL_THEME.accent }]}>
            {bookScriptureCount}
          </Text>
          <Text style={[styles.bookLabel, { color: isDark ? '#666' : '#999' }]}>
            RNDS
          </Text>
        </View>
      </TouchableOpacity>
    )
  }

  const backgroundColors = isDark
    ? (['#0a1505', '#1a2f0a', '#0f1a05'] as const) // Darker, deeper green
    : (['#4A6B2A', '#2D5016', '#1a2f0a'] as const)

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }} // Diagonal gradient
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.sectionTitle,
              MILITARY_TYPOGRAPHY.heading,
              { color: 'white', fontSize: 32, letterSpacing: 1 },
            ]}
          >
            ARMORY
          </Text>
          <View style={styles.subtitleContainer}>
            <View style={styles.subtitleLine} />
            <Text
              style={[
                styles.sectionSubtitle,
                MILITARY_TYPOGRAPHY.caption,
                { color: TACTICAL_THEME.accent, letterSpacing: 2 },
              ]}
            >
              SUPPLY LINES
            </Text>
          </View>
        </View>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowAddVerses(true)}
            testID="add-verses-button"
          >
            <FontAwesome name="plus" size={14} color="white" />
            <Text style={styles.actionButtonText}>ADD</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={() => setShowFileUploader(true)}
            testID="upload-file-button"
          >
            <FontAwesome name="download" size={14} color="black" />
            <Text style={[styles.actionButtonText, { color: 'black' }]}>IMPORT</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.collectionsTitle, { color: '#888' }]}>
            ARSENALS
          </Text>
          <View style={styles.headerLine} />
        </View>

        <FlatList
          data={collections}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Feather name="box" size={32} color="rgba(255,255,255,0.2)" />
              </View>
              <Text style={styles.emptyTitle}>Armory Empty</Text>
              <Text style={styles.emptySubtitle}>Import a file or add verses to stock your arsenal.</Text>
            </View>
          }
        />

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.collectionsTitle, { color: '#888', marginTop: 20 }]}>
            {selectedCollection ? 'CONTENTS' : 'ALL BOOKS'}
          </Text>
          <View style={[styles.headerLine, { marginTop: 20 }]} />
          {selectedCollection && (
            <TouchableOpacity onPress={() => setSelectedCollection(null)} style={{ marginTop: 20 }}>
              <Text style={{ color: TACTICAL_THEME.accent, fontSize: 12, fontWeight: 'bold' }}>CLEAR FILTER</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedCollection ? (
          // ... (Keep existing filter logic but styled better if needed)
          <View style={{ flex: 1 }}>
            {/* Filter Tabs */}
            <View style={styles.filterTabs}>
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  filterTab === 'books' && styles.activeFilterTab,
                ]}
                onPress={() => setFilterTab('books')}
              >
                <FontAwesome
                  name="book"
                  size={16}
                  color={
                    filterTab === 'books'
                      ? TACTICAL_THEME.text
                      : TACTICAL_THEME.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color:
                        filterTab === 'books'
                          ? TACTICAL_THEME.text
                          : TACTICAL_THEME.textSecondary,
                    },
                  ]}
                >
                  BOOKS
                </Text>
              </TouchableOpacity>

              {selectedCollection.isChapterBased &&
                selectedCollection.chapters &&
                selectedCollection.chapters.length > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.filterTab,
                      filterTab === 'chapters' && styles.activeFilterTab,
                    ]}
                    onPress={() => setFilterTab('chapters')}
                  >
                    <Feather
                      name="layers"
                      size={16}
                      color={
                        filterTab === 'chapters'
                          ? TACTICAL_THEME.text
                          : TACTICAL_THEME.textSecondary
                      }
                    />
                    <Text
                      style={[
                        styles.filterTabText,
                        {
                          color:
                            filterTab === 'chapters'
                              ? TACTICAL_THEME.text
                              : TACTICAL_THEME.textSecondary,
                        },
                      ]}
                    >
                      CHAPTERS
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            {/* Filter Content */}
            {filterTab === 'books' ? (
              <FlatList
                data={getScriptureDistribution()}
                renderItem={renderBookDistribution}
                keyExtractor={(item) => item.book}
                style={styles.list}
                ListEmptyComponent={
                  <Text
                    style={[
                      styles.emptyText,
                      { color: 'rgba(255, 255, 255, 0.5)' },
                    ]}
                  >
                    No books found in this arsenal
                  </Text>
                }
              />
            ) : selectedCollection.isChapterBased &&
              selectedCollection.chapters &&
              selectedCollection.chapters.length > 0 ? (
              <FlatList
                data={getChapterDistribution()}
                renderItem={renderChapterDistribution}
                keyExtractor={(item) => item.chapter}
                style={styles.list}
                ListEmptyComponent={
                  <Text
                    style={[
                      styles.emptyText,
                      { color: 'rgba(255, 255, 255, 0.5)' },
                    ]}
                  >
                    No chapters found in this arsenal
                  </Text>
                }
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text
                  style={[
                    styles.emptyText,
                    { color: 'rgba(255, 255, 255, 0.5)' },
                  ]}
                >
                  This arsenal is not organized by chapters
                </Text>
                <Text
                  style={[
                    styles.emptySubtext,
                    { color: 'rgba(255, 255, 255, 0.3)' },
                  ]}
                >
                  Use the Books tab to see scripture distribution
                </Text>
              </View>
            )}
          </View>
        ) : (
          <FlatList
            data={books}
            renderItem={renderBookItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>

      {/* Modals remain same */}
      <FileUploader
        isVisible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onVersesExtracted={handleVersesExtracted}
      />
      {selectedCollection && (
        <CollectionDetailModal
          collection={selectedCollection}
          isVisible={showCollectionDetail}
          onClose={() => setShowCollectionDetail(false)}
        />
      )}
      <BookScripturesModal
        isVisible={showBookScriptures}
        onClose={() => setShowBookScriptures(false)}
        scriptures={bookScriptures}
        bookName={selectedBookName}
      />
      <AddVersesModal
        isVisible={showAddVerses}
        onClose={() => setShowAddVerses(false)}
        onVersesAdded={(collectionId, verses) => {
          console.log(`Added ${verses.length} verses`);
        }}
      />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60, // More top padding
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerContent: {
    flex: 1,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  subtitleLine: {
    width: 20,
    height: 2,
    backgroundColor: TACTICAL_THEME.accent,
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20, // Pill shape
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  primaryAction: {
    backgroundColor: TACTICAL_THEME.accent,
    borderColor: TACTICAL_THEME.accent,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  headerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  collectionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  list: {
    flex: 1,
  },
  // Card Styles
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  collectionMainArea: {
    flex: 1,
    padding: 16,
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
    fontSize: 13,
    marginBottom: 12,
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
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  collectionArrow: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.05)',
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Book Item Styles
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  bookIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
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
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
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
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#888',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 200,
  },
  // Legacy styles needed for filter tabs
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 8,
  },
  activeFilterTab: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  distributionBook: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
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
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },

  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    // Placeholder if needed, but overridden inline
  },
  sectionSubtitle: {
    // Placeholder if needed, but overridden inline
  },
  clearSelectionButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearSelectionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Empty state styles
  emptyStateContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptySubtext: {
    textAlign: 'center',
    marginTop: 8,
    fontSize: 12,
  },
})
