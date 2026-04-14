export type MnemonicType = 'acrostic' | 'visual' | 'story-chain' | 'acronym' | 'keyword'

export interface Mnemonic {
    id: string
    scriptureId: string
    type: MnemonicType
    content: string
    source: 'ai' | 'community' | 'user'
    authorUserId?: string
    upvotes: number
    downvotes: number
    createdAt: string
    updatedAt?: string
}

export interface MnemonicGenerationRequest {
    reference: string
    text: string
}

export interface MnemonicGenerationResponse {
    mnemonics: GeneratedMnemonic[]
}

export interface GeneratedMnemonic {
    type: MnemonicType
    content: string
}

export interface MnemonicBootCampStep {
    step: number
    label: string
    description: string
    displayMode: 'full' | 'first-letters' | 'blanks' | 'hidden'
}

export const BOOT_CAMP_STEPS: MnemonicBootCampStep[] = [
    { step: 1, label: 'Full Intel', description: 'See the complete mnemonic', displayMode: 'full' },
    { step: 2, label: 'First Letters', description: 'Only first letters shown as hints', displayMode: 'first-letters' },
    { step: 3, label: 'Blanks', description: 'Key words are blanked out', displayMode: 'blanks' },
    { step: 4, label: 'From Memory', description: 'Recite from memory — no aids', displayMode: 'hidden' },
]

export const VP_REWARDS = {
    SUBMIT_MNEMONIC: 5,
    UPVOTE_RECEIVED: 2,
} as const

export const createDefaultMnemonic = (
    scriptureId: string,
    type: MnemonicType,
    content: string,
    source: Mnemonic['source'] = 'ai',
): Mnemonic => ({
    id: `mnem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    scriptureId,
    type,
    content,
    source,
    upvotes: 0,
    downvotes: 0,
    createdAt: new Date().toISOString(),
})