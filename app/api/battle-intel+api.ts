import { IntelRequest, IntelResponse } from '@/services/battleIntelligence'
import { OpenAI } from 'openai'

// Initialize OpenAI client for Gemini compatibility
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'fake-key-for-dev', // Use fake key for development
  dangerouslyAllowBrowser: true, // Allow browser usage for development
  baseURL: `${process.env.EXPO_PUBLIC_GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com'
    }/${process.env.EXPO_PUBLIC_GEMINI_API_VERSION || 'v1beta'}/openai/`,
  defaultHeaders: {
    'x-goog-api-key':
      process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'fake-key-for-dev',
  },
})

export function GET(request: Request) {
  console.log('[DEBUG] GET request received for /api/battle-intel');
  return Response.json({
    status: 'Battle Intelligence API is operational',
    version: '1.0',
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  console.log('[DEBUG] Received POST request for /api/battle-intel')
  try {
    const body = await request.json()
    console.log('[DEBUG] Request body:', body)
    const { reference, text, missionContext }: IntelRequest = body

    // Create prompt for Gemini
    const prompt = `You are a military strategist creating battle intelligence from biblical scriptures. 
    Convert the following scripture into a military-themed mnemonic for memorization:
    
    Scripture Reference: ${reference}
    Scripture Text: ${text}
    ${missionContext ? `Mission Context: ${missionContext}` : ''}
    
    Create a creative, memorable military-themed mnemonic that connects the scripture reference numbers 
    and key words to military concepts. Include:
    1. A battle plan/mnemonic (concise, memorable)
    2. Tactical notes explaining the military metaphor
    3. A reliability score (0-100) indicating confidence in the mnemonic quality
    
    Format your response as JSON with these exact keys:
    - battlePlan: string
    - tacticalNotes: string
    - reliability: number
    
    Example format:
    {
      "battlePlan": "ACTS of war require 6 soldiers with 4 weapons: Prayer and the Word for victory!",
      "tacticalNotes": "Military metaphor connecting Acts 6:4 to spiritual warfare with 6 soldiers representing the 6 words and 4 weapons representing the 4 words in the verse.",
      "reliability": 95
    }`

    console.log('[DEBUG] check env variables:', {
      apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY,
      baseURL: process.env.EXPO_PUBLIC_GEMINI_API_BASE_URL,
      version: process.env.EXPO_PUBLIC_GEMINI_API_VERSION,
      model: process.env.EXPO_PUBLIC_GEMINI_API_MODEL,
      temperature: process.env.EXPO_PUBLIC_GEMINI_API_TEMPERATURE,
      maxTokens: process.env.EXPO_PUBLIC_GEMINI_API_MAX_TOKENS,
      topP: process.env.EXPO_PUBLIC_GEMINI_API_TOP_P,
    })

    // Call Gemini API through OpenAI compatible interface
    const completion = await openai.chat.completions.create({
      model:
        process.env.EXPO_PUBLIC_GEMINI_API_MODEL ||
        'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: parseFloat(
        process.env.EXPO_PUBLIC_GEMINI_API_TEMPERATURE || '0.7'
      ),
      // max_tokens: parseInt(
      //   process.env.EXPO_PUBLIC_GEMINI_API_MAX_TOKENS || '300'
      // ),
      // top_p: parseFloat(process.env.EXPO_PUBLIC_GEMINI_API_TOP_P || '0.95'),
    })
    const responseContent = completion.choices[0]?.message?.content || '{}'
    console.log('[DEBUG] Gemini response content:', responseContent)
    let intelResponse: IntelResponse

    try {
      // Clean the response content by removing markdown backticks and 'json' identifier
      const cleanedContent = responseContent.replace(/```json\n|```/g, '');
      intelResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      // Fallback response if parsing fails
      intelResponse = {
        battlePlan: `Military Strategy ${reference} - Apply spiritual principles from this verse to your mission.`,
        tacticalNotes:
          'Fallback response due to parsing error. Basic military structure applied.',
        reliability: 60,
      }
    }

    return new Response(JSON.stringify(intelResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  } catch (error) {
    console.error('Error generating battle intelligence:', error)

    // Return fallback response
    const fallbackResponse: IntelResponse = {
      battlePlan: 'Strategic spiritual operation in progress',
      tacticalNotes:
        'Fallback response due to API error. Basic military structure applied.',
      reliability: 50,
    }

    return new Response(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}
