import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome } from '@expo/vector-icons';
import {
  GRADIENTS,
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import { runWordsOfJesusUpdate } from '@/scripts/updateWordsOfJesus'
import AsyncStorage from '@react-native-async-storage/async-storage'
import AmmunitionCard from '@/components/AmmunitionCard'
import TargetPractice from '@/components/TargetPractice'
import RankBadge from '@/components/RankBadge'
import AccuracyMeter from '@/components/AccuracyMeter'
import ActionButton from '@/components/ActionButton'
import CollectionSelector from '@/components/CollectionSelector'

import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import {
  generateAndStoreIntel,
  StoredIntel,
} from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'

export default function TrainingScreen() {
  const {
    isDark,
    currentScripture,
    getRandomScripture,
    scriptures,
    updateScriptureAccuracy,
    userStats,
    collections,
    getScripturesByCollection,
    setCurrentScripture,
  } = useAppStore()

  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)

  const [showTargetPractice, setShowTargetPractice] = useState(false)
  const [trainingMode, setTrainingMode] = useState<
    'single' | 'burst' | 'automatic'
  >('single')
  const [militaryProfile, setMilitaryProfile] = useState<any>(null)
  const [previousAccuracy, setPreviousAccuracy] = useState<number>(0)
  const [showMultiChapterSelector, setShowMultiChapterSelector] =
    useState(false)
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [generatedIntel, setGeneratedIntel] = useState<StoredIntel | null>(null)

  // Safe formatter for numeric percentages that might be null/undefined
  const fmt = (v?: number | null, digits = 1) =>
    typeof v === 'number' && !Number.isNaN(v) ? v.toFixed(digits) : '0'

  useEffect(() => {
    loadMilitaryProfile()

    // One-time Words of Jesus update - remove after running once
    AsyncStorage.getItem('wordsOfJesusUpdated').then((hasRunUpdate) => {
      if (!hasRunUpdate) {
        runWordsOfJesusUpdate().then((success) => {
          if (success) {
            AsyncStorage.setItem('wordsOfJesusUpdated', 'true')
            console.log('✅ Words of Jesus highlighting enabled')
          }
        })
      }
    })
  }, [])

  const loadMilitaryProfile = async () => {
    try {
      const profile = await militaryRankingService.getProfile()
      setMilitaryProfile(profile)
    } catch (error) {
      console.error('Failed to load military profile:', error)
    }
  }

  const handleSelectCollection = (collection: Collection) => {
    console.log('🎯 Selecting collection:', collection.name, 'ID:', collection.id);
    setSelectedCollection(collection);
    const scriptures = getScripturesByCollection(collection.id);
    console.log('💯 Found', scriptures.length, 'scriptures in collection');
    if (scriptures.length > 0) {
      // Reset previous accuracy when switching ammunition
      setPreviousAccuracy(0);
      setCurrentScripture(scriptures[0]);
    } else {
      console.warn('⚠️ No scriptures found in collection', collection.id);
    }
  }

  const handleFireAmmunition = () => {
    setShowTargetPractice(true)
  }

  const handleReloadAmmunition = () => {
    if (selectedCollection) {
      // Get the latest collection data to ensure we have updated scripture IDs
      const freshCollection = collections.find(c => c.id === selectedCollection.id);
      if (freshCollection) {
        console.log('🔄 Reloading ammunition for collection:', freshCollection.name);
        console.log('📄 Collection has', freshCollection.scriptures.length, 'scripture IDs');
        const scriptures = getScripturesByCollection(freshCollection.id);
        console.log('💯 Reload found', scriptures.length, 'scripture objects');
        if (scriptures.length > 0) {
          const randomIndex = Math.floor(Math.random() * scriptures.length);
          const newScripture = scriptures[randomIndex];
          console.log('✅ Selected random scripture:', newScripture.reference);
          setCurrentScripture(newScripture);
        } else {
          console.warn('⚠️ No scriptures available in collection');
        }
      }
    } else {
      // Get random scripture from all scriptures
      console.log('🔄 Reloading from all scriptures');
      getRandomScripture();
    }
  }

  const handleGenerateIntel = async () => {
    if (currentScripture) {
      try {
        const intel = await generateAndStoreIntel(currentScripture)
        if (intel) {
          console.log('Generated battle intel:', intel.battlePlan)
          setGeneratedIntel(intel)
          setCurrentScripture({
            ...currentScripture,
            mnemonic: `${intel.battlePlan}: ${intel.tacticalNotes}`,
          })
        }
      } catch (error) {
        console.error('Failed to generate intel:', error)
      }
    }
  }

  const handleTargetPracticeComplete = async (
    transcript: string,
    accuracy: number
  ) => {
    if (currentScripture) {
      setPreviousAccuracy(currentScripture.accuracy || 0)
      await updateScriptureAccuracy(currentScripture.id, accuracy)

      await militaryRankingService.updateProfile({
        versesMemorized: userStats.totalPracticed + 1,
        averageAccuracy: userStats.averageAccuracy,
        consecutiveDays: userStats.streak,
      })

      await loadMilitaryProfile()
    }
    // Keep the practice modal open so the user can view the transcript and
    // shot result. The modal is closed by the user via the CEASE FIRE button.
  }

  const handleMultiChapterSelection = (chapterIds: string[]) => {
    setSelectedChapterIds(chapterIds)

    // Get all scriptures from selected chapters
    if (selectedCollection && selectedCollection.chapters) {
      const selectedChapters = selectedCollection.chapters.filter((ch) =>
        chapterIds.includes(ch.id)
      )

      // Combine all scripture IDs from selected chapters
      const allScriptureIds = selectedChapters.reduce((acc, chapter) => {
        return [...acc, ...chapter.scriptures]
      }, [] as string[])

      // Get the actual scripture objects
      const chapterScriptures = allScriptureIds
        .map((id) => scriptures.find((s) => s.id === id))
        .filter(Boolean) as Scripture[]

      if (chapterScriptures.length > 0) {
        setCurrentScripture(chapterScriptures[0])
      }
    }
  }

  const backgroundColors = isDark
    ? (GRADIENTS.tactical.background as [string, string])
    : (GRADIENTS.primary.light as [string, string])

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.scrollView}>
        {/* Military Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text
              style={[
                styles.title,
                MILITARY_TYPOGRAPHY.heading,
                { color: TACTICAL_THEME.text },
              ]}
            >
              TRAINING RANGE
            </Text>

            {militaryProfile && (
              <RankBadge
                rank={militaryProfile.currentRank}
                size="small"
                showLabel={false}
              />
            )}
          </View>

          <Text
            style={[
              styles.subtitle,
              MILITARY_TYPOGRAPHY.caption,
              { color: TACTICAL_THEME.textSecondary },
            ]}
          >
            {selectedCollection
              ? `${selectedCollection.name} OPERATIONS`
              : 'ALL UNITS DEPLOYMENT'}
          </Text>

          <View style={styles.modeSelectorContainer}>
            <View style={styles.modeSelector}>
              {(['single', 'burst', 'automatic'] as const).map((mode) => (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.modeButton,
                    trainingMode === mode && styles.activeModeButton,
                  ]}
                  onPress={() => setTrainingMode(mode)}
                >
                  <Text
                    style={[
                      styles.modeText,
                      MILITARY_TYPOGRAPHY.caption,
                      {
                        color:
                          trainingMode === mode
                            ? TACTICAL_THEME.text
                            : TACTICAL_THEME.textSecondary,
                      },
                    ]}
                  >
                    {mode === 'automatic' ? 'AUTO' : mode.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.randomButtonCompact}
              onPress={handleReloadAmmunition}
            >
              <FontAwesome name="random" size={16} color={TACTICAL_THEME.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabButtons}>
            {selectedCollection && selectedCollection.isChapterBased && (
              <ActionButton
                title="CHAPTERS"
                onPress={() => setShowMultiChapterSelector(true)}
                testID="toggle-chapters-button"
                style={{ flex: 1 }}
              />
            )}
          </View>
        </View>

        {/* Collection Selector */}
        <CollectionSelector
          onSelectCollection={handleSelectCollection}
          selectedCollection={selectedCollection}
          selectedChapterIds={selectedChapterIds}
        />

        {/* Multi-Chapter Selector */}
        {selectedCollection && selectedCollection.isChapterBased && (
          <CollectionChapterSelector
            collection={selectedCollection}
            isVisible={showMultiChapterSelector}
            onClose={() => setShowMultiChapterSelector(false)}
            onStartPractice={handleMultiChapterSelection}
          />
        )}

        {/* Accuracy Meter */}
        {false && currentScripture?.accuracy != null && (
          <View style={styles.metricsContainer}>
            <AccuracyMeter
              accuracy={currentScripture?.accuracy ?? 0}
              previousAccuracy={previousAccuracy}
              label="AMMO ACCURACY"
              size="medium"
              showTrend={true}
            />
          </View>
        )}

        {/* Ammunition Card */}
        {currentScripture && (
          <AmmunitionCard
            scripture={currentScripture}
            onFire={handleFireAmmunition}
            onReload={handleReloadAmmunition}
            onIntel={handleGenerateIntel}
          />
        )}

        {/* Mission Status */}
        {militaryProfile && (
          <View style={styles.missionStatus}>
            <Text
              style={[
                styles.statusTitle,
                MILITARY_TYPOGRAPHY.subheading,
                { color: TACTICAL_THEME.text },
              ]}
            >
              MISSION STATUS
            </Text>

            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <FontAwesome name="bullseye" size={20} color={TACTICAL_THEME.accent} />
                <Text
                  style={[
                    styles.statusLabel,
                    MILITARY_TYPOGRAPHY.caption,
                    { color: TACTICAL_THEME.textSecondary },
                  ]}
                >
                  ROUNDS FIRED
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    MILITARY_TYPOGRAPHY.body,
                    { color: TACTICAL_THEME.text },
                  ]}
                >
                  {militaryProfile.totalVersesMemorized}
                </Text>
              </View>

              <View style={styles.statusItem}>
                <FontAwesome name="trophy" size={20} color={TACTICAL_THEME.success} />
                <Text
                  style={[
                    styles.statusLabel,
                    MILITARY_TYPOGRAPHY.caption,
                    { color: TACTICAL_THEME.textSecondary },
                  ]}
                >
                  AVG ACCURACY
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    MILITARY_TYPOGRAPHY.body,
                    { color: TACTICAL_THEME.text },
                  ]}
                >
                  {fmt(militaryProfile.averageAccuracy)}%
                </Text>
              </View>

              <View style={styles.statusItem}>
                <FontAwesome name="long-arrow-up" size={20} color={TACTICAL_THEME.warning} />
                <Text
                  style={[
                    styles.statusLabel,
                    MILITARY_TYPOGRAPHY.caption,
                    { color: TACTICAL_THEME.textSecondary },
                  ]}
                >
                  STREAK
                </Text>
                <Text
                  style={[
                    styles.statusValue,
                    MILITARY_TYPOGRAPHY.body,
                    { color: TACTICAL_THEME.text },
                  ]}
                >
                  {militaryProfile.consecutiveDays} DAYS
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Target Practice Modal */}
      {currentScripture && (
        <TargetPractice
          isVisible={showTargetPractice}
          targetVerse={currentScripture.text}
          intelText={
            generatedIntel
              ? `Battle Plan: ${generatedIntel.battlePlan}. Tactical Notes: ${generatedIntel.tacticalNotes}`
              : undefined
          }
          onRecordingComplete={handleTargetPracticeComplete}
          onClose={() => setShowTargetPractice(false)}
        />
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 20, // Reduced from 60
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 10, // Reduced from 20
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
    fontSize: 24,
    letterSpacing: 1,
  },
  subtitle: {
    marginBottom: 4,
    opacity: 0.7,
    letterSpacing: 2,
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  modeSelector: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.4)', // Slightly darker for better contrast
    borderRadius: 16, // Increased radius
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  randomButtonCompact: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: TACTICAL_THEME.accent,
    shadowColor: TACTICAL_THEME.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  modeText: {
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 10,
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    zIndex: 10,
    elevation: 5,
  },
  missionStatus: {
    margin: 16,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  statusTitle: {
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 2,
    opacity: 0.9,
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  statusLabel: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    fontSize: 10,
    opacity: 0.7,
    letterSpacing: 0.5,
  },
  statusValue: {
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
})
