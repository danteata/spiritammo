export type BriefingType = 'after-action' | 'cross-reference' | 'weekly-plan'

export interface ErrorPattern {
    position: 'beginning' | 'middle' | 'end'
    type: 'omission' | 'substitution' | 'transposition'
    frequency: number
}

export interface AfterActionBriefing {
    id: string
    sessionId: string
    type: 'after-action'
    diagnosis: string
    errorPatterns: ErrorPattern[]
    recommendation: string
    createdAt: string
}

export interface CrossReferenceBriefing {
    id: string
    type: 'cross-reference'
    sourceReference: string
    targetReference: string
    theme: string
    explanation: string
    createdAt: string
}

export interface WeeklyPlanBriefing {
    id: string
    type: 'weekly-plan'
    days: WeeklyPlanDay[]
    focusAreas: string[]
    createdAt: string
}

export interface WeeklyPlanDay {
    day: string
    mode: string
    description: string
    verseCount: number
    targetReferences: string[]
}

export type TacticalBriefing = AfterActionBriefing | CrossReferenceBriefing | WeeklyPlanBriefing

export interface SessionSummary {
    versesAttempted: number
    averageAccuracy: number
    duration: number
    missedWords: Array<{ reference: string; words: string[] }>
    accuracyPerVerse: Array<{ reference: string; accuracy: number }>
}