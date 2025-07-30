import React from 'react'
import { StyleSheet, Text, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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
    if (currentScripture) {
      updateScriptureAccuracy(currentScripture.id, accuracy)
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
      <ScrollView style={styles.scrollView}>
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          Ammunition
        </Text>

        <CollectionSelector
          onSelectCollection={handleSelectCollection}
          selectedCollection={selectedCollection}
        />

        {currentScripture && (
          <>
            <ScriptureCard
              scripture={currentScripture}
              onNext={handleNextScripture}
            />

            <VoiceRecorder
              scriptureText={currentScripture.text}
              onRecordingComplete={handleRecordingComplete}
            />

            <ActionButton
              title="Ready! Aim! Fire!"
              subtitle="Load next round"
              onPress={handleNextScripture}
              testID="load-next-round-button"
            />
          </>
        )}
      </ScrollView>
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
})
