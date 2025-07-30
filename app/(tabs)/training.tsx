import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target, Award, TrendingUp, Settings } from 'lucide-react-native'
import {
  GRADIENTS,
  TACTICAL_THEME,
  MILITARY_TYPOGRAPHY,
} from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'
import AmmunitionCard from '@/components/AmmunitionCard'
import TargetPractice from '@/components/TargetPractice'
import RankBadge from '@/components/RankBadge'
import AccuracyMeter from '@/components/AccuracyMeter'
import ActionButton from '@/components/ActionButton'
import CollectionSelector from '@/components/CollectionSelector'
import CollectionChapterView from '@/components/CollectionChapterView'
import { generateAndStoreIntel } from '@/services/battleIntelligence'
import { voiceRecognitionService } from '@/services/voiceRecognition'
import { militaryRankingService } from '@/services/militaryRanking'

export default function TrainingScreen() {
  const {
    isDark,
    currentScripture,
    getRandomScripture,

    updateScriptureAccuracy,
    userStats,
    collections,
    getScripturesByCollection,
    setCurrentScripture,
  } = useAppStore()

  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)
  const [showChapterSelector, setShowChapterSelector] = useState(false)
  const [showTargetPractice, setShowTargetPractice] = useState(false)
  const [trainingMode, setTrainingMode] = useState<
    'single' | 'burst' | 'automatic'
  >('single')
  const [militaryProfile, setMilitaryProfile] = useState<any>(null)
  const [previousAccuracy, setPreviousAccuracy] = useState<number>(0)

  useEffect(() => {
    loadMilitaryProfile()
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
    setSelectedCollection(collection)
    const scriptures = getScripturesByCollection(collection.id)
    if (scriptures.length > 0) {
      // Reset previous accuracy when switching ammunition
      setPreviousAccuracy(0)
      setCurrentScripture(scriptures[0])
    }
  }

  const handleFireAmmunition = () => {
    setShowTargetPractice(true)
  }

  const handleReloadAmmunition = () => {
    if (selectedCollection) {
      // Get random scripture from the selected collection
      const scriptures = getScripturesByCollection(selectedCollection.id)
      if (scriptures.length > 0) {
        const randomIndex = Math.floor(Math.random() * scriptures.length)
        setCurrentScripture(scriptures[randomIndex])
      }
    } else {
      // Get random scripture from all scriptures
      getRandomScripture()
    }
  }

  const handleGenerateIntel = async () => {
    if (currentScripture) {
      try {
        const intel = await generateAndStoreIntel(currentScripture)
        if (intel) {
          console.log('Generated battle intel:', intel.battlePlan)
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
    setShowTargetPractice(false)
  }

  const toggleChapterSelector = () => {
    setShowChapterSelector(!showChapterSelector)
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
              <RankBadge rank={militaryProfile.currentRank} size="small" />
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

          {/* Training Mode Selector */}
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
                  {mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tabButtons}>
            {selectedCollection && selectedCollection.isChapterBased && (
              <ActionButton
                title="CHAPTERS"
                onPress={toggleChapterSelector}
                testID="toggle-chapters-button"
              />
            )}

            <ActionButton
              title="RANDOM"
              onPress={handleReloadAmmunition}
              testID="random-deployment-button"
            />
          </View>
        </View>

        {/* Collection Selector */}
        <CollectionSelector
          onSelectCollection={handleSelectCollection}
          selectedCollection={selectedCollection}
        />

        {/* Chapter Selector */}
        {showChapterSelector &&
          selectedCollection &&
          selectedCollection.isChapterBased && (
            <CollectionChapterView
              collection={selectedCollection}
              onChapterSelect={(chapterId: string) => {
                // Load scriptures from selected chapter
                const chapter = selectedCollection.chapters?.find(
                  (c) => c.id === chapterId
                )
                if (chapter && chapter.scriptures.length > 0) {
                  const scriptures = getScripturesByCollection(
                    selectedCollection.id
                  )
                  const chapterScriptures = scriptures.filter((s) =>
                    chapter.scriptures.includes(s.id)
                  )
                  if (chapterScriptures.length > 0) {
                    setCurrentScripture(chapterScriptures[0])
                  }
                }
              }}
              showProgress={false}
            />
          )}

        {/* Accuracy Meter */}
        {currentScripture && currentScripture.accuracy && (
          <View style={styles.metricsContainer}>
            <AccuracyMeter
              accuracy={currentScripture.accuracy}
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
                <Target size={20} color={TACTICAL_THEME.accent} />
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
                <Award size={20} color={TACTICAL_THEME.success} />
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
                  {militaryProfile.averageAccuracy.toFixed(1)}%
                </Text>
              </View>

              <View style={styles.statusItem}>
                <TrendingUp size={20} color={TACTICAL_THEME.warning} />
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
    paddingTop: 60,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    flex: 1,
  },
  subtitle: {
    marginBottom: 16,
  },
  modeSelector: {
    flexDirection: 'row',
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: TACTICAL_THEME.accent,
  },
  modeText: {
    fontWeight: 'bold',
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  missionStatus: {
    margin: 16,
    padding: 16,
    backgroundColor: TACTICAL_THEME.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TACTICAL_THEME.border,
  },
  statusTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    alignItems: 'center',
    flex: 1,
  },
  statusLabel: {
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  statusValue: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
})
