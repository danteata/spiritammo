// Pre-generate a simple UUID alternative to avoid crypto dependency in React Native
const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};
import { Scripture } from '@/types/scripture';
import { BOOKS } from '@/mocks/books';

export interface QuestionOption {
  label: string;
  isCorrect: boolean;
  scriptureId?: string;
}

export interface Question {
  id: string;
  type: 'reference' | 'content' | 'inference' | 'multiple-select' | 'facts' | 'true-false-list';
  text: string;
  options: QuestionOption[];
  correctAnswer?: string | string[] | Record<string, 'T' | 'F'>;
  explanation?: string;
  scriptureIds: string[];
  points?: number;
}

export interface QuestionSet {
  id: string;
  collectionId: string;
  questions: Question[];
  generatedAt: string;
}

const OPTION_LABELS = ['a', 'b', 'c', 'd', 'e'] as const;


export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function getMeaningfulTruncation(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  
  // Try to find the last sentence end within the maxLength
  const sentenceEndMatch = text.substring(0, maxLength).match(/.*[.!?]\s/);
  if (sentenceEndMatch) {
    return sentenceEndMatch[0].trim();
  }
  
  // If no sentence end, try to find a comma or semicolon
  const phraseEndMatch = text.substring(0, maxLength).match(/.*[,;]\s/);
  if (phraseEndMatch) {
    return phraseEndMatch[0].trim();
  }
  
  // Fallback to word boundary
  const lastSpace = text.lastIndexOf(' ', maxLength);
  if (lastSpace > maxLength * 0.7) {
    return text.substring(0, lastSpace).trim() + '...';
  }
  
  return text.substring(0, maxLength).trim() + '...';
}

export function extractKeyPhrases(text: string, count: number): string[] {
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 5);
  // If text is short, split by commas
  if (sentences.length < 2) {
    return text.split(',').map(s => s.trim()).filter(s => s.length > 5).slice(0, count);
  }
  return shuffleArray(sentences).slice(0, count);
}

export function generateParaphrase(scripture: Scripture): string {
  const text = scripture.text;
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);

  if (sentences.length === 0) {
    return `A passage about ${scripture.book} chapter ${scripture.chapter}`;
  }

  const paraphrase = sentences
    .map((sentence) => {
      let paraphrased = sentence.trim();

      const replacements: Record<string, string> = {
        'the Lord': 'God',
        'the LORD': 'God',
        'saith': 'says',
        'hath': 'has',
        'doth': 'does',
        'shall': 'will',
        'unto': 'to',
        'thee': 'you',
        'thou': 'you',
        'thy': 'your',
        'thine': 'your',
        'spake': 'spoke',
        'came to pass': 'happened',
        'behold': 'look',
        'verily': 'truly',
        'beseech': 'beg',
        'brethren': 'brothers and sisters',
        'wherefore': 'therefore',
        'lest': 'so that not',
        'hath been': 'has been',
        'art': 'are',
        'wast': 'were',
      };

      for (const [oldWord, newWord] of Object.entries(replacements)) {
        const regex = new RegExp(`\\b${oldWord}\\b`, 'gi');
        paraphrased = paraphrased.replace(regex, newWord);
      }

      return paraphrased;
    })
    .join('. ');

  return paraphrase.length > 0 ? paraphrase : scripture.text;
}

function parseReference(reference: string): { bookId: string; chapter: number; verse: number; endVerse?: number } | null {
  const cleaned = reference.replace(/[\u2013\u2014–—]/g, '-').trim();
  const refPattern = /^(\d?\s?[A-Za-z]+)\s+(\d+):(\d+)(?:-(\d+))?$/;
  const match = cleaned.match(refPattern);

  if (!match) return null;

  const [, bookName, chapter, startVerse, endVerse] = match;
  const book = BOOKS.find(
    (b) =>
      b.name.toLowerCase() === bookName.toLowerCase().trim() ||
      b.abbreviations.some((a) => a.toLowerCase() === bookName.toLowerCase().trim())
  );

  if (!book) return null;

  return {
    bookId: book.id,
    chapter: parseInt(chapter, 10),
    verse: parseInt(startVerse, 10),
    endVerse: endVerse ? parseInt(endVerse, 10) : undefined,
  };
}

function formatReference(bookId: string, chapter: number, verse: number, endVerse?: number): string {
  const book = BOOKS.find(b => b.id === bookId);
  if (!book) return `${chapter}:${verse}`;

  const versePart = endVerse && endVerse !== verse ? `${verse}-${endVerse}` : `${verse}`;
  return `${book.name} ${chapter}:${versePart}`;
}

