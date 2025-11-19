import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';

// Voice Recognition Types
export interface VoiceSettings {
  rate: number;
  pitch: number;
  language: string;
  voice?: string;
}

export interface ShotResult {
  accuracy: number;
  transcript: string;
  timestamp: Date;
  targetText: string;
  wordAccuracy: number;
  sequenceAccuracy: number;
}

export interface ShotGrouping {
  shots: ShotResult[];
  averageAccuracy: number;
  consistency: number;
  trend: 'improving' | 'declining' | 'stable';
}

// Storage keys
const VOICE_SETTINGS_KEY = '@spiritammo_voice_settings';
const SHOT_HISTORY_KEY = '@spiritammo_shot_history';

// Default settings
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 0.9,
  pitch: 1.0,
  language: 'en-US',
};

// Military-themed voice feedback
const COMBAT_FEEDBACK = {
  excellent: [
    "Outstanding marksmanship, soldier!",
    "Bullseye! Mission accomplished!",
    "Perfect shot! You're ready for combat!",
    "Exceptional accuracy! Promote this soldier!",
  ],
  good: [
    "Good shot, soldier! Maintain fire discipline!",
    "Solid hit! Keep up the good work!",
    "Well done! Your training is paying off!",
    "Good accuracy! Continue the mission!",
  ],
  fair: [
    "Acceptable shot. Adjust your aim and try again.",
    "Hit registered. Improve your stance and fire again.",
    "Fair accuracy. More training required.",
    "Shot on target. Refine your technique.",
  ],
  poor: [
    "Miss! Check your weapon and re-engage!",
    "Shot wide! Adjust your sights and try again!",
    "Target missed! Return to basic training!",
    "Poor accuracy! More practice needed, recruit!",
  ],
};

class VoiceRecognitionService {
  private isInitialized = false;
  private isRecording = false;
  private settings: VoiceSettings = DEFAULT_VOICE_SETTINGS;
  private shotHistory: ShotResult[] = [];
  // Listeners for partial and final transcription results
  private partialListeners: Array<(partial: string) => void> = [];
  private resultListeners: Array<(finalTranscript: string) => void> = [];
  // Whether the underlying native module appears available
  private available = false;

  constructor() {
    this.initializeVoice();
    this.loadSettings();
    this.loadShotHistory();
  }

  private async initializeVoice() {
    try {
      // Quick probe: check NativeModules for the RNVoice native module which
      // react-native-voice typically registers as RNVoice.
      const nativeVoice = (NativeModules as any).RNVoice || (NativeModules as any).Voice || null
      if (Platform.OS !== 'web' && Voice && typeof Voice === 'object' && nativeVoice) {
        // Only attach handlers if the native module is available
        if (typeof Voice.onSpeechStart !== 'undefined') Voice.onSpeechStart = this.onSpeechStart;
        if (typeof Voice.onSpeechRecognized !== 'undefined') Voice.onSpeechRecognized = this.onSpeechRecognized;
        if (typeof Voice.onSpeechEnd !== 'undefined') Voice.onSpeechEnd = this.onSpeechEnd;
        if (typeof Voice.onSpeechError !== 'undefined') Voice.onSpeechError = this.onSpeechError;
        if (typeof Voice.onSpeechResults !== 'undefined') Voice.onSpeechResults = this.onSpeechResults;
        if (typeof Voice.onSpeechPartialResults !== 'undefined') Voice.onSpeechPartialResults = this.onSpeechPartialResults;
        if (typeof Voice.onSpeechVolumeChanged !== 'undefined') Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged;
        this.isInitialized = true;
        this.available = true;
      } else {
        console.warn('Voice native module not available. Voice recognition will be disabled on this platform or build.');
        this.isInitialized = false;
        this.available = false;
      }
    } catch (error) {
      console.error('Failed to initialize voice recognition:', error);
    }
  }

