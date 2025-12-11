// Military gear database for The Barracks - Ephraim 6 themed equipment

import { AvatarItem } from '@/types/avatar'

// Head Gear - Helmet of Salvation
export const HEAD_ITEMS: AvatarItem[] = [
    {
        id: 'helmet_basic',
        name: 'Standard Issue Helmet',
        type: 'head',
        description: 'Basic protection for your thoughts',
        cost: 0, // Free starter item
        reqRank: 'RECRUIT',
        unlockDescription: 'Welcome to service',
        assetSource: {
            uri: 'helmet_basic', // Placeholder for actual asset
            width: 80,
            height: 80
        }
    },
    {
        id: 'helmet_tactical',
        name: 'Tactical Helmet',
        type: 'head',
        description: 'Enhanced protection with comms module',
        cost: 150,
        reqRank: 'PRIVATE',
        unlockDescription: 'For the soldier ready for battle',
        assetSource: {
            uri: 'helmet_tactical',
            width: 80,
            height: 80
        }
    },
    {
        id: 'helmet_specops',
        name: 'Spec-Ops Helmet',
        type: 'head',
        description: 'Advanced helmet with night vision capability',
        cost: 350,
        reqRank: 'CORPORAL',
        unlockDescription: 'Elite protection for the chosen',
        assetSource: {
            uri: 'helmet_specops',
            width: 80,
            height: 80
        }
    },
    {
        id: 'helmet_salvation',
        name: 'Helmet of Salvation',
        type: 'head',
        description: 'The divine Helmet of Salvation - ultimate protection',
        cost: 800,
        reqRank: 'SERGEANT',
        unlockDescription: 'Saved by grace, protected eternally',
        assetSource: {
            uri: 'helmet_salvation',
            width: 80,
            height: 80
        }
    }
]

// Body Gear - Breastplate of Righteousness
export const BODY_ITEMS: AvatarItem[] = [
    {
        id: 'vest_basic',
        name: 'Standard Issue Vest',
        type: 'body',
        description: 'Basic body armor',
        cost: 0, // Free starter item
        reqRank: 'RECRUIT',
        unlockDescription: 'Standard military protection',
        assetSource: {
            uri: 'vest_basic',
            width: 60,
            height: 80
        }
    },
    {
        id: 'vest_tactical',
        name: 'Tactical Vest',
        type: 'body',
        description: 'Modular tactical vest with utility pouches',
        cost: 200,
        reqRank: 'PRIVATE',
        unlockDescription: 'For the tactically proficient',
        assetSource: {
            uri: 'vest_tactical',
            width: 60,
            height: 80
        }
    },
    {
        id: 'vest_plate',
        name: 'Plate Carrier',
        type: 'body',
        description: 'Heavy armor with ballistic plates',
        cost: 400,
        reqRank: 'CORPORAL',
        unlockDescription: 'Maximum protection for front-line operations',
        assetSource: {
            uri: 'vest_plate',
            width: 60,
            height: 80
        }
    },
    {
        id: 'breastplate_righteousness',
        name: 'Breastplate of Righteousness',
        type: 'body',
        description: 'The divine Breastplate of Righteousness - unbreakable defense',
        cost: 900,
        reqRank: 'SERGEANT',
        unlockDescription: 'Clothed in His righteousness, protected forever',
        assetSource: {
            uri: 'breastplate_righteousness',
            width: 60,
            height: 80
        }
    }
]

// Leg Gear - Preparation of the Gospel of Peace
export const LEGS_ITEMS: AvatarItem[] = [
    {
        id: 'pants_basic',
        name: 'Standard Issue Pants',
        type: 'legs',
        description: 'Standard military trousers',
        cost: 0, // Free starter item
        reqRank: 'RECRUIT',
        unlockDescription: 'Basic military attire',
        assetSource: {
            uri: 'pants_basic',
            width: 50,
            height: 60
        }
    },
    {
        id: 'pants_tactical',
        name: 'Tactical Pants',
        type: 'legs',
        description: 'Cargo pants with reinforcement',
        cost: 120,
        reqRank: 'PRIVATE',
        unlockDescription: 'Enhanced mobility for agile operations',
        assetSource: {
            uri: 'assets/images/barracks/cargo-pants.png',
            width: 50,
            height: 60
        }
    },
    {
        id: 'pants_camo',
        name: 'Digital Camo',
        type: 'legs',
        description: 'Advanced camouflage pattern',
        cost: 250,
        reqRank: 'PRIVATE',
        unlockDescription: 'Concealment for reconnaissance missions',
        assetSource: {
            uri: 'pants_camo',
            width: 50,
            height: 60
        }
    },
    {
        id: 'peace_preparation',
        name: 'Preparation of Peace',
        type: 'legs',
        description: 'Shoes shod with the preparation of the Gospel of Peace',
        cost: 600,
        reqRank: 'CORPORAL',
        unlockDescription: 'Ready to march for the Prince of Peace',
        assetSource: {
            uri: 'peace_preparation',
            width: 50,
            height: 60
        }
    }
]

