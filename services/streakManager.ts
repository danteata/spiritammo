import AsyncStorage from '@react-native-async-storage/async-storage'
import { errorHandler } from './errorHandler'

export interface DailyChallenge {
    id: string
    title: string
    description: string
    targetValue: number
    currentValue: number
    type: 'verses' | 'accuracy' | 'practice_minutes'
    reward: string
    completed: boolean
    date: string // YYYY-MM-DD format
}

export interface StreakData {
    currentStreak: number
    longestStreak: number
    lastPracticeDate: string | null
    firstPracticeDate: string | null
    totalPracticeDays: number
    totalPracticesToday: number
}

const STREAK_KEY = 'user_streak_data'
const DAILY_CHALLENGE_KEY = 'daily_challenge'

const DEFAULT_STREAK_DATA: StreakData = {
    currentStreak: 0,
    longestStreak: 0,
    lastPracticeDate: null,
    firstPracticeDate: null,
    totalPracticeDays: 0,
    totalPracticesToday: 0
}

export class StreakManager {
    private static instance: StreakManager

    static getInstance(): StreakManager {
        if (!StreakManager.instance) {
            StreakManager.instance = new StreakManager()
        }
        return StreakManager.instance
    }

    async getStreakData(): Promise<StreakData> {
        try {
            const stored = await AsyncStorage.getItem(STREAK_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                const today = new Date().toISOString().split('T')[0]

                // Reset today practices if day changed
                if (parsed.lastPracticeDate !== today) {
                    parsed.totalPracticesToday = 0
                }

                return { ...DEFAULT_STREAK_DATA, ...parsed }
            }
            return DEFAULT_STREAK_DATA
        } catch (error) {
            console.error('Failed to load streak data:', error)
            return DEFAULT_STREAK_DATA
        }
    }

    async recordPractice(accuracy: number = 0): Promise<StreakData> {
        try {
            const streakData = await this.getStreakData()
            const today = new Date().toISOString().split('T')[0]
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

            let updatedStreak = { ...streakData }

            // Set first practice date if not set
            if (!updatedStreak.firstPracticeDate) {
                updatedStreak.firstPracticeDate = today
            }

            // Handle streak calculation
            if (updatedStreak.lastPracticeDate === today) {
                // Practice on same day - increment today's count
                updatedStreak.totalPracticesToday += 1
            } else if (updatedStreak.lastPracticeDate === yesterday) {
                // Practice continues streak
                updatedStreak.currentStreak += 1
                updatedStreak.totalPracticeDays += 1
                updatedStreak.totalPracticesToday = 1
                updatedStreak.lastPracticeDate = today
            } else if (updatedStreak.lastPracticeDate === null || updatedStreak.lastPracticeDate < yesterday) {
                // Streak broken or first practice
                updatedStreak.currentStreak = 1
                updatedStreak.totalPracticeDays += 1
                updatedStreak.totalPracticesToday = 1
                updatedStreak.lastPracticeDate = today
            }

            // Update longest streak
            if (updatedStreak.currentStreak > updatedStreak.longestStreak) {
                updatedStreak.longestStreak = updatedStreak.currentStreak
            }

            await AsyncStorage.setItem(STREAK_KEY, JSON.stringify(updatedStreak))

            // Update daily challenge progress
            await this.updateDailyChallenge(updatedStreak)

            return updatedStreak
        } catch (error) {
            console.error('Failed to record practice:', error)
            return DEFAULT_STREAK_DATA
        }
    }

