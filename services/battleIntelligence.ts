import AsyncStorage from '@react-native-async-storage/async-storage';
import { Scripture } from '@/types/scripture';

// Battle Intelligence Types
export interface IntelRequest {
  reference: string;
  text: string;
  missionContext?: string;
}

export interface IntelResponse {
  battlePlan: string; // mnemonic
  tacticalNotes: string; // explanation
  reliability: number; // confidence
}

export interface StoredIntel {
  id: string;
  reference: string;
  battlePlan: string;
  dateCreated: Date;
  commanderRating?: number;
  isCustomIntel: boolean;
  missionType: 'prayer' | 'leadership' | 'ministry' | 'warfare' | 'general';
}

// Storage keys
const BATTLE_INTEL_KEY = '@spiritammo_intel';
const CUSTOM_INTEL_KEY = '@spiritammo_custom_intel';

// Pre-programmed tactical patterns for common verse types
const tacticalPatterns = {
  prayer: (reference: string, chapter: number, verse: number) =>
    `${reference.split(' ')[0]} Command, Chapter ${chapter}: Prayer is weapon #${verse} in your arsenal!`,

  leadership: (reference: string, chapter: number, verse: number) =>
    `Leadership Manual ${reference.split(' ')[0]} ${chapter}:${verse} - Command authority protocols.`,

  ministry: (reference: string, chapter: number, verse: number) =>
    `Mission Orders ${reference.split(' ')[0]} ${chapter}:${verse} - Ministry deployment strategy.`,

  warfare: (reference: string, chapter: number, verse: number) =>
    `Combat Manual ${reference.split(' ')[0]} ${chapter}:${verse} - Spiritual warfare tactics.`,

  general: (reference: string, chapter: number, verse: number) =>
    `Field Manual ${reference.split(' ')[0]} ${chapter}:${verse} - General operations directive.`,
};

// Determine mission type based on verse content
const determineMissionType = (text: string): keyof typeof tacticalPatterns => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('pray') || lowerText.includes('prayer')) return 'prayer';
  if (lowerText.includes('lead') || lowerText.includes('shepherd') || lowerText.includes('guide')) return 'leadership';
  if (lowerText.includes('preach') || lowerText.includes('teach') || lowerText.includes('minister')) return 'ministry';
  if (lowerText.includes('fight') || lowerText.includes('battle') || lowerText.includes('enemy') || lowerText.includes('armor')) return 'warfare';
  
  return 'general';
};

// Generate battle intelligence using AI
export const generateBattleIntel = async (request: IntelRequest): Promise<IntelResponse> => {
  try {
    // For demo purposes, we'll use pattern-based generation
    // In a real implementation, this would call OpenAI API
    
    const missionType = determineMissionType(request.text);
    const [book, chapterVerse] = request.reference.split(' ');
    const [chapter, verse] = chapterVerse.split(':').map(Number);
    
    // Use tactical pattern as base
    const basePattern = tacticalPatterns[missionType](request.reference, chapter, verse);
    
    // Enhanced tactical intelligence based on verse content
    const enhancedIntel = await createTacticalIntel(request, missionType);
    
    return {
      battlePlan: enhancedIntel || basePattern,
      tacticalNotes: `Mission Type: ${missionType.toUpperCase()} - Use military metaphors to link verse numbers to combat scenarios.`,
      reliability: 85 + Math.floor(Math.random() * 15), // 85-100% confidence
    };
  } catch (error) {
    console.error('Failed to generate battle intelligence:', error);
    
    // Fallback to basic pattern
    const missionType = determineMissionType(request.text);
    const [book, chapterVerse] = request.reference.split(' ');
    const [chapter, verse] = chapterVerse.split(':').map(Number);
    
    return {
      battlePlan: tacticalPatterns[missionType](request.reference, chapter, verse),
      tacticalNotes: 'Fallback tactical pattern - basic military structure applied.',
      reliability: 60,
    };
  }
};

