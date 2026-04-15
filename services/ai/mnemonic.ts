import { createCompletion, parseJSONResponse, isAPIKeyReady } from './client'
import { MnemonicGenerationRequest, MnemonicGenerationResponse, GeneratedMnemonic, MnemonicType } from '@/types/mnemonic'

const MNEMONIC_SYSTEM_PROMPT = `You are a military-themed mnemonic creator for SpiritAmmo, a scripture memorization app.
Generate creative, memorable mnemonics that help users encode scripture into long-term memory.
Use military imagery and tactical language where natural, but prioritize memorability above theme.
Each mnemonic should be SHORTER and SIMPLER than the verse itself.
Generate 3-5 different mnemonic types for each verse.`

const buildMnemonicPrompt = (request: MnemonicGenerationRequest): string =>
    `Generate memorization mnemonics for this scripture:

Reference: ${request.reference}
Text: ${request.text}

Create mnemonics in these categories:
1. ACROSTIC: First letters of key words form a memorable word or phrase
2. VISUAL: Vivid mental image sequence connecting key concepts
3. STORY_CHAIN: A short narrative linking verse ideas in order
4. ACRONYM: A catchy acronym from key words (if possible)
5. KEYWORD: Link the reference number to a key concept (e.g., "3 soldiers + 16 weapons")

Format as JSON:
{
  "mnemonics": [
    {"type": "acrostic|visual|story-chain|acronym|keyword", "content": "string"}
  ]
}`

export const generateMnemonics = async (
    request: MnemonicGenerationRequest,
): Promise<MnemonicGenerationResponse> => {
    if (!isAPIKeyReady()) {
        return { mnemonics: [generateFallbackMnemonic(request)] }
    }

    const prompt = buildMnemonicPrompt(request)

    const response = await createCompletion({
        prompt,
        systemPrompt: MNEMONIC_SYSTEM_PROMPT,
    })

    if (!response.success) {
        return { mnemonics: [generateFallbackMnemonic(request)] }
    }

    const parsed = parseJSONResponse<MnemonicGenerationResponse>(response.content, {
        mnemonics: [generateFallbackMnemonic(request)],
    })

    if (!parsed.mnemonics || parsed.mnemonics.length === 0) {
        return { mnemonics: [generateFallbackMnemonic(request)] }
    }

    return parsed
}

const generateFallbackMnemonic = (request: MnemonicGenerationRequest): GeneratedMnemonic => {
    const words = request.text.split(' ').filter(w => w.length > 3)
    const keyWords = words.slice(0, 5)
    const firstLetters = keyWords.map(w => w[0]).join('').toUpperCase()

    return {
        type: 'acrostic' as MnemonicType,
        content: `${request.reference}: Remember "${firstLetters}" — ${keyWords.join(' → ')}`,
    }
}