// Avatar customization slice for The Barracks feature

import { StateCreator } from 'zustand'
import { AvatarInventory, AvatarStats, EquipmentSlot } from '@/types/avatar'
import { ITEMS_DB, DEFAULT_EQUIPPED_ITEMS } from '@/constants/avatarItems'
import AsyncStorage from '@react-native-async-storage/async-storage'

const AVATAR_STORAGE_KEY = 'user_avatar_data'

export interface AvatarSlice {
    // State
    avatarInventory: AvatarInventory
    avatarStats: AvatarStats
    isLoadingAvatar: boolean

    // Actions
    loadAvatarData: () => Promise<void>
    saveAvatarData: () => Promise<void>
    purchaseItem: (itemId: string) => Promise<boolean>
    equipItem: (slot: EquipmentSlot, itemId: string) => Promise<boolean>
    addValorPoints: (points: number, source: string) => Promise<void>
    getRankProgress: () => { currentRank: string, progressPercent: number }

    // Computed values
    canAfford: (cost: number) => boolean
    isOwned: (itemId: string) => boolean
    isEquipped: (itemId: string) => boolean
    getEquippedItem: (slot: EquipmentSlot) => string | null
}

const INITIAL_AVATAR_INVENTORY: AvatarInventory = {
    ownedItems: Object.values(DEFAULT_EQUIPPED_ITEMS),
    equippedItems: { ...DEFAULT_EQUIPPED_ITEMS },
    valorPoints: 100 // Starting VP
}

const INITIAL_AVATAR_STATS: AvatarStats = {
    valorPoints: 100,
    totalVPEarned: 100,
    itemsPurchased: 5, // Default items
    lastVPReward: null
}

type AvatarSliceCreator = StateCreator<AvatarSlice>

export const createAvatarSlice: AvatarSliceCreator = (set, get) => ({
    // Initial state
    avatarInventory: INITIAL_AVATAR_INVENTORY,
    avatarStats: INITIAL_AVATAR_STATS,
    isLoadingAvatar: false,

    // Load avatar data from AsyncStorage
    loadAvatarData: async () => {
        try {
            set({ isLoadingAvatar: true })
            const stored = await AsyncStorage.getItem(AVATAR_STORAGE_KEY)

            if (stored) {
                const parsedData = JSON.parse(stored)

                // Validate owned items exist
                const validOwnedItems = parsedData.avatarInventory?.ownedItems?.filter(
                    (itemId: string) => ITEMS_DB.find(item => item.id === itemId)
                ) || []

                // Ensure default equipped items are owned
                const defaultOwned = Object.values(DEFAULT_EQUIPPED_ITEMS)
                const allOwned = [...new Set([...validOwnedItems, ...defaultOwned])]

                const avatarInventory: AvatarInventory = {
                    ownedItems: allOwned,
                    equippedItems: {
                        ...DEFAULT_EQUIPPED_ITEMS,
                        ...parsedData.avatarInventory?.equippedItems
                    },
                    valorPoints: parsedData.avatarInventory?.valorPoints || 100
                }

                const avatarStats: AvatarStats = {
                    ...INITIAL_AVATAR_STATS,
                    ...parsedData.avatarStats
                }

                set({ avatarInventory, avatarStats })
            }
        } catch (error) {
            console.error('Failed to load avatar data:', error)
        } finally {
            set({ isLoadingAvatar: false })
        }
    },

    // Save avatar data to AsyncStorage
    saveAvatarData: async () => {
        try {
            const { avatarInventory, avatarStats } = get()
            const data = { avatarInventory, avatarStats }
            await AsyncStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(data))
        } catch (error) {
            console.error('Failed to save avatar data:', error)
        }
    },

    // Purchase an item
    purchaseItem: async (itemId: string) => {
        const { avatarInventory, avatarStats, canAfford, saveAvatarData } = get()
        const item = ITEMS_DB.find(item => item.id === itemId)

        if (!item) return false
        if (!canAfford(item.cost)) return false
        if (avatarInventory.ownedItems.includes(itemId)) return false

        try {
            const updatedInventory: AvatarInventory = {
                ...avatarInventory,
                ownedItems: [...avatarInventory.ownedItems, itemId],
                valorPoints: avatarInventory.valorPoints - item.cost
            }

            const updatedStats: AvatarStats = {
                ...avatarStats,
                itemsPurchased: avatarStats.itemsPurchased + 1
            }

            set({ avatarInventory: updatedInventory, avatarStats: updatedStats })
            await saveAvatarData()
            return true

        } catch (error) {
            console.error('Failed to purchase item:', error)
            return false
        }
    },

    // Equip an item in a slot
    equipItem: async (slot: EquipmentSlot, itemId: string) => {
        const { avatarInventory, isOwned, saveAvatarData } = get()

        if (!isOwned(itemId)) return false

        try {
            const updatedInventory: AvatarInventory = {
                ...avatarInventory,
                equippedItems: {
                    ...avatarInventory.equippedItems,
                    [slot]: itemId
                }
            }

            set({ avatarInventory: updatedInventory })
            await saveAvatarData()
            return true

        } catch (error) {
            console.error('Failed to equip item:', error)
            return false
        }
    },

    // Add valor points
    addValorPoints: async (points: number, source: string) => {
        try {
            const { avatarInventory, avatarStats, saveAvatarData } = get()

            const updatedInventory: AvatarInventory = {
                ...avatarInventory,
                valorPoints: avatarInventory.valorPoints + points
            }

            const updatedStats: AvatarStats = {
                ...avatarStats,
                valorPoints: avatarStats.valorPoints + points,
                totalVPEarned: avatarStats.totalVPEarned + points,
                lastVPReward: new Date()
            }

            set({ avatarInventory: updatedInventory, avatarStats: updatedStats })
            await saveAvatarData()

            console.log(`🏆 VP Reward: +${points} VP from ${source}`)

        } catch (error) {
            console.error('Failed to add Valor Points:', error)
        }
    },

    // Get rank progress for UI display
    getRankProgress: () => {
        // This would integrate with military ranking service
        // For now, return placeholder
        return {
            currentRank: 'PRIVATE',
            progressPercent: 65
        }
    },

    // Helper: Check if user can afford an item
    canAfford: (cost: number) => {
        const { avatarInventory } = get()
        return avatarInventory.valorPoints >= cost
    },

    // Helper: Check if item is owned
    isOwned: (itemId: string) => {
        const { avatarInventory } = get()
        return avatarInventory.ownedItems.includes(itemId)
    },

    // Helper: Check if item is equipped
    isEquipped: (itemId: string) => {
        const { avatarInventory } = get()
        return Object.values(avatarInventory.equippedItems).includes(itemId)
    },

    // Helper: Get equipped item for a slot
    getEquippedItem: (slot: EquipmentSlot) => {
        const { avatarInventory } = get()
        return avatarInventory.equippedItems[slot] || null
    }
})