// Create advanced tactical intelligence
const createTacticalIntel = async (verse: IntelRequest, missionType: string): Promise<string> => {
  // This would be the OpenAI API call in a real implementation
  // For now, we'll create enhanced patterns based on the documentation examples
  
  const [book, chapterVerse] = verse.reference.split(' ');
  const [chapter, verse_num] = chapterVerse.split(':').map(Number);
  
  // Enhanced patterns based on documentation examples
  if (book === 'Acts' && chapter === 6 && verse_num === 4) {
    return "ACTS of war require 6 soldiers with 4 weapons: Prayer and the Word for victory!";
  }
  
  if (book === 'Mark' && chapter === 1 && verse_num === 35) {
    return "The #1 MARK of elite soldiers: 0335 hours (3:35) morning prayer briefing!";
  }
  
  // Generate tactical intelligence based on patterns
  const bookUnit = getBookUnit(book);
  const timeCode = formatTimeCode(chapter, verse_num);
  const tacticalAction = getTacticalAction(verse.text);
  
  return `${bookUnit} ${timeCode}: ${tacticalAction}`;
};

// Helper functions for tactical intelligence generation
const getBookUnit = (book: string): string => {
  const units: { [key: string]: string } = {
    'Genesis': 'Alpha Genesis Unit',
    'Exodus': 'Exodus Liberation Force',
    'Leviticus': 'Leviticus Protocol Division',
    'Numbers': 'Numbers Intelligence Corps',
    'Deuteronomy': 'Deuteronomy Command',
    'Joshua': 'Joshua Strike Force',
    'Judges': 'Judges Tactical Unit',
    'Ruth': 'Ruth Loyalty Squadron',
    'Samuel': 'Samuel Command Division',
    'Kings': 'Kings Royal Guard',
    'Chronicles': 'Chronicles Archive Unit',
    'Ezra': 'Ezra Reconstruction Corps',
    'Nehemiah': 'Nehemiah Defense Force',
    'Esther': 'Esther Special Operations',
    'Job': 'Job Endurance Battalion',
    'Psalms': 'Psalms Worship Warriors',
    'Proverbs': 'Proverbs Wisdom Unit',
    'Ecclesiastes': 'Ecclesiastes Philosophy Corps',
    'Song': 'Song of Songs Love Division',
    'Isaiah': 'Isaiah Prophet Command',
    'Jeremiah': 'Jeremiah Warning Division',
    'Lamentations': 'Lamentations Grief Unit',
    'Ezekiel': 'Ezekiel Vision Corps',
    'Daniel': 'Daniel Intelligence Unit',
    'Hosea': 'Hosea Restoration Force',
    'Joel': 'Joel Alert Squadron',
    'Amos': 'Amos Justice Division',
    'Obadiah': 'Obadiah Judgment Unit',
    'Jonah': 'Jonah Mission Force',
    'Micah': 'Micah Justice Corps',
    'Nahum': 'Nahum Vengeance Unit',
    'Habakkuk': 'Habakkuk Faith Division',
    'Zephaniah': 'Zephaniah Judgment Force',
    'Haggai': 'Haggai Construction Corps',
    'Zechariah': 'Zechariah Vision Unit',
    'Malachi': 'Malachi Final Warning',
    'Matthew': 'Matthew Gospel Division',
    'Mark': 'Mark Action Unit',
    'Luke': 'Luke Medical Corps',
    'John': 'John Love Command',
    'Acts': 'Acts Mission Force',
    'Romans': 'Romans Doctrine Division',
    'Corinthians': 'Corinthians Church Unit',
    'Galatians': 'Galatians Freedom Force',
    'Ephesians': 'Ephesians Armor Division',
    'Philippians': 'Philippians Joy Squadron',
    'Colossians': 'Colossians Supremacy Unit',
    'Thessalonians': 'Thessalonians Hope Corps',
    'Timothy': 'Timothy Leadership Academy',
    'Titus': 'Titus Order Division',
    'Philemon': 'Philemon Reconciliation Unit',
    'Hebrews': 'Hebrews Faith Command',
    'James': 'James Practical Division',
    'Peter': 'Peter Rock Battalion',
    'John': 'John Love Letters Unit',
    'Jude': 'Jude Warning Squadron',
    'Revelation': 'Revelation Final Command',
  };
  
  return units[book] || `${book} Division`;
};

