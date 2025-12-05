import AsyncStorage from '@react-native-async-storage/async-storage'
import { Scripture } from '@/types/scripture'
import { OpenAI } from 'openai'
import { errorHandler } from './errorHandler'

// Initialize OpenAI client for Gemini compatibility
const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'fake-key-for-dev',
  dangerouslyAllowBrowser: true,
  baseURL: `${process.env.EXPO_PUBLIC_GEMINI_API_BASE_URL ||
    'https://generativelanguage.googleapis.com'
    }/${process.env.EXPO_PUBLIC_GEMINI_API_VERSION || 'v1beta'}/openai/`,
  defaultHeaders: {
    'x-goog-api-key':
      process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'fake-key-for-dev',
  },
})

// Battle Intelligence Types
export interface IntelRequest {
  reference: string
  text: string
  missionContext?: string
}

export interface IntelResponse {
  battlePlan: string // mnemonic
  tacticalNotes: string // explanation
  reliability: number // confidence
}

export interface StoredIntel {
  id: string
  reference: string
  battlePlan: string
  dateCreated: Date
  commanderRating?: number
  isCustomIntel: boolean
  missionType: 'prayer' | 'leadership' | 'ministry' | 'warfare' | 'general'
  tacticalNotes?: string
  reliability?: number
}

// Storage keys
const BATTLE_INTEL_KEY = '@spiritammo_intel'
const CUSTOM_INTEL_KEY = '@spiritammo_custom_intel'

// Pre-programmed tactical patterns for common verse types
const tacticalPatterns = {
  prayer: (reference: string, chapter: number, verse: number) =>
    `${reference.split(' ')[0]
    } Command, Chapter ${chapter}: Prayer is weapon #${verse} in your arsenal!`,

  leadership: (reference: string, chapter: number, verse: number) =>
    `Leadership Manual ${reference.split(' ')[0]
    } ${chapter}:${verse} - Command authority protocols.`,

  ministry: (reference: string, chapter: number, verse: number) =>
    `Mission Orders ${reference.split(' ')[0]
    } ${chapter}:${verse} - Ministry deployment strategy.`,

  warfare: (reference: string, chapter: number, verse: number) =>
    `Combat Manual ${reference.split(' ')[0]
    } ${chapter}:${verse} - Spiritual warfare tactics.`,

  general: (reference: string, chapter: number, verse: number) =>
    `Field Manual ${reference.split(' ')[0]
    } ${chapter}:${verse} - General operations directive.`,
}

// Determine mission type based on verse content
const determineMissionType = (text: string): keyof typeof tacticalPatterns => {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('pray') || lowerText.includes('prayer'))
    return 'prayer'
  if (
    lowerText.includes('lead') ||
    lowerText.includes('shepherd') ||
    lowerText.includes('guide')
  )
    return 'leadership'
  if (
    lowerText.includes('preach') ||
    lowerText.includes('teach') ||
    lowerText.includes('minister')
  )
    return 'ministry'
  if (
    lowerText.includes('fight') ||
    lowerText.includes('battle') ||
    lowerText.includes('enemy') ||
    lowerText.includes('armor')
  )
    return 'warfare'

  return 'general'
}

