import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_DIR = `${FileSystem.documentDirectory || ''}tts_cache/`
const CACHE_INDEX_KEY = '@tts_cache_index'
const MAX_CACHE_SIZE_MB = 100

interface CacheEntry {
    scriptureId: string
    voiceId: string
    fileUri: string
    fileSize: number
    createdAt: number
    lastAccessedAt: number
}

class TTSCache {
    private static initialized = false

    static async initialize(): Promise<void> {
        if (this.initialized) return
        try {
            const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR)
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true })
            }
            this.initialized = true
            console.log('📦 TTS Cache initialized')
        } catch (error) {
            console.error('Failed to initialize TTS cache:', error)
        }
    }

    static async get(scriptureId: string, voiceId: string): Promise<string | null> {
        try {
            await this.initialize()
            const index = await this.getIndex()
            const entry = index.find(e => e.scriptureId === scriptureId && e.voiceId === voiceId)
            if (!entry) return null

            const fileInfo = await FileSystem.getInfoAsync(entry.fileUri)
            if (!fileInfo.exists) {
                await this.removeEntry(entry)
                return null
            }

            entry.lastAccessedAt = Date.now()
            await this.saveIndex(index)
            return entry.fileUri
        } catch (error) {
            console.error('TTS Cache get error:', error)
            return null
        }
    }

    static async set(scriptureId: string, voiceId: string, sourceUri: string): Promise<string> {
        try {
            await this.initialize()
            const filename = `tts_${scriptureId}_${voiceId}_${Date.now()}.mp3`
            const destUri = `${CACHE_DIR}${filename}`

            await FileSystem.copyAsync({ from: sourceUri, to: destUri })

            const fileInfo = await FileSystem.getInfoAsync(destUri)
            const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0

            const entry: CacheEntry = {
                scriptureId,
                voiceId,
                fileUri: destUri,
                fileSize,
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
            }

            const index = await this.getIndex()
            const existingIdx = index.findIndex(
                e => e.scriptureId === scriptureId && e.voiceId === voiceId
            )
            if (existingIdx >= 0) {
                const old = index[existingIdx]
                const oldFile = await FileSystem.getInfoAsync(old.fileUri)
                if (oldFile.exists) {
                    await FileSystem.deleteAsync(old.fileUri, { idempotent: true })
                }
                index[existingIdx] = entry
            } else {
                index.push(entry)
            }

            await this.saveIndex(index)
            await this.evictIfNeeded(index)
            return destUri
        } catch (error) {
            console.error('TTS Cache set error:', error)
            throw error
        }
    }

    static async setFromBase64(scriptureId: string, voiceId: string, base64Data: string): Promise<string> {
        try {
            await this.initialize()
            const filename = `tts_${scriptureId}_${voiceId}_${Date.now()}.mp3`
            const destUri = `${CACHE_DIR}${filename}`

            await FileSystem.writeAsStringAsync(destUri, base64Data, {
                encoding: FileSystem.EncodingType.Base64,
            })

            const fileInfo = await FileSystem.getInfoAsync(destUri)
            const fileSize = fileInfo.exists ? (fileInfo as any).size || 0 : 0

            const entry: CacheEntry = {
                scriptureId,
                voiceId,
                fileUri: destUri,
                fileSize,
                createdAt: Date.now(),
                lastAccessedAt: Date.now(),
            }

            const index = await this.getIndex()
            const existingIdx = index.findIndex(
                e => e.scriptureId === scriptureId && e.voiceId === voiceId
            )
            if (existingIdx >= 0) {
                const old = index[existingIdx]
                const oldFile = await FileSystem.getInfoAsync(old.fileUri)
                if (oldFile.exists) {
                    await FileSystem.deleteAsync(old.fileUri, { idempotent: true })
                }
                index[existingIdx] = entry
            } else {
                index.push(entry)
            }

            await this.saveIndex(index)
            await this.evictIfNeeded(index)
            return destUri
        } catch (error) {
            console.error('TTS Cache setFromBase64 error:', error)
            throw error
        }
    }

    static async clear(): Promise<void> {
        try {
            const index = await this.getIndex()
            for (const entry of index) {
                const fileInfo = await FileSystem.getInfoAsync(entry.fileUri)
                if (fileInfo.exists) {
                    await FileSystem.deleteAsync(entry.fileUri, { idempotent: true })
                }
            }
            await AsyncStorage.removeItem(CACHE_INDEX_KEY)
            console.log('📦 TTS Cache cleared')
        } catch (error) {
            console.error('TTS Cache clear error:', error)
        }
    }

    static async getCacheSize(): Promise<number> {
        const index = await this.getIndex()
        return index.reduce((sum, entry) => sum + entry.fileSize, 0)
    }

    static async getCacheSizeMB(): Promise<number> {
        const bytes = await this.getCacheSize()
        return bytes / (1024 * 1024)
    }

    static async getEntryCount(): Promise<number> {
        const index = await this.getIndex()
        return index.length
    }

    private static async getIndex(): Promise<CacheEntry[]> {
        try {
            const data = await AsyncStorage.getItem(CACHE_INDEX_KEY)
            if (!data) return []
            const parsed = JSON.parse(data)
            if (!Array.isArray(parsed)) return []
            const valid: CacheEntry[] = []
            for (const entry of parsed) {
                const fileInfo = await FileSystem.getInfoAsync(entry.fileUri).catch(() => null)
                if (fileInfo?.exists) {
                    valid.push(entry)
                }
            }
            return valid
        } catch {
            return []
        }
    }

    private static async saveIndex(index: CacheEntry[]): Promise<void> {
        await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index))
    }

    private static async removeEntry(entry: CacheEntry): Promise<void> {
        const index = await this.getIndex()
        const filtered = index.filter(
            e => !(e.scriptureId === entry.scriptureId && e.voiceId === entry.voiceId)
        )
        await this.saveIndex(filtered)
        const fileInfo = await FileSystem.getInfoAsync(entry.fileUri).catch(() => null)
        if (fileInfo?.exists) {
            await FileSystem.deleteAsync(entry.fileUri, { idempotent: true })
        }
    }

    private static async evictIfNeeded(index: CacheEntry[]): Promise<void> {
        const maxBytes = MAX_CACHE_SIZE_MB * 1024 * 1024
        let totalSize = index.reduce((sum, e) => sum + e.fileSize, 0)

        if (totalSize <= maxBytes) return

        const sorted = [...index].sort((a, b) => a.lastAccessedAt - b.lastAccessedAt)
        const toRemove: CacheEntry[] = []

        for (const entry of sorted) {
            if (totalSize <= maxBytes * 0.8) break
            totalSize -= entry.fileSize
            toRemove.push(entry)
        }

        for (const entry of toRemove) {
            const fileInfo = await FileSystem.getInfoAsync(entry.fileUri).catch(() => null)
            if (fileInfo?.exists) {
                await FileSystem.deleteAsync(entry.fileUri, { idempotent: true })
            }
        }

        const remaining = index.filter(
            e => !toRemove.some(r => r.scriptureId === e.scriptureId && r.voiceId === e.voiceId)
        )
        await this.saveIndex(remaining)
        console.log(`📦 TTS Cache evicted ${toRemove.length} entries`)
    }
}

export default TTSCache