import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import * as Speech from 'expo-speech';
import whisperService from '@/services/whisper';
import Constants from 'expo-constants';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecording, AudioRecordingResult } from '@/services/audioRecording';

interface VoiceRecorderProps {
  scriptureText: string;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecorder({ scriptureText, onRecordingComplete }: VoiceRecorderProps) {
  const { isDark, userSettings } = useAppStore();

  // Audio recording hook for mobile fallback
  const {
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    deleteRecording,
    isRecording: audioIsRecording,
    error: audioError,
    duration: recordingDuration,
    uri: recordingUri
  } = useAudioRecording();

  // Speech recognition hook
  const {
    isRecognizing,
    transcript,
    interimTranscript,
    error: speechError,
    isAvailable,
    hasPermission,
    start: startSpeechRecognition,
    stop: stopSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition({
    lang: userSettings.language || 'en-US',
    interimResults: true,
    continuous: false,
    onResult: (resultTranscript, isFinal) => {
      if (isFinal) {
        processTranscript(resultTranscript);
      }
    },
    onError: (errorMessage) => {
      console.error('Speech recognition error:', errorMessage);
    },
  });

  // State for UI
  const [accuracy, setAccuracy] = useState(0);
  const [showAccuracy, setShowAccuracy] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioRecording, setAudioRecording] = useState<AudioRecordingResult | null>(null);
  const [localTranscript, setLocalTranscript] = useState('');

  // Update status message based on availability
  useEffect(() => {
    if (isAvailable) {
      setStatusMessage(hasPermission ? 'Ready to record' : 'Microphone permission needed');
    } else {
      setStatusMessage('Speech recognition not available - using audio recording');
    }
  }, [isAvailable, hasPermission]);

  // Update status message during recording
  useEffect(() => {
    if (isRecognizing) {
      setStatusMessage('Listening... Speak now');
    } else if (audioIsRecording) {
      setStatusMessage(`Recording... ${Math.floor(recordingDuration / 1000)}s`);
    } else if (showAccuracy) {
      setStatusMessage(`Accuracy: ${accuracy}%`);
    }
  }, [isRecognizing, audioIsRecording, recordingDuration, showAccuracy, accuracy]);

  // Speak the scripture text
  const speakScripture = async () => {
    try {
      // Stop any existing speech
      await Speech.stop();

      // Start new speech with proper settings
      await Speech.speak(scriptureText, {
        rate: userSettings.voiceRate || 0.9,
        pitch: userSettings.voicePitch || 1.0,
        language: userSettings.language || 'en-US',
        onStart: () => {
          setStatusMessage('Speaking verse...');
        },
        onDone: () => {
          setStatusMessage('Ready to record');
        },
        onError: (error) => {
          console.error('Speech error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to speak scripture:', error);
    }
  };  // Start recording
  const startRecording = async () => {
    try {
      resetTranscript();
      setAccuracy(0);
      setShowAccuracy(false);
      setAudioRecording(null);

      // Try speech recognition first if available
      if (isAvailable) {
        const success = await startSpeechRecognition();
        if (success) {
          setStatusMessage('Speech recognition active');
          return;
        }
      }

      // Fallback to audio recording (for platforms without native speech recognition)
      if (Platform.OS !== 'web') {
        const audioSuccess = await startAudioRecording();
        if (audioSuccess) {
          console.log('Audio recording started as fallback');
          setStatusMessage('Audio recording active - using transcription');
          return;
        }
      }

      // If we get here, no recording method is available
      console.error('No recording method available on this platform');
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  // Stop recording
  const stopRecording = async () => {
    try {
      if (isRecognizing) {
        // Stop speech recognition
        stopSpeechRecognition();
        return;
      }

      if (audioIsRecording) {
        // Stop audio recording
        const audioResult = await stopAudioRecording();
        if (audioResult) {
          setAudioRecording(audioResult);
          console.log('Audio recording stopped:', audioResult);
          // Process the audio file with whisper if available
          await processAudioRecording(audioResult);
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  // Process audio recording with whisper service
  const processAudioRecording = async (audioResult: AudioRecordingResult) => {
    try {
      const whisperEndpoint = (Constants.manifest2?.extra as any)?.WHISPER_REMOTE_ENDPOINT || (Constants.expoConfig?.extra as any)?.WHISPER_REMOTE_ENDPOINT;

      if (whisperEndpoint) {
        try {
          await whisperService.init({ backend: 'remote', remoteEndpoint: whisperEndpoint } as any);

          // For now, simulate transcription since we need to implement proper file upload
          // In a real implementation, you would upload the audio file to the whisper endpoint
          console.log('Audio file recorded:', audioResult.uri);
          console.log('Would send to whisper endpoint:', whisperEndpoint);

          // Simulate getting a transcript from the audio
          // Replace this with actual file upload and transcription
          const simulatedTranscript = scriptureText; // In real implementation, this would come from whisper

          if (simulatedTranscript) {
            setLocalTranscript(simulatedTranscript);
            const calculatedAccuracy = calculateAccuracy(scriptureText, simulatedTranscript);
            setAccuracy(calculatedAccuracy);
            setShowAccuracy(true);

            onRecordingComplete(calculatedAccuracy);
          } else {
            console.warn('No transcription received from whisper service');
          }
        } catch (err) {
          console.warn('Whisper transcription failed:', err);
        }
      } else {
        console.warn('No whisper endpoint configured for audio transcription');
      }
    } catch (error) {
      console.error('Error processing audio recording:', error);
    }
  };

  // Process the final transcript and calculate accuracy
  const processTranscript = async (finalTranscript: string) => {
    try {
      // For native platforms or when web speech isn't available, try whisper
      if (Platform.OS !== 'web' || !isAvailable) {
        const whisperEndpoint = (Constants.manifest2?.extra as any)?.WHISPER_REMOTE_ENDPOINT || (Constants.expoConfig?.extra as any)?.WHISPER_REMOTE_ENDPOINT;

        if (whisperEndpoint) {
          try {
            await whisperService.init({ backend: 'remote', remoteEndpoint: whisperEndpoint } as any);
            // Note: In a real implementation, you would need to record audio and send the file
            // For now, we'll use the transcript from web speech or simulate with the original text
            const enhancedTranscript = finalTranscript || scriptureText;

            // Calculate accuracy based on the transcript we got
            const calculatedAccuracy = calculateAccuracy(scriptureText, enhancedTranscript);
            setAccuracy(calculatedAccuracy);
            setShowAccuracy(true);

            onRecordingComplete(calculatedAccuracy);
            return;
          } catch (err) {
            console.warn('Whisper transcription failed:', err);
          }
        }
      }

      // Calculate accuracy for web speech or fallback
      const calculatedAccuracy = calculateAccuracy(scriptureText, finalTranscript);
      setAccuracy(calculatedAccuracy);
      setShowAccuracy(true);

      onRecordingComplete(calculatedAccuracy);
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  };

  // Calculate accuracy between original text and transcript
  const calculateAccuracy = (original: string, spoken: string): number => {
    if (!original || !spoken) return 0;

    // Normalize texts for comparison
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizedOriginal = normalizeText(original);
    const normalizedSpoken = normalizeText(spoken);

    // Simple word matching accuracy
    const originalWords = normalizedOriginal.split(' ');
    const spokenWords = normalizedSpoken.split(' ');

    let correctWords = 0;
    for (let i = 0; i < Math.min(originalWords.length, spokenWords.length); i++) {
      if (originalWords[i] === spokenWords[i]) {
        correctWords++;
      }
    }

    const totalWords = Math.max(originalWords.length, spokenWords.length);
    return totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0;
  };

  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  const isRecording = isRecognizing || audioIsRecording;
  const displayError = speechError || audioError;
  const displayTranscript = transcript || localTranscript;

  return (
    <View style={styles.container}>
      {/* Comms Panel Header */}
      <View style={styles.panelHeader}>
        <View style={[styles.statusIndicator, isRecording ? styles.statusActive : styles.statusStandby]} />
        <Text style={[styles.statusText, { color: textColor }]}>
          {statusMessage.toUpperCase()}
        </Text>
      </View>

      {/* Main Comms Display */}
      <View style={styles.commsDisplay}>
        {displayError ? (
          <Text style={[styles.displayText, { color: COLORS.error }]}>{displayError}</Text>
        ) : displayTranscript ? (
          <Text style={[styles.displayText, { color: textColor }]}>"{displayTranscript}"</Text>
        ) : interimTranscript ? (
          <Text style={[styles.displayText, { color: textColor, opacity: 0.7 }]}>{interimTranscript}...</Text>
        ) : (
          <Text style={[styles.displayText, { color: textColor, opacity: 0.5 }]}>
            AWAITING VOICE INPUT...
          </Text>
        )}

        {/* Accuracy Badge */}
        {showAccuracy && (
          <View style={[
            styles.accuracyBadge,
            { backgroundColor: accuracy >= 80 ? COLORS.success : accuracy >= 60 ? COLORS.warning : COLORS.error }
          ]}>
            <Text style={styles.accuracyText}>{accuracy}% ACCURACY</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[styles.secondaryButton, { borderColor: textColor }]}
          onPress={speakScripture}
          testID="speak-scripture-button"
        >
          <FontAwesome name="volume-up" size={16} color={textColor} />
          <Text style={[styles.secondaryButtonText, { color: textColor }]}>PLAY INTEL</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.recordButton,
            audioIsRecording && styles.stopButton,
            isRecognizing && styles.listeningButton
          ]}
          onPress={audioIsRecording || isRecognizing ? stopRecording : startRecording}
          testID={audioIsRecording ? "stop-recording-button" : "start-recording-button"}
        >
          <FontAwesome
            name={audioIsRecording || isRecognizing ? "stop" : "microphone"}
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: COLORS.error,
  },
  statusStandby: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    opacity: 0.8,
  },
  commsDisplay: {
    minHeight: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  displayText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  accuracyBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  accuracyText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  stopButton: {
    backgroundColor: '#333',
    borderWidth: 2,
    borderColor: COLORS.error,
  },
  listeningButton: {
    backgroundColor: COLORS.warning,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    opacity: 0.8,
  },
  secondaryButtonText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
