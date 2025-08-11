import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import * as Speech from 'expo-speech';

interface VoiceState {
  isRecording: boolean;
  transcript: string;
  partialTranscript: string;
  error: string | null;
  accuracy: number;
  isLoading: boolean;
}

const INITIAL_STATE: VoiceState = {
  isRecording: false,
  transcript: '',
  partialTranscript: '',
  error: null,
  accuracy: 0,
  isLoading: true,
};

// Clean voice recognition hook using expo-speech-recognition
export function useExpoVoiceRecognition() {
  const [state, setState] = useState<VoiceState>(INITIAL_STATE);
  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false);

  // Update state helper
  const updateState = useCallback((updates: Partial<VoiceState>) => {
    if (isMountedRef.current) {
      setState(prevState => ({ ...prevState, ...updates }));
    }
  }, []);

  // Event handlers using the expo-speech-recognition hooks
  useSpeechRecognitionEvent('start', () => {
    console.log('Expo Speech Recognition started');
    updateState({
      isRecording: true,
      error: null,
      transcript: '',
      partialTranscript: '',
    });
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('Expo Speech Recognition ended');
    updateState({ isRecording: false });
  });

  useSpeechRecognitionEvent('result', (event) => {
    console.log('Expo Speech Recognition result:', event);
    if (event.results && event.results.length > 0) {
      const result = event.results[0];
      if (event.isFinal) {
        updateState({ transcript: result.transcript });
      } else {
        updateState({ partialTranscript: result.transcript });
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Expo Speech Recognition error:', event);
    updateState({
      error: `${event.error}: ${event.message}`,
      isRecording: false,
    });
  });

  // Initialize voice recognition
  const initializeVoice = useCallback(async () => {
    if (isInitializedRef.current) return;

    console.log('Initializing Expo Speech Recognition...');

    try {
      // Platform check
      if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
        throw new Error('Speech recognition only supported on iOS and Android');
      }

      // Check permissions
      const permissionResult = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log('Current permissions:', permissionResult);

      isInitializedRef.current = true;
      updateState({ isLoading: false, error: null });

      console.log('Expo Speech Recognition initialized successfully');

    } catch (error) {
      console.error('Expo Speech Recognition initialization error:', error);
      updateState({
        error: error instanceof Error ? error.message : String(error),
        isLoading: false,
      });
    }
  }, [updateState]);

  // Start recording
  const startRecording = useCallback(async (): Promise<boolean> => {
    console.log('Starting Expo Speech Recognition...');

    if (!isInitializedRef.current) {
      console.error('Voice not initialized');
      updateState({ error: 'Voice recognition not initialized' });
      return false;
    }

    if (state.isRecording) {
      console.log('Already recording');
      return false;
    }

    try {
      updateState({ error: null });

      // Request permissions
      const permissionResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      
      if (!permissionResult.granted) {
        console.error('Permissions not granted:', permissionResult);
        updateState({ error: 'Microphone permission required' });
        return false;
      }

      console.log('Permissions granted, starting speech recognition...');

      // Start speech recognition with comprehensive options
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
        // Android-specific options to reduce beep sounds
        androidIntentOptions: {
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 3000,
          EXTRA_MASK_OFFENSIVE_WORDS: false,
        },
      });

      console.log('Expo Speech Recognition started successfully');
      return true;

    } catch (error) {
      console.error('Start recording error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      updateState({ 
        error: errorMessage,
        isRecording: false 
      });
      return false;
    }
  }, [state.isRecording, updateState]);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<boolean> => {
    console.log('Stopping Expo Speech Recognition...');

    try {
      ExpoSpeechRecognitionModule.stop();
      console.log('Expo Speech Recognition stopped successfully');
      return true;

    } catch (error) {
      console.error('Stop recording error:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to stop recording',
        isRecording: false 
      });
      return false;
    }
  }, [updateState]);

  // Cancel recording
  const cancelRecording = useCallback(async (): Promise<boolean> => {
    console.log('Canceling Expo Speech Recognition...');

    try {
      ExpoSpeechRecognitionModule.abort();
      console.log('Expo Speech Recognition canceled successfully');
      return true;

    } catch (error) {
      console.error('Cancel recording error:', error);
      updateState({ 
        error: error instanceof Error ? error.message : 'Failed to cancel recording',
        isRecording: false 
      });
      return false;
    }
  }, [updateState]);

  // Speak text
  const speak = useCallback(async (text: string): Promise<boolean> => {
    if (!text?.trim()) {
      console.warn('No text provided to speak');
      return false;
    }

    try {
      if (Speech.isSpeakingAsync) {
        const isSpeaking = await Speech.isSpeakingAsync();
        if (isSpeaking) {
          await Speech.stop();
        }
      }

      const options = {
        rate: 0.9,
        pitch: 1.0,
        language: 'en-US',
        volume: 1.0,
      };

      await Speech.speak(text, options);
      return true;
    } catch (error) {
      console.error('Failed to speak text:', error);
      return false;
    }
  }, []);

  // Calculate accuracy
  const calculateAccuracy = useCallback((original: string, spoken: string): number => {
    if (!original?.trim() || !spoken?.trim()) return 0;

    const normalizeText = (text: string): string => {
      return text.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    };

    const normalizedOriginal = normalizeText(original);
    const normalizedSpoken = normalizeText(spoken);

    if (normalizedOriginal === normalizedSpoken) return 100;

    const originalWords = normalizedOriginal.split(' ');
    const spokenWords = normalizedSpoken.split(' ');
    
    const maxLength = Math.max(originalWords.length, spokenWords.length);
    if (maxLength === 0) return 0;
    
    let matches = 0;
    const minLength = Math.min(originalWords.length, spokenWords.length);
    
    for (let i = 0; i < minLength; i++) {
      if (originalWords[i] === spokenWords[i]) {
        matches++;
      }
    }
    
    return (matches / maxLength) * 100;
  }, []);

  const processTranscript = useCallback((originalText: string): number => {
    const calculatedAccuracy = calculateAccuracy(originalText, state.transcript);
    updateState({ accuracy: calculatedAccuracy });
    return calculatedAccuracy;
  }, [state.transcript, calculateAccuracy, updateState]);

  const reset = useCallback(() => {
    updateState({
      transcript: '',
      partialTranscript: '',
      error: null,
      accuracy: 0,
    });
  }, [updateState]);

  // Initialize on mount
  useEffect(() => {
    isMountedRef.current = true;
    
    // Initialize immediately
    initializeVoice();

    return () => {
      isMountedRef.current = false;
      isInitializedRef.current = false;
    };
  }, [initializeVoice]);

  return {
    // State
    isRecording: state.isRecording,
    transcript: state.transcript,
    partialTranscript: state.partialTranscript,
    error: state.error,
    accuracy: state.accuracy,
    settings: {
      rate: 0.9,
      pitch: 1.0,
      language: 'en-US',
      volume: 1.0,
    },
    isLoading: state.isLoading,
    isInitialized: isInitializedRef.current,
    
    // Actions
    startRecording,
    stopRecording,
    cancelRecording,
    speak,
    stopSpeaking: async () => {
      try {
        await Speech.stop();
        return true;
      } catch {
        return false;
      }
    },
    saveSettings: async () => true,
    processTranscript,
    reset,
  };
}