export function generateDistractorReferences(correctRef: string): string[] {
  const parsed = parseReference(correctRef);
  if (!parsed) {
    return generateRandomReferences(correctRef, 4);
  }

  const { bookId, chapter, verse, endVerse } = parsed;
  const book = BOOKS.find(b => b.id === bookId);
  if (!book) return generateRandomReferences(correctRef, 4);

  const distractors: string[] = [];
  const bookIndex = BOOKS.indexOf(book);
  const sameTestamentBooks = BOOKS.filter(b => b.testament === book.testament && b.id !== bookId);

  const sameBookOtherChapter = chapter + (Math.random() > 0.5 ? 1 : -1);
  if (sameBookOtherChapter >= 1 && sameBookOtherChapter <= book.chapters) {
    const ref = formatReference(bookId, sameBookOtherChapter, verse, endVerse);
    if (ref !== correctRef) distractors.push(ref);
  }

  const nearbyBooks = BOOKS.filter((_, i) => {
    if (i === bookIndex) return false;
    return Math.abs(i - bookIndex) <= 3;
  });

  for (const nearbyBook of nearbyBooks) {
    if (distractors.length >= 4) break;
    const ch = Math.min(chapter, nearbyBook.chapters);
    const v = verse + Math.floor(Math.random() * 3) - 1;
    const ref = formatReference(nearbyBook.id, ch, Math.max(1, v));
    if (ref !== correctRef && !distractors.includes(ref)) {
      distractors.push(ref);
    }
  }

  const shuffled = shuffleArray(sameTestamentBooks);
  for (const otherBook of shuffled) {
    if (distractors.length >= 4) break;
    const ch = Math.floor(Math.random() * Math.min(otherBook.chapters, chapter + 3)) + 1;
    const v = verse ? Math.min(verse + Math.floor(Math.random() * 5) - 2, 30) : undefined;
    const ref = v ? `${otherBook.name} ${ch}:${v}` : `${otherBook.name} ${ch}`;
    if (!distractors.includes(ref)) {
      distractors.push(ref);
    }
  }

  while (distractors.length < 4) {
    const randBook = BOOKS[Math.floor(Math.random() * BOOKS.length)];
    const ch = Math.floor(Math.random() * randBook.chapters) + 1;
    const v = Math.floor(Math.random() * 20) + 1;
    const ref = `${randBook.name} ${ch}:${v}`;
    if (!distractors.includes(ref)) {
      distractors.push(ref);
    }
  }

  return distractors.slice(0, 4);
}

function generateRandomReferences(excludeRef: string, count: number): string[] {
  const references: string[] = [];
  while (references.length < count) {
    const book = BOOKS[Math.floor(Math.random() * BOOKS.length)];
    const chapter = Math.floor(Math.random() * book.chapters) + 1;
    const verse = Math.floor(Math.random() * 15) + 1;
    const ref = `${book.name} ${chapter}:${verse}`;
    if (ref !== excludeRef && !references.includes(ref)) {
      references.push(ref);
    }
  }
  return references;
}

export function ensureUniqueOptions(options: QuestionOption[]): QuestionOption[] {
  const seen = new Set<string>();
  const unique: QuestionOption[] = [];

  for (const option of options) {
    const key = option.label.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(option);
    }
  }

  return unique;
}

/**
 * Enhanced lookup for scripture IDs based on reference or text content.
 * Used to ensure distractors can also provide tactical data (full verse preview).
 */
function lookupScriptureId(textOrRef: string, allScriptures: Scripture[]): string | undefined {
  if (!textOrRef) return undefined;
  const normalized = textOrRef.trim().toLowerCase();
  
  // 1. Try exact reference match (e.g., "John 3:16")
  const refMatch = allScriptures.find(s => s.reference.trim().toLowerCase() === normalized);
  if (refMatch) return refMatch.id;
  
  // 2. Try exact text match
  const textMatch = allScriptures.find(s => s.text.trim().toLowerCase() === normalized);
  if (textMatch) return textMatch.id;
  
  // 3. Try partial text match for phrases (min 15 chars to avoid noise)
  if (normalized.length > 15) {
      const partialMatch = allScriptures.find(s => s.text.toLowerCase().includes(normalized));
      if (partialMatch) return partialMatch.id;
  }
  
  return undefined;
}

