import { StateCreator } from 'zustand'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { scriptures as scripturesTable } from '@/db/schema'
import { SRSState, SRSRating, SRSDailySummary, accuracyToSRSRating, createDefaultSRSState } from '@/types/srs'
import { calculateNextReview, isDue } from '@/services/spacedRepetition'
import { getDailySummary } from '@/services/srsScheduler'
import { Scripture } from '@/types/scripture'
import { errorHandler } from '@/services/errorHandler'

export interface ScriptureWithSRS extends Scripture {
    srsState: SRSState | null
}

export interface SRSSlice {
    srsStates: Record<string, SRSState>
    srsDailySummary: SRSDailySummary

    initSRSForScripture: (scriptureId: string) => void
    updateSRSAfterReview: (scriptureId: string, accuracy: number) => Promise<boolean>
    updateSRSWithRating: (scriptureId: string, rating: SRSRating) => Promise<boolean>
    getDueScriptures: () => Scripture[]
    getOverdueScriptures: () => Scripture[]
    loadSRSStates: () => Promise<void>
    refreshDailySummary: () => void
}

export const createSRSSlice: StateCreator<
    SRSSlice & { scriptures: Scripture[] },
    [],
    [],
    SRSSlice
> = (set, get) => ({
    srsStates: {},
    srsDailySummary: {
        dueCount: 0,
        overdueCount: 0,
        newCount: 0,
        reviewedTodayCount: 0,
        totalScriptures: 0,
    },

    initSRSForScripture: (scriptureId) => {
        const current = get().srsStates
        if (current[scriptureId]) return

        set({
            srsStates: {
                ...current,
                [scriptureId]: createDefaultSRSState(),
            },
        })
    },

    updateSRSAfterReview: async (scriptureId, accuracy) => {
        const rating = accuracyToSRSRating(accuracy)
        return get().updateSRSWithRating(scriptureId, rating)
    },

    updateSRSWithRating: async (scriptureId, rating) => {
        try {
            const current = get().srsStates
            let state = current[scriptureId]

            if (!state) {
                state = createDefaultSRSState()
            }

            const newState = calculateNextReview(state, rating)

            const updatedStates = { ...current, [scriptureId]: newState }
            set({ srsStates: updatedStates })

            const db = await getDb()
            if (db) {
                await db.update(scripturesTable)
                    .set({
                        lastPracticed: newState.lastReviewDate,
                    })
                    .where(eq(scripturesTable.id, scriptureId))
            }

            get().refreshDailySummary()
            return true
        } catch (error) {
            await errorHandler.handleError(error, 'SRS Update', {
                customMessage: 'Failed to update review schedule.',
                silent: true,
            })
            return false
        }
    },

    getDueScriptures: () => {
        const { srsStates, scriptures } = get()
        return scriptures.filter(s => {
            const state = srsStates[s.id]
            return state && isDue(state)
        })
    },

    getOverdueScriptures: () => {
        const { srsStates, scriptures } = get()
        const today = new Date().toISOString().split('T')[0]
        return scriptures.filter(s => {
            const state = srsStates[s.id]
            return state && state.dueDate < today
        })
    },

    loadSRSStates: async () => {
        try {
            const db = await getDb()
            if (!db) return

            const rows = await db.select({
                id: scripturesTable.id,
                lastPracticed: scripturesTable.lastPracticed,
                accuracy: scripturesTable.accuracy,
                practiceCount: scripturesTable.practiceCount,
            }).from(scripturesTable)

            const states: Record<string, SRSState> = {}
            const today = new Date().toISOString().split('T')[0]

            for (const row of rows) {
                if (row.practiceCount && row.practiceCount > 0 && row.lastPracticed) {
                    const accuracy = row.accuracy ?? 50
                    const rating = accuracyToSRSRating(accuracy)
                    const reps = Math.min(row.practiceCount, 20)
                    const interval = reps <= 1 ? 1 : reps <= 2 ? 6 : Math.round(Math.pow(2.5, Math.min(reps - 2, 5)))

                    const lastReviewed = new Date(row.lastPracticed)
                    const nextDue = new Date(lastReviewed.getTime() + interval * 86400000)

                    states[row.id] = {
                        interval,
                        easeFactor: rating >= 3 ? 2.5 : 1.8,
                        dueDate: nextDue.toISOString().split('T')[0],
                        reps,
                        lapses: accuracy < 50 ? Math.floor(reps * 0.2) : 0,
                        lastReviewDate: row.lastPracticed,
                    }
                }
            }

            set({ srsStates: states })
            get().refreshDailySummary()
        } catch (error) {
            console.warn('SRS state migration failed (non-fatal):', error)
        }
    },

    refreshDailySummary: () => {
        const { srsStates, scriptures } = get()
        const scripturesWithSRS = scriptures.map(s => ({
            ...s,
            srsState: srsStates[s.id] || null,
        }))
        const summary = getDailySummary(scripturesWithSRS)
        set({ srsDailySummary: summary })
    },
})