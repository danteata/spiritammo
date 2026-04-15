import { StateCreator } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { UserSettings, UserStats } from '@/types/scripture'
import { militaryRankingService } from '@/services/militaryRanking'
import { errorHandler } from '@/services/errorHandler'
import { ScriptureSlice } from './createScriptureSlice'

const USER_SETTINGS_KEY = 'user_settings'
const USER_STATS_KEY = 'user_stats'

const DEFAULT_USER_SETTINGS: UserSettings = {
    themeMode: 'auto',
    voiceRate: 0.9,
    voicePitch: 1.0,
    language: 'en-US',
    trainingMode: 'single',
    voiceEngine: 'native',
    ttsEngine: 'native',
    elevenLabsVoiceId: 'onwK4e9ZLuTAKqWW03F9',
    elevenLabsApiKey: '',
    useClonedVoice: false,
    clonedVoiceId: null,
    ttsCacheEnabled: true,
    isTimedMission: false,
    stealthInputMode: 'bank',
    showPlainLabels: true,
}

const DEFAULT_USER_STATS: UserStats = {
    totalPracticed: 0,
    averageAccuracy: 0,
    streak: 0,
    rank: 'recruit',
}

// Helpers
const isYesterday = (dateString?: string) => {
    if (!dateString) return false
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)

    const date = new Date(dateString)
    date.setHours(0, 0, 0, 0)

    return date.getTime() === yesterday.getTime()
}

const calculateRank = (practiceCount: number, accuracy: number): UserStats['rank'] => {
    if (practiceCount >= 5000 && accuracy >= 99) return 'general'
    if (practiceCount >= 2000 && accuracy >= 98) return 'colonel'
    if (practiceCount >= 1000 && accuracy >= 95) return 'major'
    if (practiceCount >= 500 && accuracy >= 90) return 'captain'
    if (practiceCount >= 200 && accuracy >= 85) return 'lieutenant'
    if (practiceCount >= 100 && accuracy >= 80) return 'sergeant'
    if (practiceCount >= 50 && accuracy >= 75) return 'corporal'
    return 'recruit'
}

export interface UserSlice {
    userSettings: UserSettings
    userStats: UserStats
    saveUserSettings: (settings: UserSettings) => Promise<boolean>
    updateUserStats: (accuracy: number) => Promise<boolean>
}

export const createUserSlice: StateCreator<UserSlice & ScriptureSlice, [], [], UserSlice> = (set, get) => ({
    userSettings: DEFAULT_USER_SETTINGS,
    userStats: DEFAULT_USER_STATS,

    saveUserSettings: async (settings) => {
        try {
            await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings))
            set({ userSettings: settings })
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Save User Settings',
                { customMessage: 'Failed to save field operations settings. Please retry, soldier.' }
            )
            return false
        }
    },

    updateUserStats: async (accuracy) => {
        try {
            const updatedStats = { ...get().userStats }

            updatedStats.totalPracticed += 1

            const totalAccuracy = updatedStats.averageAccuracy * (updatedStats.totalPracticed - 1) + accuracy
            updatedStats.averageAccuracy = totalAccuracy / updatedStats.totalPracticed

            const today = new Date().toDateString()
            const lastPracticeDate = updatedStats.lastPracticeDate ? new Date(updatedStats.lastPracticeDate).toDateString() : null

            if (lastPracticeDate === today) {
                // no-op
            } else if (!lastPracticeDate || isYesterday(updatedStats.lastPracticeDate)) {
                updatedStats.streak += 1
            } else {
                updatedStats.streak = 1
            }

            updatedStats.lastPracticeDate = new Date().toISOString()
            updatedStats.rank = calculateRank(updatedStats.totalPracticed, updatedStats.averageAccuracy)

            // Fade out plain labels after 5 sessions
            const settings = get().userSettings
            if (settings.showPlainLabels && updatedStats.totalPracticed >= 5) {
                const updatedSettings = { ...settings, showPlainLabels: false }
                await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updatedSettings))
                set({ userSettings: updatedSettings })
            }

            // Sync with Military Ranking Service
            try {
                const rankingResult = await militaryRankingService.updateProfile({
                    versesMemorized: updatedStats.totalPracticed,
                    averageAccuracy: updatedStats.averageAccuracy,
                    consecutiveDays: updatedStats.streak,
                    lastSessionAccuracy: accuracy,
                    lastSessionWordCount: get().currentScripture?.text ? get().currentScripture!.text.split(/\s+/).length : 0
                })

                if (rankingResult.newRank && rankingResult.newRank !== updatedStats.rank) {
                    updatedStats.rank = rankingResult.newRank
                }
            } catch (rankError) {
                console.error('Failed to sync military ranking:', rankError)
                // Don't fail the whole operation if ranking sync fails
            }

            await AsyncStorage.setItem(USER_STATS_KEY, JSON.stringify(updatedStats))
            set({ userStats: updatedStats })
            return true
        } catch (error) {
            await errorHandler.handleError(
                error,
                'Update User Stats',
                {
                    customMessage: 'Failed to log mission results. Your combat record may not be updated.',
                    silent: true // Don't show alert for stats updates
                }
            )
            return false
        }
    },
})
