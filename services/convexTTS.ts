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

            const uploadResult = await FileSystem.uploadAsync(postUrl, localFileUri, {
                fieldName: 'file',
                httpMethod: 'POST',
                headers: {
                    'Content-Type': 'audio/mpeg',
                },
            })

            if (uploadResult.status < 200 || uploadResult.status >= 300) {
                throw new Error(`Upload failed: ${uploadResult.status}`)
            }

            const { storageId } = JSON.parse(uploadResult.body)

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
    const hashBuffer = await crypto.subtle.digest({ name: 'SHA-256' }, data as unknown as BufferSource)
    const hashArray = Array.from(new Uint8Array(hashBuffer as ArrayBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const convexTTSService = new ConvexTTSService()
export default convexTTSService