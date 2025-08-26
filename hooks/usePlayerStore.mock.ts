import { PlayerProfile, PlayerRank } from '@/types/player'

// Simple mock implementation to unblock the app while resolving Zustand issues
interface PlayerState {
  player: PlayerProfile | null
  isOnboarding: boolean
  setPlayer: (player: PlayerProfile) => void
  updatePlayer: (updates: Partial<PlayerProfile>) => void
  completeOnboarding: (playerData: Partial<PlayerProfile>) => void
  skipOnboarding: () => void
  addVerse: (accuracy: number, practiceTime: number) => void
  updateStreak: () => void
  calculateRank: () => PlayerRank
  getExperienceToNextRank: () => number
  addFriend: () => void
  removeFriend: () => void
  updateSocialSettings: (settings: any) => void
  resetPlayer: () => void
  getPlayerStats: () => any
}

// Simple mock store - replace with proper Zustand implementation once resolved
const mockPlayerState: PlayerState = {
  player: null,
  isOnboarding: true,
  
  setPlayer: () => console.log('Mock: setPlayer called'),
  updatePlayer: () => console.log('Mock: updatePlayer called'),
  completeOnboarding: () => console.log('Mock: completeOnboarding called'),
  skipOnboarding: () => console.log('Mock: skipOnboarding called'),
  addVerse: () => console.log('Mock: addVerse called'),
  updateStreak: () => console.log('Mock: updateStreak called'),
  calculateRank: () => 'recruit' as PlayerRank,
  getExperienceToNextRank: () => 0,
  addFriend: () => console.log('Mock: addFriend called'),
  removeFriend: () => console.log('Mock: removeFriend called'),
  updateSocialSettings: () => console.log('Mock: updateSocialSettings called'),
  resetPlayer: () => console.log('Mock: resetPlayer called'),
  getPlayerStats: () => ({
    rank: 'recruit' as PlayerRank,
    experience: 0,
    experienceToNext: 100,
    level: 1,
    accuracy: 0,
    streaks: { current: 0, longest: 0 },
  }),
}

export const usePlayerStore = () => mockPlayerState