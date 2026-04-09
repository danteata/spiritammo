import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import whisperService from './whisper';
import Constants from 'expo-constants';
import type { 
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent
} from 'expo-speech-recognition';

/**
 * Lazy-load the native module to prevent crashes during route scanning
 */
const getNativeModule = () => {
  try {
    const { ExpoSpeechRecognitionModule } = require('expo-speech-recognition');
    return ExpoSpeechRecognitionModule || null;
  } catch (e) {
    return null;
  }
};

// Types for speech recognition
export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface SpeechRecognitionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface SpeechRecognitionError {
  error: string;
  message: string;
}

export type SpeechRecognitionEvent =
  | { type: 'start' }
  | { type: 'result'; result: SpeechRecognitionResult }
  | { type: 'error'; error: SpeechRecognitionError }
  | { type: 'end' };

export type SpeechRecognitionCallback = (event: SpeechRecognitionEvent) => void;

// Web Speech API types (when available)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface ISpeechRecognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: any) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: any) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

class CrossPlatformSpeechRecognition {
  private isListening = false;
  private callbacks: SpeechRecognitionCallback[] = [];
  private platform: 'web' | 'native' = Platform.OS === 'web' ? 'web' : 'native';
  private webRecognition: ISpeechRecognition | null = null;
  private nativeListeners: any[] = [];

  constructor() {
    if (this.platform === 'web') {
      this.initializeWebRecognition();
    } else {
      this.initializeNativeRecognition();
    }
  }

  private initializeWebRecognition() {
    if (this.isWebSpeechSupported()) {
      try {
        const SpeechRecognitionClass =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        this.webRecognition = new SpeechRecognitionClass();
        this.setupWebSpeechHandlers();
      } catch (error) {
        console.warn('Failed to initialize Web Speech API:', error);
      }
    }
  }

  private initializeNativeRecognition() {
    const nativeModule = getNativeModule();
    // Safety check for native module availability
    if (!nativeModule) {
      console.warn('ExpoSpeechRecognition native module is not available in this environment.');
      return;
    }

    // Set up event listeners using the proper API
    const startListener = nativeModule.addListener('start', () => {
      this.isListening = true;
      this.notifyCallbacks({ type: 'start' });
    });

    const endListener = nativeModule.addListener('end', () => {
      this.isListening = false;
      this.notifyCallbacks({ type: 'end' });
    });

    const errorListener = nativeModule.addListener(
      'error',
      (event: ExpoSpeechRecognitionErrorEvent) => {
        const error: SpeechRecognitionError = {
          error: event.error || 'unknown',
          message: event.message || 'Speech recognition error',
        };
        this.notifyCallbacks({ type: 'error', error });
      }
    );

    const resultListener = nativeModule.addListener(
      'result',
      (event: ExpoSpeechRecognitionResultEvent) => {
        if (event.results && event.results.length > 0) {
          const firstResult = event.results[0];
          const result: SpeechRecognitionResult = {
            transcript: firstResult.transcript,
            confidence: firstResult.confidence || 0.9,
            isFinal: event.isFinal,
          };
          this.notifyCallbacks({ type: 'result', result });
        }
      }
    );

    // Store listeners for cleanup if needed
    this.nativeListeners = [
      startListener,
      endListener,
      errorListener,
      resultListener
    ];
  }

  private setupWebSpeechHandlers(): void {
    if (!this.webRecognition) return;

    this.webRecognition.onstart = () => {
      this.isListening = true;
      this.notifyCallbacks({ type: 'start' });
    };

    this.webRecognition.onresult = (event: any) => {
      const results = event.results;
      const lastResult = results[results.length - 1];

      if (lastResult) {
        const result: SpeechRecognitionResult = {
          transcript: lastResult[0].transcript,
          confidence: lastResult[0].confidence || 0.8,
          isFinal: lastResult.isFinal,
        };

        this.notifyCallbacks({ type: 'result', result });
      }
    };

    this.webRecognition.onerror = (event: any) => {
      const error: SpeechRecognitionError = {
        error: event.error || 'unknown',
        message: event.message || 'Speech recognition error',
      };

      this.notifyCallbacks({ type: 'error', error });
    };

    this.webRecognition.onend = () => {
      this.isListening = false;
      this.notifyCallbacks({ type: 'end' });
    };
  }

  private isWebSpeechSupported(): boolean {
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private notifyCallbacks(event: SpeechRecognitionEvent) {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in speech recognition callback:', error);
      }
    });
  }

  // Public API methods
  async isAvailable(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule) {
      // @ts-ignore
      return true;
    }
    
    if (Platform.OS === 'web') {
      return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }
    
    return false;
  }

  async requestPermission(): Promise<boolean> {
    const nativeModule = getNativeModule();
    if (nativeModule) {
      try {
        const { status } = await nativeModule.requestPermissionsAsync();
        return status === 'granted';
      } catch (error) {
        console.error('Failed to request speech permission:', error);
        return false;
      }
    }
    return true; // Web browser handles permissions on start()
  }

  async start(options: SpeechRecognitionOptions = {}): Promise<void> {
    const nativeModule = getNativeModule();
    if (nativeModule) {
      await nativeModule.start({
        lang: options.language || 'en-US',
        interimResults: options.interimResults !== undefined ? options.interimResults : true,
        continuous: options.continuous !== undefined ? options.continuous : false,
        maxAlternatives: options.maxAlternatives || 1,
      });
      return;
    }

    if (this.webRecognition) {
      this.webRecognition.lang = options.language || 'en-US';
      this.webRecognition.continuous = options.continuous !== undefined ? options.continuous : false;
      this.webRecognition.interimResults = options.interimResults !== undefined ? options.interimResults : true;
      this.webRecognition.maxAlternatives = options.maxAlternatives || 1;
      this.webRecognition.start();
    } else {
      console.error('No speech recognition engine available');
      throw new Error('Speech recognition not available');
    }
  }

  async stop(): Promise<void> {
    const nativeModule = getNativeModule();
    if (nativeModule) {
      try {
        await nativeModule.stop();
      } catch (error) {
        console.error('Failed to stop native speech recognition:', error);
      }
      return;
    }

    if (this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (error) {
        console.error('Failed to stop web speech recognition:', error);
      }
    }
  }

  async abort(): Promise<void> {
    const nativeModule = getNativeModule();
    if (nativeModule) {
      try {
        await nativeModule.abort();
      } catch (error) {
        console.error('Failed to abort native speech recognition:', error);
      }
      return;
    }

    if (this.webRecognition) {
      try {
        this.webRecognition.abort();
      } catch (error) {
        console.error('Failed to abort web speech recognition:', error);
      }
    }
  }

  addEventListener(callback: SpeechRecognitionCallback): () => void {
    this.callbacks.push(callback);

    // Return cleanup function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  getPlatform(): string {
    return this.platform;
  }

  // Utility method to get platform-specific status
  getStatusMessage(): string {
    if (this.platform === 'web') {
      if (this.isWebSpeechSupported()) {
        return 'Web Speech API available';
      } else {
        return 'Web Speech API not supported in this browser';
      }
    } else {
      return 'Using expo-speech-recognition';
    }
  }

  // Clean up listeners
  cleanup(): void {
    this.nativeListeners.forEach(listener => {
      listener?.remove();
    });
    this.nativeListeners = [];
    this.callbacks = [];
  }
}

// Export singleton instance
export const speechRecognition = new CrossPlatformSpeechRecognition();

// Export the class for testing or multiple instances if needed
export { CrossPlatformSpeechRecognition };