    private async updateDailyChallenge(streakData: StreakData): Promise<void> {
        try {
            const challenge = await this.getDailyChallenge()
            if (!challenge || challenge.completed) return

            // Update challenge progress based on type
            let progressed = false
            switch (challenge.type) {
                case 'verses':
                    challenge.currentValue = streakData.totalPracticesToday
                    progressed = true
                    break
                case 'accuracy':
                    // Would need accuracy passed in
                    break
                case 'practice_minutes':
                    // Would need time tracking
                    break
            }

            if (progressed) {
                challenge.completed = challenge.currentValue >= challenge.targetValue
                await AsyncStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(challenge))

                if (challenge.completed) {
                    // Could trigger achievement notification here
                    console.log('🎯 Daily challenge completed!')
                }
            }
        } catch (error) {
            console.error('Failed to update daily challenge:', error)
        }
    }

    async getDailyChallenge(): Promise<DailyChallenge | null> {
        try {
            const stored = await AsyncStorage.getItem(DAILY_CHALLENGE_KEY)
            const today = new Date().toISOString().split('T')[0]

            if (stored) {
                const challenge: DailyChallenge = JSON.parse(stored)
                // Reset daily challenge if it's from yesterday
                if (challenge.date !== today) {
                    return await this.generateNewDailyChallenge()
                }
                return challenge
            } else {
                return await this.generateNewDailyChallenge()
            }
        } catch (error) {
            console.error('Failed to get daily challenge:', error)
            return null
        }
    }

    private generateNewDailyChallenge(): Promise<DailyChallenge> {
        const challenges: Omit<DailyChallenge, 'currentValue' | 'completed' | 'date'>[] = [
            {
                id: 'practice_starter',
                title: 'Practice Beginner',
                description: 'Complete 3 practice sessions today',
                targetValue: 3,
                type: 'verses',
                reward: 'Practice Streak +1 Extra Day'
            },
            {
                id: 'consistancy_builder',
                title: 'Consistency Builder',
                description: 'Practice 5 verses today',
                targetValue: 5,
                type: 'verses',
                reward: 'Consistency Badge'
            },
            {
                id: 'verse_master',
                title: 'Verse Master',
                description: 'Practice 10 verses today',
                targetValue: 10,
                type: 'verses',
                reward: 'Master Memorizer Achievement'
            },
            {
                id: 'streak_maintainer',
                title: 'Streak Maintainer',
                description: 'Keep your streak alive!',
                targetValue: 1,
                type: 'verses',
                reward: 'Flame Icon Badge'
            }
        ]

        const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)]
        const today = new Date().toISOString().split('T')[0]

        const newChallenge: DailyChallenge = {
            ...randomChallenge,
            currentValue: 0,
            completed: false,
            date: today
        }

        AsyncStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify(newChallenge))

        return Promise.resolve(newChallenge)
    }

    async getAchievementMessage(streak: number): Promise<string | null> {
        if (streak === 7) return '🎖️ WEEK WARRIOR: 7-day practice streak! Keep it up, soldier!'
        if (streak === 14) return '🏆 FORTNIGHT FORCE: 14 days of dedication. You\'re unstoppable!'
        if (streak === 30) return '🌟 MONTH MASTER: 30 consecutive days! Command level achieved!'
        if (streak === 100) return '👑 CENTURY CHAMPION: 100 days of scripture mastery! Legendary status!'
        return null
    }

    async isNewStreakRecord(streak: number): Promise<boolean> {
        const streakData = await this.getStreakData()
        return streak > streakData.longestStreak && streak > 1
    }
}

// Export singleton instance
export const streakManager = StreakManager.getInstance()

// Export flavor text functions
export const getStreakFlavorText = (streak: number): string => {
    if (streak >= 100) return 'CENTURY CHAMPION'
    if (streak >= 50) return 'HALF-CENTURY HERO'
    if (streak >= 30) return 'MONTH MASTER'
    if (streak >= 14) return 'FORTNIGHT FORCE'
    if (streak >= 7) return 'WEEK WARRIOR'
    if (streak >= 3) return 'STREAK STARTER'
    return 'BEGINNING BATTALION'
}

export const getDailyChallengeFlavorText = (challenge: DailyChallenge): string => {
    if (challenge.completed) {
        return `${challenge.title}: MISSION ACCOMPLISHED! 🎯`
    }
    const progress = Math.round((challenge.currentValue / challenge.targetValue) * 100)
    return `${challenge.title}: ${progress}% complete (${challenge.currentValue}/${challenge.targetValue})`
}
