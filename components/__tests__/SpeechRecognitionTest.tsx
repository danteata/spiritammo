/**
 * Speech Recognition Test Component
 * 
 * This is a simple test component to verify expo-speech-recognition is working correctly.
 * You can temporarily add this to any screen to test the implementation.
 * 
 * Usage:
 * import SpeechRecognitionTest from '@/components/__tests__/SpeechRecognitionTest';
 * 
 * Then add <SpeechRecognitionTest /> to your JSX
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { COLORS } from '@/constants/colors';

export default function SpeechRecognitionTest() {
  const {
    isRecognizing,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    hasPermission,
    start,
    stop,
    resetTranscript,
    requestPermissions,
  } = useSpeechRecognition({
    lang: 'en-US',
    interimResults: true,
    continuous: false,
    onStart: () => console.log('🎤 Started'),
    onEnd: () => console.log('🛑 Ended'),
    onResult: (text, isFinal) => {
      console.log('📝 Result:', text, 'Final:', isFinal);
    },
    onError: (errorMsg) => {
      console.error('❌ Error:', errorMsg);
    },
  });

  const handleStart = async () => {
    if (!hasPermission) {
      await requestPermissions();
    }
    await start();
  };

  const getStatusColor = () => {
    if (error) return COLORS.error;
    if (isRecognizing) return '#4CAF50'; // Green
    if (transcript) return COLORS.success;
    return '#9e9e9e'; // Gray
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Speech Recognition Test</Text>
      
      {/* Status */}
      <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.statusText}>
          {isRecognizing ? '🔴 LISTENING' : '⚪ IDLE'}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          Available: {isAvailable ? '✅' : '❌'}
        </Text>
        <Text style={styles.infoText}>
          Permission: {hasPermission ? '✅' : '❌'}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.buttonContainer}>
        {!isRecognizing ? (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStart}
          >
            <Text style={styles.buttonText}>▶️ Start Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={stop}
          >
            <Text style={styles.buttonText}>⏹️ Stop Recording</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.button, styles.resetButton]}
          onPress={resetTranscript}
        >
          <Text style={styles.buttonText}>🔄 Reset</Text>
        </TouchableOpacity>

        {!hasPermission && (
          <TouchableOpacity
            style={[styles.button, styles.permissionButton]}
            onPress={requestPermissions}
          >
            <Text style={styles.buttonText}>🔐 Request Permission</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      <ScrollView style={styles.resultsContainer}>
        {/* Interim Results */}
        {interimTranscript && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>⏳ Interim (Real-time):</Text>
            <Text style={styles.interimText}>{interimTranscript}</Text>
          </View>
        )}

        {/* Final Transcript */}
        {transcript && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>✅ Final Transcript:</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        {/* Error */}
        {error && (
          <View style={[styles.resultBox, styles.errorBox]}>
            <Text style={styles.resultLabel}>❌ Error:</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Help Text */}
        {!isRecognizing && !transcript && !error && (
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>
              {!isAvailable
                ? '⚠️ Speech recognition is not available on this device'
                : !hasPermission
                ? '🔐 Microphone permission is required'
                : '💡 Tap "Start Recording" and speak clearly into your microphone'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    margin: 10,
    minHeight: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  statusBadge: {
    padding: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
  },
  buttonContainer: {
    marginBottom: 16,
    gap: 8,
  },
  button: {
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#f44336',
  },
  resetButton: {
    backgroundColor: '#2196F3',
  },
  permissionButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
  },
  resultBox: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  errorBox: {
    borderLeftColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  helpBox: {
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 6,
  },
  interimText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#555',
  },
  transcriptText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  helpText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
});
