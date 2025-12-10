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
import { MILITARY_TYPOGRAPHY } from '@/constants/colors'
import { Collection, Scripture } from '@/types/scripture'
import { useAppStore } from '@/hooks/useAppStore'
import AddVersesModal from './AddVersesModal'
import { LoadingOverlay } from './LoadingOverlay'
import { errorHandler } from '@/services/errorHandler'

const { width } = Dimensions.get('window')

interface CollectionDetailModalProps {
  collection: Collection
  isVisible: boolean
  onClose: () => void
}

const CollectionDetailModal = React.memo(({
  collection,
  isVisible,
  onClose,
}: CollectionDetailModalProps) => {
  const router = useRouter()
  const {
    getScripturesByCollection,
    updateCollection,
    removeScriptureFromCollection,
    bulkRemoveScripturesFromCollection,
    deleteCollection,
    isDark,
    theme,
    gradients,
  } = useAppStore()
  const styles = getStyles(theme)

  const [isBulkSelecting, setIsBulkSelecting] = useState(false)
  const [selectedScriptureIds, setSelectedScriptureIds] = useState<Set<string>>(new Set())
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editedName, setEditedName] = useState(collection.name)
  const [editedDescription, setEditedDescription] = useState(collection.description || '')
  const [localScriptures, setLocalScriptures] = useState<Scripture[]>([])
  const [showAddVersesModal, setShowAddVersesModal] = useState(false)
  const [expandedScriptureIds, setExpandedScriptureIds] = useState<Set<string>>(new Set())
  const [isProcessing, setIsProcessing] = useState(false)

  // Memoized callbacks for better performance
  const toggleExpand = React.useCallback((id: string) => {
    setExpandedScriptureIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const toggleScriptureSelection = React.useCallback((scriptureId: string) => {
    setSelectedScriptureIds(prev => {
      const newSelection = new Set(prev)
      if (newSelection.has(scriptureId)) {
        newSelection.delete(scriptureId)
      } else {
        newSelection.add(scriptureId)
      }
      return newSelection
    })
  }, [])

  // Memoized render function for better performance
  const renderScriptureItem = React.useCallback(({ item }: { item: Scripture }) => {
    const isSelected = selectedScriptureIds.has(item.id)
    const isExpanded = expandedScriptureIds.has(item.id)
    const masteryPercentage = item.masteryLevel || 0

    // Card background - match ThemedCard surface
    const cardBackground = theme.surface

    // Border color - professional
    const borderColor = theme.border

    // Mastery badge color only
    const getMasteryBadgeColor = () => {
      if (masteryPercentage >= 80) return theme.success
      if (masteryPercentage >= 50) return theme.warning
      return theme.error
    }

    // Check if text needs expand hint (more than 2 lines worth of text)
    const textLength = item.text.length
    const needsExpandHint = textLength > 80 // Approximately 2 lines

    const handlePress = () => {
      if (isBulkSelecting) {
        toggleScriptureSelection(item.id)
      } else {
        toggleExpand(item.id)
      }
    }

    const handleLongPressItem = () => {
      if (!isBulkSelecting && !isEditingInfo) {
        setIsBulkSelecting(true)
        toggleScriptureSelection(item.id)
        Vibration.vibrate(50)
      }
    }

    const handleRemoveItem = (e: any) => {
      e.stopPropagation()
      Alert.alert(
        'Remove Round',
        'Are you sure you want to remove this round from the arsenal?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              const success = await removeScriptureFromCollection(collection.id, item.id)
              if (success) {
                setLocalScriptures(prev => prev.filter(s => s.id !== item.id))
                Alert.alert('Success', 'Round removed from arsenal')
              } else {
                Alert.alert('Error', 'Failed to remove round')
              }
            }
          }
        ]
      )
    }

    return (
      <TouchableOpacity
        style={[
          styles.scriptureItem,
          { backgroundColor: cardBackground, borderWidth: 1, borderColor },
          isBulkSelecting && isSelected && {
            backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.08)',
            borderColor: theme.accent
          }
        ]}
        onLongPress={handleLongPressItem}
        onPress={handlePress}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`${item.reference}. ${needsExpandHint && !isExpanded ? 'Double tap to expand.' : ''} ${isSelected ? 'Selected.' : ''}`}
      >
        {/* Mastery progress indicator bar */}
        {masteryPercentage > 0 && (
          <View style={styles.masteryBar}>
            <View
              style={[
                styles.masteryProgress,
                {
                  width: `${masteryPercentage}%`,
                  backgroundColor: getMasteryBadgeColor()
                }
              ]}
            />
          </View>
        )}

        <View style={styles.scriptureItemContent}>
          {isBulkSelecting ? (
            <View style={[styles.checkbox, isSelected && { backgroundColor: theme.accent, borderColor: theme.accent }, { borderColor: theme.textSecondary }]}>
              {isSelected && <Feather name="check" size={14} color="#FFF" />}
            </View>
          ) : (
            <View style={styles.scriptureIconContainer}>
              <View
                style={[
                  styles.scriptureIconBadge,
                  {
                    backgroundColor: isDark ? 'rgba(60, 60, 60, 0.6)' : 'rgba(240, 240, 240, 0.9)',
                    borderColor: isDark ? 'rgba(100, 100, 100, 0.4)' : 'rgba(200, 200, 200, 0.6)'
                  }
                ]}
              >
                <FontAwesome
                  name="book"
                  size={14}
                  color={isDark ? 'rgba(180, 180, 180, 0.8)' : 'rgba(100, 100, 100, 0.7)'}
                />
              </View>
            </View>
          )}

          <View style={styles.scriptureInfo}>
            <View style={styles.scriptureHeader}>
              <Text style={[styles.scriptureRef, { color: theme.accent }]}>{item.reference}</Text>
              {masteryPercentage > 0 && (
                <View style={[styles.masteryBadge, { borderColor: getMasteryBadgeColor(), backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)' }]}>
                  <MaterialCommunityIcons
                    name="target"
                    size={10}
                    color={getMasteryBadgeColor()}
                  />
                  <Text style={[styles.masteryText, { color: getMasteryBadgeColor() }]}>
                    {masteryPercentage}%
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.scriptureText, { color: theme.textSecondary }]}
              numberOfLines={isExpanded ? undefined : 2}
            >
              {item.text}
            </Text>
            {!isExpanded && needsExpandHint && (
              <Text style={[styles.expandHint, { color: isDark ? 'rgba(180, 180, 180, 0.6)' : 'rgba(120, 120, 120, 0.7)' }]}>
                Tap to expand...
              </Text>
            )}
          </View>

          {!isBulkSelecting && (
            <TouchableOpacity
              style={[
                styles.removeButton,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
                }
              ]}
              onPress={handleRemoveItem}
              accessibilityRole="button"
              accessibilityLabel="Remove round from arsenal"
            >
              <Feather name="x" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }, [selectedScriptureIds, expandedScriptureIds, isBulkSelecting, isEditingInfo, isDark, theme, toggleExpand, toggleScriptureSelection, removeScriptureFromCollection, collection.id])

  useEffect(() => {
    if (isVisible) {
      setEditedName(collection.name)
      setEditedDescription(collection.description || '')
      setLocalScriptures(getScripturesByCollection(collection.id))
      setIsEditingInfo(false)
      setIsBulkSelecting(false)
      setSelectedScriptureIds(new Set())
      setExpandedScriptureIds(new Set())
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
      Alert.alert('Invalid Input', 'Arsenal designation cannot be empty')
      return
    }

    try {
      setIsProcessing(true)
      const success = await updateCollection({
        ...collection,
        name: editedName.trim(),
        description: editedDescription.trim()
      })

      if (success) {
        setIsEditingInfo(false)
        errorHandler.showSuccess(
          'Arsenal information updated successfully!',
          'Update Complete'
        )
      } else {
        throw new Error('Update failed')
      }
    } catch (error) {
      await errorHandler.handleError(
        error,
        'Update Arsenal Info',
        {
          customMessage: 'Failed to update arsenal information. Please retry operation.',
          retry: () => handleSaveInfo()
        }
      )
    } finally {
      setIsProcessing(false)
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

    const count = selectedScriptureIds.size
    const confirmed = await errorHandler.confirm(
      `Remove ${count} round${count !== 1 ? 's' : ''} from the arsenal?`,
      'Confirm Removal',
      'Remove',
      'Cancel'
    )

    if (!confirmed) return

    try {
      setIsProcessing(true)
      const ids = Array.from(selectedScriptureIds)
      const success = await bulkRemoveScripturesFromCollection(collection.id, ids)

      if (success) {
        // Immediately update local state to reflect the deletions
        setLocalScriptures(prev => prev.filter(s => !ids.includes(s.id)))
        setIsBulkSelecting(false)
        setSelectedScriptureIds(new Set())
        errorHandler.showSuccess(
          `Removed ${count} round${count !== 1 ? 's' : ''} from arsenal.`,
          'Rounds Removed'
        )
      } else {
        throw new Error('Bulk delete failed')
      }
    } catch (error) {
      await errorHandler.handleError(
        error,
        'Remove Rounds',
        {
          customMessage: 'Failed to remove rounds from arsenal. Please retry operation.',
          retry: () => handleBulkDelete()
        }
      )
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDeleteCollection = async () => {
    const confirmed = await errorHandler.confirm(
      `Permanently delete arsenal "${collection.name}"? This action cannot be undone.`,
      'Delete Arsenal',
      'Delete',
      'Cancel'
    )

    if (!confirmed) return

    try {
      setIsProcessing(true)
      const success = await deleteCollection(collection.id)

      if (success) {
        errorHandler.showSuccess(
          `Arsenal "${collection.name}" dismantled successfully.`,
          'Arsenal Deleted'
        )
        onClose()
      } else {
        throw new Error('Delete collection failed')
      }
    } catch (error) {
      await errorHandler.handleError(
        error,
        'Delete Arsenal',
        {
          customMessage: 'Failed to dismantle arsenal. Please retry operation.',
          retry: () => handleDeleteCollection()
        }
      )
    } finally {
      setIsProcessing(false)
    }
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

  const handleLongPressScripture = (scriptureId: string) => {
    if (!isBulkSelecting && !isEditingInfo) {
      setIsBulkSelecting(true)
      toggleScriptureSelection(scriptureId)
      Vibration.vibrate(50)
    }
  }

  const handlePressScripture = (scriptureId: string) => {
    if (isBulkSelecting) {
      toggleScriptureSelection(scriptureId)
    }
  }

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <LinearGradient
        colors={isDark ? ['#0D0D0D', '#000000'] : ['#FFFFFF', '#F8F8F8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.95)', borderBottomColor: theme.border }]}>
          <View style={styles.headerContent}>
            <View style={styles.titleSection}>
              {!isBulkSelecting && !isEditingInfo && (
                <View style={[styles.iconBadge, { backgroundColor: isDark ? 'rgba(255, 107, 53, 0.15)' : 'rgba(255, 107, 53, 0.1)', borderColor: isDark ? 'rgba(255, 107, 53, 0.3)' : 'rgba(255, 107, 53, 0.2)' }]}>
                  <MaterialCommunityIcons name="briefcase-variant" size={24} color={theme.accent} />
                </View>
              )}
              {isEditingInfo ? (
                <TextInput
                  style={[styles.titleInput, MILITARY_TYPOGRAPHY.heading, { color: theme.text, borderBottomColor: theme.accent }]}
                  value={editedName}
                  onChangeText={setEditedName}
                  placeholder="Arsenal Name"
                  placeholderTextColor={isDark ? '#666' : '#999'}
                />
              ) : isBulkSelecting ? (
                <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]} numberOfLines={1}>
                  {selectedScriptureIds.size} Selected
                </Text>
              ) : (
                <Text style={[styles.title, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]} numberOfLines={1}>
                  {collection.abbreviation
                    ? `${collection.abbreviation} - ${collection.name}`
                    : collection.name}
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {isEditingInfo ? (
                <>
                  <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]} onPress={handleCancelEdit} accessibilityRole="button" accessibilityLabel="Cancel editing">
                    <Text style={styles.cancelButtonText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveButton, { backgroundColor: theme.accent }]} onPress={handleSaveInfo} accessibilityRole="button" accessibilityLabel="Save changes">
                    <Text style={[styles.saveButtonText, Platform.OS === 'web' ? { color: theme.accentContrastText } : {}]}>SAVE</Text>
                  </TouchableOpacity>
                </>
              ) : isBulkSelecting ? (
                <>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={handleSelectAll} accessibilityRole="button"
                    accessibilityLabel={selectedScriptureIds.size === localScriptures.length ? "Deselect all" : "Select all"}
                  >
                    <MaterialCommunityIcons
                      name={selectedScriptureIds.size === localScriptures.length ? "checkbox-multiple-marked" : "checkbox-multiple-blank-outline"}
                      size={22}
                      color={theme.text}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.error, borderColor: theme.error }]}
                    onPress={handleBulkDelete}
                    disabled={selectedScriptureIds.size === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Delete selected rounds"
                  >
                    <Feather name="trash-2" size={22} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => {
                      setIsBulkSelecting(false)
                      setSelectedScriptureIds(new Set())
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel selection"
                  >
                    <Feather name="x" size={22} color={theme.text} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => setShowAddVersesModal(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Add verses"
                  >
                    <Feather name="plus" size={22} color={theme.accent} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                    onPress={() => setIsEditingInfo(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Edit arsenal info"
                  >
                    <Feather name="edit-3" size={22} color={theme.text} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close modal">
                    <Feather name="x" size={22} color={theme.text} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>

          {!isEditingInfo && !isBulkSelecting && (
            <View style={styles.descriptionContainer}>
              {collection.description ? (
                <Text style={[styles.description, MILITARY_TYPOGRAPHY.body, { color: theme.textSecondary }]} numberOfLines={3}>
                  {collection.description}
                </Text>
              ) : (
                <Text style={[styles.description, MILITARY_TYPOGRAPHY.body, { color: theme.textSecondary, opacity: 0.6 }]}>
                  No description provided.
                </Text>
              )}
            </View>
          )}

          {isEditingInfo && (
            <TextInput
              style={[styles.descriptionInput, { color: theme.text, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)' }]}
              value={editedDescription}
              onChangeText={setEditedDescription}
              placeholder="Description (Optional)"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
          )}

          {isEditingInfo && (
            <View style={styles.editActions}>
              <TouchableOpacity onPress={handleSaveInfo} style={[styles.saveInfoButton, { backgroundColor: theme.accent }]}>
                <Text style={styles.saveInfoText}>SAVE CHANGES</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Stats Grid - Match Mission Report Style */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>STATISTICS</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}>
                <Feather name="target" size={16} color={theme.accent} />
                <Text style={[styles.statValue, { color: theme.text }]}>{localScriptures.length}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>ROUNDS</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}>
                <Feather name="check-circle" size={16} color={theme.success} />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {localScriptures.filter(s => (s.masteryLevel || 0) > 80).length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>MASTERED</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}>
                <Feather name="clock" size={16} color={theme.warning} />
                <Text style={[styles.statValue, { color: theme.text }]}>
                  {localScriptures.filter(s => (s.masteryLevel || 0) < 50).length}
                </Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>TRAINING</Text>
              </View>
            </View>
          </View>

          {/* Verses List */}
          <View style={styles.versesSection}>
            <View style={styles.versesSectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 0 }]}>AMMUNITION INVENTORY</Text>
            </View>

            {localScriptures.length > 0 ? (
              <FlatList
                data={localScriptures}
                renderItem={renderScriptureItem}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={3}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
              />
            ) : (
              <View style={[styles.emptyVerses, { backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.03)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}>
                <Feather name="inbox" size={32} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                <Text style={[styles.emptyVersesText, { color: theme.textSecondary }]}>No ammunition loaded yet.</Text>
              </View>
            )}
          </View>

          {/* Stats Section */}
          <View style={styles.statsSection}>
            <Text style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading, { color: theme.text }]}>
              AMMUNITION STATS
            </Text>

            <View style={styles.statsGrid}>
              <View
                style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}
              >
                <MaterialCommunityIcons name="ammunition" size={24} color={theme.accent} />
                <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
                  {localScriptures.length}
                </Text>
                <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                  ROUNDS
                </Text>
              </View>

              {collection.isChapterBased && collection.chapters && (
                <View
                  style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}
                >
                  <MaterialCommunityIcons name="book-open-variant" size={24} color={theme.accent} />
                  <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
                    {collection.chapters.length}
                  </Text>
                  <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                    CHAPTERS
                  </Text>
                </View>
              )}

              {collection.bookInfo && (
                <View
                  style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={24} color={theme.success} />
                  <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
                    {collection.bookInfo.averageAccuracy?.toFixed(0) || '0'}%
                  </Text>
                  <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                    ACCURACY
                  </Text>
                </View>
              )}

              <View
                style={[styles.statCard, { backgroundColor: isDark ? '#0D0D0D' : '#FFFFFF', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)' }]}
              >
                <MaterialCommunityIcons name="calendar-month" size={24} color={theme.textSecondary} />
                <Text style={[styles.statValue, MILITARY_TYPOGRAPHY.heading, { color: theme.text }]}>
                  {new Date(
                    collection.createdAt || Date.now()
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                <Text style={[styles.statLabel, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}>
                  CREATED
                </Text>
              </View>
            </View>
          </View>

          {/* Tags Section */}
          {collection.tags && collection.tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text
                style={[styles.sectionTitle, MILITARY_TYPOGRAPHY.subheading, { color: theme.text }]}
              >
                MISSION TAGS
              </Text>
              <View style={styles.tagsContainer}>
                {collection.tags.map((tag, index) => (
                  <LinearGradient
                    key={index}
                    colors={[theme.accent, isDark ? '#CC5529' : '#FF9966']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tag}
                  >
                    <MaterialCommunityIcons name="tag-text-outline" size={12} color={theme.accentContrastText} />
                    <Text style={[styles.tagText, MILITARY_TYPOGRAPHY.caption, { color: theme.accentContrastText }]}>
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
                    colors={[isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)']}
                    style={styles.chapterItem}
                  >
                    <View style={styles.chapterInfo}>
                      <Text
                        style={[styles.chapterName, MILITARY_TYPOGRAPHY.body, { color: theme.text }]}
                      >
                        {chapter.name}
                      </Text>
                      <Text
                        style={[
                          styles.chapterStats,
                          MILITARY_TYPOGRAPHY.caption,
                          { color: theme.textSecondary },
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
                            ? theme.success
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
                    style={[styles.moreChapters, MILITARY_TYPOGRAPHY.caption, { color: theme.textSecondary }]}
                  >
                    +{collection.chapters.length - 5} more chapters
                  </Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Training Range Button - Only show when not editing or selecting */}
        {!isEditingInfo && !isBulkSelecting && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.trainingButton, { backgroundColor: theme.primary }]} // Keep button always military green
              onPress={() => {
                onClose()
                router.push('/(tabs)/training')
              }}
              accessibilityRole="button"
              accessibilityLabel="Enter Training Range"
            >
              <View style={styles.trainingButtonContent}>
                <MaterialCommunityIcons name="target" size={24} color="#FFFFFF" />
                <Text style={styles.trainingButtonText}>ENTER TRAINING RANGE</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
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

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isProcessing}
        message="Processing arsenal operation..."
      />
    </Modal>
  )
});

export default CollectionDetailModal;

const getStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 20 : 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
    flex: 1,
    fontSize: 20,
    letterSpacing: 0.5,
  },
  titleInput: {
    flex: 1,
    borderBottomWidth: 1,
    paddingVertical: 4,
  },
  descriptionInput: {
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
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  description: {
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
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  deleteSelectedButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
  },
  scriptureItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  masteryBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(100,100,100,0.15)',
  },
  masteryProgress: {
    height: '100%',
    borderRadius: 2,
  },
  scriptureIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  scriptureIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  scriptureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  masteryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  masteryText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  expandHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    opacity: 0.7,
  },
  scriptureItemSelected: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    borderColor: '#F97316', // Default accent color as fallback
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
    borderColor: '#94A3B8', // Default textSecondary color as fallback
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F97316', // Default accent color as fallback
    borderColor: '#F97316', // Default accent color as fallback
  },
  scriptureInfo: {
    flex: 1,
  },
  scriptureRef: {
    fontWeight: 'bold',
    fontSize: 15,
    letterSpacing: 0.5,
    flex: 1,
  },
  scriptureText: {
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  removeButton: {
    padding: 6,
    marginLeft: 8,
    borderRadius: 6,
    borderWidth: 1,
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
    fontSize: 14,
    marginTop: 12,
    fontStyle: 'italic',
  },
  sectionTitle: {
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
    marginTop: 8,
    marginBottom: 4,
    fontSize: 24,
  },
  statLabel: {
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
    color: [0, 0, 0], // Will be overridden by inline styles
    marginBottom: 4,
    fontWeight: '600',
    fontSize: 15,
  },
  chapterStats: {
    color: [0, 0, 0], // Will be overridden by inline styles
    fontSize: 12,
  },
  chapterStatus: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  moreChapters: {
    color: 'transparent', // Will be overridden by inline styles
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
    fontSize: 12,
  },
  trainingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 30,
    backgroundColor: 'transparent', // Will be overridden by inline styles
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
  trainingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainingButtonText: {
    color: '#FFFFFF', // White text for contrast
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
    backgroundColor: 'transparent', // Will be overridden by inline styles
    justifyContent: 'center',
    alignItems: 'center',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  saveInfoButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveInfoText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  addVersesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
    marginBottom: 24,
  },
  addVersesButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  contentContainer: {
    paddingBottom: 40,
  },
  bulkDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 6,
  },
  bulkDeleteText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
})
