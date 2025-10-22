import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import { PlayerProfile, PlayerRank, RANK_PROGRESSION } from '@/types/player'

// Utility function
function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
}

interface PlayerState {
  // Player data
  player: PlayerProfile | null
  isOnboarding: boolean

  // Actions
  setPlayer: (player: PlayerProfile) => void
  updatePlayer: (updates: Partial<PlayerProfile>) => void
  completeOnboarding: (playerData: Partial<PlayerProfile>) => void
  skipOnboarding: () => void

  // Stats management
  addVerse: (accuracy: number, practiceTime: number) => void
  updateStreak: () => void
  calculateRank: () => PlayerRank
  getExperienceToNextRank: () => number

  // Social features
  addFriend: () => void
  removeFriend: () => void
  updateSocialSettings: (
    settings: Partial<PlayerProfile['notifications']>
  ) => void

  // Utility
  resetPlayer: () => void
  getPlayerStats: () => {
    rank: PlayerRank
    experience: number
    experienceToNext: number
    level: number
    accuracy: number
    streaks: {
      current: number
      longest: number
    }
  }
}

const DEFAULT_PLAYER: PlayerProfile = {
  id: '',
  name: '',
  callSign: '',
  rank: 'recruit',
  joinDate: new Date(),
  lastActive: new Date(),
  totalVerses: 0,
  averageAccuracy: 0,
  currentStreak: 0,
  longestStreak: 0,
  totalPracticeTime: 0,
  friendsCount: 0,
  isPublic: true,
  allowInvites: true,
  hasCompletedOnboarding: false,
  onboardingStep: 0,
  preferredDifficulty: 'recruit',
  notifications: {
    dailyReminders: true,
    friendActivity: true,
    challenges: true,
  },
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      player: null,
      isOnboarding: true,

      setPlayer: (player) => {
        set({ player, isOnboarding: false })
      },

      updatePlayer: (updates) => {
        const currentPlayer = get().player
        if (currentPlayer) {
          set({
            player: {
              ...currentPlayer,
              ...updates,
              lastActive: new Date(),
            },
          })
        }
      },

      completeOnboarding: (playerData) => {
        const newPlayer: PlayerProfile = {
          ...DEFAULT_PLAYER,
          ...playerData,
          id: generatePlayerId(),
          hasCompletedOnboarding: true,
          onboardingStep: 5,
          joinDate: new Date(),
          lastActive: new Date(),
        }

        set({
          player: newPlayer,
          isOnboarding: false,
        })
      },

      skipOnboarding: () => {
        const newPlayer: PlayerProfile = {
          ...DEFAULT_PLAYER,
          id: generatePlayerId(),
          name: 'Anonymous Soldier',
          hasCompletedOnboarding: false,
          onboardingStep: 0,
          joinDate: new Date(),
          lastActive: new Date(),
        }

        set({
          player: newPlayer,
          isOnboarding: false,
        })
      },

      addVerse: (accuracy, practiceTime) => {
        const currentPlayer = get().player
        if (!currentPlayer) return

        const newTotalVerses = currentPlayer.totalVerses + 1
        const newTotalAccuracy =
          (currentPlayer.averageAccuracy * currentPlayer.totalVerses +
            accuracy) /
          newTotalVerses
        const newTotalTime = currentPlayer.totalPracticeTime + practiceTime

        // Calculate experience gain (base 10 + accuracy bonus)
        const experienceGain = Math.floor(10 + (accuracy / 100) * 20)

        get().updatePlayer({
          totalVerses: newTotalVerses,
          averageAccuracy: newTotalAccuracy,
          totalPracticeTime: newTotalTime,
        })

        // Update rank based on new stats
        const newRank = get().calculateRank()
        if (newRank !== currentPlayer.rank) {
          get().updatePlayer({ rank: newRank })
        }
      },

      updateStreak: () => {
        const currentPlayer = get().player
        if (!currentPlayer) return

        const today = new Date()
        const lastPractice = currentPlayer.lastActive
        const daysDiff = Math.floor(
          (today.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
        )

        let newCurrentStreak = currentPlayer.currentStreak
        let newLongestStreak = currentPlayer.longestStreak

        if (daysDiff === 0) {
          // Same day, maintain streak
          return
        } else if (daysDiff === 1) {
          // Next day, increment streak
          newCurrentStreak += 1
          newLongestStreak = Math.max(newLongestStreak, newCurrentStreak)
        } else {
          // Streak broken
          newCurrentStreak = 1
        }

        get().updatePlayer({
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak,
        })
      },

      calculateRank: (): PlayerRank => {
        const currentPlayer = get().player
        if (!currentPlayer) return 'recruit'

        const { totalVerses, averageAccuracy, currentStreak } = currentPlayer

        // Calculate composite score
        const verseScore = totalVerses * 10
        const accuracyScore = averageAccuracy * 2
        const streakScore = currentStreak * 50
        const compositeScore = verseScore + accuracyScore + streakScore

        // Determine rank based on score and requirements
        const ranks = Object.keys(RANK_PROGRESSION) as PlayerRank[]
        let newRank: PlayerRank = 'recruit'

        for (const rank of ranks) {
          const requirements = RANK_PROGRESSION[rank]
          if (
            compositeScore >= requirements.minScore &&
            totalVerses >= requirements.minVerses &&
            averageAccuracy >= requirements.minAccuracy
          ) {
            newRank = rank
          }
        }

        return newRank
      },

      getExperienceToNextRank: () => {
        const currentPlayer = get().player
        if (!currentPlayer) return 0

        const currentRank = currentPlayer.rank
        const ranks = Object.keys(RANK_PROGRESSION) as PlayerRank[]
        const currentIndex = ranks.indexOf(currentRank)

        if (currentIndex === ranks.length - 1) {
          return 0 // Already at highest rank
        }

        const nextRank = ranks[currentIndex + 1]
        const nextRequirements = RANK_PROGRESSION[nextRank]

        const currentScore =
          currentPlayer.totalVerses * 10 +
          currentPlayer.averageAccuracy * 2 +
          currentPlayer.currentStreak * 50

        return Math.max(0, nextRequirements.minScore - currentScore)
      },

      addFriend: () => {
        const currentPlayer = get().player
        if (currentPlayer) {
          get().updatePlayer({
            friendsCount: currentPlayer.friendsCount + 1,
          })
        }
      },

      removeFriend: () => {
        const currentPlayer = get().player
        if (currentPlayer && currentPlayer.friendsCount > 0) {
          get().updatePlayer({
            friendsCount: currentPlayer.friendsCount - 1,
          })
        }
      },

      updateSocialSettings: (settings) => {
        const currentPlayer = get().player
        if (currentPlayer) {
          get().updatePlayer({
            notifications: {
              ...currentPlayer.notifications,
              ...settings,
            },
          })
        }
      },

      resetPlayer: () => {
        set({
          player: null,
          isOnboarding: true,
        })
      },

      getPlayerStats: () => {
        const currentPlayer = get().player
        if (!currentPlayer) {
          return {
            rank: 'recruit' as PlayerRank,
            experience: 0,
            experienceToNext: 100,
            level: 1,
            accuracy: 0,
            streaks: {
              current: 0,
              longest: 0,
            },
          }
        }

        const experience =
          currentPlayer.totalVerses * 10 +
          currentPlayer.averageAccuracy * 2 +
          currentPlayer.currentStreak * 50

        return {
          rank: currentPlayer.rank,
          experience,
          experienceToNext: get().getExperienceToNextRank(),
          level: Math.floor(experience / 100) + 1,
          accuracy: currentPlayer.averageAccuracy,
          streaks: {
            current: currentPlayer.currentStreak,
            longest: currentPlayer.longestStreak,
          },
        }
      },
    })),
    {
      name: 'player-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state: PlayerState) => ({ player: state.player }),
    }
  )
)
