import Voice from '@react-native-voice/voice'
import * as Speech from 'expo-speech'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// Voice Recognition Types
export interface VoiceSettings {
  rate: number
  pitch: number
  language: string
  voice?: string
}

export interface ShotResult {
  accuracy: number
  transcript: string
  timestamp: Date
  targetText: string
  wordAccuracy: number
  sequenceAccuracy: number
}

export interface ShotGrouping {
  shots: ShotResult[]
  averageAccuracy: number
  consistency: number
  trend: 'improving' | 'declining' | 'stable'
}

// Storage keys
const VOICE_SETTINGS_KEY = '@spiritammo_voice_settings'
const SHOT_HISTORY_KEY = '@spiritammo_shot_history'

// Default settings
const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 0.9,
  pitch: 1.0,
  language: 'en-US',
}

// Military-themed voice feedback
const COMBAT_FEEDBACK = {
  excellent: [
    'Outstanding marksmanship, soldier!',
    'Bullseye! Mission accomplished!',
    "Perfect shot! You're ready for combat!",
    'Exceptional accuracy! Promote this soldier!',
  ],
  good: [
    'Good shot, soldier! Maintain fire discipline!',
    'Solid hit! Keep up the good work!',
    'Well done! Your training is paying off!',
    'Good accuracy! Continue the mission!',
  ],
  fair: [
    'Acceptable shot. Adjust your aim and try again.',
    'Hit registered. Improve your stance and fire again.',
    'Fair accuracy. More training required.',
    'Shot on target. Refine your technique.',
  ],
  poor: [
    'Miss! Check your weapon and re-engage!',
    'Shot wide! Adjust your sights and try again!',
    'Target missed! Return to basic training!',
    'Poor accuracy! More practice needed, recruit!',
  ],
}

class VoiceRecognitionService {
  private isInitialized = false
  private isRecording = false
  private settings: VoiceSettings = DEFAULT_VOICE_SETTINGS
  private shotHistory: ShotResult[] = []

  constructor() {
    this.initializeVoice()
    this.loadSettings()
    this.loadShotHistory()
  }

  private async initializeVoice() {
    try {
      if (Platform.OS !== 'web') {
        Voice.onSpeechStart = this.onSpeechStart
        Voice.onSpeechRecognized = this.onSpeechRecognized
        Voice.onSpeechEnd = this.onSpeechEnd
        Voice.onSpeechError = this.onSpeechError
        Voice.onSpeechResults = this.onSpeechResults
        Voice.onSpeechPartialResults = this.onSpeechPartialResults
        Voice.onSpeechVolumeChanged = this.onSpeechVolumeChanged
      }
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize voice recognition:', error)
    }
  }