// Generate battle intelligence using Gemini API
export const generateBattleIntel = async (
  request: IntelRequest
): Promise<IntelResponse> => {
  try {
    // Check if we have a stored version that's not custom and not marked for update
    const existingIntel = await getBattleIntel(request.reference)
    const nonCustomIntel = existingIntel.filter((intel) => !intel.isCustomIntel)

    // If we have existing non-custom intel and user hasn't requested an update, return it
    if (
      nonCustomIntel.length > 0 &&
      !request.missionContext?.includes('update')
    ) {
      const latestIntel = nonCustomIntel[0] // Get the most recent one
      return {
        battlePlan: latestIntel.battlePlan,
        tacticalNotes:
          latestIntel.tacticalNotes ||
          'Previously generated tactical intelligence',
        reliability: latestIntel.reliability || 85,
      }
    }

    // Call Gemini API directly
    console.log('📡 Requesting battle intelligence from Gemini...');

    const { reference, text, missionContext } = request;

    // Create prompt for Gemini
    const prompt = `You are a military strategist creating battle intelligence from biblical scriptures. 
    Convert the following scripture into a military-themed mnemonic for memorization.
    
    CRITICAL OBJECTIVE: The mnemonic must be SHORTER and SIMPLER than the verse itself. It must be catchy and easy to recall.
    
    Scripture Reference: ${reference}
    Scripture Text: ${text}
    ${missionContext ? `Mission Context: ${missionContext}` : ''}
    
    Create a creative, memorable military-themed mnemonic that connects the scripture reference numbers 
    and key words to military concepts. Include:
    1. A battle plan/mnemonic (EXTREMELY CONCISE, catchy. MUST integrate the chapter and verse numbers into the sentence itself, not just as a prefix)
    2. Tactical notes explaining the military metaphor
    3. A reliability score (0-100) indicating confidence in the mnemonic quality
    
    Format your response as JSON with these exact keys:
    - battlePlan: string
    - tacticalNotes: string
    - reliability: number
    
    Example format:
    {
      "battlePlan": "ACTS-6:4: 6 soldiers deployed with 4 weapons: Prayer and the Word!",
      "tacticalNotes": "Military metaphor connecting Acts 6:4 to spiritual warfare with 6 soldiers representing the chapter and 4 weapons representing the verse.",
      "reliability": 95
    }`

    const completion = await openai.chat.completions.create({
      model: process.env.EXPO_PUBLIC_GEMINI_API_MODEL || 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: parseFloat(process.env.EXPO_PUBLIC_GEMINI_API_TEMPERATURE || '0.7'),
    })

    const responseContent = completion.choices[0]?.message?.content || '{}'
    console.log('🎯 Gemini Response:', responseContent)

    let intelResponse: IntelResponse

    try {
      // Clean the response content by removing markdown backticks and 'json' identifier
      const cleanedContent = responseContent.replace(/```json\n|```/g, '');
      intelResponse = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse Gemini response:', parseError);
      // Fallback response if parsing fails
      intelResponse = {
        battlePlan: `Military Strategy ${reference} - Apply spiritual principles from this verse to your mission.`,
        tacticalNotes: 'Fallback response due to parsing error. Basic military structure applied.',
        reliability: 60,
      }
    }

    // Store the generated intelligence
    const storedIntel: StoredIntel = {
      id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reference: request.reference,
      battlePlan: intelResponse.battlePlan,
      tacticalNotes: intelResponse.tacticalNotes,
      reliability: intelResponse.reliability,
      dateCreated: new Date(),
      isCustomIntel: false,
      missionType: determineMissionType(request.text),
    }

    await storeBattleIntel(storedIntel)

    return intelResponse
  } catch (error) {
    console.error('Failed to generate battle intelligence:', error)

    // Use error handler for network errors
    await errorHandler.handleError(
      error,
      'Generate Battle Intelligence',
      {
        customMessage: 'Intel generation failed. Deploying standard tactical pattern.',
        silent: true // Don't show alert, just use fallback
      }
    )

    // Fallback to pattern-based generation if API fails
    const missionType = determineMissionType(request.text)
    const [book, chapterVerse] = request.reference.split(' ')
    const [chapter, verse] = chapterVerse.split(':').map(Number)

    return {
      battlePlan: tacticalPatterns[missionType](
        request.reference,
        chapter,
        verse
      ),
      tacticalNotes:
        'Fallback tactical pattern - API request failed, using basic military structure.',
      reliability: 60,
    }
  }
}

// Create advanced tactical intelligence (deprecated - now using API)
const createTacticalIntel = async (
  verse: IntelRequest,
  missionType: string
): Promise<string> => {
  // This function is deprecated as we now use the Gemini API
  // Keeping it for backward compatibility

  const [book, chapterVerse] = verse.reference.split(' ')
  const [chapter, verse_num] = chapterVerse.split(':').map(Number)

  // Enhanced patterns based on documentation examples
  if (book === 'Acts' && chapter === 6 && verse_num === 4) {
    return 'ACTS of war require 6 soldiers with 4 weapons: Prayer and the Word for victory!'
  }

  if (book === 'Mark' && chapter === 1 && verse_num === 35) {
    return 'The #1 MARK of elite soldiers: 0335 hours (3:35) morning prayer briefing!'
  }

  // Generate tactical intelligence based on patterns
  const bookUnit = getBookUnit(book)
  const timeCode = formatTimeCode(chapter, verse_num)
  const tacticalAction = getTacticalAction(verse.text)

  return `${bookUnit} ${timeCode}: ${tacticalAction}`
}