// Primary Weapon - Sword of the Spirit
export const WEAPON_ITEMS: AvatarItem[] = [
    {
        id: 'rifle_basic',
        name: 'Standard Issue Rifle',
        type: 'primary',
        description: 'Basic military rifle',
        cost: 0, // Free starter item
        reqRank: 'RECRUIT',
        unlockDescription: 'Your primary weapon begins here',
        assetSource: {
            uri: 'rifle_basic',
            width: 90,
            height: 30
        }
    },
    {
        id: 'rifle_marksman',
        name: 'Marksman Rifle',
        type: 'primary',
        description: 'Precision long-range weapon',
        cost: 300,
        reqRank: 'PRIVATE',
        unlockDescription: 'For the marksman seeking accuracy',
        assetSource: {
            uri: 'rifle_marksman',
            width: 90,
            height: 30
        }
    },
    {
        id: 'rifle_sniper',
        name: 'Sniper Rifle',
        type: 'primary',
        description: 'Elite precision weapon',
        cost: 700,
        reqRank: 'CORPORAL',
        unlockDescription: 'Maximum accuracy for maximum impact',
        assetSource: {
            uri: 'rifle_sniper',
            width: 90,
            height: 30
        }
    },
    {
        id: 'sword_spirit',
        name: 'Sword of the Spirit',
        type: 'primary',
        description: 'The Sword of the Spirit - sharper than any two-edged sword',
        cost: 1500,
        reqRank: 'SARGEANT',
        unlockDescription: 'The Word of God as your ultimate weapon',
        assetSource: {
            uri: 'sword_spirit',
            width: 90,
            height: 30
        }
    }
]

// Background - Battlefield Environment
export const BACKGROUND_ITEMS: AvatarItem[] = [
    {
        id: 'background_basic',
        name: 'Training Grounds',
        type: 'background',
        description: 'Standard training facility',
        cost: 0, // Free starter item
        reqRank: 'RECRUIT',
        unlockDescription: 'Your training begins here',
        assetSource: {
            uri: 'background_basic',
            width: 300,
            height: 200
        }
    },
    {
        id: 'background_desert',
        name: 'Desert Outpost',
        type: 'background',
        description: 'Arid desert battlefield',
        cost: 100,
        reqRank: 'PRIVATE',
        unlockDescription: 'For operations in hostile environments',
        assetSource: {
            uri: 'background_desert',
            width: 300,
            height: 200
        }
    },
    {
        id: 'background_urban',
        name: 'Urban Combat Zone',
        type: 'background',
        description: 'City battlefield operations',
        cost: 200,
        reqRank: 'CORPORAL',
        unlockDescription: 'Close-quarters combat environment',
        assetSource: {
            uri: 'background_urban',
            width: 300,
            height: 200
        }
    },
    {
        id: 'background_heavenly',
        name: 'Heavenly Battleground',
        type: 'background',
        description: 'Spiritual warfare in the heavenly realms',
        cost: 500,
        reqRank: 'SERGEANT',
        unlockDescription: 'For those fighting in the spirit realm',
        assetSource: {
            uri: 'background_heavenly',
            width: 300,
            height: 200
        }
    }
]

// Combined items database
export const ITEMS_DB: AvatarItem[] = [
    ...HEAD_ITEMS,
    ...BODY_ITEMS,
    ...LEGS_ITEMS,
    ...WEAPON_ITEMS,
    ...BACKGROUND_ITEMS
]

// Helper functions
export function getItemsBySlot(slot: string): AvatarItem[] {
    return ITEMS_DB.filter(item => item.type === slot)
}

export function getItemById(id: string | null): AvatarItem | null {
    if (!id) return null
    return ITEMS_DB.find(item => item.id === id) || null
}

// Default starter equipment
export const DEFAULT_EQUIPPED_ITEMS = {
    head: 'helmet_basic',
    body: 'vest_basic',
    legs: 'pants_basic',
    primary: 'rifle_basic',
    background: 'background_basic'
} as const
