import * as FileSystem from 'expo-file-system/legacy'

export interface ChatterboxVoice {
    filename: string
    name: string
}

export interface ChatterboxTTSOptions {
    voiceId?: string
    voiceMode?: 'predefined' | 'clone'
    referenceAudioFilename?: string
    temperature?: number
    exaggeration?: number
    cfgWeight?: number
    seed?: number
    speed?: number
    outputFormat?: 'wav' | 'mp3' | 'opus'
    splitText?: boolean
    chunkSize?: number
    language?: string
}

const DEFAULT_SERVER_URL = 'http://192.168.100.193:8004'
const DEFAULT_VOICE = 'Emily.wav'

class ChatterboxTTSService {
    private serverUrl: string = DEFAULT_SERVER_URL
    private connected: boolean = false
    private predefinedVoices: ChatterboxVoice[] = []
    private referenceAudioFiles: string[] = []

    setServerUrl(url: string): void {
        const trimmed = url.replace(/\/+$/, '')
        this.serverUrl = trimmed || DEFAULT_SERVER_URL
        this.connected = false
    }

    getServerUrl(): string {
        return this.serverUrl
    }

    isAvailable(): boolean {
        return !!this.serverUrl
    }

    async checkConnection(): Promise<boolean> {
        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 5000)
            const response = await fetch(`${this.serverUrl}/api/ui/initial-data`, {
                signal: controller.signal,
            })
            clearTimeout(timeoutId)
            if (response.ok) {
                this.connected = true
                await this.fetchVoices()
            } else {
                this.connected = false
            }
            return this.connected
        } catch {
            this.connected = false
            return false
        }
    }

    isConnected(): boolean {
        return this.connected
    }

    private async fetchVoices(): Promise<void> {
        try {
            const response = await fetch(`${this.serverUrl}/v1/audio/voices`)
            if (response.ok) {
                const data = await response.json()
                this.predefinedVoices = (data.voices || []).map((filename: string) => ({
                    filename,
                    name: filename.replace(/\.(wav|mp3)$/i, ''),
                }))
            }
        } catch {
            console.warn('[ChatterboxTTS] Failed to fetch voices')
        }

        try {
            const response = await fetch(`${this.serverUrl}/get_reference_files`)
            if (response.ok) {
                this.referenceAudioFiles = await response.json()
            }
        } catch {
            console.warn('[ChatterboxTTS] Failed to fetch reference audio list')
        }
    }

    getVoices(): ChatterboxVoice[] {
        return this.predefinedVoices
    }

    getReferenceAudioFiles(): string[] {
        return this.referenceAudioFiles
    }

    async speak(
        text: string,
        options?: ChatterboxTTSOptions
    ): Promise<string> {
        const voiceMode = options?.voiceMode || 'predefined'
        const voiceId = options?.voiceId || DEFAULT_VOICE
        const outputFormat = options?.outputFormat || 'wav'

        const requestBody: Record<string, unknown> = {
            input: text,
            voice: voiceId,
            model: 'chatterbox',
            response_format: outputFormat,
        }

        if (options?.speed !== undefined) {
            requestBody.speed = options.speed
        }
        if (options?.seed !== undefined) {
            requestBody.seed = options.seed
        }
        if (options?.language !== undefined) {
            requestBody.language = options.language
        }

        if (voiceMode === 'clone' && options?.referenceAudioFilename) {
            requestBody.voice = options.referenceAudioFilename
        }

        console.log('[ChatterboxTTS] Sending request to /v1/audio/speech:', JSON.stringify(requestBody).substring(0, 200))

        const response = await fetch(`${this.serverUrl}/v1/audio/speech`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error('[ChatterboxTTS] Error response:', response.status, errorBody.substring(0, 300))
            throw new Error(`Chatterbox TTS error ${response.status}: ${errorBody.substring(0, 200)}`)
        }

        const contentType = response.headers.get('content-type') || ''
        console.log('[ChatterboxTTS] Response content-type:', contentType, 'size:', response.headers.get('content-length'))

        const arrayBuffer = await response.arrayBuffer()
        console.log('[ChatterboxTTS] Received audio data, size:', arrayBuffer.byteLength, 'bytes')

        if (arrayBuffer.byteLength < 100) {
            console.error('[ChatterboxTTS] Suspiciously small response, might be an error')
        }

        const base64 = this.arrayBufferToBase64(arrayBuffer)

        const ext = outputFormat === 'mp3' ? 'mp3' : outputFormat === 'opus' ? 'opus' : 'wav'
        const filename = `chatterbox_${voiceId.replace(/\.(wav|mp3)$/i, '')}_${Date.now()}.${ext}`
        const fileUri = `${FileSystem.cacheDirectory}${filename}`

        await FileSystem.writeAsStringAsync(fileUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        })

        console.log('[ChatterboxTTS] Audio saved to:', fileUri)
        return fileUri
    }

    async uploadReferenceAudio(localFileUri: string, filename: string): Promise<string> {
        const uploadUrl = `${this.serverUrl}/upload_reference`

        const uploadResult = await FileSystem.uploadAsync(uploadUrl, localFileUri, {
            fieldName: 'files',
            httpMethod: 'POST',
            headers: {},
            parameters: {},
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        })

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
            throw new Error(`Chatterbox upload failed ${uploadResult.status}: ${uploadResult.body}`)
        }

        const data = JSON.parse(uploadResult.body)

        if (data.uploaded_files && data.uploaded_files.length > 0) {
            await this.fetchVoices()
            return data.uploaded_files[0]
        }

        if (data.all_reference_files) {
            const match = data.all_reference_files.find((f: string) => f === filename)
            if (match) {
                await this.fetchVoices()
                return match
            }
        }

        if (data.errors && data.errors.length > 0) {
            throw new Error(data.errors[0].error || 'Upload failed')
        }

        throw new Error('Upload completed but no filename returned')
    }

    static getHumanReadableError(error: unknown): string {
        const msg = error instanceof Error ? error.message : String(error)
        if (msg.includes('Failed to fetch') || msg.includes('Network request failed') || msg.includes('AbortError')) {
            return 'Cannot connect to Chatterbox server. Make sure it is running and the server URL is correct.'
        }
        if (msg.includes('404')) {
            return 'Voice file not found on the Chatterbox server.'
        }
        if (msg.includes('503')) {
            return 'Chatterbox TTS model is still loading. Please wait and try again.'
        }
        if (msg.includes('400')) {
            return `Bad request to Chatterbox: ${msg}`
        }
        return msg
    }

    private arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer)
        let binary = ''
        const chunkSize = 8192
        for (let i = 0; i < bytes.byteLength; i += chunkSize) {
            const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.byteLength))
            binary += String.fromCharCode.apply(null, Array.from(chunk))
        }
        return btoa(binary)
    }
}

const chatterboxTTSService = new ChatterboxTTSService()
export { ChatterboxTTSService }
export default chatterboxTTSService