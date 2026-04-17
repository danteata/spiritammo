import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { useAppStore } from '@/hooks/useAppStore'
import useZustandStore from '@/hooks/zustandStore'
import { practiceLogService } from '@/services/practiceLogService'
import { militaryRankingService } from '@/services/militaryRanking'
import ValorPointsService from '@/services/valorPoints'
import { Scripture } from '@/types/scripture'
import type { SessionSummary } from '@/types/briefing'

export interface CompletionOptions {
    practiceType: string
    isTraining: boolean
    awardVP: boolean
    saveLog: boolean
    updateProfile: boolean
    updateSRS: boolean
    afterActionBriefing: boolean
    scriptureId?: string
    extraAnalytics?: Record<string, any>
}

export function usePracticeCompletion(options: CompletionOptions) {
    const {
        updateScriptureAccuracy,
        userStats,
        addValorPoints,
    } = useAppStore()

    const [totalVP, setTotalVP] = useState(0)

    const handleComplete = useCallback(async (
        scripture: Scripture,
        accuracy: number,
        transcript: string = ''
    ) => {
        if (updateScriptureAccuracy) {
            await updateScriptureAccuracy(scripture.id, accuracy)
        }

        if (options.updateSRS) {
            useZustandStore.getState().updateSRSAfterReview(scripture.id, accuracy)
        }

        if (options.afterActionBriefing) {
            const session: SessionSummary = {
                versesAttempted: 1,
                averageAccuracy: accuracy,
                duration: 0,
                missedWords: [],
                accuracyPerVerse: [{ reference: scripture.reference, accuracy }],
            }
            useZustandStore
                .getState()
                .requestAfterActionBriefing(session, `${options.practiceType}_${Date.now()}`)
                .catch(() => {})
        }

        let vpEarned = 0
        if (options.awardVP) {
            vpEarned = ValorPointsService.calculateVPReward(
                accuracy,
                userStats?.streak || 0,
                userStats?.rank
            )
            setTotalVP(prev => prev + vpEarned)
            addValorPoints(vpEarned, options.practiceType)
        }

        if (options.saveLog) {
            await practiceLogService.saveLog({
                scriptureId: scripture.id,
                accuracy,
                transcription: transcript,
            })
        }

        if (options.updateProfile) {
            await militaryRankingService.updateProfile({
                versesMemorized: userStats?.totalPracticed || 0,
                averageAccuracy: userStats?.averageAccuracy || 0,
                consecutiveDays: userStats?.streak || 0,
                lastSessionAccuracy: accuracy,
                lastSessionWordCount: scripture.text.split(' ').length,
            })
        }

        return { accuracy, vpEarned }
    }, [options, updateScriptureAccuracy, userStats, addValorPoints])

    return { totalVP, setTotalVP, handleComplete }
}