  private async loadSettings() {
    try {
      const stored = await AsyncStorage.getItem(VOICE_SETTINGS_KEY)
      if (stored) {
        this.settings = { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Failed to load voice settings:', error)
    }
  }

  private async loadShotHistory() {
    try {
      const stored = await AsyncStorage.getItem(SHOT_HISTORY_KEY)
      if (stored) {
        this.shotHistory = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load shot history:', error)
    }
  }

  // Voice event handlers
  private onSpeechStart = (e: any) => {
    console.log('Speech recognition started')
  }

  private onSpeechRecognized = (e: any) => {
    console.log('Speech recognized')
  }

  private onSpeechEnd = (e: any) => {
    console.log('Speech recognition ended')
    this.isRecording = false
  }

  private onSpeechError = (e: any) => {
    console.error('Speech recognition error:', e.error)
    this.isRecording = false
  }

  private onSpeechResults = (e: any) => {
    console.log('Speech results:', e.value)
  }

  private onSpeechPartialResults = (e: any) => {
    console.log('Partial results:', e.value)
  }

  private onSpeechVolumeChanged = (e: any) => {
    console.log('Volume changed:', e.value)
  }

  // Start voice recognition
  async startRecording(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initializeVoice()
      }

      if (Platform.OS === 'web') {
        console.log('Voice recognition not fully supported on web')
        return false
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
        return []
      }

      await Voice.stop()
      this.isRecording = false

      // In a real implementation, this would return the actual results
      // For now, we'll return an empty array and handle results in the callback
      return []
    } catch (error) {
      console.error('Failed to stop voice recognition:', error)
      return []
    }
  }

  // Calculate advanced accuracy metrics
  calculateAccuracy(originalText: string, spokenText: string): ShotResult {
    const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    const normalizedOriginal = normalizeText(originalText)
    const normalizedSpoken = normalizeText(spokenText)

    // Word-level accuracy
    const originalWords = normalizedOriginal.split(' ')
    const spokenWords = normalizedSpoken.split(' ')

    let correctWords = 0
    const maxLength = Math.max(originalWords.length, spokenWords.length)

    // Calculate word accuracy using dynamic programming (Levenshtein-like)
    for (
      let i = 0;
      i < Math.min(originalWords.length, spokenWords.length);
      i++
    ) {
      if (originalWords[i] === spokenWords[i]) {
        correctWords++
      }
    }

    const wordAccuracy = maxLength > 0 ? (correctWords / maxLength) * 100 : 0

    // Sequence accuracy (order matters)
    const sequenceAccuracy = this.calculateSequenceAccuracy(
      originalWords,
      spokenWords
    )

    // Overall accuracy (weighted average)
    const overallAccuracy = wordAccuracy * 0.7 + sequenceAccuracy * 0.3

    const result: ShotResult = {
      accuracy: Math.round(overallAccuracy * 100) / 100,
      transcript: spokenText,
      timestamp: new Date(),
      targetText: originalText,
      wordAccuracy: Math.round(wordAccuracy * 100) / 100,
      sequenceAccuracy: Math.round(sequenceAccuracy * 100) / 100,
    }

    // Store shot result
    this.addShotToHistory(result)

    return result
  }

  // Calculate sequence accuracy using longest common subsequence
  private calculateSequenceAccuracy(
    original: string[],
    spoken: string[]
  ): number {
    const lcs = this.longestCommonSubsequence(original, spoken)
    const maxLength = Math.max(original.length, spoken.length)
    return maxLength > 0 ? (lcs / maxLength) * 100 : 0
  }

  // Longest Common Subsequence algorithm
  private longestCommonSubsequence(arr1: string[], arr2: string[]): number {
    const m = arr1.length
    const n = arr2.length
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0))

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
        }
      }
    }

    return dp[m][n]
  }

  // Add shot to history
  private async addShotToHistory(shot: ShotResult) {
    try {
      this.shotHistory.push(shot)

      // Keep only last 100 shots
      if (this.shotHistory.length > 100) {
        this.shotHistory = this.shotHistory.slice(-100)
      }

      await AsyncStorage.setItem(
        SHOT_HISTORY_KEY,
        JSON.stringify(this.shotHistory)
      )
    } catch (error) {
      console.error('Failed to save shot history:', error)
    }
  }

  // Get shot grouping analysis
  getShotGrouping(count: number = 10): ShotGrouping {
    const recentShots = this.shotHistory.slice(-count)

    if (recentShots.length === 0) {
      return {
        shots: [],
        averageAccuracy: 0,
        consistency: 0,
        trend: 'stable',
      }
    }

    const averageAccuracy =
      recentShots.reduce((sum, shot) => sum + shot.accuracy, 0) /
      recentShots.length

    // Calculate consistency (lower standard deviation = higher consistency)
    const variance =
      recentShots.reduce(
        (sum, shot) => sum + Math.pow(shot.accuracy - averageAccuracy, 2),
        0
      ) / recentShots.length
    const standardDeviation = Math.sqrt(variance)
    const consistency = Math.max(0, 100 - standardDeviation)

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable'
    if (recentShots.length >= 5) {
      const firstHalf = recentShots.slice(0, Math.floor(recentShots.length / 2))
      const secondHalf = recentShots.slice(Math.floor(recentShots.length / 2))

      const firstHalfAvg =
        firstHalf.reduce((sum, shot) => sum + shot.accuracy, 0) /
        firstHalf.length
      const secondHalfAvg =
        secondHalf.reduce((sum, shot) => sum + shot.accuracy, 0) /
        secondHalf.length

      const difference = secondHalfAvg - firstHalfAvg
      if (difference > 5) trend = 'improving'
      else if (difference < -5) trend = 'declining'
    }

    return {
      shots: recentShots,
      averageAccuracy: Math.round(averageAccuracy * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      trend,
    }
  }

  // Get military feedback based on accuracy
  getMilitaryFeedback(accuracy: number): string {
    let category: keyof typeof COMBAT_FEEDBACK

    if (accuracy >= 90) category = 'excellent'
    else if (accuracy >= 80) category = 'good'
    else if (accuracy >= 70) category = 'fair'
    else category = 'poor'

    const messages = COMBAT_FEEDBACK[category]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  // Text-to-speech with military command voice
  async speakCommand(
    text: string,
    isCommand: boolean = false
  ): Promise<boolean> {
    try {
      const options = {
        rate: isCommand ? this.settings.rate * 0.8 : this.settings.rate, // Slower for commands
        pitch: isCommand ? this.settings.pitch * 1.1 : this.settings.pitch, // Higher for authority
        language: this.settings.language,
        voice: this.settings.voice,
      }

      const commandText = isCommand ? `Command: ${text}` : text
      await Speech.speak(commandText, options)
      return true
    } catch (error) {
      console.error('Failed to speak command:', error)
      return false
    }
  }

  // Update voice settings
  async updateSettings(newSettings: Partial<VoiceSettings>): Promise<boolean> {
    try {
      this.settings = { ...this.settings, ...newSettings }
      await AsyncStorage.setItem(
        VOICE_SETTINGS_KEY,
        JSON.stringify(this.settings)
      )
      return true
    } catch (error) {
      console.error('Failed to update voice settings:', error)
      return false
    }
  }

  // Get current settings
  getSettings(): VoiceSettings {
    return { ...this.settings }
  }

  // Check if recording
  getIsRecording(): boolean {
    return this.isRecording
  }

  // Cleanup
  async destroy() {
    try {
      if (Platform.OS !== 'web') {
        await Voice.destroy()
      }
    } catch (error) {
      console.error('Failed to destroy voice recognition:', error)
    }
  }
}

// Export singleton instance
export const voiceRecognitionService = new VoiceRecognitionService()
