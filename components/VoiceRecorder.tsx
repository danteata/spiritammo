import * as React from 'react';
import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, TouchableOpacity } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
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
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsEventType } from '@/services/analytics';

interface VoiceRecorderProps {
  scriptureText: string;
  scriptureId?: string;
  scriptureRef?: string;
  intelText?: string;
  onRecordingComplete: (accuracy: number) => void;
}

export default function VoiceRecorder({ scriptureText, scriptureId, scriptureRef, intelText, onRecordingComplete }: VoiceRecorderProps) {
  const { isDark, userSettings } = useAppStore();
  const { trackEvent, trackVoiceRecordingStart, trackVoiceRecordingComplete, trackError } = useAnalytics();

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

  // Audio player for playback - use recordingUri from the audio recording hook
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : undefined);

  // Clear transcript when scripture changes
  useEffect(() => {
    setLocalTranscript('');
    resetTranscript();
    setAccuracy(0);
    setShowAccuracy(false);
    setAudioRecording(null);
    // Cleanup player
    if (isPlaying) {
      player.pause();
    }
    setIsPlaying(false);
  }, [scriptureText]);

  // Initialize Whisper and voice recording service
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        setStatusMessage('Initializing services...');

        // Track initialization start
        trackEvent(AnalyticsEventType.WHISPER_MODEL_LOADED, {
          model_version: 'whisper',
          load_time: 0,
          success: false
        });

        // Initialize voice recording service
        await VoiceRecordingService.initialize();

        // Initialize Whisper
        const startTime = Date.now();
        await whisperService.init();
        const loadTime = Date.now() - startTime;
        console.log('Whisper initialized');
        setWhisperReady(true);

        // Track successful initialization
        trackEvent(AnalyticsEventType.WHISPER_MODEL_LOADED, {
          model_version: 'whisper',
          load_time: loadTime,
          success: true
        });

        setStatusMessage('Ready to record');
      } catch (error) {
        console.error('Failed to init services:', error);
        setStatusMessage('Service initialization failed');

        // Track initialization failure
        trackError(error as Error, 'VoiceRecorder', {
          context: 'service_initialization',
          service: 'whisper'
        });

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
      // Track TTS usage
      trackEvent(AnalyticsEventType.TTS_VOICE_CHANGED, {
        old_voice: 'none',
        new_voice: userSettings.language || 'en-US',
        language: userSettings.language || 'en-US'
      });

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

          // Track TTS playback start
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_START, {
            recording_id: 'tts_intel',
            playback_type: 'tts',
            text_length: textToSpeak.length
          });
        },
        onDone: () => {
          setStatusMessage('Ready to record');

          // Track TTS playback complete
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_COMPLETE, {
            recording_id: 'tts_intel',
            playback_type: 'tts',
            duration: 0 // Would need to calculate actual duration
          });
        },
        onError: (error) => {
          console.error('Speech error:', error);

          // Track TTS error
          trackError(new Error('TTS playback failed'), 'VoiceRecorder', {
            context: 'tts_playback',
            error_type: 'speech_error',
            text: textToSpeak.substring(0, 100) // Limit text length for privacy
          });
        }
      });
    } catch (error) {
      console.error('Failed to speak intel:', error);

      // Track TTS initialization error
      trackError(error as Error, 'VoiceRecorder', {
        context: 'tts_initialization',
        error_type: 'speech_initialization_error'
      });
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

      const transcriptionStartTime = Date.now();

      try {
        const result = await whisperService.transcribeFromFile(audioResult.uri);
        console.log('🎙️ VoiceRecorder: Whisper result:', result);

        if (result && result.text) {
          setLocalTranscript(result.text);
          const calculatedAccuracy = calculateTextAccuracy(scriptureText, result.text);
          console.log('🎙️ VoiceRecorder: Calculated accuracy from Whisper:', calculatedAccuracy);
          setAccuracy(calculatedAccuracy);
          setShowAccuracy(true);

          const transcriptionDuration = Date.now() - transcriptionStartTime;

          // Track successful recording completion
          trackVoiceRecordingComplete({
            scripture_id: scriptureId,
            recording_type: 'whisper',
            accuracy: calculatedAccuracy,
            duration: audioResult.duration || 0,
            transcription_time: transcriptionDuration,
            auto_saved: calculatedAccuracy >= 90
          });

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

                // Track recording saved
                trackEvent(AnalyticsEventType.VERSE_ADDED_TO_COLLECTION, {
                  verse_id: scriptureId || 'temp_scripture_id',
                  collection_id: 'voice_recordings',
                  reference: scriptureRef || scriptureText.substring(0, 50) + '...',
                  accuracy: calculatedAccuracy
                });
              }
            } catch (saveError) {
              console.error('Failed to save voice recording:', saveError);
              // Don't block the main flow if saving fails

              // Track save error
              trackError(saveError as Error, 'VoiceRecorder', {
                context: 'recording_save',
                error_type: 'save_failure',
                scripture_id: scriptureId
              });
            }
          }

          console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
          onRecordingComplete(calculatedAccuracy);
        } else {
          console.warn('No transcription received from whisper service');
          setStatusMessage('Transcription failed');

          // Track transcription failure
          trackError(new Error('No transcription received'), 'VoiceRecorder', {
            context: 'whisper_transcription',
            error_type: 'empty_result',
            service: 'whisper'
          });
        }
      } catch (err) {
        console.error('Whisper transcription failed:', err);
        setStatusMessage('Transcription error');

        // Track transcription error
        trackError(err as Error, 'VoiceRecorder', {
          context: 'whisper_transcription',
          error_type: 'transcription_error',
          service: 'whisper'
        });
      }
    } catch (error) {
      console.error('Error processing audio recording:', error);
      setStatusMessage('Error processing audio');

      // Track audio processing error
      trackError(error as Error, 'VoiceRecorder', {
        context: 'audio_processing',
        error_type: 'processing_error'
      });
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

          // Track native speech recognition completion
          trackVoiceRecordingComplete({
            scripture_id: scriptureId,
            recording_type: 'native_speech',
            accuracy: calculatedAccuracy,
            duration: 0, // Would need to track actual duration
            transcription_time: 0,
            auto_saved: false
          });

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

      // Track fallback recording completion
      trackVoiceRecordingComplete({
        scripture_id: scriptureId,
        recording_type: 'web_speech_fallback',
        accuracy: calculatedAccuracy,
        duration: 0, // Would need to track actual duration
        transcription_time: 0,
        auto_saved: false
      });

      console.log('🎙️ VoiceRecorder: Calling onRecordingComplete with accuracy:', calculatedAccuracy);
      onRecordingComplete(calculatedAccuracy);
    } catch (error) {
      console.error('Error processing transcript:', error);

      // Track transcript processing error
      trackError(error as Error, 'VoiceRecorder', {
        context: 'transcript_processing',
        error_type: 'processing_error',
        transcript_length: finalTranscript?.length || 0
      });
    }
  };


  // Play/pause recorded audio
  const togglePlayback = async () => {
    try {
      if (!recordingUri) return;

      if (isPlaying) {
        // Pause
        player.pause();
        setIsPlaying(false);
        setStatusMessage('Playback paused');
      } else {
        // Play - if we need to restart from beginning, seek to 0
        if (player.currentTime >= player.duration) {
          player.seekTo(0);
        }
        player.play();
        setIsPlaying(true);
        setStatusMessage('Playing recording...');
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
