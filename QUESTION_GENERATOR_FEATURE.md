# Scripture Question Generator Feature

## Overview
This feature automatically generates quiz questions from scripture collections to help users learn and test their knowledge of biblical content.

## Files Created

### 1. `/services/questionGenerator.ts`
Core service that generates different types of questions from scripture collections.

**Question Types:**
- **Reference Questions**: "The scripture '[text]' can be found in" with scripture reference options
- **Content Questions**: "The following quotations can be found in [reference]" with quote options
- **Inference Questions**: "The statement '[paraphrase]' can be gleaned from" with reference options
- **Multiple Select Questions**: "[Reference] talks about" with multiple correct theme options
- **Facts Questions**: "According to [source], the following are Facts About [topic]" with true/false statements

**Key Functions:**
```typescript
// Generate a complete question set from a collection
generateCollectionQuestions(scriptures: Scripture[], collectionId: string): QuestionSet

// Generate individual question types
generateReferenceQuestion(scripture: Scripture): Question
generateContentQuestion(scripture: Scripture, allScriptures?: Scripture[]): Question
generateInferenceQuestion(scripture: Scripture): Question
generateThematicQuestion(scripture: Scripture): Question

// Helper functions
generateDistractorReferences(correctRef: string): string[]
generateDistractorQuotes(correctQuote: string, allScriptures: Scripture[]): string[]
generateDistractorThemes(correctThemes: string[]): string[]
extractKeyPhrases(text: string, count?: number): string[]
identifyThemes(scripture: Scripture): string[]
generateParaphrase(scripture: Scripture): string
```

### 2. `/app/(tabs)/train/quiz.tsx`
Quiz screen that displays generated questions and tracks user performance.

**Features:**
- Displays questions one at a time with progress indicator
- Supports single-select and multiple-select answers
- Shows score during quiz
- Displays results with percentage and performance feedback
- Allows retry or return to collection
- Tracks analytics events

### 3. Updated `/app/(tabs)/train/collection.tsx`
Added "TEST KNOWLEDGE" button to launch quiz from collection view.

### 4. Updated `/services/analytics.ts`
Added new analytics events:
- `QUIZ_STARTED`
- `QUIZ_GENERATED`
- `QUIZ_QUESTION_ANSWERED`
- `QUIZ_COMPLETED`

## Usage

### For Users
1. Navigate to a collection in Training mode
2. Click "TEST KNOWLEDGE" button
3. Answer questions (single or multiple select)
4. View results and retry if desired

### For Developers

Generate questions from a collection:
```typescript
import { generateCollectionQuestions } from '@/services/questionGenerator'

const questionSet = generateCollectionQuestions(scriptures, collectionId)
```

Access question details:
```typescript
interface Question {
  id: string
  type: 'reference' | 'content' | 'inference' | 'multiple-select' | 'facts'
  text: string
  options: QuestionOption[]
  correctAnswer?: string | string[]
  explanation?: string
  scriptureIds: string[]
}
```

## Question Generation Logic

### Reference Questions
- Extracts key phrase from scripture
- Generates 4 distractor references from:
  - Same book, different chapter
  - Nearby books in same testament
  - Random books if needed
- Shuffles options for randomness

### Content Questions
- Identifies memorable quotes from scripture
- Pulls distractor quotes from other scriptures
- Ensures distractors are different from correct answer

### Inference Questions
- Creates paraphrased version using KJV-to-modern translations
- Replaces archaic words (thee→you, saith→says, etc.)
- Uses reference options similar to reference questions

### Thematic Questions
- Identifies 2-4 correct themes using keyword matching
- Generates distractor themes from common biblical themes
- Multiple select format (2-4 correct answers)

### Facts Questions
- Uses predefined fact patterns for each theme
- Mixes correct and incorrect statements
- Multiple select format

## Theme Detection

The system identifies themes by searching for keywords in scripture text:
- Spiritual Warfare: armor, battle, fight, weapon, enemy, devil, demon, stronghold
- Faith and Trust: faith, believe, trust, confidence, assurance
- Love and Compassion: love, compassion, mercy, kindness, charity
- And 30+ more themes...

## Customization

To add new themes, update the `COMMON_THEMES` array and `themeKeywords` mapping in `questionGenerator.ts`.

To adjust question difficulty:
- Modify distractor generation logic
- Change number of options (currently 5)
- Adjust theme detection sensitivity

## Testing

Test the feature by:
1. Opening a collection with scriptures
2. Clicking "TEST KNOWLEDGE"
3. Answering questions
4. Verifying score calculation
5. Checking that correct answers match scripture content

## Future Enhancements

Potential improvements:
- Add difficulty levels (easy/medium/hard)
- Include scripture context in questions
- Add image-based questions
- Support for user-created questions
- Question quality scoring and filtering
- Spaced repetition based on performance
- Achievement badges for quiz performance
