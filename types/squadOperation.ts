export interface SquadOperation {
    id: string
    type: OperationType
    squadId: string
    status: OperationStatus
    participants: OperationParticipant[]
    config: OperationConfig
    results?: OperationResults
    createdAt: number
    updatedAt: number
}

export type OperationType = 'skirmish' | 'raid' | 'war'
export type OperationStatus = 'waiting' | 'active' | 'completed' | 'cancelled'

export interface OperationParticipant {
    userId: string
    displayName: string
    score?: number
    accuracy?: number
    completedAt?: number
    ready: boolean
}

export interface OperationConfig {
    skirmish?: SkirmishConfig
    raid?: RaidConfig
    war?: WarConfig
}

export interface SkirmishConfig {
    scriptureReferences: string[]
    accuracyThreshold: number
    timeLimitSec: number
    vpReward: number
}

export interface RaidConfig {
    campaignId: string
    nodeId: string
    accuracyThreshold: number
    vpRewardPerMember: number
}

export interface WarConfig {
    challengerSquadId: string
    defenderSquadId: string
    startDate: number
    endDate: number
    vpBounty: number
    scoringMetric: 'accuracy' | 'verse_count' | 'total_xp'
}

export interface OperationResults {
    winnerId?: string
    participants: Array<{
        userId: string
        score: number
        accuracy: number
        versesCompleted: number
    }>
    vpAwarded: number
    completedAt: number
}

export interface SkirmishState {
    operationId: string
    myUserId: string
    opponentUserId: string
    scriptureReference: string
    myAccuracy: number
    opponentAccuracy: number
    countdown: number
    phase: 'countdown' | 'active' | 'complete'
    winnerId?: string
}

export interface RaidState {
    operationId: string
    nodeId: string
    assignments: Array<{
        userId: string
        scriptureReferences: string[]
        completed: boolean
        accuracy: number
    }>
    allCompleted: boolean
    overallAccuracy: number
}

export interface WarScoreboard {
    challengerSquadId: string
    defenderSquadId: string
    challengerScore: number
    defenderScore: number
    daysRemaining: number
    topContributors: Array<{
        userId: string
        displayName: string
        score: number
    }>
}