  private async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(VOICE_SETTINGS_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error);
    }
  }

  private async loadShotHistory() {
    try {
      const stored = await AsyncStorage.getItem(SHOT_HISTORY_KEY);
      if (stored) {
        this.shotHistory = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load shot history:', error);
    }
  }

  // Voice event handlers
  private onSpeechStart = (e: any) => {
    console.log('Speech recognition started');
  };

  private onSpeechRecognized = (e: any) => {
    console.log('Speech recognized');
  };

  private onSpeechEnd = (e: any) => {
    console.log('Speech recognition ended');
    this.isRecording = false;
  };

  private onSpeechError = (e: any) => {
    console.error('Speech recognition error:', e.error);
    this.isRecording = false;
  };

  private onSpeechResults = (e: any) => {
    console.log('Speech results:', e.value);
    try {
      const results: string[] = Array.isArray(e.value) ? e.value : []
      const first = results.length > 0 ? results[0] : ''
      // Notify listeners with the first (best) result
      this.resultListeners.forEach((cb) => cb(first))
    } catch (err) {
      console.error('Error handling speech results:', err)
    }
  };

  private onSpeechPartialResults = (e: any) => {
    console.log('Partial results:', e.value);
    try {
      const results: string[] = Array.isArray(e.value) ? e.value : []
      const partial = results.length > 0 ? results.join(' ') : ''
      this.partialListeners.forEach((cb) => cb(partial))
    } catch (err) {
      console.error('Error handling partial results:', err)
    }
  };

  private onSpeechVolumeChanged = (e: any) => {
    console.log('Volume changed:', e.value);
  };

  // Start voice recognition
  async startRecording(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeVoice();
      }

      if (Platform.OS === 'web') {
        console.log('Voice recognition not supported on web');
        return false;
      }

      if (!this.available || !Voice || typeof Voice.start !== 'function') {
        console.warn('Native voice module not available. Aborting startRecording.');
        return false;
      }

      // Android: request RECORD_AUDIO permission at runtime
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'SpiritAmmo needs access to your microphone for voice practice.',
              buttonPositive: 'OK',
            }
          )
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.warn('Microphone permission denied')
            return false
          }
        } catch (permErr) {
          console.error('Failed to request microphone permission:', permErr)
          return false
        }
      }

      await Voice.start(this.settings.language)
      this.isRecording = true
      return true
    } catch (error) {
      console.error('Failed to start voice recognition:', error)
      return false
    }
  }

  // Stop voice recognition
  async stopRecording(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        return [];
      }

      if (!Voice || typeof Voice.stop !== 'function') {
        console.warn('Voice.stop is not available');
        this.isRecording = false;
        return [];
      }

      await Voice.stop();
      this.isRecording = false;
      // Final results will be pushed to listeners via the native callbacks
      return [];
    } catch (error) {
      console.error('Failed to stop voice recognition:', error);
      return [];
    }
  }

  // Listener registration helpers
  addPartialListener(cb: (partial: string) => void) {
    this.partialListeners.push(cb)
  }

  removePartialListener(cb: (partial: string) => void) {
    this.partialListeners = this.partialListeners.filter((fn) => fn !== cb)
  }

  addResultListener(cb: (finalTranscript: string) => void) {
    this.resultListeners.push(cb)
  }

  removeResultListener(cb: (finalTranscript: string) => void) {
    this.resultListeners = this.resultListeners.filter((fn) => fn !== cb)
  }

  // Calculate advanced accuracy metrics
  calculateAccuracy(originalText: string, spokenText: string): ShotResult {
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normalizedOriginal = normalizeText(originalText);
    const normalizedSpoken = normalizeText(spokenText);

    // Word-level accuracy
    const originalWords = normalizedOriginal.split(' ');
    const spokenWords = normalizedSpoken.split(' ');
    
    let correctWords = 0;
    const maxLength = Math.max(originalWords.length, spokenWords.length);
    
    // Calculate word accuracy using dynamic programming (Levenshtein-like)
    for (let i = 0; i < Math.min(originalWords.length, spokenWords.length); i++) {
      if (originalWords[i] === spokenWords[i]) {
        correctWords++;
      }
    }
    
    const wordAccuracy = maxLength > 0 ? (correctWords / maxLength) * 100 : 0;

    // Sequence accuracy (order matters)
    const sequenceAccuracy = this.calculateSequenceAccuracy(originalWords, spokenWords);

    // Overall accuracy (weighted average)
    const overallAccuracy = (wordAccuracy * 0.7) + (sequenceAccuracy * 0.3);

    const result: ShotResult = {
      accuracy: Math.round(overallAccuracy * 100) / 100,
      transcript: spokenText,
      timestamp: new Date(),
      targetText: originalText,
      wordAccuracy: Math.round(wordAccuracy * 100) / 100,
      sequenceAccuracy: Math.round(sequenceAccuracy * 100) / 100,
    };

    // Store shot result
    this.addShotToHistory(result);

    return result;
  }

  // Calculate sequence accuracy using longest common subsequence
  private calculateSequenceAccuracy(original: string[], spoken: string[]): number {
    const lcs = this.longestCommonSubsequence(original, spoken);
    const maxLength = Math.max(original.length, spoken.length);
    return maxLength > 0 ? (lcs / maxLength) * 100 : 0;
  }

  // Longest Common Subsequence algorithm
  private longestCommonSubsequence(arr1: string[], arr2: string[]): number {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  // Add shot to history
  private async addShotToHistory(shot: ShotResult) {
    try {
      this.shotHistory.push(shot);
      
      // Keep only last 100 shots
      if (this.shotHistory.length > 100) {
        this.shotHistory = this.shotHistory.slice(-100);
      }

      await AsyncStorage.setItem(SHOT_HISTORY_KEY, JSON.stringify(this.shotHistory));
    } catch (error) {
      console.error('Failed to save shot history:', error);
    }
  }

  // Get shot grouping analysis
  getShotGrouping(count: number = 10): ShotGrouping {
    const recentShots = this.shotHistory.slice(-count);
    
    if (recentShots.length === 0) {
      return {
        shots: [],
        averageAccuracy: 0,
        consistency: 0,
        trend: 'stable',
      };
    }

    const averageAccuracy = recentShots.reduce((sum, shot) => sum + shot.accuracy, 0) / recentShots.length;
    
    // Calculate consistency (lower standard deviation = higher consistency)
    const variance = recentShots.reduce((sum, shot) => sum + Math.pow(shot.accuracy - averageAccuracy, 2), 0) / recentShots.length;
    const standardDeviation = Math.sqrt(variance);
    const consistency = Math.max(0, 100 - standardDeviation);

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (recentShots.length >= 5) {
      const firstHalf = recentShots.slice(0, Math.floor(recentShots.length / 2));
      const secondHalf = recentShots.slice(Math.floor(recentShots.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, shot) => sum + shot.accuracy, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, shot) => sum + shot.accuracy, 0) / secondHalf.length;
      
      const difference = secondHalfAvg - firstHalfAvg;
      if (difference > 5) trend = 'improving';
      else if (difference < -5) trend = 'declining';
    }

    return {
      shots: recentShots,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      trend,
    };
  }

  // Get military feedback based on accuracy
  getMilitaryFeedback(accuracy: number): string {
    let category: keyof typeof COMBAT_FEEDBACK;
    
    if (accuracy >= 95) category = 'excellent';
    else if (accuracy >= 85) category = 'good';
    else if (accuracy >= 75) category = 'fair';
    else category = 'poor';

    const messages = COMBAT_FEEDBACK[category];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  // Text-to-speech with military command voice
  async speakCommand(text: string, isCommand: boolean = false): Promise<boolean> {
    try {
      const options = {
        rate: isCommand ? this.settings.rate * 0.8 : this.settings.rate, // Slower for commands
        pitch: isCommand ? this.settings.pitch * 1.1 : this.settings.pitch, // Higher for authority
        language: this.settings.language,
        voice: this.settings.voice,
      };

      const commandText = isCommand ? `Command: ${text}` : text;
      await Speech.speak(commandText, options);
      return true;
    } catch (error) {
      console.error('Failed to speak command:', error);
      return false;
    }
  }

  // Update voice settings
  async updateSettings(newSettings: Partial<VoiceSettings>): Promise<boolean> {
    try {
      this.settings = { ...this.settings, ...newSettings };
      await AsyncStorage.setItem(VOICE_SETTINGS_KEY, JSON.stringify(this.settings));
      return true;
    } catch (error) {
      console.error('Failed to update voice settings:', error);
      return false;
    }
  }

  // Get current settings
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  // Check if recording
  getIsRecording(): boolean {
    return this.isRecording;
  }

  // Cleanup
  async destroy() {
    try {
      if (Platform.OS !== 'web') {
        await Voice.destroy();
      }
    } catch (error) {
      console.error('Failed to destroy voice recognition:', error);
    }
  }
}

// Export singleton instance
export const voiceRecognitionService = new VoiceRecognitionService();
