import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Mic, Square, Volume2 } from 'lucide-react-native';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import * as Speech from 'expo-speech';

interface VoiceRecorderProps {
  scriptureText: string;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecorder({ scriptureText, onRecordingComplete }: VoiceRecorderProps) {
  const { isDark, userSettings } = useAppStore();
  const [isRecording, setIsRecording] = useState(false);
  // Using a simulated transcript for demo purposes
  const [simulatedTranscript, setSimulatedTranscript] = useState('');
  const [accuracy, setAccuracy] = useState(0);
  const [showAccuracy, setShowAccuracy] = useState(false);
  
  // Speak the scripture text
  const speakScripture = async () => {
    try {
      await Speech.speak(scriptureText, {
        rate: userSettings.voiceRate,
        pitch: userSettings.voicePitch,
        language: userSettings.language
      });
    } catch (error) {
      console.error('Failed to speak scripture:', error);
    }
  };
  
  // Start recording
  const startRecording = () => {
    setIsRecording(true);
    setSimulatedTranscript('');
    setAccuracy(0);
    setShowAccuracy(false);
    
    // In a real app, this would connect to the device's speech recognition
    console.log('Started recording...');
  };
  
  // Stop recording and process result
  const stopRecording = () => {
    setIsRecording(false);
    console.log('Stopped recording');
    
    // Simulate receiving a transcript
    // In a real app, this would come from the speech recognition API
    const transcript = scriptureText;
    setSimulatedTranscript(transcript);
    
    // Calculate accuracy
    const calculatedAccuracy = calculateAccuracy(scriptureText, simulatedTranscript);
    setAccuracy(calculatedAccuracy);
    setShowAccuracy(true);
    
    // Notify parent component
    onRecordingComplete(calculatedAccuracy);
  };
  
  // Calculate accuracy between original text and transcript
  const calculateAccuracy = (original: string, spoken: string): number => {
    if (!original || !spoken) return 0;
    
    // For demo purposes, return a random accuracy between 70 and 100
    return Math.floor(Math.random() * 30) + 70;
  };
  
  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  
  return (
    <View style={styles.container}>
      <View style={styles.controlsContainer}>
        {isRecording ? (
          <TouchableOpacity
            style={[styles.recordButton, styles.stopButton]}
            onPress={stopRecording}
            testID="stop-recording-button"
          >
            <Square size={24} color="white" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={startRecording}
            testID="start-recording-button"
          >
            <Mic size={24} color="white" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.speakButton, { backgroundColor: COLORS.secondary.main }]}
          onPress={speakScripture}
          testID="speak-scripture-button"
        >
          <Volume2 size={20} color="white" />
          <Text style={styles.speakButtonText}>Quote!</Text>
        </TouchableOpacity>
      </View>
      
      {isRecording ? (
        <Text style={[styles.recordingText, { color: textColor }]}>
          Recording... Speak now
        </Text>
      ) : (
        <Text style={[styles.recordingText, { color: textColor }]}>
          Start speaking...
        </Text>
      )}
      
      {showAccuracy && (
        <Text style={[styles.accuracyText, { color: textColor }]}>
          Accuracy: {accuracy.toFixed(2)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 16,
  },
  controlsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stopButton: {
    backgroundColor: COLORS.error,
  },
  speakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  speakButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  recordingText: {
    fontSize: 16,
    marginTop: 8,
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
});