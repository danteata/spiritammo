import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native'
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { BlurView } from 'expo-blur';
import { Collection, CollectionChapter } from '@/types/scripture'
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'

interface CollectionChapterDropdownProps {
  collection: Collection | null
  selectedChapterIds: string[]
  onSelectChapters: (chapterIds: string[]) => void
}

export default function CollectionChapterDropdown({
  collection,
  selectedChapterIds,
  onSelectChapters,
}: CollectionChapterDropdownProps) {
  const { isDark, theme } = useAppStore()
  const styles = getStyles(theme)
  const [modalVisible, setModalVisible] = useState(false)
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedChapterIds)

  // Update tempSelectedIds when selectedChapterIds changes externally
  React.useEffect(() => {
    setTempSelectedIds(selectedChapterIds)
  }, [selectedChapterIds])

  if (!collection?.isChapterBased || !collection.chapters || collection.chapters.length === 0) {
    return null
  }

  const chapters = collection.chapters

  const handleToggleChapter = (chapterId: string) => {
    setTempSelectedIds(prev => {
      if (prev.includes(chapterId)) {
        return prev.filter(id => id !== chapterId)
      } else {
        return [...prev, chapterId]
      }
    })
  }

  const handleSelectAll = () => {
    setTempSelectedIds(chapters.map(ch => ch.id))
  }

  const handleClearAll = () => {
    setTempSelectedIds([])
  }

  const handleApply = () => {
    onSelectChapters(tempSelectedIds)
    setModalVisible(false)
  }

  const getDisplayText = () => {
    if (selectedChapterIds.length === 0) {
      return 'No chapters selected'
    }
    if (selectedChapterIds.length === chapters.length) {
      return 'All Chapters'
    }
    return `${selectedChapterIds.length} Chapter${selectedChapterIds.length !== 1 ? 's' : ''} Selected`
  }

  const getVerseCount = () => {
    if (selectedChapterIds.length === 0) {
      return 0
    }
    const selectedChapters = chapters.filter(ch => selectedChapterIds.includes(ch.id))
    return selectedChapters.reduce((total, ch) => total + ch.scriptures.length, 0)
  }

  const renderChapterItem = ({ item }: { item: CollectionChapter }) => {
    const isSelected = tempSelectedIds.includes(item.id)

    return (
      <TouchableOpacity
        style={[
          styles.chapterItem,
          isSelected && { 
            backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.1)',
            borderColor: theme.accent 
          }
        ]}
        onPress={() => handleToggleChapter(item.id)}
      >
        <View style={styles.chapterContent}>
          <View style={styles.chapterHeader}>
            <FontAwesome
              name={isSelected ? "check-square-o" : "square-o"}
              size={18}
              color={isSelected ? theme.accent : theme.textSecondary}
            />
            <View style={styles.chapterInfo}>
              <Text style={[styles.chapterName, MILITARY_TYPOGRAPHY.body, { color: theme.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.chapterMeta, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                {item.scriptures.length} verses
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const backgroundColor = theme.surface
  const textColor = theme.text
  const borderColor = theme.border

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.selector, { backgroundColor, borderColor }]}
        onPress={() => setModalVisible(true)}
        testID="chapter-selector-button"
      >
        <View style={styles.selectorContent}>
          <FontAwesome name="list" size={18} color={theme.accent} />
          <View style={styles.selectorTextContainer}>
            <Text
              style={[
                styles.selectorText,
                MILITARY_TYPOGRAPHY.body,
                { color: textColor },
              ]}
            >
              {getDisplayText()}
            </Text>
            {selectedChapterIds.length > 0 && (
              <Text
                style={[
                  styles.selectorSubtext,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: theme.textSecondary },
                ]}
              >
                {getVerseCount()} verses loaded
              </Text>
            )}
          </View>
        </View>
        <FontAwesome name="chevron-down" size={16} color={textColor} />
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
                SELECT CHAPTERS
              </Text>
              <Text
                style={[
                  styles.modalSubtitle,
                  MILITARY_TYPOGRAPHY.caption,
                  { color: theme.textSecondary },
                ]}
              >
                {collection.name}
              </Text>
            </View>

            {/* Selection controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={handleSelectAll}
              >
                <Text style={[styles.controlButtonText, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>
                  SELECT ALL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.controlButton, { borderColor: theme.border }]}
                onPress={handleClearAll}
              >
                <Text style={[styles.controlButtonText, MILITARY_TYPOGRAPHY.caption, { color: theme.text }]}>
                  CLEAR
                </Text>
              </TouchableOpacity>
            </View>

            {/* Chapter list */}
            <FlatList
              data={chapters}
              renderItem={renderChapterItem}
              keyExtractor={(item) => item.id}
              style={styles.chapterList}
              showsVerticalScrollIndicator={false}
            />

            {/* Selection summary and apply button */}
            <View style={styles.footer}>
              <Text style={[styles.selectionSummary, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                {tempSelectedIds.length} of {chapters.length} chapters selected
              </Text>
              <View style={styles.footerButtons}>
                <TouchableOpacity
                  style={[styles.footerButton, { borderColor: theme.border }]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={[styles.footerButtonText, { color: theme.textSecondary }]}>
                    CANCEL
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.footerButton, styles.applyButton, { backgroundColor: theme.accent }]}
                  onPress={handleApply}
                >
                  <Text style={[styles.footerButtonText, { color: theme.text }]}>
                    APPLY
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  selectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontWeight: '600',
    fontSize: 14,
  },
  selectorSubtext: {
    marginTop: 2,
    opacity: 0.8,
    fontSize: 11,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
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
    marginBottom: 16,
  },
  modalTitle: {
    marginBottom: 4,
  },
  modalSubtitle: {
    opacity: 0.8,
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  controlButtonText: {
    fontWeight: '600',
  },
  chapterList: {
    maxHeight: 350,
  },
  chapterItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chapterContent: {
    flex: 1,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    fontWeight: '500',
    fontSize: 14,
  },
  chapterMeta: {
    marginTop: 2,
    fontSize: 11,
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  selectionSummary: {
    textAlign: 'center',
    marginBottom: 12,
  },
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  applyButton: {
    borderColor: 'transparent',
  },
  footerButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
})