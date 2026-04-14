import { StateCreator } from 'zustand'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { Mnemonic, MnemonicType, createDefaultMnemonic, VP_REWARDS } from '@/types/mnemonic'
import { generateMnemonics } from '@/services/ai/mnemonic'

const STORAGE_KEY = '@spiritammo_mnemonics'

export interface MnemonicSlice {
    mnemonics: Mnemonic[]
    isMnemonicLoading: boolean

    loadMnemonics: () => Promise<void>
    getMnemonicsForScripture: (scriptureId: string) => Mnemonic[]
    generateMnemonicsForScripture: (scriptureId: string, reference: string, text: string) => Promise<Mnemonic[]>
    addMnemonic: (scriptureId: string, type: MnemonicType, content: string) => Promise<Mnemonic>
    upvoteMnemonic: (mnemonicId: string) => Promise<void>
    downvoteMnemonic: (mnemonicId: string) => Promise<void>
    removeMnemonic: (mnemonicId: string) => Promise<void>
}

export const createMnemonicSlice: StateCreator<MnemonicSlice & { addValorPoints?: (vp: number, source: string) => Promise<void> }, [], [], MnemonicSlice> = (set, get) => ({
    mnemonics: [],
    isMnemonicLoading: false,

    loadMnemonics: async () => {
        try {
            const db = await getDb()
            if (!db) return

            const { mnemonics: mnemonicsTable } = await import('@/db/schema')
            const rows = await db.select().from(mnemonicsTable)

            const loaded: Mnemonic[] = rows.map(r => ({
                id: r.id,
                scriptureId: r.scriptureId,
                type: r.type as MnemonicType,
                content: r.content,
                source: (r.source as Mnemonic['source']) || 'user',
                authorUserId: r.authorUserId || undefined,
                upvotes: r.upvotes ?? 0,
                downvotes: r.downvotes ?? 0,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt || undefined,
            }))

            set({ mnemonics: loaded })
        } catch (error) {
            console.warn('Failed to load mnemonics:', error)
        }
    },

    getMnemonicsForScripture: (scriptureId) => {
        return get().mnemonics
            .filter(m => m.scriptureId === scriptureId)
            .sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes))
    },

    generateMnemonicsForScripture: async (scriptureId, reference, text) => {
        if (get().isMnemonicLoading) return []

        set({ isMnemonicLoading: true })
        try {
            const existing = get().mnemonics.filter(m => m.scriptureId === scriptureId && m.source === 'ai')
            if (existing.length >= 3) return existing

            const response = await generateMnemonics({ reference, text })
            const newMnemonics: Mnemonic[] = response.mnemonics.map(gm =>
                createDefaultMnemonic(scriptureId, gm.type, gm.content, 'ai'),
            )

            const updated = [...get().mnemonics, ...newMnemonics]
            set({ mnemonics: updated })

            const db = await getDb()
            if (db) {
                const { mnemonics: mnemonicsTable } = await import('@/db/schema')
                for (const m of newMnemonics) {
                    await db.insert(mnemonicsTable).values({
                        id: m.id,
                        scriptureId: m.scriptureId,
                        type: m.type,
                        content: m.content,
                        source: m.source,
                        upvotes: m.upvotes,
                        downvotes: m.downvotes,
                        createdAt: m.createdAt,
                    }).onConflictDoNothing()
                }
            }

            return newMnemonics
        } catch (error) {
            console.warn('Failed to generate mnemonics:', error)
            return []
        } finally {
            set({ isMnemonicLoading: false })
        }
    },

    addMnemonic: async (scriptureId, type, content) => {
        const mnemonic = createDefaultMnemonic(scriptureId, type, content, 'user')

        const updated = [...get().mnemonics, mnemonic]
        set({ mnemonics: updated })

        const db = await getDb()
        if (db) {
            const { mnemonics: mnemonicsTable } = await import('@/db/schema')
            await db.insert(mnemonicsTable).values({
                id: mnemonic.id,
                scriptureId: mnemonic.scriptureId,
                type: mnemonic.type,
                content: mnemonic.content,
                source: mnemonic.source,
                upvotes: mnemonic.upvotes,
                downvotes: mnemonic.downvotes,
                createdAt: mnemonic.createdAt,
            }).onConflictDoNothing()
        }

        const addVP = (get() as any).addValorPoints
        if (addVP) {
            await addVP(VP_REWARDS.SUBMIT_MNEMONIC, 'Mnemonic Submitted')
        }

        return mnemonic
    },

    upvoteMnemonic: async (mnemonicId) => {
        const updated = get().mnemonics.map(m =>
            m.id === mnemonicId ? { ...m, upvotes: m.upvotes + 1 } : m,
        )
        set({ mnemonics: updated })

        const db = await getDb()
        if (db) {
            const { mnemonics: mnemonicsTable } = await import('@/db/schema')
            const mn = updated.find(m => m.id === mnemonicId)
            if (mn) {
                await db.update(mnemonicsTable)
                    .set({ upvotes: mn.upvotes })
                    .where(eq(mnemonicsTable.id, mnemonicId))
            }
        }
    },

    downvoteMnemonic: async (mnemonicId) => {
        const updated = get().mnemonics.map(m =>
            m.id === mnemonicId ? { ...m, downvotes: m.downvotes + 1 } : m,
        )
        set({ mnemonics: updated })
    },

    removeMnemonic: async (mnemonicId) => {
        const updated = get().mnemonics.filter(m => m.id !== mnemonicId)
        set({ mnemonics: updated })

        const db = await getDb()
        if (db) {
            const { mnemonics: mnemonicsTable } = await import('@/db/schema')
            await db.delete(mnemonicsTable).where(eq(mnemonicsTable.id, mnemonicId))
        }
    },
})