// Helper functions for tactical intelligence generation
const getBookUnit = (book: string): string => {
  // Special handling for books with similar names
  if (book === 'John') {
    return 'John Love Command'
  }

  if (book === 'John Letters') {
    return 'John Love Letters Unit'
  }

  const units: { [key: string]: string } = {
    Genesis: 'Alpha Genesis Unit',
    Exodus: 'Exodus Liberation Force',
    Leviticus: 'Leviticus Protocol Division',
    Numbers: 'Numbers Intelligence Corps',
    Deuteronomy: 'Deuteronomy Command',
    Joshua: 'Joshua Strike Force',
    Judges: 'Judges Tactical Unit',
    Ruth: 'Ruth Loyalty Squadron',
    Samuel: 'Samuel Command Division',
    Kings: 'Kings Royal Guard',
    Chronicles: 'Chronicles Archive Unit',
    Ezra: 'Ezra Reconstruction Corps',
    Nehemiah: 'Nehemiah Defense Force',
    Esther: 'Esther Special Operations',
    Job: 'Job Endurance Battalion',
    Psalms: 'Psalms Worship Warriors',
    Proverbs: 'Proverbs Wisdom Unit',
    Ecclesiastes: 'Ecclesiastes Philosophy Corps',
    Song: 'Song of Songs Love Division',
    Isaiah: 'Isaiah Prophet Command',
    Jeremiah: 'Jeremiah Warning Division',
    Lamentations: 'Lamentations Grief Unit',
    Ezekiel: 'Ezekiel Vision Corps',
    Daniel: 'Daniel Intelligence Unit',
    Hosea: 'Hosea Restoration Force',
    Joel: 'Joel Alert Squadron',
    Amos: 'Amos Justice Division',
    Obadiah: 'Obadiah Judgment Unit',
    Jonah: 'Jonah Mission Force',
    Micah: 'Micah Justice Corps',
    Nahum: 'Nahum Vengeance Unit',
    Habakkuk: 'Habakkuk Faith Division',
    Zephaniah: 'Zephaniah Judgment Force',
    Haggai: 'Haggai Construction Corps',
    Zechariah: 'Zechariah Vision Unit',
    Malachi: 'Malachi Final Warning',
    Matthew: 'Matthew Gospel Division',
    Mark: 'Mark Action Unit',
    Luke: 'Luke Medical Corps',
    Acts: 'Acts Mission Force',
    Romans: 'Romans Doctrine Division',
    Corinthians: 'Corinthians Church Unit',
    Galatians: 'Galatians Freedom Force',
    Ephesians: 'Ephesians Armor Division',
    Philippians: 'Philippians Joy Squadron',
    Colossians: 'Colossians Supremacy Unit',
    Thessalonians: 'Thessalonians Hope Corps',
    Timothy: 'Timothy Leadership Academy',
    Titus: 'Titus Order Division',
    Philemon: 'Philemon Reconciliation Unit',
    Hebrews: 'Hebrews Faith Command',
    James: 'James Practical Division',
    Peter: 'Peter Rock Battalion',
    Jude: 'Jude Warning Squadron',
    Revelation: 'Revelation Final Command',
  }

  return units[book] || `${book} Division`
}

const formatTimeCode = (chapter: number, verse: number): string => {
  // Format as military time when possible
  if (chapter <= 24 && verse <= 59) {
    return `${chapter.toString().padStart(2, '0')}${verse
      .toString()
      .padStart(2, '0')} hours`
  }

  // Format as coordinates
  return `Grid ${chapter}-${verse}`
}

