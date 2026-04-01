import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator, Animated } from 'react-native';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import { COLORS } from '@/constants/colors';
import { useAppStore } from '@/hooks/useAppStore';
import * as Speech from 'expo-speech';
import whisperService from '@/services/whisper';
import neuralTTSService, { speakWithNeuralTTS, TTSProgress } from '@/services/neuralTTS';
import Constants from 'expo-constants';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useAudioRecording, AudioRecordingResult } from '@/services/audioRecording';
import { StatusIndicator } from './ui/StatusIndicator';
import { RecordingControls } from './ui/RecordingControls';
import { AccuracyBadge } from './ui/AccuracyBadge';
import AccuracyTarget from './ui/AccuracyTarget';
import { calculateTextAccuracy } from '@/utils/accuracyCalculator';
import VoiceRecordingService from '@/services/voiceRecording';
import VoicePlaybackService from '@/services/voicePlayback';
import { useAnalytics } from '@/hooks/useAnalytics';
import { AnalyticsEventType } from '@/services/analytics';

// Format recording time as MM:SS
const formatRecordingTime = (ms: number): string => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

// Animated waveform bar component
interface AnimatedWaveformBarProps {
  isActive: boolean;
  delay: number;
}

const AnimatedWaveformBar: React.FC<AnimatedWaveformBarProps> = ({ isActive, delay }) => {
  const animatedHeight = useRef(new Animated.Value(10));
  const animatedOpacity = useRef(new Animated.Value(0.3));

  React.useEffect(() => {
    if (isActive) {
      // Create random height animation
      const animate = () => {
        const randomHeight = Math.random() * 20 + 10; // 10-30
        const randomOpacity = Math.random() * 0.5 + 0.5; // 0.5-1.0

        Animated.parallel([
          Animated.timing(animatedHeight.current, {
            toValue: randomHeight,
            duration: 150,
            useNativeDriver: false,
          }),
          Animated.timing(animatedOpacity.current, {
            toValue: randomOpacity,
            duration: 150,
            useNativeDriver: false,
          }),
        ]).start(() => {
          if (isActive) {
            setTimeout(animate, 50 + delay);
          }
        });
      };

      setTimeout(animate, delay);
    } else {
      // Reset to default
      Animated.parallel([
        Animated.timing(animatedHeight.current, {
          toValue: 10,
          duration: 200,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacity.current, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [isActive, delay]);

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        {
          height: animatedHeight.current,
          opacity: animatedOpacity.current,
        },
      ]}
    />
  );
};

interface VoiceRecorderProps {
  scriptureText: string;
  scriptureId?: string;
  scriptureRef?: string;
  intelText?: string;
  onRecordingComplete: (accuracy: number) => void;
  variant?: 'default' | 'embedded';
  onRecordingStateChange?: (isRecording: boolean) => void;
  hideListen?: boolean;
}

export default function VoiceRecorder({
  scriptureText,
  scriptureId,
  scriptureRef,
  intelText,
  onRecordingComplete,
  variant = 'default',
  onRecordingStateChange,
  hideListen = false,
}: VoiceRecorderProps) {
  const { isDark, userSettings, theme } = useAppStore();
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
    continuous: true,
    onResult: (resultTranscript, isFinal) => {
      if (activeEngineRef.current === 'native') {
        if (isFinal) {
          const combined = [nativeTranscriptRef.current, resultTranscript].filter(Boolean).join(' ').trim();
          nativeTranscriptRef.current = combined;
          setLocalTranscript(combined);
        } else {
          const combined = [nativeTranscriptRef.current, resultTranscript].filter(Boolean).join(' ').trim();
          setLocalTranscript(combined);
        }
        return;
      }

      if (isFinal) {
        processTranscript(resultTranscript);
      }
    },
    onError: (errorMessage) => {
      console.error('Speech recognition error:', errorMessage);
    },
    onEnd: () => {
      // Debounce restart to prevent rapid restarts on short pauses
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }

      if (!manualStopRef.current && keepListeningRef.current && activeEngineRef.current === 'native') {
        restartTimeoutRef.current = setTimeout(async () => {
          try {
            await startSpeechRecognition();
          } catch (error) {
            console.warn('Failed to restart speech recognition:', error);
            keepListeningRef.current = false;
          }
        }, 500); // Small delay to prevent rapid restarts
      }
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [ttsProgress, setTtsProgress] = useState(0); // Neural TTS download progress (0-100)
  const activeEngineRef = useRef<'native' | 'whisper' | 'audio' | null>(null);
  const keepListeningRef = useRef(false);
  const manualStopRef = useRef(false);
  const nativeTranscriptRef = useRef('');
  const restartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Maximum recording duration (90 seconds to prevent runaway recordings)
  const MAX_RECORDING_DURATION = 90000;

  // Audio player for playback - use recordingUri from the audio recording hook
  const player = useAudioPlayer(recordingUri ? { uri: recordingUri } : undefined);

  const isRecording = isRecognizing || audioIsRecording;

  useEffect(() => {
    onRecordingStateChange?.(isRecording);
  }, [isRecording, onRecordingStateChange]);

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
        const whisperAvailable = whisperService.isAvailable();
        if (whisperAvailable) {
          console.log('Whisper initialized');
        } else {
          console.warn('Whisper unavailable, falling back to native');
        }
        setWhisperReady(whisperAvailable);

        // Track successful initialization
        trackEvent(AnalyticsEventType.WHISPER_MODEL_LOADED, {
          model_version: 'whisper',
          load_time: loadTime,
          success: whisperAvailable
        });

        setStatusMessage('READY FOR DEPLOYMENT');
      } catch (error) {
        console.error('Failed to init services:', error);
        setStatusMessage('COMMS INITIALIZATION FAILED');

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
    } else if (!isInitializing && !isProcessing) {
      // Idle state - check settings
      if (!hasPermission) {
        setStatusMessage('MICROPHONE PERMISSION NEEDED');
      } else if (userSettings.voiceEngine === 'whisper' && whisperReady) {
        setStatusMessage('READY TO RECORD');
      } else if (isAvailable) {
        setStatusMessage('READY TO LISTEN');
      } else {
        setStatusMessage('IDLE');
      }
    }
  }, [isRecognizing, audioIsRecording, recordingDuration, showAccuracy, accuracy, isInitializing, isProcessing, userSettings.voiceEngine, whisperReady, hasPermission, isAvailable]);

  // Speak the verse text using neural TTS
  const speakVerse = async () => {
    try {
      if (!scriptureText) return;
      await Speech.stop();
      await neuralTTSService.stop();
      setStatusMessage('Preparing speech...');

      await speakWithNeuralTTS(scriptureText, {
        onProgress: (progress: TTSProgress) => {
          setTtsProgress(progress.progress);
          if (progress.status === 'downloading') {
            setStatusMessage(`Downloading voice model: ${progress.progress.toFixed(0)}%`);
          } else if (progress.status === 'initializing') {
            setStatusMessage('Initializing speech engine...');
          } else if (progress.status === 'playing') {
            setStatusMessage('Listening to targets...');
          }
        },
        onStart: () => {
          setStatusMessage('Listening to targets...');
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_START, {
            recording_id: 'tts_verse',
            playback_type: 'neural_tts',
            text_length: scriptureText.length
          });
        },
        onDone: () => {
          setTtsProgress(0);
          setStatusMessage('Ready to record');
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_COMPLETE, {
            recording_id: 'tts_verse',
            playback_type: 'neural_tts',
            duration: 0
          });
        },
        onError: (error: Error) => {
          setTtsProgress(0);
          setStatusMessage('Error reading verse');
          trackError(error, 'speakVerse_TTS_error');
        }
      });
    } catch (error: any) {
      console.error('Error in speakVerse:', error);
      setStatusMessage('Speech engine error');
    }
  };

  // Speak the intel text (mnemonic) using neural TTS
  const speakIntel = async () => {
    try {
      trackEvent(AnalyticsEventType.TTS_VOICE_CHANGED, {
        old_voice: 'none',
        new_voice: userSettings.language || 'en-US',
        language: userSettings.language || 'en-US'
      });
      await Speech.stop();
      await neuralTTSService.stop();
      const textToSpeak = intelText || "No tactical intel available for this target.";
      setStatusMessage('Preparing speech...');

      await speakWithNeuralTTS(textToSpeak, {
        onProgress: (progress: TTSProgress) => {
          setTtsProgress(progress.progress);
          if (progress.status === 'downloading') {
            setStatusMessage(`Downloading voice model: ${progress.progress.toFixed(0)}%`);
          } else if (progress.status === 'initializing') {
            setStatusMessage('Initializing speech engine...');
          } else if (progress.status === 'playing') {
            setStatusMessage('Reading intel...');
          }
        },
        onStart: () => {
          setStatusMessage('Reading intel...');
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_START, {
            recording_id: 'tts_intel',
            playback_type: 'neural_tts',
            text_length: textToSpeak.length
          });
        },
        onDone: () => {
          setTtsProgress(0);
          setStatusMessage('Ready to record');
          trackEvent(AnalyticsEventType.VOICE_PLAYBACK_COMPLETE, {
            recording_id: 'tts_intel',
            playback_type: 'neural_tts',
            duration: 0
          });
        },
        onError: (error: Error) => {
          setTtsProgress(0);
          setStatusMessage('Error reading intel');
          trackError(error, 'speakIntel_TTS_error');
        }
      });
    } catch (error: any) {
      console.error('Error in speakIntel:', error);
      setStatusMessage('Speech engine error');
    }
  };  // Start recording
  const startRecording = async () => {
    try {
      await VoicePlaybackService.stopPlayback()
      await Speech.stop()
      await neuralTTSService.stop()
      if (isPlaying) {
        player.pause()
        setIsPlaying(false)
      }

      // Clear previous results
      resetTranscript();
      setLocalTranscript('');
      setAccuracy(0);
      setShowAccuracy(false);
      setIsProcessing(false);
      setAudioRecording(null);
      nativeTranscriptRef.current = '';
      manualStopRef.current = false;
      keepListeningRef.current = false;
      activeEngineRef.current = null;

      // Clear any pending timeouts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }

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
              activeEngineRef.current = 'whisper';
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
            try {
              activeEngineRef.current = 'native';
              keepListeningRef.current = true;
              const success = await startSpeechRecognition();
              if (success) {
                setStatusMessage('Speech recognition active');

                // Set max recording duration timeout
                maxDurationTimeoutRef.current = setTimeout(() => {
                  console.log('Max recording duration reached, auto-stopping');
                  stopRecording();
                }, MAX_RECORDING_DURATION);

                return;
              }
            } catch (nativeError) {
              console.error('Native speech recognition fallback failed:', nativeError);
              trackError(new Error(`Native speech recognition fallback failed: ${nativeError}`), 'VoiceRecorder', {
                context: 'tts_native_fallback',
                error_type: 'speech_recognition_fallback_failed'
              });
            }
            keepListeningRef.current = false;
            activeEngineRef.current = null;
          }
        }
      } else {
        console.log('🎤 Starting Native recording (Preference: ' + userSettings.voiceEngine + ')')
        // 2. Fallback to Native Speech Recognition
        if (isAvailable) {
          try {
            activeEngineRef.current = 'native';
            keepListeningRef.current = true;
            const success = await startSpeechRecognition();
            if (success) {
              setStatusMessage('Speech recognition active');

              // Set max recording duration timeout
              maxDurationTimeoutRef.current = setTimeout(() => {
                console.log('Max recording duration reached, auto-stopping');
                stopRecording();
              }, MAX_RECORDING_DURATION);

              return;
            }
          } catch (error) {
            console.error('Native speech recognition failed:', error);
            trackError(new Error(`Speech recognition start failed: ${error}`), 'VoiceRecorder', {
              context: 'tts_native_start',
              error_type: 'speech_recognition_start_failed'
            });
          }
          keepListeningRef.current = false;
          activeEngineRef.current = null;
        }
      }

      // Fallback to audio recording (for platforms without native speech recognition)
      if (Platform.OS !== 'web') {
        const audioSuccess = await startAudioRecording();
        if (audioSuccess) {
          activeEngineRef.current = whisperReady ? 'whisper' : 'audio';
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
      // Clear max duration timeout
      if (maxDurationTimeoutRef.current) {
        clearTimeout(maxDurationTimeoutRef.current);
        maxDurationTimeoutRef.current = null;
      }

      // Clear restart timeout
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }

      if (isRecognizing) {
        // Stop speech recognition
        manualStopRef.current = true;
        keepListeningRef.current = false;
        stopSpeechRecognition();

        if (activeEngineRef.current === 'native') {
          const finalTranscript = nativeTranscriptRef.current || transcript || localTranscript;
          if (finalTranscript) {
            processTranscript(finalTranscript.trim());
          } else {
            setStatusMessage('No speech detected');
          }
          nativeTranscriptRef.current = '';
        }

        return;
      }

      if (audioIsRecording) {
        // Stop audio recording
        const audioResult = await stopAudioRecording();
        if (audioResult) {
          setAudioRecording(audioResult);
          console.log('Audio recording stopped:', audioResult);
          // Process the audio file with whisper if available
          setIsProcessing(true);
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
      // Varied military-themed transcription status messages
      const statusMsgs = [
        'DECODING TRANSMISSION...',
        'ANALYZING BATTLEFIELD INTEL...',
        'EXTRACTING VERSE FREQUENCIES...',
        'RUNNING BALLISTICS ANALYSIS...',
        'DECRYPTING COMMS...',
        'FILTERING SIGNAL NOISE...',
        'ESTABLISHING SECURE UPLINK...',
        'CALIBRATING TACTICAL DATA...',
        'TRIANGULATING SCRIPTURE...',
        'FINALIZING MISSION BRIEF...',
        'ESTABLISHING VIRTUAL SIGHT...',
        'SYNCRONIZING SQUAD COMMS...',
        'VERIFYING TARGET SECTOR...'
      ];
      const randomMsg = statusMsgs[Math.floor(Math.random() * statusMsgs.length)];
      setStatusMessage(randomMsg);
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
    } finally {
      setIsProcessing(false);
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
  const displayError = speechError || audioError;
  const displayTranscript = localTranscript || transcript;

  const isEmbedded = variant === 'embedded';

  return (
    <View style={[styles.container, isEmbedded && styles.embeddedContainer]}>
      {/* Comms Panel Header */}
      <View style={styles.panelHeader}>
        {isInitializing || isProcessing ? (
          <ActivityIndicator size="small" color={textColor} style={{ marginRight: 8 }} />
        ) : (
          <StatusIndicator isActive={isRecording} isLoading={false} isError={false} />
        )}
        <Text style={[styles.statusText, { color: textColor }]}>
          {statusMessage.toUpperCase()}
        </Text>
      </View>

      {/* Main Comms Display */}
      <View style={[styles.commsDisplay, isEmbedded && styles.embeddedCommsDisplay]}>
        {displayError ? (
          <Text style={[styles.displayText, { color: COLORS.error }]}>{displayError}</Text>
        ) : displayTranscript ? (
          <Text style={[styles.displayText, { color: textColor }]}>"{displayTranscript}"</Text>
        ) : interimTranscript ? (
          <Text style={[styles.displayText, { color: textColor, opacity: 0.7 }]}>{interimTranscript}...</Text>
        ) : (
          <>
            <View style={styles.waveformContainer}>
              {/* Animated waveform bars for recording feedback */}
              {isRecording ? (
                <>
                  <AnimatedWaveformBar key="1" isActive={true} delay={0} />
                  <AnimatedWaveformBar key="2" isActive={true} delay={100} />
                  <AnimatedWaveformBar key="3" isActive={true} delay={200} />
                  <AnimatedWaveformBar key="4" isActive={true} delay={100} />
                  <AnimatedWaveformBar key="5" isActive={true} delay={0} />
                </>
              ) : (
                <>
                  <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
                  <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
                  <View style={[styles.waveformBar, { height: 24, opacity: 0.7 }]} />
                  <View style={[styles.waveformBar, { height: 16, opacity: 0.5 }]} />
                  <View style={[styles.waveformBar, { height: 10, opacity: 0.3 }]} />
                </>
              )}
            </View>
            {!isRecording && !showAccuracy && (
              <Text style={[styles.idleHint, { color: textColor }]}>Tap the mic to begin</Text>
            )}
          </>
        )}

        {/* Recording Duration Timer */}
        {isRecording && (
          <View style={styles.timerContainer}>
            <View style={styles.recordingIndicator}>
              <View style={styles.recordingDot} />
              <Text style={styles.timerText}>
                {formatRecordingTime(recordingDuration)}
              </Text>
            </View>
          </View>
        )}

        {/* Accuracy Badge */}
        {showAccuracy && <AccuracyBadge accuracy={accuracy} />}

        {/* Processing Overlay */}
        {(isProcessing || isInitializing) && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={{ marginTop: 10, color: theme.accent, fontWeight: 'bold', fontSize: 12 }}>
              {statusMessage}
            </Text>
          </View>
        )}
      </View>

      {showAccuracy && (
        <View style={styles.accuracyTargetRow}>
          <AccuracyTarget accuracy={accuracy} size={isEmbedded ? 110 : 140} />
          <View style={styles.accuracyMeta}>
            <Text style={[styles.accuracyLabel, { color: textColor }]}>SHOT PLACEMENT</Text>
            <Text style={[styles.accuracyValue, { color: theme.accent }]}>{accuracy.toFixed(1)}%</Text>
            <Text style={[styles.accuracyHint, { color: textColor }]}>
              Closer to the bullseye means higher accuracy
            </Text>
          </View>
        </View>
      )}

      <RecordingControls
        isRecording={audioIsRecording}
        isRecognizing={isRecognizing}
        isLoading={isInitializing}
        isProcessing={isProcessing || isInitializing}
        onListen={hideListen ? undefined : speakVerse}
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
  embeddedContainer: {
    marginVertical: 0,
    marginHorizontal: 0,
    padding: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
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
    position: 'relative',
  },
  embeddedCommsDisplay: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  displayText: {
    fontSize: 14,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  idleHint: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 24,
  },
  waveformBar: {
    width: 4,
    backgroundColor: 'white',
    borderRadius: 2,
  },
  timerContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  timerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  accuracyTargetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  accuracyMeta: {
    flex: 1,
    gap: 6,
  },
  accuracyLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.7,
  },
  accuracyValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  accuracyHint: {
    fontSize: 12,
    opacity: 0.6,
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
