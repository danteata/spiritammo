import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router'
import {
  COLORS,
  GRADIENTS,
  MILITARY_TYPOGRAPHY,

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
import StreakChallenge from '@/components/StreakChallenge'
import CollectionAssault from '@/components/CollectionAssault'
import { analytics, Analytics } from '@/services/analytics'

interface AssaultResult {
  scriptureId: string
  accuracy: number
  timestamp: Date
  transcript: string
}

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
    theme,
    gradients,
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
  const [isLoadingIntel, setIsLoadingIntel] = useState(false)
  const [showStealthDrill, setShowStealthDrill] = useState(false)
  const [showCollectionAssault, setShowCollectionAssault] = useState(false)
  const [assaultCollections, setAssaultCollections] = useState<Collection[]>([])
  const [assaultParameters, setAssaultParameters] = useState({
    verseCount: 5,
    timeLimit: 0, // 0 = no limit
    difficulty: 'standard'
  })



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

    // Track collection selection
    analytics.trackInteraction('select', 'collection', {
      collection_id: collection.id,
      collection_name: collection.name,
      scripture_count: scriptures.length
    })

    if (scriptures.length > 0) {
      // Reset previous accuracy when switching ammunition
      setPreviousAccuracy(0);
      setCurrentScripture(scriptures[0]);
    } else {
      console.warn('⚠️ No scriptures found in collection', collection.id);
    }
  }

  const handleFireAmmunition = () => {
    // Track target practice start
    analytics.track({
      name: Analytics.Events.PRACTICE_START,
      properties: {
        mode: 'target_practice',
        scripture_id: currentScripture?.id,
        scripture_reference: currentScripture?.reference,
        collection: selectedCollection?.name
      }
    })
    setShowTargetPractice(true)
  }

  const handleStealthDrill = () => {
    // Track stealth drill start
    analytics.track({
      name: Analytics.Events.PRACTICE_START,
      properties: {
        mode: 'stealth_drill',
        scripture_id: currentScripture?.id,
        scripture_reference: currentScripture?.reference,
        collection: selectedCollection?.name
      }
    })
    setShowStealthDrill(true)
  }

  const handleStealthDrillComplete = async (accuracy: number, text?: string) => {
    console.log('🎯 Training: Stealth drill completed with accuracy:', accuracy)
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

      // Award Valor Points for stealth drill
      const { default: ValorPointsService } = await import('@/services/valorPoints')
      const vpEarned = await ValorPointsService.awardStealthDrillVP(
        accuracy,
        'RECRUIT', // Default difficulty for now
        userStats.streak,
        userStats.rank
      )

      // Show different completion message for stealth mode
      if (accuracy >= 90) {
        Alert.alert(
          'SHADOW ASSISTANCE COMPLETE',
          `Silent reconnaissance successful! Accuracy: ${accuracy.toFixed(1)}%\nValor Points Earned: ${vpEarned} VP`,
          [{ text: 'Hooah!' }]
        )
      } else {
        Alert.alert(
          'TACTICAL WITHDRAWAL',
          `Reconnaissance compromised. Accuracy: ${accuracy.toFixed(1)}%. Minimizing exposure.`,
          [{ text: 'Roger that', style: 'cancel' }]
        )
      }

      await loadMilitaryProfile()
      console.log('🎯 Training: Stealth drill completed successfully')
    } else {
      console.warn('🎯 Training: No current scripture to update')
    }
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

      // Record streak progress for practice completion
      const { streakManager } = await import('@/services/streakManager')
      await streakManager.recordPractice()

      // Award Valor Points for successful target practice
      const { default: ValorPointsService } = await import('@/services/valorPoints')
      const vpEarned = await ValorPointsService.awardTargetPracticeVP(
        accuracy,
        userStats.streak,
        userStats.rank
      )

      if (vpEarned > 0) {
        Alert.alert(
          'MISSION ACCOMPLISHED',
          `Accuracy: ${accuracy.toFixed(1)}%\nValor Points Earned: ${vpEarned} VP`,
          [{ text: 'HOOAH!' }]
        )
      }

      await loadMilitaryProfile()
      console.log('🎯 Training: handleTargetPracticeComplete completed')
    } else {
      console.warn('🎯 Training: No current scripture to update')
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

  const handleAssaultComplete = (results: AssaultResult[]) => {
    console.log('🫡 Collection assault completed with results:', results)
    setShowCollectionAssault(false)
    setTrainingMode('single') // Reset back to single mode

    // Show completion message
    const totalAccuracies = results.reduce((sum, r) => sum + r.accuracy, 0)
    const averageAccuracy = totalAccuracies / results.length

    Alert.alert(
      'COLLECTION ASSAULT COMPLETE',
      `${results.length} verses conquered\nAverage Accuracy: ${averageAccuracy.toFixed(1)}%`,
      [{ text: 'HOOAH!' }]
    )
  }

  return (
    <ThemedContainer style={styles.container}>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 104 }}>
        <ScreenHeader
          title="TRAINING"
          subtitle="TARGET PRACTICE"
          rightAction={
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleReloadAmmunition}
                style={[
                  styles.randomButton,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                  }
                ]}
                accessibilityRole="button"
                accessibilityLabel="Reload Ammunition"
              >
                <FontAwesome name="random" size={16} color={theme.text} />
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

        {/* Fire Mode Selector */}
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
                  trainingMode === mode && [styles.activeModeButton, {
                    backgroundColor: theme.accent,
                    shadowColor: theme.accent
                  }],
                ]}
                onPress={() => setTrainingMode(mode)}
                accessibilityRole="button"
                accessibilityLabel={`Select ${mode} mode`}
              >
                <Text
                  style={[
                    styles.modeText,
                    {
                      color:
                        trainingMode === mode
                          ? theme.accentContrastText
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {mode === 'automatic' ? 'AUTO' : mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>



        {/* Streak Challenge - Daily Goal Tracking */}
        <StreakChallenge compact={true} />

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

        {/* Mission Status */}
        {militaryProfile && (
          <ThemedCard style={styles.missionStatus} variant="default">
            <ThemedText variant="subheading" style={styles.statusTitle}>
              MISSION STATUS
            </ThemedText>

            <View style={styles.statusGrid}>
              {isDark ? (
                <LinearGradient
                  colors={[theme.surface, '#1a1a1a']}
                  style={styles.statusItem}
                >
                  <MaterialCommunityIcons name="target" size={28} color={theme.accent} style={{ marginBottom: 8 }} />
                  <ThemedText variant="heading" style={styles.statusValue}>
                    {militaryProfile.totalVersesMemorized}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    ROUNDS FIRED
                  </ThemedText>
                </LinearGradient>
              ) : (
                <View style={[
                  styles.statusItem,
                  {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }
                ]}>
                  <FontAwesome name="bullseye" size={20} color={theme.accent} />
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    ROUNDS FIRED
                  </ThemedText>
                  <ThemedText variant="body" style={styles.statusValue}>
                    {militaryProfile.totalVersesMemorized}
                  </ThemedText>
                </View>
              )}

              {isDark ? (
                <LinearGradient
                  colors={[theme.surface, '#1a1a1a']}
                  style={styles.statusItem}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={28} color={theme.success} style={{ marginBottom: 8 }} />
                  <ThemedText variant="heading" style={styles.statusValue}>
                    {fmt(militaryProfile.averageAccuracy)}%
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    ACCURACY
                  </ThemedText>
                </LinearGradient>
              ) : (
                <View style={[
                  styles.statusItem,
                  {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }
                ]}>
                  <FontAwesome name="trophy" size={20} color={theme.success} />
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    AVG ACCURACY
                  </ThemedText>
                  <ThemedText variant="body" style={styles.statusValue}>
                    {fmt(militaryProfile.averageAccuracy)}%
                  </ThemedText>
                </View>
              )}

              {isDark ? (
                <LinearGradient
                  colors={[theme.surface, '#1a1a1a']}
                  style={styles.statusItem}
                >
                  <MaterialCommunityIcons name="fire" size={28} color={theme.warning} style={{ marginBottom: 8 }} />
                  <ThemedText variant="heading" style={styles.statusValue}>
                    {militaryProfile.consecutiveDays}
                  </ThemedText>
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    DAY STREAK
                  </ThemedText>
                </LinearGradient>
              ) : (
                <View style={[
                  styles.statusItem,
                  {
                    backgroundColor: 'rgba(0, 0, 0, 0.05)',
                    borderColor: 'rgba(0, 0, 0, 0.1)'
                  }
                ]}>
                  <FontAwesome name="long-arrow-up" size={20} color={theme.warning} />
                  <ThemedText variant="caption" style={styles.statusLabel}>
                    STREAK
                  </ThemedText>
                  <ThemedText variant="body" style={styles.statusValue}>
                    {militaryProfile.consecutiveDays} DAYS
                  </ThemedText>
                </View>
              )}
            </View>
          </ThemedCard>
        )}
      </ScrollView>

      {/* Target Practice Modal */}
      {currentScripture && (
        <TargetPractice
          isVisible={showTargetPractice}
          targetVerse={currentScripture.text}
          reference={currentScripture.reference}
          scriptureId={currentScripture.id}
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
          onComplete={handleStealthDrillComplete}
          onClose={() => setShowStealthDrill(false)}
        />
      )}

      {/* Loading Overlay */}
      <LoadingOverlay
        visible={isLoadingIntel}
        message="Requesting tactical intelligence from command..."
      />

      {/* Collection Assault Modal */}
      {selectedCollection && showCollectionAssault && (
        <CollectionAssault
          isVisible={showCollectionAssault}
          collections={[selectedCollection]}
          parameters={assaultParameters}
          onComplete={handleAssaultComplete}
          onClose={() => {
            setShowCollectionAssault(false)
            setTrainingMode('single')
          }}
        />
      )}
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
    borderRadius: 16, // Increased radius
    padding: 4,
    borderWidth: 1,
  },
  randomButtonCompact: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeModeButton: {
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
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
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
  modeSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trainingModesSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  trainingModeButton: {
    flex: 1,
    backgroundColor: 'rgba(0, 123, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 123, 255, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainingModeActive: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  trainingModeText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    letterSpacing: 0.5,
  },
  modeSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    gap: 12,
  },
  separatorLine: {
    flex: 1,
    height: 2,
  },
  separatorIcon: {
    marginTop: 1,
  },
  testingModesSection: {
    marginTop: 8,
  },
  testingModeButton: {
    backgroundColor: 'rgba(220, 53, 69, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(220, 53, 69, 0.3)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  testingModeActive: {
    backgroundColor: '#DC3545',
    borderColor: '#DC3545',
    shadowColor: '#DC3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  testingModeIcon: {
    marginBottom: 8,
  },
  testingModeTextContainer: {
    alignItems: 'center',
  },
  testingModeText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'center',
  },
  testingModeSubtitle: {
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: 2,
    opacity: 0.9,
  },
  assessmentNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  assessmentNoticeText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    flex: 1,
  },
})