const getTacticalAction = (text: string): string => {
  const lowerText = text.toLowerCase()

  if (lowerText.includes('pray') || lowerText.includes('prayer')) {
    return 'Prayer artillery support requested'
  }
  if (lowerText.includes('love')) {
    return 'Love deployment authorized'
  }
  if (lowerText.includes('faith')) {
    return 'Faith shield activation protocol'
  }
  if (lowerText.includes('hope')) {
    return 'Hope beacon transmission active'
  }
  if (lowerText.includes('peace')) {
    return 'Peace treaty negotiations in progress'
  }
  if (lowerText.includes('joy')) {
    return 'Joy morale boost deployment'
  }
  if (lowerText.includes('strength')) {
    return 'Strength reinforcement protocol'
  }
  if (lowerText.includes('wisdom')) {
    return 'Wisdom intelligence briefing'
  }

  return 'Strategic spiritual operation in progress'
}

// Store battle intelligence
export const storeBattleIntel = async (
  intel: StoredIntel
): Promise<boolean> => {
  try {
    const existingIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY)
    const intelArray: StoredIntel[] = existingIntel
      ? JSON.parse(existingIntel)
      : []

    intelArray.push(intel)

    await AsyncStorage.setItem(BATTLE_INTEL_KEY, JSON.stringify(intelArray))
    return true
  } catch (error) {
    console.error('Failed to store battle intelligence:', error)
    return false
  }
}

// Retrieve battle intelligence
export const getBattleIntel = async (
  reference?: string
): Promise<StoredIntel[]> => {
  try {
    const storedIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY)
    const intelArray: StoredIntel[] = storedIntel ? JSON.parse(storedIntel) : []

    if (reference) {
      return intelArray.filter((intel) => intel.reference === reference)
    }

    return intelArray
  } catch (error) {
    console.error('Failed to retrieve battle intelligence:', error)
    return []
  }
}

// Rate battle intelligence
export const rateBattleIntel = async (
  intelId: string,
  rating: number
): Promise<boolean> => {
  try {
    const storedIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY)
    const intelArray: StoredIntel[] = storedIntel ? JSON.parse(storedIntel) : []

    const updatedIntel = intelArray.map((intel) =>
      intel.id === intelId ? { ...intel, commanderRating: rating } : intel
    )

    await AsyncStorage.setItem(BATTLE_INTEL_KEY, JSON.stringify(updatedIntel))
    return true
  } catch (error) {
    console.error('Failed to rate battle intelligence:', error)
    return false
  }
}

// Generate and store intelligence for a scripture
export const generateAndStoreIntel = async (
  scripture: Scripture,
  forceUpdate: boolean = false
): Promise<StoredIntel | null> => {
  try {
    const request: IntelRequest = {
      reference: scripture.reference,
      text: scripture.text,
      missionContext: forceUpdate ? 'update' : undefined,
    }

    const response = await generateBattleIntel(request)

    // The generateBattleIntel function now handles storage, so we just need to return the stored intel
    // We need to get the LATEST one, not just the first one
    const storedIntel = await getBattleIntel(scripture.reference)
    const nonCustomIntel = storedIntel.filter((intel) => !intel.isCustomIntel)

    if (nonCustomIntel.length > 0) {
      // Sort by date created (descending) to get the newest one
      nonCustomIntel.sort((a, b) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime())
      return nonCustomIntel[0]
    }

    return null
  } catch (error) {
    console.error('Failed to generate and store intelligence:', error)
    return null
  }
}

// Fetch scripture text using Gemini API
export const fetchScriptureText = async (reference: string): Promise<string | null> => {
  try {
    console.log(`📡 Fetching scripture text for ${reference} from Gemini...`);

    const prompt = `Provide the King James Version (KJV) text for the bible verse: ${reference}.
    RETURN ONLY THE TEXT. Do not include the reference, verse numbers, or any other commentary.
    If the verse does not exist, return "NOT_FOUND".`;

    const completion = await openai.chat.completions.create({
      model: process.env.EXPO_PUBLIC_GEMINI_API_MODEL || 'gemini-2.5-flash',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1, // Low temperature for exact retrieval
    });

    const text = completion.choices[0]?.message?.content?.trim();

    if (!text || text === 'NOT_FOUND') {
      return null;
    }

    // specific cleanup for common AI artifacts
    return text.replace(/^"|"$/g, '').trim();
  } catch (error) {
    console.error(`Failed to fetch scripture text for ${reference}:`, error);
    await errorHandler.handleError(error, 'Fetch Scripture Text', { silent: true });
    return null;
  }
}
