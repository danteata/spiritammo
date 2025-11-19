import React, { useState } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome } from '@expo/vector-icons';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection, CollectionChapter } from '@/types/scripture'
import { CollectionChapterService } from '@/services/collectionChapters'

interface CollectionChapterViewProps {
  collection: Collection
  onChapterSelect: (chapterId: string) => void
  onCollectionUpdate?: (updatedCollection: Collection) => void
  selectedChapterId?: string
  showProgress?: boolean
}

export default function CollectionChapterView({
  collection,
  onChapterSelect,
  onCollectionUpdate,
  selectedChapterId,
  showProgress = true,
}: CollectionChapterViewProps) {
  const [showChapterManager, setShowChapterManager] = useState(false)

  if (!collection.isChapterBased || !collection.chapters) {
    return null
  }

  const stats = CollectionChapterService.getChapterStats(collection)

  const getChapterStatusColor = (chapter: CollectionChapter) => {
    if (chapter.isCompleted) return TACTICAL_THEME.success
    if (chapter.averageAccuracy && chapter.averageAccuracy >= 80)
      return TACTICAL_THEME.warning
    if (chapter.lastPracticed) return TACTICAL_THEME.accent
    return TACTICAL_THEME.textSecondary
  }

  const getChapterStatusIcon = (chapter: CollectionChapter) => {
    if (chapter.isCompleted) {
      return <FontAwesome name="check-circle" size={16} color={TACTICAL_THEME.success} />
    }
    if (chapter.averageAccuracy && chapter.averageAccuracy >= 80) {
      return <FontAwesome name="bullseye" size={16} color={TACTICAL_THEME.warning} />
    }
    return <FontAwesome name="circle-o" size={16} color={TACTICAL_THEME.textSecondary} />
  }

  const handleDeleteChapter = (chapterId: string) => {
    Alert.alert(
      'Delete Chapter',
      'Are you sure you want to remove this chapter from the collection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedCollection = CollectionChapterService.removeChapter(
              collection,
              chapterId
            )
            onCollectionUpdate?.(updatedCollection)
          },
        },
      ]
    )
  }

  const renderChapterCard = (chapter: CollectionChapter) => (
    <TouchableOpacity
      key={chapter.id}
      style={[
        styles.chapterCard,
        selectedChapterId === chapter.id && styles.selectedChapter,
      ]}
      onPress={() => onChapterSelect(chapter.id)}
    >
      <View style={styles.chapterHeader}>
        <View style={styles.chapterInfo}>
          <View style={styles.chapterTitle}>
            {getChapterStatusIcon(chapter)}
            <Text style={[styles.chapterName, MILITARY_TYPOGRAPHY.body]}>
              {chapter.name || `Chapter ${chapter.chapterNumber}`}
            </Text>
          </View>

          {chapter.isCustomSection && (
            <View style={styles.customBadge}>
              <Text
                style={[styles.customBadgeText, MILITARY_TYPOGRAPHY.caption]}
              >
                CUSTOM
              </Text>
            </View>
          )}
        </View>

        <View style={styles.chapterStats}>
          <Text style={[styles.verseCount, MILITARY_TYPOGRAPHY.caption]}>
            {chapter.scriptures.length} verses
          </Text>

          {chapter.averageAccuracy && (
            <Text
              style={[
                styles.accuracy,
                MILITARY_TYPOGRAPHY.caption,
                { color: getChapterStatusColor(chapter) },
              ]}
            >
              {chapter.averageAccuracy.toFixed(1)}%
            </Text>
          )}
        </View>
      </View>

      {chapter.description && (
        <Text style={[styles.chapterDescription, MILITARY_TYPOGRAPHY.caption]}>
          {chapter.description}
        </Text>
      )}

      <View style={styles.chapterFooter}>
        {chapter.lastPracticed && (
          <View style={styles.lastPracticed}>
            <FontAwesome name="calendar" size={12} color={TACTICAL_THEME.textSecondary} />
            <Text
              style={[styles.lastPracticedText, MILITARY_TYPOGRAPHY.caption]}
            >
              Last: {new Date(chapter.lastPracticed).toLocaleDateString()}
            </Text>
          </View>
        )}

        {chapter.sectionRange && (
          <Text style={[styles.sectionRange, MILITARY_TYPOGRAPHY.caption]}>
            Range: {chapter.sectionRange}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header with progress */}
      {showProgress && (
        <View style={styles.progressHeader}>
          <View style={styles.progressInfo}>
            <Text
              style={[styles.progressTitle, MILITARY_TYPOGRAPHY.subheading]}
            >
              CHAPTER PROGRESS
            </Text>
            <Text style={[styles.progressStats, MILITARY_TYPOGRAPHY.caption]}>
              {stats.completedChapters}/{stats.totalChapters} completed •{' '}
              {stats.averageAccuracy.toFixed(1)}% avg
            </Text>
          </View>

          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => setShowChapterManager(true)}
          >
            <FontAwesome name="cog" size={16} color={TACTICAL_THEME.text} />
          </TouchableOpacity>
        </View>
      )}

      {/* Progress bar */}
      {showProgress && (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${stats.progressPercentage}%` },
              ]}
            />
          </View>
          <Text
            style={[styles.progressPercentage, MILITARY_TYPOGRAPHY.caption]}
          >
            {stats.progressPercentage.toFixed(0)}%
          </Text>
        </View>
      )}

      {/* Chapter list */}
      <ScrollView
        style={styles.chapterList}
        showsVerticalScrollIndicator={false}
      >
        {collection.chapters.map(renderChapterCard)}
      </ScrollView>

      {/* Chapter Manager Modal */}
      <Modal
        visible={showChapterManager}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <LinearGradient
          colors={[TACTICAL_THEME.background, '#0D0D0D']}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, MILITARY_TYPOGRAPHY.heading]}>
              CHAPTER MANAGEMENT
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowChapterManager(false)}
            >
              <FontAwesome name="close" size={24} color={TACTICAL_THEME.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.managerSection}>
              <Text
                style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}
              >
                COLLECTION OVERVIEW
              </Text>

              <View style={styles.overviewCard}>
                <View style={styles.overviewRow}>
                  <Text
                    style={[styles.overviewLabel, MILITARY_TYPOGRAPHY.body]}
                  >
                    Source Book:
                  </Text>
                  <Text
                    style={[styles.overviewValue, MILITARY_TYPOGRAPHY.body]}
                  >
                    {collection.sourceBook || 'Mixed Sources'}
                  </Text>
                </View>

                <View style={styles.overviewRow}>
                  <Text
                    style={[styles.overviewLabel, MILITARY_TYPOGRAPHY.body]}
                  >
                    Total Chapters:
                  </Text>
                  <Text
                    style={[styles.overviewValue, MILITARY_TYPOGRAPHY.body]}
                  >
                    {stats.totalChapters}
                  </Text>
                </View>

                <View style={styles.overviewRow}>
                  <Text
                    style={[styles.overviewLabel, MILITARY_TYPOGRAPHY.body]}
                  >
                    Progress:
                  </Text>
                  <Text
                    style={[styles.overviewValue, MILITARY_TYPOGRAPHY.body]}
                  >
                    {stats.progressPercentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.managerSection}>
              <View style={styles.sectionHeader}>
                <Text
                  style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}
                >
                  CHAPTERS
                </Text>
                <TouchableOpacity style={styles.addButton}>
                  <FontAwesome name="plus" size={16} color={TACTICAL_THEME.text} />
                  <Text
                    style={[styles.addButtonText, MILITARY_TYPOGRAPHY.caption]}
                  >
                    ADD SECTION
                  </Text>
                </TouchableOpacity>
              </View>

              {collection.chapters.map((chapter) => (
                <View key={chapter.id} style={styles.managerChapterCard}>
                  <View style={styles.managerChapterHeader}>
                    <View style={styles.managerChapterInfo}>
                      {getChapterStatusIcon(chapter)}
                      <View style={styles.managerChapterDetails}>
                        <Text
                          style={[
                            styles.managerChapterName,
                            MILITARY_TYPOGRAPHY.body,
                          ]}
                        >
                          {chapter.name}
                        </Text>
                        {chapter.description && (
                          <Text
                            style={[
                              styles.managerChapterDesc,
                              MILITARY_TYPOGRAPHY.caption,
                            ]}
                          >
                            {chapter.description}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.managerChapterActions}>
                      <Text
                        style={[
                          styles.managerChapterStats,
                          MILITARY_TYPOGRAPHY.caption,
                        ]}
                      >
                        {chapter.scriptures.length}v
                      </Text>
                      {chapter.averageAccuracy && (
                        <Text
                          style={[
                            styles.managerChapterAccuracy,
                            MILITARY_TYPOGRAPHY.caption,
                            { color: getChapterStatusColor(chapter) },
                          ]}
                        >
                          {chapter.averageAccuracy.toFixed(0)}%
                        </Text>
                      )}

                      <View style={styles.chapterActionButtons}>
                        <TouchableOpacity style={styles.actionButton}>
                          <FontAwesome name="edit" size={14} color={TACTICAL_THEME.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => handleDeleteChapter(chapter.id)}
                        >
                          <FontAwesome name="trash" size={14} color={TACTICAL_THEME.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </LinearGradient>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 4,
  },
  progressStats: {
    color: TACTICAL_THEME.textSecondary,
  },
  manageButton: {
    padding: 8,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 6,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: TACTICAL_THEME.accent,
    borderRadius: 3,
  },
  progressPercentage: {
    color: TACTICAL_THEME.textSecondary,
    minWidth: 35,
  },
  chapterList: {
    maxHeight: 300,
  },
  chapterCard: {
    backgroundColor: TACTICAL_THEME.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  selectedChapter: {
    borderColor: TACTICAL_THEME.accent,
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
  },
  chapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  chapterName: {
    color: TACTICAL_THEME.text,
    flex: 1,
  },
  customBadge: {
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  customBadgeText: {
    color: TACTICAL_THEME.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  chapterStats: {
    alignItems: 'flex-end',
  },
  verseCount: {
    color: TACTICAL_THEME.textSecondary,
    marginBottom: 2,
  },
  accuracy: {
    fontWeight: 'bold',
  },
  chapterDescription: {
    color: TACTICAL_THEME.textSecondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  chapterFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastPracticed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lastPracticedText: {
    color: TACTICAL_THEME.textSecondary,
  },
  sectionRange: {
    color: TACTICAL_THEME.textSecondary,
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalTitle: {
    color: TACTICAL_THEME.text,
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  managerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  overviewCard: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 16,
  },
  overviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  overviewLabel: {
    color: TACTICAL_THEME.textSecondary,
  },
  overviewValue: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  managerChapterCard: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  managerChapterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  managerChapterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  managerChapterDetails: {
    flex: 1,
  },
  managerChapterName: {
    color: TACTICAL_THEME.text,
    marginBottom: 2,
  },
  managerChapterDesc: {
    color: TACTICAL_THEME.textSecondary,
  },
  managerChapterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  managerChapterStats: {
    color: TACTICAL_THEME.textSecondary,
  },
  managerChapterAccuracy: {
    fontWeight: 'bold',
  },
  chapterActionButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  actionButton: {
    padding: 6,
    borderRadius: 4,
    backgroundColor: TACTICAL_THEME.border,
  },
})
