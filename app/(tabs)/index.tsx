import React from 'react'
import { StyleSheet, Text, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'
import ScriptureCard from '@/components/ScriptureCard'
import CollectionSelector from '@/components/CollectionSelector'
import VoiceRecorder from '@/components/VoiceRecorder'
import ActionButton from '@/components/ActionButton'
import { ThemedContainer, ThemedText } from '@/components/Themed'
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
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingBottom: 104 }]}>
        <ScreenHeader
          title="WARFARE"
          subtitle="BATTLE READY"
        />


        <CollectionSelector
          onSelectCollection={handleSelectCollection}
          selectedCollection={selectedCollection}
        />

        {currentScripture ? (
          <>
            <ScriptureCard
              scripture={currentScripture}
              onNext={handleNextScripture}
            />

            <VoiceRecorder
              scriptureText={currentScripture.text}
              onRecordingComplete={handleRecordingComplete}
            />
          </>
        ) : !isLoading ? (
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyIconCircle, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}
              accessible={true}
              accessibilityRole="image"
              accessibilityLabel="Shield icon indicating no ammunition loaded"
            >
              <Feather name="shield" size={48} color={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} />
            </View>
            <ThemedText variant="heading" style={styles.emptyTitle}>NO AMMUNITION LOADED</ThemedText>
            <ThemedText variant="body" style={styles.emptySubtitle}>
              Select an arsenal or import verses to begin your training.
            </ThemedText>
            <ActionButton
              title="GO TO ARMORY"
              onPress={() => router.push('/armory')}
              style={{ marginTop: 24, width: '100%' }}
            />
          </View>
        ) : null}
      </ScrollView>

      {currentScripture && (
        <View style={styles.footer}>
          <ActionButton
            title="Ready! Aim! Fire!"
            onPress={handleNextScripture}
            testID="load-next-round-button"
            animated={true}
            style={{ paddingVertical: 16, marginVertical: 0, marginBottom: 104, minWidth: 200, backgroundColor: '#CC5529' }}
          />
        </View>
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
    // Bottom padding handled by SafeAreaView
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footer: {
    padding: 20,
    paddingBottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: '80%',
  },
})
