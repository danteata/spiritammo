import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Book, ChevronRight, Upload, Layers } from 'lucide-react-native'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import CollectionDetailModal from '@/components/CollectionDetailModal'
import { CollectionChapterService } from '@/services/collectionChapters'

export default function ArmoryScreen() {
  const {
    isDark,
    collections,
    books,
    scriptures,
    setSelectedBook,
    getScripturesByCollection,
    addCollection,
    addScriptures,
  } = useAppStore()
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)
  const [showFileUploader, setShowFileUploader] = useState(false)
  const [showCollectionDetail, setShowCollectionDetail] = useState(false)
  const [filterTab, setFilterTab] = useState<'books' | 'chapters'>('books')

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection)
    // Don't open modal, just set as active collection for filtering
  }

  const handleShowCollectionDetail = (collection: Collection) => {
    setSelectedCollection(collection)
    setShowCollectionDetail(true)
  }

  const handleSelectBook = (bookId: string) => {
    const book = books.find((b) => b.id === bookId)
    if (book) {
      setSelectedBook(book)
    }
  }

  const handleVersesExtracted = async (extractedVerses: Scripture[]) => {
    if (extractedVerses.length === 0) {
      Alert.alert('No Verses', 'No verses were extracted from the file.')
      return
    }

    // Add the scriptures to the main store first
    await addScriptures(extractedVerses)

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
        `This collection can be organized by chapters (${
          analysis.stats.totalChapters
        } chapters from ${analysis.stats.totalBooks} book${
          analysis.stats.totalBooks > 1 ? 's' : ''
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
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
          borderColor:
            selectedCollection?.id === item.id
              ? TACTICAL_THEME.accent
              : 'transparent',
          borderWidth: selectedCollection?.id === item.id ? 2 : 0,
        },
      ]}
      testID={`collection-${item.id}`}
    >
      <TouchableOpacity
        style={styles.collectionMainArea}
        onPress={() => handleSelectCollection(item)}
      >
        <View style={styles.collectionInfo}>
          <Text
            style={[
              styles.collectionName,
              { color: isDark ? 'white' : 'black' },
            ]}
          >
            {item.abbreviation
              ? `${item.abbreviation} - ${item.name}`
              : item.name}
          </Text>
          <View style={styles.collectionMeta}>
            <Text
              style={[
                styles.collectionCount,
                {
                  color: isDark
                    ? 'rgba(255, 255, 255, 0.5)'
                    : 'rgba(0, 0, 0, 0.5)',
                },
              ]}
            >
              {item.scriptures.length} rounds
            </Text>

            {item.isChapterBased && item.chapters && (
              <Text
                style={[styles.chapterBadge, { color: TACTICAL_THEME.accent }]}
              >
                {item.chapters.length} chapters
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.collectionArrow}
        onPress={() => handleShowCollectionDetail(item)}
      >
        <ChevronRight size={20} color={isDark ? 'white' : 'black'} />
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
    <View
      style={[
        styles.distributionItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
    >
      <Book size={16} color={TACTICAL_THEME.accent} />
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
    </View>
  )

  const renderChapterDistribution = ({
    item,
  }: {
    item: { chapter: string; count: number }
  }) => (
    <View
      style={[
        styles.distributionItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
    >
      <Layers size={16} color={TACTICAL_THEME.accent} />
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
    </View>
  )

  const renderBookItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.bookItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={() => handleSelectBook(item.id)}
      testID={`book-${item.id}`}
    >
      <Book size={20} color={isDark ? 'white' : 'black'} />
      <Text style={[styles.bookName, { color: isDark ? 'white' : 'black' }]}>
        {item.name}
      </Text>
      <Text
        style={[
          styles.bookChapters,
          { color: isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)' },
        ]}
      >
        {item.chapters} rounds
      </Text>
      <ChevronRight size={20} color={isDark ? 'white' : 'black'} />
    </TouchableOpacity>
  )

  const backgroundColors = isDark
    ? (['#1a2f0a', '#2D5016', '#0f1a05'] as const) // Beautiful army green gradient
    : (['#4A6B2A', '#2D5016', '#1a2f0a'] as const)

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text
            style={[
              styles.sectionTitle,
              MILITARY_TYPOGRAPHY.heading,
              { color: TACTICAL_THEME.text },
            ]}
          >
            AMMUNITION ARMORY
          </Text>
          <Text
            style={[
              styles.sectionSubtitle,
              MILITARY_TYPOGRAPHY.caption,
              { color: TACTICAL_THEME.textSecondary },
            ]}
          >
            Scripture Collections & Supply Lines
          </Text>
        </View>

        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setShowFileUploader(true)}
          testID="upload-file-button"
        >
          <Upload size={20} color={TACTICAL_THEME.text} />
          <Text style={[styles.uploadText, MILITARY_TYPOGRAPHY.caption]}>
            SUPPLY DROP
          </Text>
        </TouchableOpacity>
      </View>

      <Text
        style={[
          styles.collectionsTitle,
          MILITARY_TYPOGRAPHY.subheading,
          { color: TACTICAL_THEME.text },
        ]}
      >
        AMMUNITION COLLECTIONS
      </Text>

      <FlatList
        data={collections}
        renderItem={renderCollectionItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionSubtitle, { color: 'white' }]}>
          {selectedCollection
            ? `${
                selectedCollection.abbreviation || selectedCollection.name
              } - Scripture Distribution`
            : `Books (${scriptures.length} total rounds)`}
        </Text>
        {selectedCollection && (
          <TouchableOpacity
            style={styles.clearSelectionButton}
            onPress={() => setSelectedCollection(null)}
          >
            <Text style={styles.clearSelectionText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {selectedCollection ? (
        <View>
          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[
                styles.filterTab,
                filterTab === 'books' && styles.activeFilterTab,
              ]}
              onPress={() => setFilterTab('books')}
            >
              <Book
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

            {selectedCollection.isChapterBased && (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  filterTab === 'chapters' && styles.activeFilterTab,
                ]}
                onPress={() => setFilterTab('chapters')}
              >
                <Layers
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
                  No books found in this collection
                </Text>
              }
            />
          ) : (
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
                  No chapters found in this collection
                </Text>
              }
            />
          )}
        </View>
      ) : (
        <FlatList
          data={books}
          renderItem={renderBookItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      )}

      {/* File Uploader Modal */}
      <FileUploader
        isVisible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onVersesExtracted={handleVersesExtracted}
      />

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <CollectionDetailModal
          collection={selectedCollection}
          isVisible={showCollectionDetail}
          onClose={() => {
            setShowCollectionDetail(false)
            // Keep selectedCollection active for filtering
          }}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingTop: 20,
  },
  headerContent: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionSubtitle: {
    marginBottom: 4,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  uploadText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  collectionsTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  collectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 8,
  },
  collectionMainArea: {
    flex: 1,
    padding: 16,
  },
  collectionArrow: {
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collectionInfo: {
    flex: 1,
  },
  collectionName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  collectionDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  collectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  collectionCount: {
    fontSize: 12,
  },
  chapterBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  bookName: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  bookChapters: {
    fontSize: 12,
    marginRight: 8,
  },
  // Distribution styles
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  distributionBook: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
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
  // Filter tab styles
  filterTabs: {
    flexDirection: 'row',
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  activeFilterTab: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
})
