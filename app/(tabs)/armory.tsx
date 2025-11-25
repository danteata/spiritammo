import { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather } from '@expo/vector-icons';
import {
  COLORS,
  GRADIENTS,
  MILITARY_TYPOGRAPHY,
  TACTICAL_THEME,
  GARRISON_THEME,
} from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import BookScripturesModal from '@/components/BookScripturesModal'
import AddVersesModal from '@/components/AddVersesModal'
import ScreenHeader from '@/components/ScreenHeader'

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
    <ThemedCard
      style={[
        styles.collectionItem,
        // Force background color for unselected items to prevent them from going blank
        {
          backgroundColor: selectedCollection?.id === item.id
            ? 'transparent'
            : (isDark ? TACTICAL_THEME.surface : GARRISON_THEME.surface),
          borderColor: selectedCollection?.id === item.id
            ? TACTICAL_THEME.accent
            : 'transparent',
          borderWidth: 1,
        }
      ]}
      lightColor={GARRISON_THEME.surface}
      darkColor={TACTICAL_THEME.surface}
      variant="outlined"
    >
      <TouchableOpacity
        style={styles.collectionMainArea}
        onPress={() => handleSelectCollection(item)}
      >
        <View style={styles.collectionInfo}>
          <View style={styles.collectionHeaderRow}>
            <ThemedText variant="heading" style={styles.collectionName}>
              {item.abbreviation || item.name}
            </ThemedText>
            {item.isChapterBased && (
              <View style={styles.chapterBadgeContainer}>
                <Feather name="layers" size={10} color={TACTICAL_THEME.accent} />
                <Text style={[styles.chapterBadgeText, { color: TACTICAL_THEME.accent }]}>
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
              <FontAwesome name="crosshairs" size={10} color={isDark ? '#888' : '#666'} />
              <ThemedText variant="caption" style={styles.statText}>
                {item.scriptures.length} ROUNDS
              </ThemedText>
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
    </ThemedCard>
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
    <ThemedCard
      style={styles.distributionItem}
      onPress={() => handleBookDistributionTap(item.book)}
      variant="flat"
    >
      <FontAwesome name="book" size={16} color={TACTICAL_THEME.accent} />
      <ThemedText style={styles.distributionBook}>
        {item.book}
      </ThemedText>
      <View style={styles.distributionCount}>
        <Text style={[styles.countText, { color: TACTICAL_THEME.accent }]}>
          {item.count}
        </Text>
        <ThemedText variant="caption" style={styles.countLabel}>
          rounds
        </ThemedText>
      </View>
      <FontAwesome name="chevron-right" size={12} color={TACTICAL_THEME.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
    </ThemedCard>
  )

  const renderChapterDistribution = ({
    item,
  }: {
    item: { chapter: string; count: number }
  }) => (
    <ThemedCard
      style={styles.distributionItem}
      onPress={() => handleChapterDistributionTap(item.chapter)}
      variant="flat"
    >
      <Feather name="layers" size={16} color={TACTICAL_THEME.accent} />
      <ThemedText style={styles.distributionBook}>
        {item.chapter}
      </ThemedText>
      <View style={styles.distributionCount}>
        <Text style={[styles.countText, { color: TACTICAL_THEME.accent }]}>
          {item.count}
        </Text>
        <ThemedText variant="caption" style={styles.countLabel}>
          rounds
        </ThemedText>
      </View>
      <FontAwesome name="chevron-right" size={12} color={TACTICAL_THEME.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
    </ThemedCard>
  )

  const renderBookItem = ({ item }: { item: any }) => {
    // Count actual scriptures from this book across all collections
    const bookScriptureCount = scriptures.filter(
      (s) => s.book === item.name
    ).length

    return (
      <ThemedCard
        style={styles.bookItem}
        onPress={() => handleDefaultBookTap(item.name)}
        testID={`book-${item.id}`}
        variant="flat"
      >
        <View style={styles.bookIconContainer}>
          <FontAwesome name="book" size={18} color={TACTICAL_THEME.accent} />
        </View>

        <View style={styles.bookInfo}>
          <ThemedText style={styles.bookName}>
            {item.name}
          </ThemedText>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(bookScriptureCount * 2, 100)}%`, backgroundColor: TACTICAL_THEME.accent }]} />
          </View>
        </View>

        <View style={styles.bookStat}>
          <Text style={[styles.bookCount, { color: TACTICAL_THEME.accent }]}>
            {bookScriptureCount}
          </Text>
          <ThemedText variant="caption" style={styles.bookLabel}>
            RNDS
          </ThemedText>
        </View>
        <FontAwesome name="chevron-right" size={12} color={TACTICAL_THEME.textSecondary} style={{ marginLeft: 12, opacity: 0.5 }} />
      </ThemedCard>
    )
  }

  return (
    <ThemedContainer style={styles.container}>
      <ScreenHeader
        title="ARMORY"
        subtitle="AMMUNITION BANK"
        rightAction={
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => setShowAddVerses(true)}
              testID="add-verses-button"
            >
              <FontAwesome name="plus" size={14} color={isDark ? "white" : "black"} />
              <Text style={[styles.actionButtonText, { color: isDark ? "white" : "black" }]}>ADD</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
              ]}
              onPress={() => setShowFileUploader(true)}
              testID="upload-file-button"
            >
              <FontAwesome name="download" size={14} color={isDark ? "white" : "black"} />
              <Text style={[styles.actionButtonText, { color: isDark ? "white" : "black" }]}>IMPORT</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.contentContainer}>
        <View style={styles.sectionHeaderRow}>
          <ThemedText variant="caption" style={styles.collectionsTitle}>
            AMMUNITION
          </ThemedText>
          <View style={[styles.headerLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
        </View>

        <View style={{ maxHeight: '45%', flexGrow: 0 }}>
          <FlatList
            data={collections}
            extraData={selectedCollection}
            renderItem={renderCollectionItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Feather name="box" size={32} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
                </View>
                <ThemedText style={styles.emptyTitle}>Armory Empty</ThemedText>
                <ThemedText variant="caption" style={styles.emptySubtitle}>Import a file or add verses to stock your arsenal.</ThemedText>
              </View>
            }
          />
        </View>

        <View style={styles.sectionHeaderRow}>
          <ThemedText variant="caption" style={[styles.collectionsTitle, { marginTop: 10 }]}>
            {selectedCollection ? 'CONTENTS' : 'ALL BOOKS'}
          </ThemedText>
          <View style={[styles.headerLine, { marginTop: 10, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          {selectedCollection && (
            <TouchableOpacity onPress={() => setSelectedCollection(null)} style={{ marginTop: 10 }}>
              <Text style={{ color: TACTICAL_THEME.accent, fontSize: 12, fontWeight: 'bold' }}>CLEAR FILTER</Text>
            </TouchableOpacity>
          )}
        </View>

        {selectedCollection ? (
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
                  <ThemedText variant="caption" style={styles.emptyText}>
                    No books found in this arsenal
                  </ThemedText>
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
                  <ThemedText variant="caption" style={styles.emptyText}>
                    No chapters found in this arsenal
                  </ThemedText>
                }
              />
            ) : (
              <View style={styles.emptyStateContainer}>
                <ThemedText variant="caption" style={styles.emptyText}>
                  This arsenal is not organized by chapters
                </ThemedText>
                <ThemedText variant="caption" style={styles.emptySubtext}>
                  Use the Books tab to see scripture distribution
                </ThemedText>
              </View>
            )}
          </View>
        ) : (
          <ThemedContainer
            useGradient={true}
            style={styles.listGradient}
          >
            <FlatList
              data={books}
              renderItem={renderBookItem}
              keyExtractor={(item) => item.id}
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 100 }}
            />
          </ThemedContainer>

        )}
      </View>


      {/* Modals remain same */}
      <FileUploader
        isVisible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onVersesExtracted={handleVersesExtracted}
      />
      {
        selectedCollection && (
          <CollectionDetailModal
            collection={selectedCollection}
            isVisible={showCollectionDetail}
            onClose={() => setShowCollectionDetail(false)}
          />
        )
      }
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
    </ThemedContainer >
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  subHeader: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
  },
  listGradient: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
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
    paddingHorizontal: 20,
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
    marginBottom: 8, // Reduced from 12
    // overflow: 'hidden', // Removed to prevent clipping issues with shadows/content
    padding: 0, // Remove default card padding
    minHeight: 80, // Ensure minimum height to prevent blank rendering
  },
  collectionMainArea: {
    flex: 1,
    padding: 10, // Reduced from 12
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
    fontSize: 12, // Slightly smaller font
    marginBottom: 4, // Reduced from 8
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
