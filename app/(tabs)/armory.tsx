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
import { Book, ChevronRight, Upload } from 'lucide-react-native'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import FileUploader from '@/components/FileUploader'
import { CollectionChapterService } from '@/services/collectionChapters'

export default function ArmoryScreen() {
  const {
    isDark,
    collections,
    books,
    setSelectedBook,
    setCurrentScripture,
    getScripturesByCollection,
    addCollection,
    addScriptures,
  } = useAppStore()
  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)
  const [showFileUploader, setShowFileUploader] = useState(false)

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection)
    const scriptures = getScripturesByCollection(collection.id)
    if (scriptures.length > 0) {
      setCurrentScripture(scriptures[0])
    }
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
    <TouchableOpacity
      style={[
        styles.collectionItem,
        {
          backgroundColor: isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)',
        },
      ]}
      onPress={() => handleSelectCollection(item)}
      testID={`collection-${item.id}`}
    >
      <View style={styles.collectionInfo}>
        <Text
          style={[styles.collectionName, { color: isDark ? 'white' : 'black' }]}
        >
          {item.name}
        </Text>
        {item.description && (
          <Text
            style={[
              styles.collectionDescription,
              {
                color: isDark
                  ? 'rgba(255, 255, 255, 0.7)'
                  : 'rgba(0, 0, 0, 0.7)',
              },
            ]}
          >
            {item.description}
          </Text>
        )}
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
      <ChevronRight size={20} color={isDark ? 'white' : 'black'} />
    </TouchableOpacity>
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
        {item.chapters} chapters
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

      <Text style={[styles.sectionSubtitle, { color: 'white' }]}>Books</Text>

      <FlatList
        data={books}
        renderItem={renderBookItem}
        keyExtractor={(item) => item.id}
        style={styles.list}
      />

      {/* File Uploader Modal */}
      <FileUploader
        isVisible={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onVersesExtracted={handleVersesExtracted}
      />
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
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
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
})
