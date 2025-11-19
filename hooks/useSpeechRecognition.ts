import { useState, useEffect, useCallback, useRef } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import type { ExpoSpeechRecognitionOptions } from 'expo-speech-recognition';

interface UseSpeechRecognitionOptions {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
  maxAlternatives?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}) {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Check availability on mount
  useEffect(() => {
    checkAvailability();
  }, []);

  const checkAvailability = async () => {
    try {
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      setIsAvailable(available);
      
      if (available) {
        const permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
        setHasPermission(permissions.granted);
      }
    } catch (err) {
      console.error('Failed to check speech recognition availability:', err);
      setIsAvailable(false);
    }
  };

  // Event listeners
  useSpeechRecognitionEvent('start', () => {
    setIsRecognizing(true);
    setError(null);
    optionsRef.current.onStart?.();
  });

  useSpeechRecognitionEvent('end', () => {
    setIsRecognizing(false);
    setInterimTranscript('');
    optionsRef.current.onEnd?.();
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      const result = event.results[0];
      const resultTranscript = result.transcript;
      
      if (event.isFinal) {
        setTranscript(resultTranscript);
        setInterimTranscript('');
        optionsRef.current.onResult?.(resultTranscript, true);
      } else {
        setInterimTranscript(resultTranscript);
        optionsRef.current.onResult?.(resultTranscript, false);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    const errorMessage = event.message || `Speech recognition error: ${event.error}`;
    setError(errorMessage);
    setIsRecognizing(false);
    optionsRef.current.onError?.(errorMessage);
  });

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setHasPermission(result.granted);
      return result.granted;
    } catch (err) {
      console.error('Failed to request permissions:', err);
      setError('Failed to request permissions');
      return false;
    }
  }, []);

  const start = useCallback(async (overrideOptions?: Partial<ExpoSpeechRecognitionOptions>): Promise<boolean> => {
    if (isRecognizing) {
      console.warn('Speech recognition already in progress');
      return false;
    }

    if (!isAvailable) {
      setError('Speech recognition is not available on this device');
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        setError('Microphone permission not granted');
        return false;
      }
    }

    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');

      const recognitionOptions: ExpoSpeechRecognitionOptions = {
        lang: overrideOptions?.lang ?? optionsRef.current.lang ?? 'en-US',
        interimResults: overrideOptions?.interimResults ?? optionsRef.current.interimResults ?? true,
        continuous: overrideOptions?.continuous ?? optionsRef.current.continuous ?? false,
        maxAlternatives: overrideOptions?.maxAlternatives ?? optionsRef.current.maxAlternatives ?? 1,
      };

      ExpoSpeechRecognitionModule.start(recognitionOptions);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start speech recognition';
      setError(errorMessage);
      console.error('Failed to start speech recognition:', err);
      return false;
    }
  }, [isRecognizing, isAvailable, hasPermission, requestPermissions]);

  const stop = useCallback(() => {
    if (!isRecognizing) {
      return;
    }

    try {
      ExpoSpeechRecognitionModule.stop();
    } catch (err) {
      console.error('Failed to stop speech recognition:', err);
      setError('Failed to stop speech recognition');
    }
  }, [isRecognizing]);

  const abort = useCallback(() => {
    try {
      ExpoSpeechRecognitionModule.abort();
      setIsRecognizing(false);
      setInterimTranscript('');
    } catch (err) {
      console.error('Failed to abort speech recognition:', err);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    // State
    isRecognizing,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    hasPermission,
    
    // Methods
    start,
    stop,
    abort,
    resetTranscript,
    requestPermissions,
  };
}
