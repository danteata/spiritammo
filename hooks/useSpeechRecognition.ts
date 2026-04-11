import { useState, useEffect, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

const useSafeSpeechRecognitionEvent = ExpoSpeechRecognitionModule
  ? useSpeechRecognitionEvent
  : (_eventName: string, _callback: (event: any) => void) => {
      useEffect(() => {}, []);
    };

interface SpeechRecognitionOptions {
  lang?: string;
  interimResults?: boolean;
  continuous?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

interface SpeechRecognitionReturn {
  isRecognizing: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  isAvailable: boolean;
  hasPermission: boolean;
  supportsOffline: boolean;
  start: () => Promise<boolean>;
  stop: () => Promise<void>;
  resetTranscript: () => void;
  requestPermissions: () => Promise<boolean>;
}

export function useSpeechRecognition(
  options: SpeechRecognitionOptions = {}
): SpeechRecognitionReturn {
  const {
    lang = 'en-US',
    interimResults = true,
    continuous = false,
    onResult,
    onError,
    onEnd,
  } = options;

  const [isRecognizing, setIsRecognizing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [supportsOffline, setSupportsOffline] = useState(false);

  const isStartingRef = useRef(false);
  const isStoppingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    checkAvailability();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const checkAvailability = async () => {
    if (!ExpoSpeechRecognitionModule) {
      if (mountedRef.current) {
        setIsAvailable(false);
        setSupportsOffline(false);
      }
      return;
    }
    try {
      const status = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      if (mountedRef.current) setHasPermission(status.granted);

      if (!status.granted) {
        try {
          const requestResult = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
          if (mountedRef.current) setHasPermission(requestResult.granted);
        } catch (permError) {
          console.warn('[useSpeechRecognition] Permission request failed:', permError);
        }
      }

      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!mountedRef.current) return;
      setIsAvailable(available);

      if (available) {
        try {
          const onDevice = await (ExpoSpeechRecognitionModule as any).isOnDeviceRecognitionAvailable?.();
          if (mountedRef.current) setSupportsOffline(!!onDevice);
        } catch {
          if (mountedRef.current) setSupportsOffline(false);
        }
      } else {
        if (mountedRef.current) setSupportsOffline(false);
      }
    } catch (e) {
      console.warn('[useSpeechRecognition] Availability check failed:', e);
      if (mountedRef.current) {
        setIsAvailable(false);
        setSupportsOffline(false);
      }
    }
  };

  useSafeSpeechRecognitionEvent('start', () => {
    if (!mountedRef.current) return;
    setIsRecognizing(true);
    setError(null);
    isStartingRef.current = false;
  });

  useSafeSpeechRecognitionEvent('end', () => {
    if (!mountedRef.current) return;
    setIsRecognizing(false);
    setInterimTranscript('');
    isStoppingRef.current = false;
    onEnd?.();
  });

  useSafeSpeechRecognitionEvent('result', (event: any) => {
    if (!mountedRef.current) return;
    if (!event.results || event.results.length === 0) return;

    const firstResult = event.results[0];
    const text = firstResult.transcript ?? '';
    const isFinal = event.isFinal ?? false;

    if (isFinal) {
      setTranscript((prev) => (prev ? `${prev} ${text}` : text).trim());
      setInterimTranscript('');
    } else {
      setInterimTranscript(text);
    }

    onResult?.(text, isFinal);
  });

  useSafeSpeechRecognitionEvent('error', (event: any) => {
    if (!mountedRef.current) return;
    const msg = event.message ?? event.error ?? 'Unknown STT error';
    console.warn('[useSpeechRecognition] Error event:', msg);
    setError(msg);
    setIsRecognizing(false);
    isStartingRef.current = false;
    onError?.(msg);
  });

  // ── start — minimal options like VoiceRecorder uses ─────────
  const start = useCallback(async (): Promise<boolean> => {
    if (isStartingRef.current || isRecognizing) {
      console.warn('[useSpeechRecognition] Already starting/recognizing');
      return false;
    }

    if (!hasPermission) {
      const granted = await requestPermissions();
      if (!granted) {
        setError('Microphone permission denied');
        return false;
      }
    }

    try {
      isStartingRef.current = true;
      setError(null);

      // Use the same minimal options VoiceRecorder uses — no iosCategory,
      // no androidIntentOptions — let the native module manage audio itself
      await ExpoSpeechRecognitionModule.start({
        lang,
        interimResults,
        continuous,
        maxAlternatives: 1,
      });

      return true;
    } catch (e: any) {
      console.warn('[useSpeechRecognition] start() failed:', e?.message);
      isStartingRef.current = false;
      setError(e?.message ?? 'Failed to start STT');
      return false;
    }
  }, [hasPermission, isRecognizing, lang, interimResults, continuous]);

  const stop = useCallback(async (): Promise<void> => {
    if (isStoppingRef.current) return;
    try {
      isStoppingRef.current = true;
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      console.warn('[useSpeechRecognition] stop() threw:', e);
    } finally {
      isStoppingRef.current = false;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (mountedRef.current) setHasPermission(result.granted);
      return result.granted;
    } catch (e) {
      console.warn('[useSpeechRecognition] Permission request failed:', e);
      return false;
    }
  }, []);

  return {
    isRecognizing,
    transcript,
    interimTranscript,
    error,
    isAvailable,
    hasPermission,
    supportsOffline,
    start,
    stop,
    resetTranscript,
    requestPermissions,
  };
}
