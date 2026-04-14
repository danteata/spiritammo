import { StateCreator } from 'zustand'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { AfterActionBriefing, CrossReferenceBriefing, WeeklyPlanBriefing, TacticalBriefing, SessionSummary } from '@/types/briefing'
import { generateAfterActionBriefing, generateCrossReferenceBriefing, generateWeeklyPlan } from '@/services/ai/briefing'
import { Scripture } from '@/types/scripture'

const STORAGE_KEY = '@spiritammo_briefings'

export interface BriefingSlice {
    afterActionBriefings: AfterActionBriefing[]
    crossReferenceBriefings: CrossReferenceBriefing[]
    weeklyPlan: WeeklyPlanBriefing | null
    isBriefingLoading: boolean

    requestAfterActionBriefing: (session: SessionSummary, sessionId: string) => Promise<AfterActionBriefing | null>
    requestCrossReferenceBriefing: (scriptures: Scripture[]) => Promise<CrossReferenceBriefing[]>
    requestWeeklyPlan: (scriptures: Scripture[], streak: number, averageAccuracy: number) => Promise<WeeklyPlanBriefing | null>
    loadBriefings: () => Promise<void>
    clearBriefings: () => Promise<void>
}

export const createBriefingSlice: StateCreator<BriefingSlice, [], [], BriefingSlice> = (set, get) => ({
    afterActionBriefings: [],
    crossReferenceBriefings: [],
    weeklyPlan: null,
    isBriefingLoading: false,

    requestAfterActionBriefing: async (session, sessionId) => {
        set({ isBriefingLoading: true })
        try {
            const briefing = await generateAfterActionBriefing(session, sessionId)
            if (briefing) {
                const updated = [briefing, ...get().afterActionBriefings].slice(0, 50)
                set({ afterActionBriefings: updated })
                await persistBriefings(get())
            }
            return briefing
        } finally {
            set({ isBriefingLoading: false })
        }
    },

    requestCrossReferenceBriefing: async (scriptures) => {
        set({ isBriefingLoading: true })
        try {
            const knownRefs = scriptures
                .filter(s => s.practiceCount && s.practiceCount > 0)
                .slice(0, 20)
                .map(s => ({
                    reference: s.reference,
                    theme: extractTheme(s.text),
                }))

            const briefings = await generateCrossReferenceBriefing(knownRefs)
            if (briefings.length > 0) {
                const updated = [...briefings, ...get().crossReferenceBriefings].slice(0, 20)
                set({ crossReferenceBriefings: updated })
                await persistBriefings(get())
            }
            return briefings
        } finally {
            set({ isBriefingLoading: false })
        }
    },

    requestWeeklyPlan: async (scriptures, streak, averageAccuracy) => {
        set({ isBriefingLoading: true })
        try {
            const weakest = scriptures
                .filter(s => s.practiceCount && s.practiceCount > 0)
                .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0))
                .slice(0, 10)
                .map(s => ({ reference: s.reference, accuracy: s.accuracy ?? 0 }))

            const { srsDailySummary } = get() as any
            const dueCount = srsDailySummary?.dueCount ?? 0
            const overdueCount = srsDailySummary?.overdueCount ?? 0

            const plan = await generateWeeklyPlan(weakest, dueCount, overdueCount, streak, averageAccuracy)
            if (plan) {
                set({ weeklyPlan: plan })
                await persistBriefings(get())
            }
            return plan
        } finally {
            set({ isBriefingLoading: false })
        }
    },

    loadBriefings: async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                set({
                    afterActionBriefings: parsed.afterActionBriefings || [],
                    crossReferenceBriefings: parsed.crossReferenceBriefings || [],
                    weeklyPlan: parsed.weeklyPlan || null,
                })
            }
        } catch (error) {
            console.warn('Failed to load briefings:', error)
        }
    },

    clearBriefings: async () => {
        set({
            afterActionBriefings: [],
            crossReferenceBriefings: [],
            weeklyPlan: null,
        })
        await AsyncStorage.removeItem(STORAGE_KEY)
    },
})

const persistBriefings = async (state: BriefingSlice) => {
    try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
            afterActionBriefings: state.afterActionBriefings,
            crossReferenceBriefings: state.crossReferenceBriefings,
            weeklyPlan: state.weeklyPlan,
        }))
    } catch (error) {
        console.warn('Failed to persist briefings:', error)
    }
}

const extractTheme = (text: string): string => {
    const lowerText = text.toLowerCase()
    const themes = ['faith', 'grace', 'love', 'peace', 'hope', 'strength', 'wisdom', 'prayer']
    for (const theme of themes) {
        if (lowerText.includes(theme)) return theme
    }
    return 'general'
}