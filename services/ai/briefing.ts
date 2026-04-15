import { createCompletion, parseJSONResponse, isAPIKeyReady } from './client'
import { PROMPTS, SYSTEM_PROMPTS } from './prompts'
import {
    AfterActionBriefing,
    CrossReferenceBriefing,
    WeeklyPlanBriefing,
    SessionSummary,
    ErrorPattern,
} from '@/types/briefing'

const generateId = () => `brief_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

export const generateAfterActionBriefing = async (
    session: SessionSummary,
    sessionId: string,
): Promise<AfterActionBriefing | null> => {
    if (!isAPIKeyReady()) return null

    const prompt = PROMPTS.afterActionBriefing({
        versesAttempted: session.versesAttempted,
        averageAccuracy: session.averageAccuracy,
        duration: session.duration,
        missedWords: session.missedWords,
        accuracyPerVerse: session.accuracyPerVerse,
    })

    const response = await createCompletion({
        prompt,
        systemPrompt: SYSTEM_PROMPTS.tactician,
    })

    if (!response.success) return null

    const parsed = parseJSONResponse<{
        diagnosis: string
        errorPatterns: ErrorPattern[]
        recommendation: string
    }>(response.content, {
        diagnosis: '',
        errorPatterns: [],
        recommendation: '',
    })

    if (!parsed.diagnosis) return null

    return {
        id: generateId(),
        sessionId,
        type: 'after-action',
        diagnosis: parsed.diagnosis,
        errorPatterns: parsed.errorPatterns,
        recommendation: parsed.recommendation,
        createdAt: new Date().toISOString(),
    }
}

export const generateCrossReferenceBriefing = async (
    knownReferences: Array<{ reference: string; theme: string }>,
): Promise<CrossReferenceBriefing[]> => {
    if (!isAPIKeyReady()) return []
    if (knownReferences.length < 2) return []

    const prompt = PROMPTS.crossReference({ knownReferences })

    const response = await createCompletion({
        prompt,
        systemPrompt: SYSTEM_PROMPTS.tactician,
    })

    if (!response.success) return []

    const parsed = parseJSONResponse<Array<{
        sourceReference: string
        targetReference: string
        theme: string
        explanation: string
    }>>(response.content, [])

    return parsed.map(item => ({
        id: generateId(),
        type: 'cross-reference' as const,
        sourceReference: item.sourceReference,
        targetReference: item.targetReference,
        theme: item.theme,
        explanation: item.explanation,
        createdAt: new Date().toISOString(),
    }))
}

export const generateWeeklyPlan = async (
    weakestVerses: Array<{ reference: string; accuracy: number }>,
    dueForReview: number,
    overdueCount: number,
    streak: number,
    averageAccuracy: number,
): Promise<WeeklyPlanBriefing | null> => {
    if (!isAPIKeyReady()) return null

    const prompt = PROMPTS.weeklyPlan({
        weakestVerses,
        dueForReview,
        overdueCount,
        streak,
        averageAccuracy,
    })

    const response = await createCompletion({
        prompt,
        systemPrompt: SYSTEM_PROMPTS.strategist,
    })

    if (!response.success) return null

    const parsed = parseJSONResponse<{
        days: WeeklyPlanBriefing['days']
        focusAreas: string[]
    }>(response.content, { days: [], focusAreas: [] })

    if (parsed.days.length === 0) return null

    return {
        id: generateId(),
        type: 'weekly-plan',
        days: parsed.days,
        focusAreas: parsed.focusAreas,
        createdAt: new Date().toISOString(),
    }
}