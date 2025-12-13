import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import * as Speech from 'expo-speech';
import whisperService from '@/services/whisper';
import Constants from 'expo-constants';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecording, AudioRecordingResult } from '@/services/audioRecording';
import { StatusIndicator } from './ui/StatusIndicator';
import { RecordingControls } from './ui/RecordingControls';
import { AccuracyBadge } from './ui/AccuracyBadge';
import { calculateTextAccuracy } from '@/utils/accuracyCalculator';
import VoiceRecordingService from '@/services/voiceRecording';
import VoicePlaybackService from '@/services/voicePlayback';

interface VoiceRecorderProps {
  scriptureText: string;
  scriptureId?: string;
  scriptureRef?: string;
  intelText?: string;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecorder({ scriptureText, scriptureId, scriptureRef, intelText, onRecordingComplete }: VoiceRecorderProps) {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [savedRecordingUri, setSavedRecordingUri] = useState<string | null>(null);

  // Clear transcript when scripture changes
  useEffect(() => {
    setLocalTranscript('');
    resetTranscript();
    setAccuracy(0);
    setShowAccuracy(false);
    setAudioRecording(null);
    // Cleanup sound
    if (sound) {
      sound.unloadAsync();
      setSound(null);
    }
    setIsPlaying(false);
  }, [scriptureText]);

  // Initialize Whisper and voice recording service
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        setStatusMessage('Initializing services...');

        // Initialize voice recording service
        await VoiceRecordingService.initialize();

        // Initialize Whisper
        await whisperService.init();
        console.log('Whisper initialized');
        setWhisperReady(true);

        setStatusMessage('Ready to record');
      } catch (error) {
        console.error('Failed to init services:', error);
        setStatusMessage('Service initialization failed');
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
          const calculatedAccuracy = calculateTextAccuracy(scriptureText, result.text);
          console.log('🎙️ VoiceRecorder: Calculated accuracy from Whisper:', calculatedAccuracy);
          setAccuracy(calculatedAccuracy);
          setShowAccuracy(true);

          // Auto-save high-accuracy recordings
          if (calculatedAccuracy >= 90) {
            try {
              const savedRecording = await VoiceRecordingService.saveRecording(
                scriptureId || 'temp_scripture_id', // Use provided scriptureId or fallback
                scriptureRef || scriptureText.substring(0, 50) + '...', // Use provided scriptureRef or fallback
                audioResult.uri,
                calculatedAccuracy,
                audioResult.duration || 0
              );

              if (savedRecording) {
                setStatusMessage(`Recording saved! ${calculatedAccuracy}% accuracy`);
                console.log('🎙️ Voice recording auto-saved:', savedRecording);
              }
            } catch (saveError) {
              console.error('Failed to save voice recording:', saveError);
              // Don't block the main flow if saving fails
            }
          }

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
          const calculatedAccuracy = calculateTextAccuracy(scriptureText, finalTranscript);
          console.log('🎙️ VoiceRecorder: Calculated accuracy:', calculatedAccuracy);
          setAccuracy(calculatedAccuracy);
          setShowAccuracy(true);
          console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
          onRecordingComplete(calculatedAccuracy);
          return;
        }
      }

      // Calculate accuracy for web speech or fallback
      const calculatedAccuracy = calculateTextAccuracy(scriptureText, finalTranscript);
      console.log('🎙️ VoiceRecorder: Calculated accuracy (fallback):', calculatedAccuracy);
      setAccuracy(calculatedAccuracy);
      setShowAccuracy(true);

      console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
      onRecordingComplete(calculatedAccuracy);
    } catch (error) {
      console.error('Error processing transcript:', error);
    }
  };


  // Play/pause recorded audio
  const togglePlayback = async () => {
    try {
      if (!recordingUri) return;

      if (isPlaying && sound) {
        // Pause
        await sound.pauseAsync();
        setIsPlaying(false);
        setStatusMessage('Playback paused');
      } else if (sound) {
        // Resume
        await sound.playAsync();
        setIsPlaying(true);
        setStatusMessage('Playing recording...');
      } else {
        // Start new playback
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: recordingUri },
          { shouldPlay: true }
        );

        setSound(newSound);
        setIsPlaying(true);
        setStatusMessage('Playing recording...');

        // Handle playback finished
        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            setStatusMessage('Playback finished');
          }
        });
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setStatusMessage('Playback error');
    }
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
          <StatusIndicator isActive={isRecording} isLoading={false} isError={false} />
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
        {showAccuracy && <AccuracyBadge accuracy={accuracy} />}
      </View>

      {/* Controls */}
      <RecordingControls
        isRecording={audioIsRecording}
        isRecognizing={isRecognizing}
        isLoading={isInitializing}
        onSpeakIntel={speakIntel}
        onToggleRecording={audioIsRecording || isRecognizing ? stopRecording : startRecording}
        textColor={textColor}
        hasRecording={!!recordingUri && showAccuracy}
        isPlaying={isPlaying}
        onTogglePlayback={togglePlayback}
      />
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
