export interface Scripture {
  id: string
  book: string
  chapter: number
  verse: number
  endVerse?: number
  text: string
  reference: string
  mnemonic?: string
  lastPracticed?: string
  accuracy?: number
  practiceCount?: number
  isJesusWords?: boolean // Flag to indicate if this verse contains words of Jesus
  masteryLevel?: number
}

export interface Book {
  id: string
  name: string
  chapters: number
  testament: 'old' | 'new'
  abbreviations: string[]
}

export interface Collection {
  id: string
  name: string
  abbreviation?: string // Short abbreviation like "POSE", "LAD", etc.
  description?: string
  scriptures: string[] // Scripture IDs
  createdAt?: string
  tags?: string[]
  // Chapter-based organization (optional)
  isChapterBased?: boolean
  chapters?: CollectionChapter[]
  // Book information (for book-based collections)
  sourceBook?: string
  bookInfo?: {
    totalChapters: number
    completedChapters: number
    averageAccuracy?: number
  }
  // System properties
  isSystem?: boolean
  stats?: {
    totalVerses: number
    masteredVerses?: number
  }
}

export interface CollectionChapter {
  id: string
  chapterNumber: number
  name?: string // Optional custom name like "Creation Story", "Sermon on the Mount"
  description?: string
  scriptures: string[] // Scripture IDs in this chapter
  isCompleted?: boolean
  averageAccuracy?: number
  lastPracticed?: string
  // For non-sequential chapters or custom sections
  isCustomSection?: boolean
  sectionRange?: string // e.g., "1-3", "5,7,9"
}

export type ThemeMode = 'light' | 'dark' | 'auto'
export type ThemeColor = 'slate' | 'jungle'

export interface UserSettings {
  themeMode: ThemeMode
  themeColor?: ThemeColor
  voiceRate: number
  voicePitch: number
  language: string
  trainingMode: 'single' | 'burst' | 'automatic'
  voiceEngine: 'whisper' | 'native'
}

export interface UserStats {
  totalPracticed: number
  averageAccuracy: number
  streak: number
  lastPracticeDate?: string
  rank:
  | 'recruit'
  | 'private'
  | 'corporal'
  | 'sergeant'
  | 'lieutenant'
  | 'captain'
  | 'major'
  | 'colonel'
  | 'general'
  specializations?: string[]
  commendations?: string[]
  totalPoints?: number
}

// Enhanced Military Types
export interface BattleIntel {
  id: string
  reference: string
  battlePlan: string
  tacticalNotes: string
  reliability: number
  dateCreated: Date
  missionType: 'prayer' | 'leadership' | 'ministry' | 'warfare' | 'general'
}

export interface TrainingSession {
  id: string
  date: Date
  versesAttempted: number
  averageAccuracy: number
  duration: number // in minutes
  missionType: string
  shotGrouping?: {
    shots: number
    averageAccuracy: number
    consistency: number
  }
}

export interface CombatStats {
  totalRoundsFired: number
  averageAccuracy: number
  consecutiveHits: number
  favoriteAmmunition: string[]
  marksmanLevel: UserStats['rank']
  specializations: string[]
  commendations: string[]
  trainingHistory: TrainingSession[]
}

// Voice Recording System Types
export interface VoiceRecording {
  id: string
  scriptureId: string
  scriptureRef: string // e.g., "John 3:16"
  accuracy: number
  timestamp: number
  duration: number // in seconds
  fileUri: string
  fileSize?: number // in bytes
  quality: 'standard' | 'high' | 'premium'
  tags?: string[] // e.g., ['high-accuracy', 'mastered', 'favorite']
  metadata?: {
    deviceModel?: string
    osVersion?: string
    appVersion?: string
  }
}

export interface VoiceRecordingStats {
  totalRecordings: number
  totalStorageUsed: number // in bytes
  averageAccuracy: number
  recordingsByQuality: Record<VoiceRecording['quality'], number>
  oldestRecording?: number
  newestRecording?: number
}

export interface VoiceLibrarySettings {
  autoSaveEnabled: boolean
  minimumAccuracy: number // threshold for auto-saving (e.g., 90)
  maxStorageDays: number // delete recordings older than X days (0 = never)
  maxStorageSize: number // max storage in MB (0 = unlimited)
  preferredQuality: VoiceRecording['quality']
  useRecordedVoice: boolean // prefer recorded voice over TTS when available
}
