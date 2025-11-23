import React from 'react'
import { StyleSheet, Text, ScrollView, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Feather } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { GRADIENTS } from '@/constants/colors'
import { useAppStore } from '@/hooks/useAppStore'
import { Collection } from '@/types/scripture'
import ScriptureCard from '@/components/ScriptureCard'
import CollectionSelector from '@/components/CollectionSelector'
import VoiceRecorder from '@/components/VoiceRecorder'
import ActionButton from '@/components/ActionButton'

export default function HomeScreen() {
  const {
    isDark,
    currentScripture,
    getRandomScripture,
    collections,
    getScripturesByCollection,
    setCurrentScripture,
    updateScriptureAccuracy,
  } = useAppStore()
  const router = useRouter()

  const [selectedCollection, setSelectedCollection] =
    React.useState<Collection | null>(null)

  const handleSelectCollection = (collection: Collection) => {
    setSelectedCollection(collection)
    const scriptures = getScripturesByCollection(collection.id)
    if (scriptures.length > 0) {
      // Reset to first scripture when switching collections
      setCurrentScripture(scriptures[0])
    }
  }

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

  const handleRecordingComplete = (accuracy: number) => {
    console.log('🏠 Home: handleRecordingComplete called with accuracy:', accuracy)
    if (currentScripture) {
      console.log('🏠 Home: Updating scripture accuracy for:', currentScripture.id)
      updateScriptureAccuracy(currentScripture.id, accuracy)
    } else {
      console.warn('🏠 Home: No current scripture to update')
    }
  }

  const backgroundColors = isDark
    ? (GRADIENTS.primary.dark as [string, string])
    : (GRADIENTS.primary.light as [string, string])

  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>


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
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Feather name="shield" size={48} color="rgba(255,255,255,0.2)" />
            </View>
            <Text style={[styles.emptyTitle, { color: 'white' }]}>NO AMMUNITION LOADED</Text>
            <Text style={[styles.emptySubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
              Select an arsenal or import verses to begin your training.
            </Text>
            <ActionButton
              title="GO TO ARMORY"
              onPress={() => router.push('/armory')}
              style={{ marginTop: 24, width: '100%' }}
            />
          </View>
        )}
      </ScrollView>

      {currentScripture && (
        <View style={styles.footer}>
          <ActionButton
            title="Ready! Aim! Fire!"
            subtitle="LOAD NEXT ROUND"
            onPress={handleNextScripture}
            testID="load-next-round-button"
            animated={true}
            style={{ paddingVertical: 12, marginVertical: 0 }}
          />
        </View>
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
  scrollContent: {
    paddingBottom: 40,
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
    paddingBottom: 30,
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