const formatTimeCode = (chapter: number, verse: number): string => {
  // Format as military time when possible
  if (chapter <= 24 && verse <= 59) {
    return `${chapter.toString().padStart(2, '0')}${verse.toString().padStart(2, '0')} hours`;
  }
  
  // Format as coordinates
  return `Grid ${chapter}-${verse}`;
};

const getTacticalAction = (text: string): string => {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('pray') || lowerText.includes('prayer')) {
    return 'Prayer artillery support requested';
  }
  if (lowerText.includes('love')) {
    return 'Love deployment authorized';
  }
  if (lowerText.includes('faith')) {
    return 'Faith shield activation protocol';
  }
  if (lowerText.includes('hope')) {
    return 'Hope beacon transmission active';
  }
  if (lowerText.includes('peace')) {
    return 'Peace treaty negotiations in progress';
  }
  if (lowerText.includes('joy')) {
    return 'Joy morale boost deployment';
  }
  if (lowerText.includes('strength')) {
    return 'Strength reinforcement protocol';
  }
  if (lowerText.includes('wisdom')) {
    return 'Wisdom intelligence briefing';
  }
  
  return 'Strategic spiritual operation in progress';
};

// Store battle intelligence
export const storeBattleIntel = async (intel: StoredIntel): Promise<boolean> => {
  try {
    const existingIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY);
    const intelArray: StoredIntel[] = existingIntel ? JSON.parse(existingIntel) : [];
    
    intelArray.push(intel);
    
    await AsyncStorage.setItem(BATTLE_INTEL_KEY, JSON.stringify(intelArray));
    return true;
  } catch (error) {
    console.error('Failed to store battle intelligence:', error);
    return false;
  }
};

// Retrieve battle intelligence
export const getBattleIntel = async (reference?: string): Promise<StoredIntel[]> => {
  try {
    const storedIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY);
    const intelArray: StoredIntel[] = storedIntel ? JSON.parse(storedIntel) : [];
    
    if (reference) {
      return intelArray.filter(intel => intel.reference === reference);
    }
    
    return intelArray;
  } catch (error) {
    console.error('Failed to retrieve battle intelligence:', error);
    return [];
  }
};

// Rate battle intelligence
export const rateBattleIntel = async (intelId: string, rating: number): Promise<boolean> => {
  try {
    const storedIntel = await AsyncStorage.getItem(BATTLE_INTEL_KEY);
    const intelArray: StoredIntel[] = storedIntel ? JSON.parse(storedIntel) : [];
    
    const updatedIntel = intelArray.map(intel => 
      intel.id === intelId 
        ? { ...intel, commanderRating: rating }
        : intel
    );
    
    await AsyncStorage.setItem(BATTLE_INTEL_KEY, JSON.stringify(updatedIntel));
    return true;
  } catch (error) {
    console.error('Failed to rate battle intelligence:', error);
    return false;
  }
};

// Generate and store intelligence for a scripture
export const generateAndStoreIntel = async (scripture: Scripture): Promise<StoredIntel | null> => {
  try {
    const request: IntelRequest = {
      reference: scripture.reference,
      text: scripture.text,
    };
    
    const response = await generateBattleIntel(request);
    
    const intel: StoredIntel = {
      id: `intel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reference: scripture.reference,
      battlePlan: response.battlePlan,
      dateCreated: new Date(),
      isCustomIntel: false,
      missionType: determineMissionType(scripture.text),
    };
    
    const success = await storeBattleIntel(intel);
    
    return success ? intel : null;
  } catch (error) {
    console.error('Failed to generate and store intelligence:', error);
    return null;
  }
};