function buildReferenceOptions(
  correctLabel: string,
  correctScriptureId: string,
  distractors: string[],
  scripturesInScope: Scripture[] = []
): QuestionOption[] {
  const allOptions: QuestionOption[] = [
    { label: correctLabel, isCorrect: true, scriptureId: correctScriptureId },
    ...distractors.slice(0, 4).map(d => {
      // Enhanced lookup for reference-based distractors
      const sid = lookupScriptureId(d, scripturesInScope)
      return { label: d, isCorrect: false, scriptureId: sid }
    }),
  ]

  const unique = ensureUniqueOptions(allOptions);

  while (unique.length < 5) {
    const randomBook = BOOKS[Math.floor(Math.random() * BOOKS.length)]
    const ch = Math.floor(Math.random() * randomBook.chapters) + 1
    const v = Math.floor(Math.random() * 20) + 1
    const filler = `${randomBook.name} ${ch}:${v}`

    if (!unique.some(o => o.label.toLowerCase() === filler.toLowerCase())) {
      const sid = lookupScriptureId(filler, scripturesInScope)
      unique.push({ label: filler, isCorrect: false, scriptureId: sid })
    }
  }

  return shuffleArray(unique.slice(0, 5));
}

function buildContentOptions(
  correctScripture: Scripture,
  scripturesInScope: Scripture[],
): QuestionOption[] {
  const otherScriptures = scripturesInScope.filter(s => s.id !== correctScripture.id)
  const shuffled = shuffleArray(otherScriptures)

  const distractors: QuestionOption[] = shuffled.slice(0, 4).map(s => ({
    label: s.text,
    isCorrect: false,
    scriptureId: s.id,
  }))

  const allOptions: QuestionOption[] = [
    { label: correctScripture.text, isCorrect: true, scriptureId: correctScripture.id },
    ...distractors,
  ]

  const unique = ensureUniqueOptions(allOptions)
  while (unique.length < 5) {
    const randIdx = Math.floor(Math.random() * scripturesInScope.length)
    const fillerScripture = scripturesInScope[randIdx]
    const filler = fillerScripture?.text || "Follow the path of righteousness and truth in all things."
    if (!unique.some(o => o.label.toLowerCase() === filler.toLowerCase())) {
      unique.push({ label: filler, isCorrect: false, scriptureId: fillerScripture?.id })
    }
  }

  return shuffleArray(unique.slice(0, 5))
}

export function generateReferenceQuestion(scripture: Scripture, scripturesInScope: Scripture[] = []): Question {
  const isNegative = Math.random() < 0.10;
  const correctRef = scripture.reference;
  const distractors = generateDistractorReferences(correctRef);
  
  // Ensure we have exactly 5 options (1 correct, 4 distractors)
  const options = buildReferenceOptions(correctRef, scripture.id, distractors.slice(0, 4), scripturesInScope);

  const correctMap: Record<string, 'T' | 'F'> = {};
  options.forEach(o => {
    correctMap[o.label] = o.isCorrect ? 'T' : 'F';
  });

  const prompt = isNegative
    ? `Identify which of the following references DOES NOT contain this passage: "${getMeaningfulTruncation(scripture.text, 300)}"`
    : `Evaluate whether the following passage can be found in these references: "${getMeaningfulTruncation(scripture.text, 300)}"`;

  return {
    id: uuidv4(),
    type: 'true-false-list',
    text: prompt,
    options,
    correctAnswer: correctMap,
    explanation: `${scripture.reference}: ${scripture.text}`,
    scriptureIds: [scripture.id],
  };
}

export function generateContentQuestion(
  scripture: Scripture,
  allScriptures: Scripture[]
): Question {
  const isNegative = Math.random() < 0.10;
  const options = buildContentOptions(scripture, allScriptures)

  const correctMap: Record<string, 'T' | 'F'> = {};
  options.forEach(o => {
    // If it's a negative question, 'T' means it CANNOT be gleaned (so it's a distractor usually)
    // Actually, it's simpler: 'T' always means the statement is TRUE.
    // The prompt changes.
    correctMap[o.label] = o.isCorrect ? 'T' : 'F';
  });

  const prompt = isNegative 
    ? `Identify which of the following quotes CANNOT be gleaned from ${scripture.reference}:`
    : `Which of the following quotes can be gleaned from ${scripture.reference}?`;

  return {
    id: uuidv4(),
    type: 'true-false-list',
    text: prompt,
    options,
    correctAnswer: correctMap,
    explanation: `${scripture.reference}: ${scripture.text}`,
    scriptureIds: [scripture.id],
  };
}

