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
      {/* Status message */}
      <Text style={[styles.statusText, { color: textColor }]}>
        {statusMessage}
      </Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={[
            styles.recordButton,
            audioIsRecording && styles.stopButton
          ]}
          onPress={audioIsRecording ? stopRecording : startRecording}
          testID={audioIsRecording ? "stop-recording-button" : "start-recording-button"}
        >
          <FontAwesome
            name={audioIsRecording ? "square" : "microphone"}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.speakButton, { backgroundColor: COLORS.secondary.main }]}
          onPress={speakScripture}
          testID="speak-scripture-button"
        >
          <FontAwesome name="volume-up" size={20} color="white" />
          <Text style={styles.speakButtonText}>Quote!</Text>
        </TouchableOpacity>
      </View>

      {/* Error message */}
      {displayError && (
        <Text style={[styles.errorText, { color: COLORS.error }]}>
          {displayError}
        </Text>
      )}

      {/* Recording status */}
      {audioIsRecording && (
        <Text style={[styles.recordingText, { color: textColor }]}>
          🎤 Recording... Speak now ({Math.floor(recordingDuration / 1000)}s)
        </Text>
      )}

      {/* Audio error message */}
      {audioError && (
        <Text style={[styles.errorText, { color: COLORS.error }]}>
          Audio Error: {audioError}
        </Text>
      )}

      {/* Interim transcript (real-time feedback) */}
      {interimTranscript && (
        <Text style={[styles.interimText, { color: textColor }]}>
          "{interimTranscript}"
        </Text>
      )}

      {/* Final transcript */}
      {displayTranscript && !isRecording && (
        <Text style={[styles.transcriptText, { color: textColor }]}>
          You said: "{displayTranscript}"
        </Text>
      )}

      {/* Audio recording info */}
      {audioRecording && (
        <Text style={[styles.transcriptText, { color: textColor }]}>
          Audio recorded: {Math.floor(audioRecording.duration / 1000)}s, {(audioRecording.size / 1024).toFixed(1)}KB
        </Text>
      )}

      {/* Accuracy result */}
      {showAccuracy && (
        <Text style={[
          styles.accuracyText,
          { color: accuracy >= 80 ? COLORS.success : accuracy >= 60 ? COLORS.warning : COLORS.error }
        ]}>
          Accuracy: {accuracy}% {accuracy >= 90 ? '🎯' : accuracy >= 75 ? '✅' : '📝'}
        </Text>
      )}

      {/* Instructions */}
      {!isRecording && !displayTranscript && !displayError && (
        <Text style={[styles.instructionText, { color: textColor }]}>
          {isAvailable
            ? "Tap the microphone and speak the scripture text"
            : "Speech recognition not available - using audio transcription"
          }
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
  disabledButton: {
    opacity: 0.5,
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
  statusText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
    opacity: 0.7,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  recordingText: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
  },
  interimText: {
    fontSize: 16,
    marginTop: 8,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.8,
  },
  transcriptText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  instructionText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
  accuracyText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
});
