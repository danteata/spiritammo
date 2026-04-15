import Constants from 'expo-constants'
import * as FileSystem from 'expo-file-system/legacy'

export interface ElevenLabsVoice {
    voice_id: string
    name: string
    category: string
    labels?: Record<string, string>
    preview_url?: string
    fine_tuning?: { is_allowed_to_fine_tune: boolean }
}

export interface ElevenLabsVoiceSettings {
    stability: number
    similarity_boost: number
    style?: number
    use_speaker_boost?: boolean
}

export interface ElevenLabsOptions {
    voiceId?: string
    modelId?: string
    voiceSettings?: ElevenLabsVoiceSettings
}

const DEFAULT_VOICE_ID = 'onwK4e9ZLuTAKqWW03F9' // Daniel — free-tier premade
const DEFAULT_MODEL = 'eleven_flash_v2_5'
const DEFAULT_VOICE_SETTINGS: ElevenLabsVoiceSettings = {
    stability: 0.5,
    similarity_boost: 0.75,
    use_speaker_boost: true,
}

const FREE_TIER_CATEGORY = 'premade'

export class ElevenLabsTTSService {
    private apiKey: string | null = null

    constructor() {
        this.apiKey = Constants.expoConfig?.extra?.elevenLabsApiKey
            || process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY
            || null
    }

    isAvailable(): boolean {
        return !!this.apiKey
    }

    async getSubscriptionInfo(): Promise<{ tier: string; character_count: number; character_limit: number }> {
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key not configured')
        }

        const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
            headers: {
                'xi-api-key': this.apiKey!,
            },
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`ElevenLabs subscription check failed ${response.status}: ${errorBody}`)
        }

        return response.json()
    }

    static isPaymentRequiredError(error: unknown): boolean {
        const msg = error instanceof Error ? error.message : String(error)
        return msg.includes('402') || msg.includes('payment_required')
    }

    static getHumanReadableError(error: unknown): string {
        const msg = error instanceof Error ? error.message : String(error)
        if (msg.includes('402') || msg.includes('payment_required')) {
            return 'This voice requires a paid ElevenLabs plan. Free-tier users can only use premade voices — try selecting a different voice.'
        }
        if (msg.includes('401')) {
            return 'Invalid API key. Please check your ElevenLabs API key and try again.'
        }
        if (msg.includes('429')) {
            return 'Rate limit reached. Please wait a moment and try again.'
        }
        if (msg.includes('quota') || msg.includes('character_limit')) {
            return 'Character quota exceeded. Your free tier has a monthly limit.'
        }
        return msg
    }

    setApiKey(key: string): void {
        this.apiKey = key
    }

    async speak(
        text: string,
        options?: ElevenLabsOptions
    ): Promise<string> {
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key not configured')
        }

        const voiceId = options?.voiceId || DEFAULT_VOICE_ID
        const modelId = options?.modelId || DEFAULT_MODEL
        const voiceSettings = options?.voiceSettings || DEFAULT_VOICE_SETTINGS

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': this.apiKey!,
                },
                body: JSON.stringify({
                    text,
                    model_id: modelId,
                    voice_settings: voiceSettings,
                    output_format: 'mp3_44100_128',
                }),
            }
        )

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const base64 = this.arrayBufferToBase64(arrayBuffer)

        const filename = `elevenlabs_${voiceId}_${Date.now()}.mp3`
        const fileUri = `${FileSystem.cacheDirectory}${filename}`

        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        })

        return fileUri
    }

    async getVoices(): Promise<ElevenLabsVoice[]> {
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key not configured')
        }

        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            headers: {
                'xi-api-key': this.apiKey!,
            },
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`ElevenLabs API error ${response.status}: ${errorBody}`)
        }

        const data = await response.json()
        const allVoices: ElevenLabsVoice[] = data.voices || []
        return allVoices.filter((v) => v.category === FREE_TIER_CATEGORY || v.category === 'cloned')
    }

    async cloneVoice(name: string, sampleFileUris: string[]): Promise<string> {
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key not configured')
        }

        if (sampleFileUris.length === 0) {
            throw new Error('At least one sample file is required for voice cloning')
        }

        const formData = new FormData()

        formData.append('name', name)
        formData.append('description', 'Voice clone created in SpiritAmmo')

        for (const fileUri of sampleFileUris) {
            const filename = fileUri.split('/').pop() || 'sample.mp3'
            const mimeType = filename.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'

            const fileResponse = await fetch(fileUri)
            const fileBlob = await fileResponse.blob()

            formData.append('files', fileBlob, filename)
        }

        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
            method: 'POST',
            headers: {
                'xi-api-key': this.apiKey!,
            },
            body: formData,
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Voice cloning failed ${response.status}: ${errorBody}`)
        }

        const data = await response.json()
        return data.voice_id
    }

    async deleteVoice(voiceId: string): Promise<void> {
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key not configured')
        }

        const response = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
            method: 'DELETE',
            headers: {
                'xi-api-key': this.apiKey!,
            },
        })

        if (!response.ok) {
            const errorBody = await response.text()
            throw new Error(`Delete voice failed ${response.status}: ${errorBody}`)
        }
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }
}

const elevenLabsTTSService = new ElevenLabsTTSService()
export default elevenLabsTTSService