import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native'
import { ChevronDown, Target, BookOpen } from 'lucide-react-native'
import { Collection } from '@/types/scripture'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface CollectionSelectorProps {
  onSelectCollection: (collection: Collection) => void
  selectedCollection?: Collection | null
  selectedChapterIds?: string[]
}

export default function CollectionSelector({
  onSelectCollection,
  selectedCollection,
  selectedChapterIds = [],
}: CollectionSelectorProps) {
  const { collections, isDark } = useAppStore()
  const [modalVisible, setModalVisible] = useState(false)

  const handleSelect = (collection: Collection) => {
    onSelectCollection(collection)
    setModalVisible(false)
  }

  const getDisplayRoundCount = (collection: Collection) => {
    // If no chapters are selected or collection is not chapter-based, show total
    if (
      !collection.isChapterBased ||
      !collection.chapters ||
      selectedChapterIds.length === 0
    ) {
      return collection.scriptures.length
    }

    // Calculate rounds from selected chapters only
    const selectedChapters = collection.chapters.filter((ch) =>
      selectedChapterIds.includes(ch.id)
    )

    return selectedChapters.reduce((total, chapter) => {
      return total + chapter.scriptures.length
    }, 0)
  }

  const renderItem = ({ item }: { item: Collection }) => (
    <TouchableOpacity
      style={styles.collectionItem}
      onPress={() => handleSelect(item)}
      testID={`collection-item-${item.id}`}
    >
      <View style={styles.collectionInfo}>
        <View style={styles.collectionHeader}>
          <BookOpen size={16} color={TACTICAL_THEME.accent} />
          <Text style={[styles.collectionName, MILITARY_TYPOGRAPHY.body]}>
            {item.abbreviation
              ? `${item.abbreviation} - ${item.name}`
              : item.name}
          </Text>

          {item.isChapterBased && item.chapters && (
            <View style={styles.chapterBadge}>
              <Text
                style={[styles.chapterBadgeText, MILITARY_TYPOGRAPHY.caption]}
              >
                {item.chapters.length}CH
              </Text>
            </View>
          )}
        </View>

        {item.description && (
          <Text
            style={[styles.collectionDescription, MILITARY_TYPOGRAPHY.caption]}
          >
            {item.description}
          </Text>
        )}

        <View style={styles.collectionMeta}>
          <Text style={[styles.roundsCount, MILITARY_TYPOGRAPHY.caption]}>
            {getDisplayRoundCount(item)} rounds
          </Text>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tags}>
              {item.tags.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={[styles.tagText, MILITARY_TYPOGRAPHY.caption]}>
                    {tag.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )

  const backgroundColor = TACTICAL_THEME.surface
  const textColor = TACTICAL_THEME.text
  const borderColor = TACTICAL_THEME.border

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor, borderColor }]}
        onPress={() => setModalVisible(true)}
        testID="collection-selector-button"
      >
        <View style={styles.selectorContent}>
          <Target size={20} color={TACTICAL_THEME.accent} />
          <View style={styles.selectorTextContainer}>
            <Text
              style={[
                styles.selectorText,
                MILITARY_TYPOGRAPHY.body,
                { color: textColor },
              ]}
            >
              {selectedCollection
                ? selectedCollection.abbreviation
                  ? `${selectedCollection.abbreviation} - ${selectedCollection.name}`
                  : selectedCollection.name
                : 'SELECT AMMUNITION'}
            </Text>
            {selectedCollection && (
              <Text
                style={[
                  styles.selectorSubtext,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: TACTICAL_THEME.textSecondary },
                ]}
              >
                {getDisplayRoundCount(selectedCollection)} rounds loaded
              </Text>
            )}
          </View>
        </View>
        <ChevronDown size={20} color={textColor} />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor }]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  MILITARY_TYPOGRAPHY.heading,
                  { color: textColor },
                ]}
              >
                AMMUNITION SELECTION
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: TACTICAL_THEME.textSecondary },
                ]}
              >
                Choose your scripture collection
              </Text>
            </View>

            {collections.length === 0 ? (
              <View style={styles.emptyState}>
                <BookOpen size={48} color={TACTICAL_THEME.textSecondary} />
                <Text
                  style={[
                    styles.emptyStateText,
                    MILITARY_TYPOGRAPHY.body,
                    { color: TACTICAL_THEME.textSecondary },
                  ]}
                >
                  No ammunition collections available
                </Text>
                <Text
                  style={[
                    styles.emptyStateSubtext,
                    MILITARY_TYPOGRAPHY.caption,
                    { color: TACTICAL_THEME.textSecondary },
                  ]}
                >
                  Create collections in the Armory
                </Text>
              </View>
            ) : (
              <FlatList
                data={collections}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                style={styles.collectionList}
                showsVerticalScrollIndicator={false}
              />
            )}

            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: TACTICAL_THEME.accent },
              ]}
              onPress={() => setModalVisible(false)}
            >
              <Text
                style={[styles.closeButtonText, MILITARY_TYPOGRAPHY.button]}
              >
                CLOSE
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    paddingHorizontal: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontWeight: '600',
  },
  selectorSubtext: {
    marginTop: 2,
    opacity: 0.8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalSubtitle: {
    opacity: 0.8,
  },
  collectionList: {
    maxHeight: 400,
  },
  collectionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: TACTICAL_THEME.border,
  },
  collectionInfo: {
    flex: 1,
  },
  collectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  collectionName: {
    flex: 1,
    color: TACTICAL_THEME.text,
    fontWeight: '600',
  },
  chapterBadge: {
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  chapterBadgeText: {
    color: TACTICAL_THEME.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  collectionDescription: {
    color: TACTICAL_THEME.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  collectionMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundsCount: {
    color: TACTICAL_THEME.textSecondary,
    fontWeight: '500',
  },
  tags: {
    flexDirection: 'row',
    gap: 4,
  },
  tag: {
    backgroundColor: TACTICAL_THEME.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagText: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 16,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    opacity: 0.7,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
})
