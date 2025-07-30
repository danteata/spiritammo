export interface Scripture {
  id: string;
  book: string;
  chapter: number;
  verse: number;
  endVerse?: number;
  text: string;
  reference: string;
  mnemonic?: string;
  lastPracticed?: string;
  accuracy?: number;
  practiceCount?: number;
}

export interface Book {
  id: string;
  name: string;
  chapters: number;
  testament: 'old' | 'new';
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  scriptures: string[]; // Scripture IDs
}

export type ThemeMode = 'light' | 'dark' | 'auto';

export interface UserSettings {
  themeMode: ThemeMode;
  voiceRate: number;
  voicePitch: number;
  language: string;
  trainingMode: 'single' | 'burst' | 'automatic';
}

export interface UserStats {
  totalPracticed: number;
  averageAccuracy: number;
  streak: number;
  lastPracticeDate?: string;
  rank: 'recruit' | 'soldier' | 'sergeant' | 'lieutenant' | 'captain' | 'major' | 'colonel' | 'general';
}