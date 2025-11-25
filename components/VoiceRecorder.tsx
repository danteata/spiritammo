import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
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
  intelText?: string;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecorder({ scriptureText, intelText, onRecordingComplete }: VoiceRecorderProps) {
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
  const [whisperReady, setWhisperReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Clear transcript when scripture changes
  useEffect(() => {
    setLocalTranscript('');
    resetTranscript();
    setAccuracy(0);
    setShowAccuracy(false);
    setAudioRecording(null);
  }, [scriptureText]);

  // Initialize Whisper and check availability
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        setStatusMessage('Initializing Whisper model...');
        await whisperService.init();
        console.log('Whisper initialized');
        setWhisperReady(true);
      } catch (error) {
        console.error('Failed to init whisper:', error);
        // Fallback handled by status effect
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, [isAvailable, hasPermission]);

  // Update status message during recording or settings change
  useEffect(() => {
    if (isRecognizing) {
      setStatusMessage('Listening... Speak now');
    } else if (audioIsRecording) {
      setStatusMessage(`Recording... ${Math.floor(recordingDuration / 1000)}s`);
    } else if (showAccuracy) {
      setStatusMessage(`Accuracy: ${accuracy}%`);
    } else if (!isInitializing) {
      // Idle state - check settings
      if (!hasPermission) {
        setStatusMessage('Microphone permission needed');
      } else if (userSettings.voiceEngine === 'whisper' && whisperReady) {
        setStatusMessage('Ready to record');
      } else if (isAvailable) {
        setStatusMessage('Ready to listen');
      } else {
        setStatusMessage('Ready to listen');
      }
    }
  }, [isRecognizing, audioIsRecording, recordingDuration, showAccuracy, accuracy, isInitializing, userSettings.voiceEngine, whisperReady, hasPermission, isAvailable]);

  // Speak the intel text
  const speakIntel = async () => {
    try {
      // Stop any existing speech
      await Speech.stop();

      const textToSpeak = intelText || "No tactical intel available for this target.";

      // Start new speech with proper settings
      await Speech.speak(textToSpeak, {
        rate: userSettings.voiceRate || 0.9,
        pitch: userSettings.voicePitch || 1.0,
        language: userSettings.language || 'en-US',
        onStart: () => {
          setStatusMessage('Reading intel...');
        },
        onDone: () => {
          setStatusMessage('Ready to record');
        },
        onError: (error) => {
          console.error('Speech error:', error);
        }
      });
    } catch (error) {
      console.error('Failed to speak intel:', error);
    }
  };  // Start recording
  const startRecording = async () => {
    try {
      // Clear previous results
      resetTranscript();
      setLocalTranscript('');
      setAccuracy(0);
      setShowAccuracy(false);
      setAudioRecording(null);

      // Check if we should use Whisper based on settings and availability
      console.log('🎤 VoiceRecorder: userSettings.voiceEngine:', userSettings.voiceEngine)
      console.log('🎤 VoiceRecorder: whisperReady:', whisperReady)

      if (whisperReady && userSettings.voiceEngine === 'whisper') {
        try {
          console.log('🎤 Starting Whisper recording...')
          // 1. Prefer Whisper (Audio Recording) if available
          if (Platform.OS !== 'web') {
            const audioSuccess = await startAudioRecording();
            if (audioSuccess) {
              console.log('Audio recording started (Whisper mode)');
              setStatusMessage('Recording... (Whisper)');
              return;
            }
          }
        } catch (error) {
          console.error('Whisper recording failed, falling back to native:', error)
          // Fallback to native if Whisper fails
          // 2. Fallback to Native Speech Recognition
          if (isAvailable) {
            const success = await startSpeechRecognition();
            if (success) {
              setStatusMessage('Speech recognition active');
              return;
            }
          }
        }
      } else {
        console.log('🎤 Starting Native recording (Preference: ' + userSettings.voiceEngine + ')')
        // 2. Fallback to Native Speech Recognition
        if (isAvailable) {
          const success = await startSpeechRecognition();
          if (success) {
            setStatusMessage('Speech recognition active');
            return;
          }
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
      setStatusMessage('Transcribing...');
      console.log('🎙️ VoiceRecorder: Processing audio with Whisper:', audioResult.uri);

      try {
        const result = await whisperService.transcribeFromFile(audioResult.uri);
        console.log('🎙️ VoiceRecorder: Whisper result:', result);

        if (result && result.text) {
          setLocalTranscript(result.text);
          const calculatedAccuracy = calculateAccuracy(scriptureText, result.text);
          console.log('🎙️ VoiceRecorder: Calculated accuracy from Whisper:', calculatedAccuracy);
          setAccuracy(calculatedAccuracy);
          setShowAccuracy(true);
          console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
          onRecordingComplete(calculatedAccuracy);
        } else {
          console.warn('No transcription received from whisper service');
          setStatusMessage('Transcription failed');
        }
      } catch (err) {
        console.error('Whisper transcription failed:', err);
        setStatusMessage('Transcription error');
      }
    } catch (error) {
      console.error('Error processing audio recording:', error);
      setStatusMessage('Error processing audio');
    }
  };

  // Process the final transcript and calculate accuracy
  const processTranscript = async (finalTranscript: string) => {
    try {
      console.log('🎙️ VoiceRecorder: processTranscript called with:', finalTranscript);
      // For native platforms or when web speech isn't available, try whisper
      if (Platform.OS !== 'web' || !isAvailable) {
        // If we have a final transcript from native dictation, use it.
        // Otherwise, if we were doing audio recording, we handled it in processAudioRecording.
        if (finalTranscript) {
          const calculatedAccuracy = calculateAccuracy(scriptureText, finalTranscript);
          console.log('🎙️ VoiceRecorder: Calculated accuracy:', calculatedAccuracy);
          setAccuracy(calculatedAccuracy);
          setShowAccuracy(true);
          console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
          onRecordingComplete(calculatedAccuracy);
          return;
        }
      }

      // Calculate accuracy for web speech or fallback
      const calculatedAccuracy = calculateAccuracy(scriptureText, finalTranscript);
      console.log('🎙️ VoiceRecorder: Calculated accuracy (fallback):', calculatedAccuracy);
      setAccuracy(calculatedAccuracy);
      setShowAccuracy(true);

      console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
      onRecordingComplete(calculatedAccuracy);
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  };

  // Calculate accuracy using Levenshtein distance
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

    const s1 = normalizeText(original);
    const s2 = normalizeText(spoken);

    if (s1 === s2) return 100;
    if (s1.length === 0) return 0;
    if (s2.length === 0) return 0;

    // Levenshtein distance algorithm
    const track = Array(s2.length + 1).fill(null).map(() =>
      Array(s1.length + 1).fill(null));

    for (let i = 0; i <= s1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= s2.length; j += 1) {
      for (let i = 1; i <= s1.length; i += 1) {
        const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    const distance = track[s2.length][s1.length];
    const maxLength = Math.max(s1.length, s2.length);

    // Calculate similarity percentage
    const similarity = 1 - (distance / maxLength);
    return Math.round(similarity * 100);
  };

  const textColor = isDark ? COLORS.text.dark : COLORS.text.light;
  const isRecording = isRecognizing || audioIsRecording;
  const displayError = speechError || audioError;
  const displayTranscript = transcript || localTranscript;

  return (
    <View style={styles.container}>
      {/* Comms Panel Header */}
      <View style={styles.panelHeader}>
        {isInitializing || statusMessage.includes('Transcribing') || statusMessage.includes('Initializing') ? (
          <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />
        ) : (
          <View style={[styles.statusIndicator, isRecording ? styles.statusActive : styles.statusStandby]} />
        )}
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
          <View style={styles.waveformContainer}>
            <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
            <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
            <View style={[styles.waveformBar, { height: 24, opacity: 0.7 }]} />
            <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
            <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
          </View>
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
          onPress={speakIntel}
          testID="speak-intel-button"
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
    minHeight: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
  },
  displayText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 24,
  },
  waveformBar: {
    width: 3,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  accuracyBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accuracyText: {
    color: 'white',
    fontSize: 9,
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
