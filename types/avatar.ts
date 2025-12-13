// Avatar system types for The Barracks

export type EquipmentSlot = 'head' | 'body' | 'legs' | 'primary' | 'communications' | 'background'

export interface AvatarItem {
    id: string
    name: string
    type: EquipmentSlot
    description: string
    cost: number // VP cost
    reqRank: string // Rank required to purchase
    unlockDescription: string
    assetSource: {
        uri: string // Placeholder until we have actual images
        width: number
        height: number
    }
}

export interface AvatarInventory {
    ownedItems: string[] // Array of item IDs
    equippedItems: Record<EquipmentSlot, string | null> // Current equipped item per slot
    valorPoints: number
}

export interface AvatarStats {
    valorPoints: number
    totalVPEarned: number
    itemsPurchased: number
    lastVPReward: Date | null
}

// VP Reward System
export interface VPReward {
    accuracy: number // Minimum accuracy threshold
    baseVP: number // Base VP reward
    streakMultiplier: number // Multiplier for current streak
    rankBonus: number // Bonus for being above current rank
}

export const VP_REWARDS: VPReward[] = [
    {
        accuracy: 95,
        baseVP: 25,
        streakMultiplier: 2, // 50 VP with 7+ day streak
        rankBonus: 10
    },
    {
        accuracy: 90,
        baseVP: 15,
        streakMultiplier: 1.5, // 22.5 VP rounded to 23 with streak
        rankBonus: 5
    },
    {
        accuracy: 85,
        baseVP: 10,
        streakMultiplier: 1.2, // 12 VP with streak
        rankBonus: 3
    },
    {
        accuracy: 80,
        baseVP: 5,
        streakMultiplier: 1,
        rankBonus: 0
    }
]

// VPCategory labels tying into Ephesians 6
export const SLOT_LABELS: Record<EquipmentSlot, string> = {
    head: 'Helmet of Salvation',
    body: 'Breastplate of Righteousness',
    legs: 'Preparation of Peace',
    primary: 'Sword of the Spirit',
    communications: 'Belt of Truth',
    background: 'Battlefield'
}

export const SLOT_DESCRIPTIONS: Record<EquipmentSlot, string> = {
    head: 'Protection for your mind and thoughts',
    body: 'Guard your heart and righteousness',
    legs: 'Ready your feet for the gospel of peace',
    primary: 'Your Scripture becomes your weapon',
    communications: 'Stay connected with truth and command',
    background: 'The environment of spiritual warfare'
}

export default interface AvatarTypes {
    AvatarItem: AvatarItem
    AvatarInventory: AvatarInventory
    AvatarStats: AvatarStats
    EquipmentSlot: EquipmentSlot
}