export function generateInferenceQuestion(scripture: Scripture, scripturesInScope: Scripture[] = []): Question {
  const isNegative = Math.random() < 0.10;
  const correctRef = scripture.reference;
  const distractors = generateDistractorReferences(correctRef);
  
  // Ensure exactly 5 options
  const options = buildReferenceOptions(correctRef, scripture.id, distractors.slice(0, 4), scripturesInScope);

  const correctMap: Record<string, 'T' | 'F'> = {};
  options.forEach(o => {
    correctMap[o.label] = o.isCorrect ? 'T' : 'F';
  });

  const prompt = isNegative
    ? `Evaluate whether the following passage CANNOT be gleaned from these references: "${getMeaningfulTruncation(scripture.text, 300)}"`
    : `Evaluate whether the following passage can be gleaned from the following: "${getMeaningfulTruncation(scripture.text, 300)}"`;

  return {
    id: uuidv4(),
    type: 'true-false-list',
    text: prompt,
    options,
    correctAnswer: correctMap,
    explanation: `${scripture.reference}: ${scripture.text}`,
    scriptureIds: [scripture.id],
  };
}


export function generateTrueFalseListQuestion(scripture: Scripture, allScriptures: Scripture[]): Question {
  const isNegative = Math.random() < 0.10;
  const phrases = extractKeyPhrases(scripture.text, 3);
  const otherScriptures = allScriptures.filter(s => s.id !== scripture.id);
  
  const allStatements = shuffleArray([
    ...phrases.map(p => ({ 
      label: `"${p}" is a truth revealed in this passage`, 
      isCorrect: true,
      scriptureId: scripture.id
    })),
    ...shuffleArray(otherScriptures).slice(0, 2).map(s => ({
      label: `"${getMeaningfulTruncation(s.text, 100)}" is the primary subject here`,
      isCorrect: false,
      scriptureId: s.id
    }))
  ]);

  // If we still need more distractors to reach 5
  while (allStatements.length < 5) {
      const randIdx = Math.floor(Math.random() * otherScriptures.length);
      const randText = otherScriptures.length > 0 ? otherScriptures[randIdx].text : "Hold fast to the teachings of the faithful.";
      const sid = otherScriptures.length > 0 ? otherScriptures[randIdx].id : undefined;
      allStatements.push({
          label: `This passage implies that "${getMeaningfulTruncation(randText, 80)}"`,
          isCorrect: false,
          scriptureId: sid
      });
  }

  const finalOptions = shuffleArray(allStatements).slice(0, 5);

  const correctMap: Record<string, 'T' | 'F'> = {};
  finalOptions.forEach(s => {
    correctMap[s.label] = s.isCorrect ? 'T' : 'F';
  });

  const prompt = isNegative
    ? `Analyze ${scripture.reference} and identify which of these statements are FALSE or CANNOT be gleaned:`
    : `Evaluate whether the following can be gleaned from ${scripture.reference}:`;

  return {
    id: uuidv4(),
    type: 'true-false-list',
    text: prompt,
    options: finalOptions,
    correctAnswer: correctMap,
    explanation: `${scripture.reference}: ${scripture.text}`,
    scriptureIds: [scripture.id],
  };
}

export function generateCollectionQuestions(
  scriptures: Scripture[],
  collectionId: string,
  limit: number = 20
): QuestionSet {
  const questions: Question[] = [];

  for (const scripture of scriptures) {
    try {
      const refQuestion = generateReferenceQuestion(scripture, scriptures);
      questions.push(refQuestion);
    } catch (e) {
      console.error(`Failed to generate reference question for ${scripture.id}:`, e);
    }

    try {
      const contentQuestion = generateContentQuestion(scripture, scriptures);
      questions.push(contentQuestion);
    } catch (e) {
      console.error(`Failed to generate content question for ${scripture.id}:`, e);
    }

    try {
      const inferenceQuestion = generateInferenceQuestion(scripture, scriptures);
      questions.push(inferenceQuestion);
    } catch (e) {
      console.error(`Failed to generate inference question for ${scripture.id}:`, e);
    }

    try {
      const tfQuestion = generateTrueFalseListQuestion(scripture, scriptures);
      questions.push(tfQuestion);
    } catch (e) {
      console.error(`Failed to generate true-false question for ${scripture.id}:`, e);
    }
  }

  const shuffled = shuffleArray(questions);
  const finalQuestions = shuffled.slice(0, limit);

  return {
    id: `qs_${collectionId}_${Date.now()}`,
    collectionId,
    questions: finalQuestions,
    generatedAt: new Date().toISOString(),
  };
}
