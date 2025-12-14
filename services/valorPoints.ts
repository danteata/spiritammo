/**
 * Comprehensive Valor Points (VP) System
 * This service handles all VP calculations, rewards, and management
 * to create an engaging progression system for spiritual training
 */

import useZustandStore from '@/hooks/zustandStore'
import { VPReward, VP_REWARDS } from '@/types/avatar'
import { errorHandler } from './errorHandler'
import { useAppStore } from '@/hooks/useAppStore'

class ValorPointsService {

    /**
     * Calculate VP reward based on accuracy and current streak
     * @param accuracy The accuracy percentage (0-100)
     * @param currentStreak Current streak in days
     * @param rank Current user rank for bonus calculation
     * @returns VP reward amount
     */
    static calculateVPReward(accuracy: number, currentStreak: number = 0, rank: string = 'recruit'): number {
        // Find the appropriate reward tier based on accuracy
        const rewardTier = VP_REWARDS
            .sort((a, b) => b.accuracy - a.accuracy) // Sort descending by accuracy
            .find(tier => accuracy >= tier.accuracy) || VP_REWARDS[VP_REWARDS.length - 1]

        // Calculate base VP with streak multiplier
        let baseVP = rewardTier.baseVP

        // Apply streak multiplier (cap at 7-day streak for maximum bonus)
        const streakMultiplier = Math.min(rewardTier.streakMultiplier, 1 + (currentStreak * 0.1))
        baseVP = Math.round(baseVP * streakMultiplier)

        // Apply rank bonus
        const rankBonus = this.getRankBonus(rank, rewardTier.rankBonus)
        baseVP += rankBonus

        return baseVP
    }

    /**
     * Get rank bonus based on user's current rank
     * @param rank Current user rank
     * @param baseBonus Base bonus from reward tier
     * @returns Additional VP bonus for rank
     */
    private static getRankBonus(rank: string, baseBonus: number): number {
        const rankHierarchy = {
            'recruit': 0,
            'private': 1,
            'corporal': 2,
            'sergeant': 3,
            'lieutenant': 4,
            'captain': 5,
            'major': 6,
            'colonel': 7,
            'general': 8
        }

        const rankValue = rankHierarchy[rank.toLowerCase()] || 0
        return baseBonus * rankValue
    }

    /**
     * Award VP for Target Practice completion
     * @param accuracy Accuracy percentage achieved
     * @param currentStreak Current streak in days
     * @param rank Current user rank
     */
    static async awardTargetPracticeVP(accuracy: number, currentStreak: number = 0, rank: string = 'recruit'): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints
            const vpReward = this.calculateVPReward(accuracy, currentStreak, rank)

            if (vpReward > 0) {
                await addVPEarned(vpReward, 'Target Practice')
                console.log(`🎖️ Awarded ${vpReward} VP for Target Practice (${accuracy}% accuracy)`)
                return vpReward
            }

