import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Dimensions,
  SafeAreaView,
  Platform,
  StatusBar,
  Vibration,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router'
import { TACTICAL_THEME, MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection, Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import AddVersesModal from './AddVersesModal'

const { width } = Dimensions.get('window')

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
  const router = useRouter()
  const {
    getScripturesByCollection,
    updateCollection,
    removeScriptureFromCollection,
    bulkRemoveScripturesFromCollection,
    deleteCollection,
  } = useAppStore()

  const [isBulkSelecting, setIsBulkSelecting] = useState(false)
  const [selectedScriptureIds, setSelectedScriptureIds] = useState<Set<string>>(new Set())
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editedName, setEditedName] = useState(collection.name)
  const [editedDescription, setEditedDescription] = useState(collection.description || '')
  const [localScriptures, setLocalScriptures] = useState<Scripture[]>([])
  const [showAddVersesModal, setShowAddVersesModal] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setEditedName(collection.name)
      setEditedDescription(collection.description || '')
      setLocalScriptures(getScripturesByCollection(collection.id))
      setIsEditingInfo(false)
      setIsBulkSelecting(false)
      setSelectedScriptureIds(new Set())
    }
  }, [isVisible, collection])

  // Refresh scriptures when collection updates
  useEffect(() => {
    if (isVisible) {
      setLocalScriptures(getScripturesByCollection(collection.id))
    }
  }, [collection.scriptures, isVisible])

  const handleSaveInfo = async () => {
    if (!editedName.trim()) {
      Alert.alert('Error', 'Arsenal name cannot be empty')
      return
    }

    const success = await updateCollection({
      ...collection,
      name: editedName.trim(),
      description: editedDescription.trim()
    })

    if (success) {
      setIsEditingInfo(false)
    } else {
      Alert.alert('Error', 'Failed to update arsenal')
    }
  }

  const handleCancelEdit = () => {
    setEditedName(collection.name)
    setEditedDescription(collection.description || '')
    setIsEditingInfo(false)
  }

  const handleRemoveScripture = async (scriptureId: string) => {
    Alert.alert(
      'Remove Round',
      'Are you sure you want to remove this round from the arsenal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const success = await removeScriptureFromCollection(collection.id, scriptureId)
            if (success) {
              // Immediately update local state to reflect the deletion
              setLocalScriptures(prev => prev.filter(s => s.id !== scriptureId))
              Alert.alert('Success', 'Round removed from arsenal')
            } else {
              Alert.alert('Error', 'Failed to remove round')
            }
          }
        }
      ]
    )
  }

  const toggleScriptureSelection = (scriptureId: string) => {
    const newSelection = new Set(selectedScriptureIds)
    if (newSelection.has(scriptureId)) {
      newSelection.delete(scriptureId)
    } else {
      newSelection.add(scriptureId)
    }
    setSelectedScriptureIds(newSelection)
  }

  const handleSelectAll = () => {
    if (selectedScriptureIds.size === localScriptures.length) {
      // Deselect all
      setSelectedScriptureIds(new Set())
    } else {
      // Select all
      const allIds = new Set(localScriptures.map(s => s.id))
      setSelectedScriptureIds(allIds)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedScriptureIds.size === 0) return

    Alert.alert(
      'Remove Rounds',
      `Are you sure you want to remove ${selectedScriptureIds.size} rounds from the arsenal?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selectedScriptureIds)
            const success = await bulkRemoveScripturesFromCollection(collection.id, ids)
            if (success) {
              // Immediately update local state to reflect the deletions
              setLocalScriptures(prev => prev.filter(s => !ids.includes(s.id)))
              setIsBulkSelecting(false)
              setSelectedScriptureIds(new Set())
              Alert.alert('Success', `Removed ${ids.length} round${ids.length !== 1 ? 's' : ''} from arsenal`)
            } else {
              Alert.alert('Error', 'Failed to remove rounds')
            }
          }
        }
      ]
    )
  }

  const handleDeleteCollection = () => {
    Alert.alert(
      'Delete Arsenal',
      `Are you sure you want to permanently delete "${collection.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteCollection(collection.id)
            if (success) {
              onClose()
            } else {
              Alert.alert('Error', 'Failed to delete arsenal')
            }
          }
        }
      ]
    )
  }

  const handleGoToTraining = () => {
    onClose()
    router.push({
      pathname: '/(tabs)/training',
      params: { collectionId: collection.id }
    })
  }

  const handleVersesAdded = () => {
    // Immediately refresh the local scriptures when verses are added
    setLocalScriptures(getScripturesByCollection(collection.id))
  }

  const renderScriptureItem = ({ item }: { item: Scripture }) => {
    const isSelected = selectedScriptureIds.has(item.id)

    return (
      <TouchableOpacity
        style={[
          styles.scriptureItem,
          isBulkSelecting && isSelected && styles.scriptureItemSelected
        ]}
        onPress={() => {
          if (isBulkSelecting) {
            toggleScriptureSelection(item.id)
          }
        }}
        onLongPress={() => {
          if (!isBulkSelecting && !isEditingInfo) {
            setIsBulkSelecting(true)
            toggleScriptureSelection(item.id)
            Vibration.vibrate(50)
          }
        }}
        activeOpacity={isBulkSelecting ? 0.7 : 1}
      >
        {isBulkSelecting ? (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <MaterialCommunityIcons name="check" size={16} color="#000" />}
          </View>
        ) : (
          <View style={styles.scriptureIcon}>
            <MaterialCommunityIcons name="bullet" size={16} color={TACTICAL_THEME.accent} />
          </View>
        )}

        <View style={styles.scriptureInfo}>
          <Text style={styles.scriptureRef}>{item.reference}</Text>
          <Text style={styles.scriptureText} numberOfLines={2}>{item.text}</Text>
        </View>

        {!isBulkSelecting && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveScripture(item.id)}
          >
            <MaterialCommunityIcons name="close-circle-outline" size={20} color={TACTICAL_THEME.error || '#FF4444'} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
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
        colors={['#0a1505', '#1a2f0a', '#0f1a05']}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              {!isBulkSelecting && !isEditingInfo && (
                <View style={styles.iconBadge}>
                  <MaterialCommunityIcons name="briefcase-variant" size={24} color={TACTICAL_THEME.accent} />
                </View>
              )}
              {isEditingInfo ? (
                <TextInput
                  style={[styles.titleInput, MILITARY_TYPOGRAPHY.heading]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Arsenal Name"
                  placeholderTextColor="#666"
                />
              ) : isBulkSelecting ? (
                <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]} numberOfLines={1}>
                  {selectedScriptureIds.size} Selected
                </Text>
              ) : (
                <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading]} numberOfLines={1}>
                  {collection.abbreviation
                    ? `${collection.abbreviation} - ${collection.name}`
                    : collection.name}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {isEditingInfo ? (
                <>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.saveButton} onPress={handleSaveInfo}>
                    <Text style={styles.saveButtonText}>SAVE</Text>
                  </TouchableOpacity>
                </>
              ) : isBulkSelecting ? (
                <>
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={handleSelectAll}
                  >
                    <MaterialCommunityIcons
                      name={selectedScriptureIds.size === localScriptures.length ? "checkbox-multiple-marked" : "checkbox-multiple-blank-outline"}
                      size={22}
                      color={TACTICAL_THEME.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: 'rgba(255, 68, 68, 0.3)' }]}
                    onPress={handleBulkDelete}
                    disabled={selectedScriptureIds.size === 0}
                  >
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color={selectedScriptureIds.size === 0 ? 'rgba(255, 255, 255, 0.3)' : (TACTICAL_THEME.error || '#FF4444')}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setIsBulkSelecting(false)
                      setSelectedScriptureIds(new Set())
                    }}
                  >
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity 
                    style={[styles.iconButton, { backgroundColor: 'rgba(255, 68, 68, 0.15)', borderColor: 'rgba(255, 68, 68, 0.3)' }]} 
                    onPress={handleDeleteCollection}
                  >
                    <MaterialCommunityIcons name="delete-outline" size={16} color={TACTICAL_THEME.error || '#FF4444'} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.selectButton} onPress={() => setIsBulkSelecting(true)}>
                    <Text style={styles.selectButtonText}>SELECT</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editButton} onPress={() => setIsEditingInfo(true)}>
                    <MaterialCommunityIcons name="pencil" size={16} color={TACTICAL_THEME.text} />
                  </TouchableOpacity>
                </>
              )}

              {!isEditingInfo && !isBulkSelecting && (
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <MaterialCommunityIcons name="close" size={20} color={TACTICAL_THEME.text} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isEditingInfo ? (
            <TextInput
              style={[styles.descriptionInput, MILITARY_TYPOGRAPHY.body]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Description (optional)"
              placeholderTextColor="#666"
              multiline
            />
          ) : collection.description && (
            <Text style={[styles.description, MILITARY_TYPOGRAPHY.body]}>
              {collection.description}
            </Text>
          )}
        </View>

        <View style={styles.content}>
          {isBulkSelecting ? (
            <View style={styles.editContent}>
              <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
                SELECT ROUNDS TO REMOVE
              </Text>

              <FlatList
                data={localScriptures}
                renderItem={renderScriptureItem}
                keyExtractor={item => item.id}
                style={styles.scriptureList}
                contentContainerStyle={{ paddingBottom: 40 }}
              />
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Verses List Section */}
              <View style={styles.versesSection}>
                <View style={styles.versesSectionHeader}>
                  <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
                    AMMUNITION ({localScriptures.length} ROUNDS)
                  </Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddVersesModal(true)}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color={TACTICAL_THEME.text} />
                  </TouchableOpacity>
                </View>

                {localScriptures.length > 0 ? (
                  <FlatList
                    data={localScriptures}
                    renderItem={renderScriptureItem}
                    keyExtractor={item => item.id}
                    scrollEnabled={false}
                    contentContainerStyle={{ paddingBottom: 16 }}
                  />
                ) : (
                  <View style={styles.emptyVerses}>
                    <MaterialCommunityIcons name="ammunition" size={48} color="rgba(255,255,255,0.2)" />
                    <Text style={styles.emptyVersesText}>No rounds in this arsenal</Text>
                  </View>
                )}
              </View>

              {/* Stats Section */}
              <View style={styles.statsSection}>
                <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading]}>
                  AMMUNITION STATS
                </Text>

                <View style={styles.statsGrid}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    style={styles.statCard}
                  >
                    <MaterialCommunityIcons name="ammunition" size={24} color={TACTICAL_THEME.accent} />
                    <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                      {localScriptures.length}
                    </Text>
                    <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                      ROUNDS
                    </Text>
                  </LinearGradient>

                  {collection.isChapterBased && collection.chapters && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                      style={styles.statCard}
                    >
                      <MaterialCommunityIcons name="book-open-variant" size={24} color={TACTICAL_THEME.accent} />
                      <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                        {collection.chapters.length}
                      </Text>
                      <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                        CHAPTERS
                      </Text>
                    </LinearGradient>
                  )}

                  {collection.bookInfo && (
                    <LinearGradient
                      colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                      style={styles.statCard}
                    >
                      <MaterialCommunityIcons name="crosshairs-gps" size={24} color={TACTICAL_THEME.success} />
                      <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading]}>
                        {collection.bookInfo.averageAccuracy?.toFixed(0) || '0'}%
                      </Text>
                      <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption]}>
                        ACCURACY
                      </Text>
                    </LinearGradient>
                  )}

                  <LinearGradient
                    colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                    style={styles.statCard}
                  >
                    <MaterialCommunityIcons name="calendar-month" size={24} color="#AAA" />
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
                  </LinearGradient>
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
                      <LinearGradient
                        key={index}
                        colors={[TACTICAL_THEME.accent, '#CC5529']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.tag}
                      >
                        <MaterialCommunityIcons name="tag-text-outline" size={12} color="black" />
                        <Text style={[styles.tagText, MILITARY_TYPOGRAPHY.caption]}>
                          {tag.toUpperCase()}
                        </Text>
                      </LinearGradient>
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
                      <LinearGradient
                        key={chapter.id}
                        colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.02)']}
                        style={styles.chapterItem}
                      >
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
                                : 'rgba(255,255,255,0.1)',
                              borderWidth: chapter.isCompleted ? 0 : 1,
                              borderColor: chapter.isCompleted ? 'transparent' : 'rgba(255,255,255,0.2)'
                            },
                          ]}
                        />
                      </LinearGradient>
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
          )}
        </View>

        {/* Training Range Button - Only show when not editing or selecting */}
        {!isEditingInfo && !isBulkSelecting && (
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleGoToTraining} activeOpacity={0.9}>
              <LinearGradient
                colors={[TACTICAL_THEME.accent, '#CC5529']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.trainingButton}
              >
                <View style={styles.trainingButtonContent}>
                  <MaterialCommunityIcons name="target" size={24} color="#000" />
                  <Text style={styles.trainingButtonText}>
                    ENTER TRAINING RANGE
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </LinearGradient>

      {/* Add Verses Modal - Reusing existing component */}
      <AddVersesModal
        isVisible={showAddVersesModal}
        onClose={() => setShowAddVersesModal(false)}
        preselectedCollection={collection}
        onVersesAdded={handleVersesAdded}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 8,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
  },
  title: {
    color: TACTICAL_THEME.text,
    flex: 1,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  titleInput: {
    color: TACTICAL_THEME.text,
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: TACTICAL_THEME.accent,
    paddingVertical: 4,
  },
  descriptionInput: {
    color: TACTICAL_THEME.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 4,
    minHeight: 40,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  editButtonText: {
    color: TACTICAL_THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: TACTICAL_THEME.accent,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  cancelButtonText: {
    color: TACTICAL_THEME.text,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
    color: TACTICAL_THEME.textSecondary,
    lineHeight: 22,
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  editContent: {
    flex: 1,
  },
  manageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
  },
  selectButtonText: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteSelectedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: TACTICAL_THEME.error || '#FF4444',
    borderRadius: 6,
  },
  deleteSelectedButtonDisabled: {
    backgroundColor: 'rgba(255, 68, 68, 0.3)',
  },
  deleteSelectedButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scriptureList: {
    flex: 1,
  },
  scriptureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  scriptureItemSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: TACTICAL_THEME.accent,
  },
  scriptureIcon: {
    marginRight: 12,
    opacity: 0.7,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.textSecondary,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: TACTICAL_THEME.accent,
    borderColor: TACTICAL_THEME.accent,
  },
  scriptureInfo: {
    flex: 1,
  },
  scriptureRef: {
    color: TACTICAL_THEME.accent,
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  scriptureText: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 13,
  },
  removeButton: {
    padding: 8,
    marginLeft: 8,
  },
  statsSection: {
    marginBottom: 24,
  },
  versesSection: {
    marginBottom: 24,
  },
  versesSectionHeader: {
    marginBottom: 16,
  },
  emptyVerses: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyVersesText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
    color: TACTICAL_THEME.text,
    marginBottom: 16,
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '700',
    opacity: 0.8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statValue: {
    color: TACTICAL_THEME.text,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 24,
  },
  statLabel: {
    color: TACTICAL_THEME.textSecondary,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  tagText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 11,
    letterSpacing: 0.5,
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
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterName: {
    color: TACTICAL_THEME.text,
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 15,
  },
  chapterStats: {
    color: TACTICAL_THEME.textSecondary,
    fontSize: 12,
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
    fontSize: 12,
  },
  trainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    shadowColor: TACTICAL_THEME.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  trainingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
  },
  footer: {
    padding: 20,
    paddingTop: 0,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TACTICAL_THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
