import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
  const { collections, isDark, addCollection } = useAppStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [newArsenalName, setNewArsenalName] = useState('')

  const handleSelect = (collection: Collection) => {
    onSelectCollection(collection)
    setModalVisible(false)
  }

  const handleCreateArsenal = async () => {
    if (!newArsenalName.trim()) return

    const newCollection: Collection = {
      id: `arsenal_${Date.now()}`,
      name: newArsenalName.trim(),
      description: 'Custom Arsenal',
      scriptures: [],
      createdAt: new Date().toISOString(),
      tags: ['custom'],
      isChapterBased: false
    }

    await addCollection(newCollection)
    onSelectCollection(newCollection)
    setNewArsenalName('')
    setIsCreating(false)
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
          <FontAwesome name="book" size={16} color={TACTICAL_THEME.accent} />
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
          <FontAwesome name="bullseye" size={20} color={TACTICAL_THEME.accent} />
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
                : 'SELECT ARSENAL'}
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
        <FontAwesome name="chevron-down" size={20} color={textColor} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <BlurView
            intensity={20}
            tint={isDark ? "dark" : "light"}
            style={styles.blurOverlay}
          />
          <View style={[styles.modalContent, { backgroundColor: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  MILITARY_TYPOGRAPHY.heading,
                  { color: textColor },
                ]}
              >
                ARSENAL SELECTION
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: TACTICAL_THEME.textSecondary },
                ]}
              >
                Choose your ammunition supply
              </Text>
            </View>

            {isCreating ? (
              <View style={styles.createContainer}>
                <TextInput
                  style={[styles.input, { color: textColor, borderColor: TACTICAL_THEME.border }]}
                  placeholder="ENTER ARSENAL NAME"
                  placeholderTextColor={TACTICAL_THEME.textSecondary}
                  value={newArsenalName}
                  onChangeText={setNewArsenalName}
                  autoFocus
                />
                <View style={styles.createActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: TACTICAL_THEME.border }]}
                    onPress={() => setIsCreating(false)}
                  >
                    <Text style={[styles.actionButtonText, { color: TACTICAL_THEME.textSecondary }]}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: TACTICAL_THEME.accent, borderColor: TACTICAL_THEME.accent }]}
                    onPress={handleCreateArsenal}
                  >
                    <Text style={[styles.actionButtonText, { color: TACTICAL_THEME.text }]}>CREATE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setIsCreating(true)}
                >
                  <FontAwesome name="plus" size={16} color={TACTICAL_THEME.text} />
                  <Text style={[styles.createButtonText, MILITARY_TYPOGRAPHY.button]}>
                    ESTABLISH NEW ARSENAL
                  </Text>
                </TouchableOpacity>

                {collections.length === 0 ? (
                  <View style={styles.emptyState}>
                    <FontAwesome name="book" size={48} color={TACTICAL_THEME.textSecondary} />
                    <Text
                      style={[
                        styles.emptyStateText,
                        MILITARY_TYPOGRAPHY.body,
                        { color: TACTICAL_THEME.textSecondary },
                      ]}
                    >
                      No arsenals available
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
              </>
            )}

            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: TACTICAL_THEME.secondary },
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
    alignItems: 'center',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
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
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    gap: 8,
  },
  createButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  createContainer: {
    padding: 16,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  createActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: 'bold',
  },
})