            return 0
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award Target Practice VP')
            return 0
        }
    }

    /**
     * Award VP for Stealth Drill completion
     * @param accuracy Accuracy percentage achieved
     * @param difficultyLevel Difficulty level completed
     * @param currentStreak Current streak in days
     * @param rank Current user rank
     */
    static async awardStealthDrillVP(accuracy: number, difficultyLevel: string, currentStreak: number = 0, rank: string = 'recruit'): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints

            // Calculate base VP
            let baseVP = this.calculateVPReward(accuracy, currentStreak, rank)

            // Apply difficulty multiplier
            const difficultyMultipliers = {
                'RECRUIT': 1.0,
                'SOLDIER': 1.2,
                'SNIPER': 1.5,
                'GHOST': 2.0
            }

            const difficultyMultiplier = difficultyMultipliers[difficultyLevel] || 1.0
            baseVP = Math.round(baseVP * difficultyMultiplier)

            if (baseVP > 0) {
                await addVPEarned(baseVP, 'Stealth Drill')
                console.log(`🎖️ Awarded ${baseVP} VP for Stealth Drill (${difficultyLevel}, ${accuracy}% accuracy)`)
                return baseVP
            }

            return 0
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award Stealth Drill VP')
            return 0
        }
    }

    /**
     * Award VP for Collection Assault completion
     * @param collectionSize Number of verses in the collection
     * @param accuracy Average accuracy across the collection
     * @param completionTime Time taken to complete in seconds
     * @param currentStreak Current streak in days
     * @param rank Current user rank
     */
    static async awardCollectionAssaultVP(collectionSize: number, accuracy: number, completionTime: number, currentStreak: number = 0, rank: string = 'recruit'): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints

            // Base VP from accuracy only - all verses treated equally
            let baseVP = this.calculateVPReward(accuracy, currentStreak, rank)

            // Speed bonus (faster completion = more VP)
            const timeBonus = this.calculateTimeBonus(completionTime, collectionSize)
            baseVP += timeBonus

            if (baseVP > 0) {
                await addVPEarned(baseVP, 'Collection Assault')
                console.log(`🎖️ Awarded ${baseVP} VP for Collection Assault (${collectionSize} verses, ${accuracy}% accuracy)`)
                return baseVP
            }

            return 0
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award Collection Assault VP')
            return 0
        }
    }

    /**
     * Calculate time bonus for faster completions
     * @param completionTime Time taken in seconds
     * @param collectionSize Number of verses
     * @returns Time bonus VP
     */
    private static calculateTimeBonus(completionTime: number, collectionSize: number): number {
        // Estimate expected time: 30 seconds per verse as baseline
        const expectedTime = collectionSize * 30

        if (completionTime < expectedTime * 0.8) {
            // 20% faster than expected = full bonus
            return 25
        } else if (completionTime < expectedTime * 0.9) {
            // 10% faster than expected = partial bonus
            return 15
        } else if (completionTime < expectedTime) {
            // On time = small bonus
            return 5
        }

        return 0 // No bonus for slow completion
    }

    /**
     * Award VP for daily streak maintenance
     * @param streakLength Current streak length
     */
    static async awardDailyStreakVP(streakLength: number): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints

            // Base streak reward with increasing bonuses
            const streakRewards = [
                { min: 1, max: 2, vp: 20 },
                { min: 3, max: 6, vp: 30 },
                { min: 7, max: 14, vp: 50 },
                { min: 15, max: 30, vp: 75 },
                { min: 31, vp: 100 }
            ]

            const reward = streakRewards.find(r =>
                (r.max ? streakLength >= r.min && streakLength <= r.max : streakLength >= r.min)
            ) || streakRewards[0]

            await addVPEarned(reward.vp, 'Daily Streak')
            console.log(`🎖️ Awarded ${reward.vp} VP for ${streakLength}-day streak`)
            return reward.vp
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award daily streak VP')
            return 0
        }
    }

    /**
     * Award VP for first successful recording of the day
     */
    static async awardFirstRecordingVP(): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints
            const firstRecordingBonus = 15

            await addVPEarned(firstRecordingBonus, 'First Recording')
            console.log(`🎖️ Awarded ${firstRecordingBonus} VP for first recording of the day`)
            return firstRecordingBonus
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award first recording VP')
            return 0
        }
    }

    /**
     * Award VP for perfect accuracy (100%)
     */
    static async awardPerfectAccuracyVP(): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints
            const perfectBonus = 25

            await addVPEarned(perfectBonus, 'Perfect Accuracy')
            console.log(`🎖️ Awarded ${perfectBonus} VP for perfect accuracy`)
            return perfectBonus
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award perfect accuracy VP')
            return 0
        }
    }

    /**
     * Award VP for completing a chapter
     * @param chapterSize Number of verses in the chapter
     */
    static async awardChapterCompletionVP(chapterSize: number): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints

            // Fixed reward for chapter completion - all chapters treated equally
            const chapterCompletionVP = 100

            await addVPEarned(chapterCompletionVP, 'Chapter Completion')
            console.log(`🎖️ Awarded ${chapterCompletionVP} VP for completing chapter (${chapterSize} verses)`)
            return chapterCompletionVP
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award chapter completion VP')
            return 0
        }
    }

    /**
     * Award VP for completing a book
     * @param bookName Name of the book completed
     */
    static async awardBookCompletionVP(bookName: string): Promise<number> {
        try {
            const addVPEarned = useZustandStore.getState().addValorPoints

            // All books treated equally - fixed reward for book completion
            const bookCompletionVP = 300

            await addVPEarned(bookCompletionVP, 'Book Completion')
            console.log(`🎖️ Awarded ${bookCompletionVP} VP for completing book: ${bookName}`)
            return bookCompletionVP
        } catch (error) {
            errorHandler.handleError(error, 'Failed to award book completion VP')
            return 0
        }
    }

    /**
     * Get current VP balance
     * @returns Current VP balance
     */
    static getCurrentVP(): number {
        try {
            const { avatarInventory } = useZustandStore.getState()
            return avatarInventory.valorPoints || 0
        } catch (error) {
            errorHandler.handleError(error, 'Failed to get current VP')
            return 0
        }
    }

    /**
     * Check if user can afford an item
     * @param cost Cost of the item
     * @returns True if user has enough VP
     */
    static canAfford(cost: number): boolean {
        try {
            const currentVP = this.getCurrentVP()
            return currentVP >= cost
        } catch (error) {
            errorHandler.handleError(error, 'Failed to check affordability')
            return false
        }
    }

    /**
     * Get VP reward explanation for UI display
     * @param accuracy Accuracy percentage
     * @param currentStreak Current streak
     * @param rank Current rank
     * @returns Formatted reward explanation
     */
    static getVPRewardExplanation(accuracy: number, currentStreak: number, rank: string): string {
        const rewardTier = VP_REWARDS
            .sort((a, b) => b.accuracy - a.accuracy)
            .find(tier => accuracy >= tier.accuracy) || VP_REWARDS[VP_REWARDS.length - 1]

        const baseVP = rewardTier.baseVP
        const streakMultiplier = Math.min(rewardTier.streakMultiplier, 1 + (currentStreak * 0.1))
        const rankBonus = this.getRankBonus(rank, rewardTier.rankBonus)

        const totalVP = Math.round(baseVP * streakMultiplier) + rankBonus

        return `Base: ${baseVP} VP • Streak: ${streakMultiplier}x • Rank Bonus: +${rankBonus} VP = ${totalVP} VP Total`
    }

    /**
     * Get VP history and statistics
     * @returns VP statistics object
     */
    static getVPStatistics(): {
        currentVP: number
        totalEarned: number
        itemsPurchased: number
        estimatedValue: number
    } {
        try {
            const { avatarInventory, avatarStats } = useZustandStore.getState()

            return {
                currentVP: avatarInventory.valorPoints || 0,
                totalEarned: avatarStats.totalVPEarned || 0,
                itemsPurchased: avatarStats.itemsPurchased || 0,
                estimatedValue: (avatarStats.totalVPEarned || 0) - (avatarInventory.valorPoints || 0)
            }
        } catch (error) {
            errorHandler.handleError(error, 'Failed to get VP statistics')
            return {
                currentVP: 0,
                totalEarned: 0,
                itemsPurchased: 0,
                estimatedValue: 0
            }
        }
    }
}

export default ValorPointsService
