import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  FlatList,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather } from '@expo/vector-icons';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection, CollectionChapter } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

interface CollectionChapterSelectorProps {
  collection: Collection
  isVisible: boolean
  onClose: () => void
  onStartPractice: (selectedChapterIds: string[]) => void
}

export default function CollectionChapterSelector({
  collection,
  isVisible,
  onClose,
  onStartPractice,
}: CollectionChapterSelectorProps) {
  const { theme } = useAppStore()
  const styles = getStyles(theme)
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])

  const chapters = collection.chapters || []

  const toggleChapter = (chapterId: string) => {
    setSelectedChapterIds((prev) =>
      prev.includes(chapterId)
        ? prev.filter((id) => id !== chapterId)
        : [...prev, chapterId]
    )
  }

  const selectAll = () => {
    setSelectedChapterIds(chapters.map((ch) => ch.id))
  }

  const clearAll = () => {
    setSelectedChapterIds([])
  }

  const handleStartPractice = () => {
    if (selectedChapterIds.length === 0) {
      Alert.alert(
        'No Chapters Selected',
        'Please select at least one chapter to practice.'
      )
      return
    }
    onStartPractice(selectedChapterIds)
    onClose()
  }

  const renderChapterItem = ({ item }: { item: CollectionChapter }) => {
    const isSelected = selectedChapterIds.includes(item.id)

    return (
      <TouchableOpacity
        style={[styles.chapterItem, isSelected && styles.selectedChapterItem]}
        onPress={() => toggleChapter(item.id)}
      >
        <View style={styles.chapterContent}>
          <View style={styles.chapterHeader}>
            <View style={styles.chapterInfo}>
              <Feather name="layers" size={16} color={theme.accent} />
              <Text style={[styles.chapterName, MILITARY_TYPOGRAPHY.body]}>
                {item.name}
              </Text>
            </View>

            <View style={styles.selectionIndicator}>
              {isSelected ? (
                <FontAwesome name="check-square-o" size={20} color={theme.accent} />
              ) : (
                <FontAwesome name="square-o" size={20} color={theme.textSecondary} />
              )}
            </View>
          </View>

          <View style={styles.chapterMeta}>
            <Text style={[styles.chapterStats, MILITARY_TYPOGRAPHY.caption]}>
              {item.scriptures.length} rounds
            </Text>

            {item.averageAccuracy && (
              <Text
                style={[styles.chapterAccuracy, MILITARY_TYPOGRAPHY.caption]}
              >
                {item.averageAccuracy.toFixed(0)}% accuracy
              </Text>
            )}

            <View
              style={[
                styles.completionStatus,
                {
                  backgroundColor: item.isCompleted
                    ? theme.success
                    : theme.border,
                },
              ]}
            />
          </View>

          {item.description && (
            <Text
              style={[styles.chapterDescription, MILITARY_TYPOGRAPHY.caption]}
            >
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  const selectedCount = selectedChapterIds.length
  const totalRounds = chapters
    .filter((ch) => selectedChapterIds.includes(ch.id))
    .reduce((sum, ch) => sum + ch.scriptures.length, 0)

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={['#1a2f0a', '#2D5016', '#0f1a05']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <FontAwesome name="bullseye" size={24} color={theme.accent} />
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                SELECT CHAPTERS
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, MILITARY_TYPOGRAPHY.body]}>
            {collection.abbreviation || collection.name}
          </Text>
        </View>

        {/* Selection Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.controlButton} onPress={selectAll}>
            <Text
              style={[styles.controlButtonText, MILITARY_TYPOGRAPHY.button]}
            >
              SELECT ALL
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={clearAll}>
            <Text
              style={[styles.controlButtonText, MILITARY_TYPOGRAPHY.button]}
            >
              CLEAR ALL
            </Text>
          </TouchableOpacity>
        </View>

        {/* Chapter List */}
        <FlatList
          data={chapters}
          renderItem={renderChapterItem}
          keyExtractor={(item) => item.id}
          style={styles.chapterList}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        {/* Selection Summary & Action */}
        <View style={styles.footer}>
          <View style={styles.selectionSummary}>
            <Text style={[styles.summaryText, MILITARY_TYPOGRAPHY.body]}>
              {selectedCount} chapter{selectedCount !== 1 ? 's' : ''} selected
            </Text>
            {totalRounds > 0 && (
              <Text style={[styles.roundsText, MILITARY_TYPOGRAPHY.caption]}>
                {totalRounds} total rounds
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              selectedCount === 0 && styles.disabledButton,
            ]}
            onPress={handleStartPractice}
            disabled={selectedCount === 0}
          >
            <FontAwesome name="play" size={20} color={theme.text} />
            <Text style={[styles.startButtonText, MILITARY_TYPOGRAPHY.button]}>
              START PRACTICE
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  title: {
    color: theme.text,
    flex: 1,
  },
  subtitle: {
    color: theme.textSecondary,
  },
  closeButton: {
    padding: 8,
    backgroundColor: theme.border,
    borderRadius: 6,
  },
  controls: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  controlButton: {
    flex: 1,
    backgroundColor: theme.surface,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  controlButtonText: {
    color: theme.text,
    fontWeight: 'bold',
  },
  chapterList: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  chapterItem: {
    backgroundColor: theme.surface,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedChapterItem: {
    borderColor: theme.accent,
    backgroundColor: 'rgba(255, 165, 0, 0.1)',
  },
  chapterContent: {
    padding: 16,
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chapterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  chapterName: {
    color: theme.text,
    fontWeight: '600',
  },
  selectionIndicator: {
    padding: 4,
  },
  chapterMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  chapterStats: {
    color: theme.textSecondary,
  },
  chapterAccuracy: {
    color: theme.accent,
  },
  completionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 'auto',
  },
  chapterDescription: {
    color: theme.textSecondary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  selectionSummary: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryText: {
    color: theme.text,
    marginBottom: 4,
  },
  roundsText: {
    color: theme.textSecondary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.accent,
    paddingVertical: 16,
    borderRadius: 8,
    gap: 8,
  },
  disabledButton: {
    backgroundColor: theme.border,
    opacity: 0.5,
  },
  startButtonText: {
    color: theme.text,
    fontWeight: 'bold',
  },
})
