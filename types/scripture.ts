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
}

export interface Book {
  id: string
  name: string
  chapters: number
  testament: 'old' | 'new'
}

export interface Collection {
  id: string
  name: string
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

export interface UserSettings {
  themeMode: ThemeMode
  voiceRate: number
  voicePitch: number
  language: string
  trainingMode: 'single' | 'burst' | 'automatic'
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
