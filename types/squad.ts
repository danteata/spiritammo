export interface SquadMember {
    id: string
    name: string
    rank: string
    status: 'Online' | 'Offline' | 'Training'
    avatar: string
    score?: number // For leaderboard
}

export type ChallengeType = 'ROUNDS' | 'ACCURACY' | 'STREAK'

export interface SquadChallenge {
    id: string
    type: ChallengeType
    title: string
    description: string
    targetValue: number
    currentValue: number
    reward: string
    participants: number // Number of squad members contributing
    endDate?: string
}
