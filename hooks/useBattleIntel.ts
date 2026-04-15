import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { generateBattleIntel } from '@/services/battleIntelligence'
import { militaryRankingService } from '@/services/militaryRanking'
import VoicePlaybackService from '@/services/voicePlayback'
import { Scripture } from '@/types/scripture'

interface VoiceSettings {
    rate?: number
    pitch?: number
    language?: string
}

export function useBattleIntel(
    getCurrentScripture: () => Scripture | null,
    voiceSettings?: VoiceSettings
) {
    const [isLoadingIntel, setIsLoadingIntel] = useState(false)
    const [isListeningIntel, setIsListeningIntel] = useState(false)
    const [tacticalIntel, setTacticalIntel] = useState<{
        battlePlan: string
        tacticalNotes: string
    } | null>(null)

    const rate = voiceSettings?.rate ?? 0.9
    const pitch = voiceSettings?.pitch ?? 1.0
    const language = voiceSettings?.language ?? 'en-US'

    const handleShowIntel = useCallback(async () => {
        const scripture = getCurrentScripture()
        if (!scripture) return

        setIsLoadingIntel(true)
        try {
            const intel = await generateBattleIntel({
                reference: scripture.reference,
                text: scripture.text,
            })
            setTacticalIntel(intel)
            await militaryRankingService.recordIntelGenerated()
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert(
                'SYSTEM ERROR',
                'Failed to retrieve battle intelligence. Check communications.'
            )
        } finally {
            setIsLoadingIntel(false)
        }
    }, [getCurrentScripture])

    const handleListenIntel = useCallback(async () => {
        const scripture = getCurrentScripture()
        if (!scripture) return
        setIsListeningIntel(true)
        try {
            let intel = tacticalIntel
            if (!intel) {
                setIsLoadingIntel(true)
                intel = await generateBattleIntel({
                    reference: scripture.reference,
                    text: scripture.text,
                })
                setTacticalIntel(intel)
                setIsLoadingIntel(false)
                await militaryRankingService.recordIntelGenerated()
            }
            await VoicePlaybackService.playTextToSpeech(
                `${intel.battlePlan}. ${intel.tacticalNotes}`,
                { rate, pitch, language }
            )
        } catch (error) {
            console.error('Failed to get intel:', error)
            Alert.alert(
                'SYSTEM ERROR',
                'Failed to retrieve battle intelligence. Check communications.'
            )
        } finally {
            setIsListeningIntel(false)
            setIsLoadingIntel(false)
        }
    }, [getCurrentScripture, tacticalIntel, rate, pitch, language])

    const intelText = tacticalIntel
        ? `${tacticalIntel.battlePlan}\n\n${tacticalIntel.tacticalNotes}`
        : undefined

    return {
        isLoadingIntel,
        isListeningIntel,
        tacticalIntel,
        intelText,
        handleShowIntel,
        handleListenIntel,
    }
}