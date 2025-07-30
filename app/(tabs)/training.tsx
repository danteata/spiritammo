import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import ScriptureCard from '@/components/ScriptureCard';
import VoiceRecorder from '@/components/VoiceRecorder';
import ActionButton from '@/components/ActionButton';
import ChapterSelector from '@/components/ChapterSelector';

export default function TrainingScreen() {
  const { 
    isDark, 
    currentScripture, 
    getRandomScripture, 
    selectedBook,
    selectedChapters,
    setSelectedChapters,
    updateScriptureAccuracy
  } = useAppStore();
  
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  
  const handleSelectChapters = (chapters: number[]) => {
    setSelectedChapters(chapters);
  };
  
  const handleNextScripture = () => {
    getRandomScripture();
  };
  
  const handleRecordingComplete = (accuracy: number) => {
    if (currentScripture) {
      updateScriptureAccuracy(currentScripture.id, accuracy);
    }
  };
  
  const toggleChapterSelector = () => {
    setShowChapterSelector(!showChapterSelector);
  };
  
  const backgroundColors = isDark ? GRADIENTS.primary.dark : GRADIENTS.primary.light;
  
  return (
    <LinearGradient
      colors={backgroundColors}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: 'white' }]}>
            {selectedBook ? selectedBook.name : 'Training Range'}
          </Text>
          
          <View style={styles.tabButtons}>
            <ActionButton
              title="Chapters"
              onPress={toggleChapterSelector}
              testID="toggle-chapters-button"
            />
            
            <ActionButton
              title="All Rounds"
              onPress={handleNextScripture}
              testID="all-rounds-button"
            />
          </View>
        </View>
        
        {showChapterSelector && selectedBook && (
          <ChapterSelector onSelectChapters={handleSelectChapters} />
        )}
        
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  tabButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});