import { SRSState, SRSDailySummary, emptyDailySummary } from '@/types/srs'
import { isDue, getOverdueDays, getUrgencyScore } from './spacedRepetition'

export interface ScriptureWithSRS {
    id: string
    reference: string
    srsState: SRSState | null
    accuracy?: number
    practiceCount?: number
}

export const getDueScriptures = <T extends ScriptureWithSRS>(
    scriptures: T[],
    date?: Date,
): T[] => {
    return scriptures
        .filter(s => s.srsState !== null && isDue(s.srsState, date))
        .sort((a, b) => getUrgencyScore(b.srsState!, date) - getUrgencyScore(a.srsState!, date))
}

export const getNewScriptures = <T extends ScriptureWithSRS>(
    scriptures: T[],
): T[] => {
    return scriptures.filter(s => s.srsState === null || s.srsState.reps === 0)
}

export const getOverdueScriptures = <T extends ScriptureWithSRS>(
    scriptures: T[],
    date?: Date,
): T[] => {
    return scriptures
        .filter(s => s.srsState !== null && getOverdueDays(s.srsState, date) > 0)
        .sort((a, b) => getOverdueDays(b.srsState!, date) - getOverdueDays(a.srsState!, date))
}

export const getDailySummary = <T extends ScriptureWithSRS>(
    scriptures: T[],
    date?: Date,
): SRSDailySummary => {
    const today = (date || new Date()).toISOString().split('T')[0]
    const due = getDueScriptures(scriptures, date)
    const overdue = getOverdueScriptures(scriptures, date)
    const newScriptures = getNewScriptures(scriptures)
    const reviewedToday = scriptures.filter(
        s => s.srsState?.lastReviewDate === today
    )

    return {
        dueCount: due.length,
        overdueCount: overdue.length,
        newCount: newScriptures.length,
        reviewedTodayCount: reviewedToday.length,
        totalScriptures: scriptures.length,
    }
}

export const buildSRSReviewQueue = <T extends ScriptureWithSRS>(
    scriptures: T[],
    newCardsPerDay: number = 5,
    date?: Date,
): { review: T[]; new_: T[] } => {
    const due = getDueScriptures(scriptures, date)
    const newScriptures = getNewScriptures(scriptures)

    const limitedNew = newScriptures.slice(0, newCardsPerDay)

    return {
        review: due,
        new_: limitedNew,
    }
}

export const getSRSPriorityDescription = (overdueCount: number, dueCount: number): string => {
    if (overdueCount > 0) {
        return overdueCount === 1
            ? '1 verse is overdue for review — deploy now to reinforce memory.'
            : `${overdueCount} verses are overdue for review — deploy now to reinforce memory.`
    }
    if (dueCount > 0) {
        return dueCount === 1
            ? '1 verse is due for review today — stay sharp with a quick deployment.'
            : `${dueCount} verses are due for review today — stay sharp with a quick deployment.`
    }
    return 'All missions complete — no verses due for review.'
}