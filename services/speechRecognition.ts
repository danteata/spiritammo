import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import whisperService from './whisper';
import Constants from 'expo-constants';
import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import type { 
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent
} from 'expo-speech-recognition';

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
    // Set up event listeners using the proper API
    const startListener = ExpoSpeechRecognitionModule.addListener('start', () => {
      this.isListening = true;
      this.notifyCallbacks({ type: 'start' });
    });

    const endListener = ExpoSpeechRecognitionModule.addListener('end', () => {
      this.isListening = false;
      this.notifyCallbacks({ type: 'end' });
    });

    const errorListener = ExpoSpeechRecognitionModule.addListener(
      'error',
      (event: ExpoSpeechRecognitionErrorEvent) => {
        const error: SpeechRecognitionError = {
          error: event.error || 'unknown',
          message: event.message || 'Speech recognition error',
        };
        this.notifyCallbacks({ type: 'error', error });
      }
    );

    const resultListener = ExpoSpeechRecognitionModule.addListener(
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
    if (this.platform === 'web') {
      return this.isWebSpeechSupported();
    }
    try {
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      return available;
    } catch (error) {
      console.warn('Failed to check speech recognition availability:', error);
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (this.platform === 'web') {
      return true;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      return result.granted;
    } catch (error) {
      console.error('Failed to request permissions:', error);
      return false;
    }
  }

  async start(options: SpeechRecognitionOptions = {}): Promise<boolean> {
    if (this.isListening) {
      return false;
    }

    if (this.platform === 'web' && this.webRecognition) {
      try {
        this.webRecognition.continuous = options.continuous ?? false;
        this.webRecognition.interimResults = options.interimResults ?? true;
        this.webRecognition.lang = options.language ?? 'en-US';
        this.webRecognition.maxAlternatives = options.maxAlternatives ?? 1;

        this.webRecognition.start();
        return true;
      } catch (error) {
        console.error('Failed to start web speech recognition:', error);
        return false;
      }
    }

    try {
      const nativeOptions: ExpoSpeechRecognitionOptions = {
        lang: options.language ?? 'en-US',
        interimResults: options.interimResults ?? true,
        maxAlternatives: options.maxAlternatives ?? 1,
        continuous: options.continuous ?? false,
      };
      
      ExpoSpeechRecognitionModule.start(nativeOptions);
      return true;
    } catch (error) {
      console.error('Failed to start native speech recognition:', error);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    if (this.platform === 'web' && this.webRecognition) {
      try {
        this.webRecognition.stop();
      } catch (error) {
        console.error('Failed to stop web speech recognition:', error);
      }
    } else {
      try {
        ExpoSpeechRecognitionModule.stop();
      } catch (error) {
        console.error('Failed to stop native speech:', error);
      }
    }
  }

  abort(): void {
    if (this.platform === 'web' && this.webRecognition) {
      try {
        this.webRecognition.abort();
      } catch (error) {
        console.error('Failed to abort web speech recognition:', error);
      }
    } else {
      try {
        ExpoSpeechRecognitionModule.abort();
      } catch (error) {
        console.error('Failed to abort native speech recognition:', error);
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