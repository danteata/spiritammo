import React from 'react';
import { StyleSheet, Text, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GRADIENTS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import ScriptureCard from '@/components/ScriptureCard';
import BookSelector from '@/components/BookSelector';
import VoiceRecorder from '@/components/VoiceRecorder';
import ActionButton from '@/components/ActionButton';

export default function HomeScreen() {
  const { 
    isDark, 
    currentScripture, 
    getRandomScripture, 
    setSelectedBook,
    books,
    updateScriptureAccuracy
  } = useAppStore();
  
  const handleSelectBook = (book: string) => {
    setSelectedBook(book);
  };
  
  const handleNextScripture = () => {
    getRandomScripture();
  };
  
  const handleRecordingComplete = (accuracy: number) => {
    if (currentScripture) {
      updateScriptureAccuracy(currentScripture.id, accuracy);
    }
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
        <Text style={[styles.sectionTitle, { color: 'white' }]}>
          Ammunition
        </Text>
        
        <BookSelector onSelectBook={handleSelectBook} />
        
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
});