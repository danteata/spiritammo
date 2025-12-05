import { Scripture } from './scripture'

export type NodeStatus = 'LOCKED' | 'ACTIVE' | 'CONQUERED'

export interface CampaignNode {
    id: string
    title: string
    description: string
    scriptureReference: {
        book: string
        chapter: number
        verse: number
        endVerse?: number
    }
    status: NodeStatus
    requiredAccuracy: number // Percentage required to unlock next node
    xpReward: number
    coordinate: { x: number; y: number } // For map placement
}

export interface Campaign {
    id: string
    title: string
    description: string
    nodes: CampaignNode[]
    totalNodes: number
    completedNodes: number
    difficulty: 'RECRUIT' | 'VETERAN' | 'ELITE'
    theme: 'jungle' | 'desert' | 'urban' | 'arctic'
}
