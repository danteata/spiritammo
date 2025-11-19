import React from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather } from '@expo/vector-icons';
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'

interface CollectionDetailModalProps {
  collection: Collection
  isVisible: boolean
  onClose: () => void
}

export default function CollectionDetailModal({
  collection,
  isVisible,
  onClose,
}: CollectionDetailModalProps) {
  const { getScripturesByCollection } = useAppStore()
  const scriptures = getScripturesByCollection(collection.id)

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
              <FontAwesome name="book" size={24} color={TACTICAL_THEME.accent} />
              <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]}>
                {collection.abbreviation
                  ? `${collection.abbreviation} - ${collection.name}`
                  : collection.name}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <FontAwesome name="close" size={24} color={TACTICAL_THEME.text} />
            </TouchableOpacity>
          </View>

          {collection.description && (
            <Text style={[styles.description, MILITARY_TYPOGRAPHY.body]}>
              {collection.description}
            </Text>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
              AMMUNITION STATS
            </Text>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <FontAwesome name="bullseye" size={20} color={TACTICAL_THEME.accent} />
                <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                  {scriptures.length}
                </Text>
                <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                  ROUNDS
                </Text>
              </View>

              {collection.isChapterBased && collection.chapters && (
                <View style={styles.statCard}>
                  <Feather name="layers" size={20} color={TACTICAL_THEME.accent} />
                  <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                    {collection.chapters.length}
                  </Text>
                  <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                    CHAPTERS
                  </Text>
                </View>
              )}

              {collection.bookInfo && (
                <View style={styles.statCard}>
                  <FontAwesome name="bar-chart" size={20} color={TACTICAL_THEME.accent} />
                  <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                    {collection.bookInfo.averageAccuracy?.toFixed(0) || '0'}%
                  </Text>
                  <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                    ACCURACY
                  </Text>
                </View>
              )}

              <View style={styles.statCard}>
                <FontAwesome name="calendar" size={20} color={TACTICAL_THEME.accent} />
                <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                  {new Date(
                    collection.createdAt || Date.now()
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                  CREATED
                </Text>
              </View>
            </View>
          </View>

          {/* Tags Section */}
          {collection.tags && collection.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text
                style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}
              >
                MISSION TAGS
              </Text>
              <View style={styles.tagsContainer}>
                {collection.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <FontAwesome name="tag" size={12} color={TACTICAL_THEME.text} />
                    <Text style={[styles.tagText, MILITARY_TYPOGRAPHY.caption]}>
                      {tag.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Chapter Progress Section */}
          {collection.isChapterBased && collection.chapters && (
            <View style={styles.chaptersSection}>
              <Text
                style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}
              >
                CHAPTER PROGRESS
              </Text>

              <View style={styles.chaptersList}>
                {collection.chapters.slice(0, 5).map((chapter) => (
                  <View key={chapter.id} style={styles.chapterItem}>
                    <View style={styles.chapterInfo}>
                      <Text
                        style={[styles.chapterName, MILITARY_TYPOGRAPHY.body]}
                      >
                        {chapter.name}
                      </Text>
                      <Text
                        style={[
                          styles.chapterStats,
                          MILITARY_TYPOGRAPHY.caption,
                        ]}
                      >
                        {chapter.scriptures.length} verses
                        {chapter.averageAccuracy &&
                          ` • ${chapter.averageAccuracy.toFixed(0)}%`}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.chapterStatus,
                        {
                          backgroundColor: chapter.isCompleted
                            ? TACTICAL_THEME.success
                            : TACTICAL_THEME.border,
                        },
                      ]}
                    />
                  </View>
                ))}

                {collection.chapters.length > 5 && (
                  <Text
                    style={[styles.moreChapters, MILITARY_TYPOGRAPHY.caption]}
                  >
                    +{collection.chapters.length - 5} more chapters
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Training Range Note */}
        <View style={styles.trainingNote}>
          <FontAwesome name="bullseye" size={20} color={TACTICAL_THEME.accent} />
          <Text style={[styles.trainingNoteText, MILITARY_TYPOGRAPHY.body]}>
            Visit the{' '}
            <Text style={styles.trainingRangeText}>Training Range</Text> to
            practice with this collection
          </Text>
        </View>
      </LinearGradient>
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    color: TACTICAL_THEME.text,
    flex: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: TACTICAL_THEME.border,
    borderRadius: 6,
  },
  description: {
    color: TACTICAL_THEME.textSecondary,
    lineHeight: 22,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
  },
  statValue: {
    color: TACTICAL_THEME.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: TACTICAL_THEME.text,
    fontWeight: 'bold',
  },
  chaptersSection: {
    marginBottom: 24,
  },
  chaptersList: {
    gap: 12,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 12,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    color: TACTICAL_THEME.text,
    marginBottom: 4,
  },
  chapterStats: {
    color: TACTICAL_THEME.textSecondary,
  },
  chapterStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moreChapters: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  trainingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TACTICAL_THEME.surface,
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
    gap: 12,
  },
  trainingNoteText: {
    color: TACTICAL_THEME.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  trainingRangeText: {
    color: TACTICAL_THEME.accent,
    fontWeight: 'bold',
  },
})
