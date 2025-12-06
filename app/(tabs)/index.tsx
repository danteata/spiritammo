import * as React from 'react'
import { StyleSheet, Text, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'
import ScriptureCard from '@/components/ScriptureCard'
import CollectionSelector from '@/components/CollectionSelector'
import VoiceRecorder from '@/components/VoiceRecorder'
import ActionButton from '@/components/ActionButton'
import { ThemedContainer, ThemedText } from '@/components/Themed'
import { TACTICAL_THEME, GARRISON_THEME } from '@/constants/colors'
import ScreenHeader from '@/components/ScreenHeader'
import { LoadingOverlay } from '@/components/LoadingOverlay'
import { errorHandler } from '@/services/errorHandler'

export default function HomeScreen() {
  const {
    isDark,
    currentScripture,
    getRandomScripture,
    collections,
    getScripturesByCollection,
    setCurrentScripture,
    updateScriptureAccuracy,
    isLoading,
  } = useAppStore()
  const router = useRouter()

  const [selectedCollection, setSelectedCollection] =
    React.useState<Collection | null>(null)
  const [isLoadingScripture, setIsLoadingScripture] = React.useState(false)

  const handleSelectCollection = (collection: Collection) => {
    try {
      setIsLoadingScripture(true)
      setSelectedCollection(collection)
      const scriptures = getScripturesByCollection(collection.id)
      if (scriptures.length > 0) {
        // Reset to first scripture when switching collections
        setCurrentScripture(scriptures[0])
      }
    } catch (error) {
      errorHandler.handleError(
        error,
        'Select Arsenal',
        {
          customMessage: 'Failed to load arsenal. Please try again.',
          silent: true
        }
      )
    } finally {
      setIsLoadingScripture(false)
    }
  }

  // Auto-select first collection on load if no scripture is selected
  React.useEffect(() => {
    if (!isLoading && !currentScripture && collections.length > 0 && !selectedCollection) {
      const firstCollection = collections[0]
      const scriptures = getScripturesByCollection(firstCollection.id)
      if (scriptures.length > 0) {
        setSelectedCollection(firstCollection)
        setCurrentScripture(scriptures[0])
      }
    }
  }, [isLoading, collections, currentScripture, selectedCollection])

  const handleNextScripture = () => {
    if (selectedCollection) {
      // Get next scripture from the selected collection
      const scriptures = getScripturesByCollection(selectedCollection.id)
      if (scriptures.length > 0) {
        const currentIndex = scriptures.findIndex(
          (s) => s.id === currentScripture?.id
        )
        const nextIndex = (currentIndex + 1) % scriptures.length
        setCurrentScripture(scriptures[nextIndex])
      }
    } else {
      // Get random scripture from all scriptures
      getRandomScripture()
    }
  }

  const handleRecordingComplete = async (accuracy: number) => {
    console.log('🏠 Home: handleRecordingComplete called with accuracy:', accuracy)
    if (currentScripture) {
      console.log('🏠 Home: Updating scripture accuracy for:', currentScripture.id)
      try {
        setIsLoadingScripture(true)
        await updateScriptureAccuracy(currentScripture.id, accuracy)
        errorHandler.showSuccess(
          `Target hit with ${accuracy.toFixed(1)}% accuracy! Mission complete.`,
          'Hit Confirmed'
        )
      } catch (error) {
        await errorHandler.handleError(
          error,
          'Record Practice Session',
          {
            customMessage: 'Failed to record your practice results. Please try again.',
            retry: () => handleRecordingComplete(accuracy)
          }
        )
      } finally {
        setIsLoadingScripture(false)
      }
    } else {
      console.warn('🏠 Home: No current scripture to update')
    }
  }

  return (
    <ThemedContainer style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="WARFARE"
          subtitle="BATTLE READY"
        />

        <View style={styles.dashboardGrid}>
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <CollectionSelector
              onSelectCollection={handleSelectCollection}
              selectedCollection={selectedCollection}
            />
          </Animated.View>

          {currentScripture ? (
            <>
              <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.activeCardContainer}>
                <ScriptureCard
                  scripture={currentScripture}
                  onNext={handleNextScripture}
                />
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <VoiceRecorder
                  scriptureText={currentScripture.text}
                  onRecordingComplete={handleRecordingComplete}
                />
              </Animated.View>
            </>
          ) : !isLoading ? (
            <Animated.View entering={FadeIn.delay(200).duration(500)} style={styles.emptyState}>
              <View style={[styles.emptyIconCircle, {
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }]}>
                <Feather name="shield" size={48} color={TACTICAL_THEME.textSecondary} style={{ opacity: 0.5 }} />
              </View>
              <ThemedText variant="heading" style={styles.emptyTitle}>NO AMMUNITION</ThemedText>
              <ThemedText variant="body" style={styles.emptySubtitle}>
                Select an arsenal or import verses to begin your training.
              </ThemedText>
              <ActionButton
                title="GO TO ARMORY"
                onPress={() => router.push('/armory')}
                style={{ marginTop: 32, width: '100%' }}
              />
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>

      {currentScripture && (
        <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.footer}>
          <ActionButton
            title="NEXT ROUND"
            onPress={handleNextScripture}
            testID="load-next-round-button"
            animated={true}
            style={{ paddingVertical: 18, width: '100%', backgroundColor: TACTICAL_THEME.accent }}
          />
        </Animated.View>
      )}

      {/* Loading Overlays */}
      <LoadingOverlay
        visible={isLoading}
        message="Mobilizing forces..."
      />
      <LoadingOverlay
        visible={isLoadingScripture}
        message="Loading ammunition..."
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
  scrollContent: {
    paddingBottom: 120, // Space for footer
    paddingHorizontal: 16,
  },
  dashboardGrid: {
    gap: 24,
  },
  activeCardContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40, // standard tab bar height compensation if needed, or stick to safe area
    // backdropFilter: 'blur(20px)', // Web only, use BlurView for native if needed
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 30, // Squircle
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 20,
    letterSpacing: 2,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.6,
    maxWidth: 240,
  },
})
