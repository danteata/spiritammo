import React, { useEffect, useState } from 'react'
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
import { BlurView } from 'expo-blur';
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection, CollectionChapter } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

interface CollectionChapterSelectorProps {
  collection: Collection
  isVisible: boolean
  onClose: () => void
  onStartPractice: (selectedChapterIds: string[]) => void
  initialSelectedChapterIds?: string[]
  actionLabel?: string
  title?: string
  subtitle?: string
  variant?: 'modal' | 'dropdown'
}

export default function CollectionChapterSelector({
  collection,
  isVisible,
  onClose,
  onStartPractice,
  initialSelectedChapterIds = [],
  actionLabel = 'APPLY SELECTION',
  title = 'SELECT CHAPTERS',
  subtitle,
  variant = 'modal',
}: CollectionChapterSelectorProps) {
  const { theme, gradients, isDark } = useAppStore()
  const styles = getStyles(theme, variant)
  const gradientColors = Array.isArray(gradients?.primary)
    ? gradients.primary
    : [theme.background, theme.surface]
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const accentContrast = theme.accentContrastText || theme.text

  const chapters = collection.chapters || []

  useEffect(() => {
    if (isVisible) {
      setSelectedChapterIds(initialSelectedChapterIds)
    }
  }, [isVisible, collection.id, initialSelectedChapterIds.join(',')])

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
      if (variant === 'modal') {
        Alert.alert(
          'No Chapters Selected',
          'Please select at least one chapter to practice.'
        )
      }
      return
    }
    onStartPractice(selectedChapterIds)
    if (variant === 'modal') {
      onClose()
    }
  }

  const handleApply = () => {
    if (selectedChapterIds.length === 0) {
      return
    }
    onStartPractice(selectedChapterIds)
    onClose()
  }

  const renderChapterItem = ({ item }: { item: CollectionChapter }) => {
    const isSelected = selectedChapterIds.includes(item.id)

    if (variant === 'dropdown') {
      return (
        <TouchableOpacity
          style={[
            styles.chapterItem,
            isSelected && { 
              backgroundColor: isDark ? `${theme.accent}20` : `${theme.accent}10`,
              borderColor: theme.accent 
            }
          ]}
          onPress={() => toggleChapter(item.id)}
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

  if (variant === 'dropdown') {
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

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={onClose}
          testID="chapter-selector-button"
        >
          <View style={styles.selectorContent}>
            <FontAwesome name="list" size={18} color={theme.accent} />
            <View style={styles.selectorTextContainer}>
              <Text
                style={[
                  styles.selectorText,
                  MILITARY_TYPOGRAPHY.body,
                  { color: theme.text },
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
          <FontAwesome name="chevron-down" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={gradientColors as any}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              <FontAwesome name="bullseye" size={24} color={theme.accent} />
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                {title}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, MILITARY_TYPOGRAPHY.body]}>
            {subtitle || collection.abbreviation || collection.name}
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
            <FontAwesome
              name="play"
              size={20}
              color={selectedCount === 0 ? theme.textSecondary : accentContrast}
            />
            <Text
              style={[
                styles.startButtonText,
                MILITARY_TYPOGRAPHY.button,
                { color: selectedCount === 0 ? theme.textSecondary : accentContrast },
              ]}
            >
              {actionLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const withAlpha = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return `rgba(255,255,255,${alpha})`
  const r = parseInt(normalized.slice(0, 2), 16)
  const g = parseInt(normalized.slice(2, 4), 16)
  const b = parseInt(normalized.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const getStyles = (theme: any, variant: 'modal' | 'dropdown' = 'modal') => StyleSheet.create({
  container: variant === 'dropdown' ? {
    marginTop: 12,
    paddingHorizontal: 16,
  } : {
    flex: 1,
  },
  selector: variant === 'dropdown' ? {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  } : {},
  selectorContent: variant === 'dropdown' ? {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  } : {},
  selectorTextContainer: variant === 'dropdown' ? {
    flex: 1,
  } : {},
  selectorText: variant === 'dropdown' ? {
    fontWeight: '600',
    fontSize: 14,
  } : {},
  selectorSubtext: variant === 'dropdown' ? {
    marginTop: 2,
    opacity: 0.8,
    fontSize: 11,
  } : {},
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
  chapterItem: variant === 'dropdown' ? {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    borderRadius: 8,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  } : {
    backgroundColor: theme.surface,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  selectedChapterItem: {
    borderColor: theme.accent,
    backgroundColor: withAlpha(theme.accent, 0.12),
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
    fontWeight: 'bold',
  },
})
