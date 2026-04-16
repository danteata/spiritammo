import * as FileSystem from 'expo-file-system/legacy'
import { api } from '../convex/_generated/api'
import { convex } from '../providers/ConvexProvider'

const COMMUNITY_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9'

class ConvexTTSService {
    private enabled = false

    initialize(): void {
        this.enabled = !!convex
        if (this.enabled) {
            console.log('[ConvexTTS] initialized with Convex backend')
        }
    }

    isAvailable(): boolean {
        return this.enabled
    }

    async getCommunityAudio(scriptureId: string, voiceId?: string): Promise<string | null> {
        if (!this.enabled || !convex) return null

        try {
            const result = await convex.query(api.ttsAudio.getAudio, {
                scriptureId,
                voiceId: voiceId || COMMUNITY_VOICE_ID,
            })

            if (!result?.url) return null

            return result.url
        } catch (error) {
            console.warn('[ConvexTTS] getCommunityAudio failed:', error)
            return null
        }
    }

    async generateAndCache(scriptureId: string, text: string, voiceId?: string): Promise<string | null> {
        if (!this.enabled || !convex) return null

        try {
            const url = await convex.action(api.ttsAudio.generateAndCache, {
                scriptureId,
                text,
                voiceId: voiceId || COMMUNITY_VOICE_ID,
            })

            return url
        } catch (error) {
            console.warn('[ConvexTTS] generateAndCache failed:', error)
            return null
        }
    }

    async uploadFromLocal(
        scriptureId: string,
        voiceId: string,
        localFileUri: string
    ): Promise<void> {
        if (!this.enabled || !convex) return

        try {
            const postUrl = await convex.mutation(api.ttsAudio.generateUploadUrl, {})

            const base64 = await FileSystem.readAsStringAsync(localFileUri, {
                encoding: FileSystem.EncodingType.Base64,
            })

            const binaryString = atob(base64)
            const bytes = new Uint8Array(binaryString.length)
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
            }

            const blob = new Blob([bytes], { type: 'audio/mpeg' })

            const uploadResponse = await fetch(postUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'audio/mpeg' },
                body: blob,
            })

            if (!uploadResponse.ok) {
                throw new Error(`Upload failed: ${uploadResponse.status}`)
            }

            const { storageId } = await uploadResponse.json()

            const textHash = await hashText(scriptureId)

            await convex.mutation(api.ttsAudio.storeAudio, {
                scriptureId,
                voiceId,
                textHash,
                storageId,
            })

            console.log('[ConvexTTS] uploaded local audio to Convex:', scriptureId)
        } catch (error) {
            console.warn('[ConvexTTS] uploadFromLocal failed:', error)
        }
    }

    getCommunityVoiceId(): string {
        return COMMUNITY_VOICE_ID
    }
}

async function hashText(text: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
            const hashBuffer = await crypto.subtle.digest('SHA-256', data.buffer as ArrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const convexTTSService = new ConvexTTSService()
export default convexTTSService