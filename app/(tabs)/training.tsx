import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router'
import {
  COLORS,
  GRADIENTS,
  MILITARY_TYPOGRAPHY,
  TACTICAL_THEME,
  GARRISON_THEME,
} from '@/constants/colors'
import { ThemedContainer, ThemedText, ThemedCard } from '@/components/Themed'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection, Scripture } from '@/types/scripture'
import { runWordsOfJesusUpdate } from '@/scripts/updateWordsOfJesus'
import AsyncStorage from '@react-native-async-storage/async-storage'
import AmmunitionCard from '@/components/AmmunitionCard'
import TargetPractice from '@/components/TargetPractice'
import StealthDrill from '@/components/StealthDrill'
import RankBadge from '@/components/RankBadge'
import AccuracyMeter from '@/components/AccuracyMeter'
import ActionButton from '@/components/ActionButton'
import CollectionSelector from '@/components/CollectionSelector'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import CollectionChapterSelector from '@/components/CollectionChapterSelector'
import {
  generateAndStoreIntel,
  StoredIntel,
} from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'
import { errorHandler } from '@/services/errorHandler'

export default function TrainingScreen() {
  const params = useLocalSearchParams()
  const {
    isDark,
    currentScripture,
    getRandomScripture,
    scriptures,
    updateScriptureAccuracy,
    updateScriptureMnemonic,
    userStats,
    collections,
    getScripturesByCollection,
    setCurrentScripture,
  } = useAppStore()

  const [selectedCollection, setSelectedCollection] =
    useState<Collection | null>(null)

  const [showTargetPractice, setShowTargetPractice] = useState(false)
  const [showStealthDrill, setShowStealthDrill] = useState(false)
  const [trainingMode, setTrainingMode] = useState<
    'single' | 'burst' | 'automatic'
  >('single')
  const [militaryProfile, setMilitaryProfile] = useState<any>(null)
  const [previousAccuracy, setPreviousAccuracy] = useState<number>(0)
  const [showMultiChapterSelector, setShowMultiChapterSelector] =
    useState(false)
  const [selectedChapterIds, setSelectedChapterIds] = useState<string[]>([])
  const [generatedIntel, setGeneratedIntel] = useState<StoredIntel | null>(null)
  const [isLoadingIntel, setIsLoadingIntel] = useState(false)

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

  // Handle deep linking / navigation params
  useEffect(() => {
    if (params.collectionId && collections.length > 0) {
      const collectionId = Array.isArray(params.collectionId)
        ? params.collectionId[0]
        : params.collectionId

      const targetCollection = collections.find(c => c.id === collectionId)
      if (targetCollection) {
        console.log('🔗 Deep link to collection:', targetCollection.name)
        handleSelectCollection(targetCollection)
      }
    }
  }, [params.collectionId, collections])

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

  const handleStealthDrill = () => {
    setShowStealthDrill(true)
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

  const handleGenerateIntel = async (force: boolean = false) => {
    if (currentScripture) {
      try {
        setIsLoadingIntel(true)
        const intel = await generateAndStoreIntel(currentScripture, force)
        if (intel) {
          console.log('Generated battle intel:', intel.battlePlan)
          setGeneratedIntel(intel)
          await militaryRankingService.recordIntelGenerated()

          const mnemonicText = `${intel.battlePlan}\n---\n${intel.tacticalNotes}`;
          await updateScriptureMnemonic(currentScripture.id, mnemonicText);

          errorHandler.showSuccess(
            'Battle intelligence deployed successfully! Tactical advantage secured.',
            'Intel Acquired'
          )
        }
      } catch (error) {
        await errorHandler.handleError(
          error,
          'Generate Intel',
          {
            customMessage: 'Intel generation failed. Command unable to provide tactical support. Retry?',
            retry: () => handleGenerateIntel(force)
          }
        )
      } finally {
        setIsLoadingIntel(false)
      }
    }
  }

  const handleTargetPracticeComplete = async (
    transcript: string,
    accuracy: number
  ) => {
    console.log('🎯 Training: handleTargetPracticeComplete called with accuracy:', accuracy)
    if (currentScripture) {
      console.log('🎯 Training: Updating scripture accuracy for:', currentScripture.id)
      setPreviousAccuracy(currentScripture.accuracy || 0)
      await updateScriptureAccuracy(currentScripture.id, accuracy)

      await militaryRankingService.updateProfile({
        versesMemorized: userStats.totalPracticed + 1,
        averageAccuracy: userStats.averageAccuracy,
        consecutiveDays: userStats.streak,
        lastSessionAccuracy: accuracy,
        lastSessionWordCount: currentScripture.text.split(' ').length,
      })

      await loadMilitaryProfile()
      console.log('🎯 Training: handleTargetPracticeComplete completed')
    } else {
      console.warn('🎯 Training: No current scripture to update')
    }
    // Keep the practice modal open so the user can view the transcript and
    // shot result. The modal is closed by the user via the CEASE FIRE button.
  }

  const handleStealthDrillComplete = async (accuracy: number) => {
    console.log('🕵️‍♀️ Training: handleStealthDrillComplete called with accuracy:', accuracy)
    if (currentScripture) {
      setPreviousAccuracy(currentScripture.accuracy || 0)
      await updateScriptureAccuracy(currentScripture.id, accuracy)

      // Log stats (could add a flag for 'stealth' mode later in service)
      await militaryRankingService.updateProfile({
        versesMemorized: userStats.totalPracticed + 1,
        averageAccuracy: userStats.averageAccuracy,
        consecutiveDays: userStats.streak,
        lastSessionAccuracy: accuracy,
        lastSessionWordCount: currentScripture.text.split(' ').length,
      })

      await loadMilitaryProfile()
    }
    // Modal closes automatically via component prop, or we can force it here if needed
    // setShowStealthDrill(false) is called by the component via onStealthDrillClose if we passed one,
    // but the component calls internal onClose -> onComplete -> which calls this.
    // Wait, the component calls onComplete and THEN onClose?
    // StealthDrill calls: onComplete(accuracy); onClose();
    // So we don't need to manually close it here if onClose prop handles it.
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

  return (
    <ThemedContainer style={styles.container}>

      <ScrollView style={styles.scrollView}>
        <ScreenHeader
          title="TRAINING"
          subtitle="TARGET PRACTICE"
          rightAction={
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReloadAmmunition}
                style={styles.randomButton}
                accessibilityRole="button"
                accessibilityLabel="Reload Ammunition"
              >
                <FontAwesome name="random" size={16} color={TACTICAL_THEME.text} />
              </TouchableOpacity>
              {selectedCollection && selectedCollection.isChapterBased && (
                <ActionButton
                  title="CHAPTERS"
                  onPress={() => setShowMultiChapterSelector(true)}
                  testID="toggle-chapters-button"
                  style={{ paddingVertical: 6, paddingHorizontal: 12, minWidth: 0, height: 32 }}
                  textStyle={{ fontSize: 10 }}
                />
              )}
            </View>
          }
        />

        <View style={{ height: 10 }} />

        {/* Mode Selector */}
        <View style={[styles.modeSelectorContainer, { paddingHorizontal: 20 }]}>
          <View style={[
            styles.modeSelector,
            {
              backgroundColor: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.05)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)'
            }
          ]}>
            {(['single', 'burst', 'automatic'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  trainingMode === mode && styles.activeModeButton,
                ]}
                onPress={() => setTrainingMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${mode} mode`}
              >
                <ThemedText
                  variant="caption"
                  style={[
                    styles.modeText,
                    {
                      color:
                        trainingMode === mode
                          ? TACTICAL_THEME.text
                          : (isDark ? TACTICAL_THEME.textSecondary : GARRISON_THEME.textSecondary),
                    },
                  ]}
                >
                  {mode === 'automatic' ? 'AUTO' : mode.toUpperCase()}
                </ThemedText>
              </TouchableOpacity>
            ))}
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
            onStealth={handleStealthDrill}
            isDark={isDark}
          />
        )}

        <ThemedCard style={styles.missionStatus} variant="default">
          <ThemedText variant="subheading" style={styles.statusTitle}>
            MISSION STATUS
          </ThemedText>

          <View style={styles.statusGrid}>
            {/* Rounds Fired */}
            {isDark ? (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="target" size={24} color={TACTICAL_THEME.accent} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {militaryProfile?.totalVersesMemorized || 0}
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  ROUNDS FIRED
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }]}>
                <MaterialCommunityIcons name="target" size={24} color={TACTICAL_THEME.accent} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {militaryProfile?.totalVersesMemorized || 0}
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  ROUNDS FIRED
                </ThemedText>
              </View>
            )}

            {/* Accuracy */}
            {isDark ? (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color={TACTICAL_THEME.success} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {fmt(militaryProfile?.averageAccuracy)}%
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  AVG ACCURACY
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }]}>
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color={TACTICAL_THEME.success} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {fmt(militaryProfile?.averageAccuracy)}%
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  AVG ACCURACY
                </ThemedText>
              </View>
            )}

            {/* Streak */}
            {isDark ? (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.05)' }]}>
                <MaterialCommunityIcons name="fire" size={24} color={TACTICAL_THEME.warning} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {militaryProfile?.consecutiveDays || 0}
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  DAY STREAK
                </ThemedText>
              </View>
            ) : (
              <View style={[styles.statusItem, { backgroundColor: 'rgba(0,0,0,0.05)', borderColor: 'rgba(0,0,0,0.1)' }]}>
                <MaterialCommunityIcons name="fire" size={24} color={TACTICAL_THEME.warning} style={{ marginBottom: 8 }} />
                <ThemedText variant="heading" style={styles.statusValue}>
                  {militaryProfile?.consecutiveDays || 0}
                </ThemedText>
                <ThemedText variant="caption" style={styles.statusLabel}>
                  DAY STREAK
                </ThemedText>
              </View>
            )}
          </View>
        </ThemedCard>

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

      {/* Stealth Drill Modal */}
      {currentScripture && (
        <StealthDrill
          isVisible={showStealthDrill}
          targetVerse={currentScripture.text}
          reference={currentScripture.reference}
          /* Wait, StealthDrill expects onComplete: (accuracy) => void. 
             handleTargetPracticeComplete expects (transcript, accuracy).
             I need to use handleStealthDrillComplete created above.
          */
          onComplete={handleStealthDrillComplete}
          onClose={() => setShowStealthDrill(false)}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isLoadingIntel}
        message="Requesting tactical intelligence from command..."
      />
    </ThemedContainer>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  randomButton: {
    padding: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
    // Removed hardcoded background to let ThemedCard handle it
    borderRadius: 16,
    // Removed hardcoded border/shadow to let ThemedCard handle it
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
