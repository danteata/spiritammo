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
