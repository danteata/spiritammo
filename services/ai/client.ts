import { OpenAI } from 'openai'

const buildGeminiBaseUrl = (rawBaseUrl?: string, version: string = 'v1beta') => {
    const base = (rawBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '')
    if (base.includes('/openai')) return `${base}/`
    if (base.match(/\/v\d/)) return `${base}/openai/`
    return `${base}/${version}/openai/`
}

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY
const GEMINI_API_VERSION = process.env.EXPO_PUBLIC_GEMINI_API_VERSION || 'v1beta'
const GEMINI_API_BASE_URL = buildGeminiBaseUrl(process.env.EXPO_PUBLIC_GEMINI_API_BASE_URL, GEMINI_API_VERSION)
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_API_MODEL || 'gemini-2.5-flash'
const FALLBACK_MODEL = 'gemini-1.5-flash'
const TEMPERATURE = parseFloat(process.env.EXPO_PUBLIC_GEMINI_API_TEMPERATURE || '0.7')

export interface AIClientConfig {
    apiKey: string
    baseURL: string
    model: string
    fallbackModel: string
    temperature: number
}

export const getAIClientConfig = (): AIClientConfig => ({
    apiKey: GEMINI_API_KEY || 'fake-key-for-dev',
    baseURL: GEMINI_API_BASE_URL,
    model: GEMINI_MODEL,
    fallbackModel: FALLBACK_MODEL,
    temperature: TEMPERATURE,
})

export const isAPIKeyReady = (): boolean =>
    !!(GEMINI_API_KEY && GEMINI_API_KEY !== 'fake-key-for-dev')

let _client: OpenAI | null = null

export const getAIClient = (): OpenAI => {
    if (!_client) {
        const config = getAIClientConfig()
        _client = new OpenAI({
            apiKey: config.apiKey,
            dangerouslyAllowBrowser: true,
            baseURL: config.baseURL,
            defaultHeaders: {
                'x-goog-api-key': config.apiKey,
            },
        })
    }
    return _client
}

export interface CompletionRequest {
    prompt: string
    systemPrompt?: string
    model?: string
    temperature?: number
}

export interface CompletionResponse {
    content: string
    model: string
    success: boolean
    error?: string
}

export const createCompletion = async (request: CompletionRequest): Promise<CompletionResponse> => {
    const client = getAIClient()
    const config = getAIClientConfig()

    if (!isAPIKeyReady()) {
        return {
            content: '',
            model: request.model || config.model,
            success: false,
            error: 'Gemini API key missing. Set EXPO_PUBLIC_GEMINI_API_KEY.',
        }
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = []
    if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const model = request.model || config.model
    const temp = request.temperature ?? config.temperature

    try {
        const completion = await client.chat.completions.create({
            model,
            messages,
            temperature: temp,
        })

        const content = completion.choices[0]?.message?.content || ''
        return { content, model, success: true }
    } catch (err: any) {
        if (err?.status === 404 && model !== config.fallbackModel) {
            try {
                const fallbackCompletion = await client.chat.completions.create({
                    model: config.fallbackModel,
                    messages,
                    temperature: temp,
                })
                const content = fallbackCompletion.choices[0]?.message?.content || ''
                return { content, model: config.fallbackModel, success: true }
            } catch (fallbackErr) {
                return {
                    content: '',
                    model: config.fallbackModel,
                    success: false,
                    error: `Both models failed: ${fallbackErr}`,
                }
            }
        }
        return {
            content: '',
            model,
            success: false,
            error: err?.message || 'Unknown error',
        }
    }
}

export const parseJSONResponse = <T>(content: string, fallback: T): T => {
    try {
        const cleaned = content.replace(/```json\n|```/g, '')
        return JSON.parse(cleaned) as T
    } catch {
        return fallback
    }
}