import { v4 as uuidv4 } from 'uuid';
import { Scripture } from '@/types/scripture';
import { BOOKS } from '@/mocks/books';

export interface QuestionOption {
  label: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  type: 'reference' | 'content' | 'inference' | 'multiple-select' | 'facts';
  text: string;
  options: QuestionOption[];
  correctAnswer?: string | string[];
  explanation?: string;
  scriptureIds: string[];
}

export interface QuestionSet {
  id: string;
  collectionId: string;
  questions: Question[];
  generatedAt: string;
}

const OPTION_LABELS = ['a', 'b', 'c', 'd', 'e'] as const;

const COMMON_THEMES = [
  'Faith and Trust',
  'Love and Compassion',
  'Obedience to God',
  'Prayer and Worship',
  'Salvation and Redemption',
  'Wisdom and Understanding',
  'Courage and Strength',
  'Forgiveness and Mercy',
  'Righteousness and Justice',
  'Hope and Perseverance',
  'Humility and Service',
  'Spiritual Warfare',
  'God\'s Promises',
  'Repentance',
  'The Holy Spirit',
  'Kingdom of God',
  'Grace and Truth',
  'Peace and Unity',
  'Discipleship',
  'Prophecy and Fulfillment',
  'The Gospel',
  'Eternal Life',
  'The Cross',
  'Resurrection',
  'Sin and Death',
  'Judgment',
  'Blessing',
  'Suffering',
  'Joy',
  'Patience',
  'Self-Control',
  'Gentleness',
  'Goodness',
  'Kindness',
  'Thankfulness',
  'Generosity',
  'Leadership',
  'Service',
  'Witnessing',
  'Holiness',
  'Stewardship',
  'Unity',
  'Trust in God',
  'God\'s Sovereignty',
  'God\'s Faithfulness',
  'The Second Coming',
] as const;

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function extractKeyPhrases(text: string, count: number = 3): string[] {
  const sentences = text.split(/[.!?;]+/).map(s => s.trim()).filter(s => s.length > 10);
  if (sentences.length === 0) return [text.substring(0, 80)];

  const scored = sentences.map(s => ({
    text: s.trim(),
    score: s.length + (s.includes('for') || s.includes('the') || s.includes('and') ? 10 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.text);
}

export function identifyThemes(scripture: Scripture): string[] {
  const text = scripture.text.toLowerCase();
  const themes: string[] = [];

  const themeKeywords: Record<string, string[]> = {
    'Faith and Trust': ['faith', 'believe', 'trust', 'confidence', 'assurance'],
    'Love and Compassion': ['love', 'compassion', 'mercy', 'kindness', 'charity'],
    'Obedience to God': ['obey', 'command', 'commandment', 'keep', 'follow'],
    'Prayer and Worship': ['pray', 'prayer', 'worship', 'praise', 'supplication'],
    'Salvation and Redemption': ['save', 'salvation', 'redeem', 'redemption', 'deliver'],
    'Wisdom and Understanding': ['wisdom', 'understand', 'knowledge', 'discern', 'wise'],
    'Courage and Strength': ['strong', 'courage', 'strength', 'mighty', 'bold'],
    'Forgiveness and Mercy': ['forgive', 'forgiveness', 'pardon', 'mercy', 'grace'],
    'Righteousness and Justice': ['righteous', 'justice', 'just', 'upright', 'equity'],
    'Hope and Perseverance': ['hope', 'endure', 'persevere', 'patient', 'steadfast'],
    'Humility and Service': ['humble', 'humility', 'serve', 'servant', 'meek'],
    'Spiritual Warfare': ['armor', 'battle', 'fight', 'weapon', 'enemy', 'devil', 'demon', 'stronghold', 'demolish'],
    'God\'s Promises': ['promise', 'covenant', 'pledge', 'vow', 'swear'],
    'Repentance': ['repent', 'repentance', 'turn', 'confess', 'sin'],
    'The Holy Spirit': ['spirit', 'holy ghost', 'comforter', 'counselor'],
    'Kingdom of God': ['kingdom', 'reign', 'throne', 'heaven', 'glory'],
    'Grace and Truth': ['grace', 'truth', 'favor', 'blessing'],
    'Peace and Unity': ['peace', 'unity', 'one', 'together', 'harmony'],
    'Discipleship': ['disciple', 'follow', 'teach', 'learn', 'apostle'],
    'Prophecy and Fulfillment': ['prophecy', 'prophesy', 'fulfill', 'foretell', 'declare'],
    'The Gospel': ['gospel', 'good news', 'glad tidings'],
    'Eternal Life': ['eternal', 'everlasting', 'eternal life'],
    'The Cross': ['cross', 'crucified', 'crucifixion'],
    'Resurrection': ['resurrection', 'raised', 'rise', 'rose'],
    'Sin and Death': ['sin', 'sins', 'death', 'die', 'dead', 'perish'],
    'Judgment': ['judgment', 'judge', 'judged', 'reckoning'],
    'Blessing': ['bless', 'blessing', 'blessed'],
    'Suffering': ['suffer', 'suffering', 'tribulation', 'affliction', 'trials'],
    'Joy': ['joy', 'rejoice', 'glad', 'delight'],
    'Patience': ['patient', 'patience', 'longsuffering'],
    'Self-Control': ['self-control', 'temperate', 'discipline'],
    'Gentleness': ['gentle', 'gentleness', 'meekness'],
    'Goodness': ['good', 'goodness', 'virtue'],
    'Kindness': ['kind', 'kindness', 'compassion'],
    'Thankfulness': ['thank', 'thanks', 'thankful', 'thanksgiving', 'gratitude'],
    'Generosity': ['give', 'giving', 'generous', 'liberal', 'share'],
    'Holiness': ['holy', 'holiness', 'sanctified', 'set apart'],
    'God\'s Sovereignty': ['sovereign', 'almighty', 'lord of all', 'ruler'],
    'God\'s Faithfulness': ['faithful', 'faithfulness', 'steadfast', 'never fails'],
  };

  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        if (!themes.includes(theme)) {
          themes.push(theme);
        }
        break;
      }
    }
  }

  if (themes.length === 0) {
    themes.push('Faith and Trust', 'God\'s Promises', 'Righteousness and Justice');
  }

  return themes.slice(0, 6);
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

export function generateDistractorQuotes(correctQuote: string, allScriptures: Scripture[]): string[] {
  const distractors: string[] = [];
  const candidates = allScriptures.filter((s) => s.text !== correctQuote && s.text.length > 15);
  const shuffled = shuffleArray(candidates);

  for (const scripture of shuffled) {
    if (distractors.length >= 4) break;

    const phrases = extractKeyPhrases(scripture.text, 1);
    if (phrases.length > 0 && phrases[0] !== correctQuote && !distractors.includes(phrases[0])) {
      distractors.push(phrases[0]);
    }
  }

  while (distractors.length < 4) {
    const randomScripture = allScriptures[Math.floor(Math.random() * allScriptures.length)];
    if (randomScripture.text !== correctQuote) {
      const truncated = randomScripture.text.length > 80 ? randomScripture.text.substring(0, 77) + '...' : randomScripture.text;
      if (!distractors.includes(truncated)) {
        distractors.push(truncated);
      }
    }
  }

  return distractors.slice(0, 4);
}

export function generateDistractorThemes(correctThemes: string[]): string[] {
  const distractors: string[] = [];
  const available = (COMMON_THEMES as readonly string[]).filter((t) => !correctThemes.includes(t));
  const shuffled = shuffleArray([...available]);

  for (const theme of shuffled) {
    if (distractors.length >= 4) break;
    distractors.push(theme);
  }

  while (distractors.length < 4) {
    const randomTheme = COMMON_THEMES[Math.floor(Math.random() * COMMON_THEMES.length)];
    if (!distractors.includes(randomTheme)) {
      distractors.push(randomTheme);
    }
  }

  return distractors.slice(0, 4);
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

function buildOptions(correctLabel: string, distractors: string[]): QuestionOption[] {
  const allOptions: QuestionOption[] = [
    { label: correctLabel, isCorrect: true },
    ...distractors.slice(0, 4).map(d => ({ label: d, isCorrect: false })),
  ];

  const unique = ensureUniqueOptions(allOptions);

  while (unique.length < 5) {
    const randomBook = BOOKS[Math.floor(Math.random() * BOOKS.length)];
    const ch = Math.floor(Math.random() * randomBook.chapters) + 1;
    const v = Math.floor(Math.random() * 20) + 1;
    const filler = `${randomBook.name} ${ch}:${v}`;
    if (!unique.some(o => o.label.toLowerCase() === filler.toLowerCase())) {
      unique.push({ label: filler, isCorrect: false });
    }
  }

  return shuffleArray(unique.slice(0, 5));
}

function buildMultiSelectOptions(correctLabels: string[], distractors: string[]): QuestionOption[] {
  const correctCount = Math.min(Math.max(correctLabels.length, 2), 4);
  const distractorCount = 5 - correctCount;

  const allOptions: QuestionOption[] = [
    ...correctLabels.slice(0, correctCount).map(l => ({ label: l, isCorrect: true })),
    ...distractors.slice(0, distractorCount).map(d => ({ label: d, isCorrect: false })),
  ];

  const unique = ensureUniqueOptions(allOptions);
  const shuffled = shuffleArray(unique);

  return shuffled.slice(0, 5);
}

export function generateReferenceQuestion(scripture: Scripture): Question {
  const phrases = extractKeyPhrases(scripture.text, 1);
  const quote = phrases[0] || scripture.text.substring(0, 60);

  const correctRef = scripture.reference;
  const distractors = generateDistractorReferences(correctRef);
  const options = buildOptions(correctRef, distractors);

  return {
    id: uuidv4(),
    type: 'reference',
    text: `The scripture "${quote}" can be found in`,
    options,
    correctAnswer: correctRef,
    explanation: `This passage is from ${scripture.reference}.`,
    scriptureIds: [scripture.id],
  };
}

export function generateContentQuestion(scripture: Scripture, allScriptures?: Scripture[]): Question {
  const correctQuote = extractKeyPhrases(scripture.text, 1)[0] || scripture.text.substring(0, 60);
  const distractors = allScriptures
    ? generateDistractorQuotes(correctQuote, allScriptures)
    : shuffleArray([...COMMON_THEMES] as string[]).slice(0, 4);

  const options = buildOptions(correctQuote, distractors);

  return {
    id: uuidv4(),
    type: 'content',
    text: `The following quotations can be found in ${scripture.reference}:`,
    options,
    correctAnswer: correctQuote,
    explanation: `This quotation appears in ${scripture.reference}.`,
    scriptureIds: [scripture.id],
  };
}

export function generateInferenceQuestion(scripture: Scripture): Question {
  const paraphrase = generateParaphrase(scripture);
  const correctRef = scripture.reference;
  const distractors = generateDistractorReferences(correctRef);
  const options = buildOptions(correctRef, distractors);

  return {
    id: uuidv4(),
    type: 'inference',
    text: `The statement "${paraphrase.substring(0, 80)}${paraphrase.length > 80 ? '...' : ''}" can be gleaned from`,
    options,
    correctAnswer: correctRef,
    explanation: `This teaching is derived from ${scripture.reference}.`,
    scriptureIds: [scripture.id],
  };
}

export function generateThematicQuestion(scripture: Scripture): Question {
  const themes = identifyThemes(scripture);
  const correctCount = Math.min(themes.length, 3);
  const correctThemes = themes.slice(0, correctCount);
  const distractors = generateDistractorThemes(correctThemes);

  const options = buildMultiSelectOptions(correctThemes, distractors);
  const correctLabels = options.filter(o => o.isCorrect).map(o => o.label);

  return {
    id: uuidv4(),
    type: 'multiple-select',
    text: `${scripture.reference} talks about`,
    options,
    correctAnswer: correctLabels,
    explanation: `This scripture addresses themes including: ${correctThemes.join(', ')}.`,
    scriptureIds: [scripture.id],
  };
}

function generateFactsQuestion(scripture: Scripture): Question | null {
  const themes = identifyThemes(scripture);
  if (themes.length < 2) return null;

  const topic = themes[0];
  const text = scripture.text.toLowerCase();

  const factPatterns: Record<string, string[]> = {
    'Faith and Trust': [
      'Believers are called to walk by faith',
      'Faith is the assurance of things hoped for',
      'Without faith it is impossible to please God',
      'Faith comes by hearing the word of God',
    ],
    'Love and Compassion': [
      'Love is patient and kind',
      'God demonstrated His love through sacrifice',
      'Love never fails',
      'We are commanded to love one another',
    ],
    'Obedience to God': [
      'Obedience is better than sacrifice',
      'Those who love God keep His commandments',
      'Blessed are those who hear and obey',
      'Obedience demonstrates faith',
    ],
    'Prayer and Worship': [
      'Believers should pray without ceasing',
      'The prayer of a righteous person is powerful',
      'God hears the prayers of His people',
      'Prayer should be offered in faith',
    ],
    'Salvation and Redemption': [
      'Salvation is found in no one else',
      'Whoever calls on the name of the Lord will be saved',
      'Salvation is a gift from God',
      'God so loved the world that He provided salvation',
    ],
    'Wisdom and Understanding': [
      'The fear of the Lord is the beginning of wisdom',
      'Wisdom is more precious than rubies',
      'God gives wisdom generously to those who ask',
      'Wisdom builds her house',
    ],
    'Courage and Strength': [
      'Be strong and courageous',
      'God has not given us a spirit of fear',
      'The Lord is my strength and my shield',
      'Do not be afraid, for God is with you',
    ],
    'Forgiveness and Mercy': [
      'God forgives those who confess their sins',
      'We must forgive others as God forgave us',
      'Forgiveness is found in the blood of Christ',
      'God removes our transgressions far from us',
    ],
    'Righteousness and Justice': [
      'The righteous shall live by faith',
      'God imputes righteousness to believers',
      'Righteousness exalts a nation',
      'We become the righteousness of God in Christ',
    ],
    'Hope and Perseverance': [
      'Hope does not disappoint',
      'We are saved in hope',
      'Hope anchors the soul',
      'God is the God of hope',
    ],
    'Humility and Service': [
      'God opposes the proud but gives grace to the humble',
      'Humble yourselves under God\'s mighty hand',
      'Whoever humbles himself will be exalted',
      'Humility comes before honor',
    ],
    'Spiritual Warfare': [
      'Believers must put on the full armor of God',
      'Our weapons are not carnal but mighty',
      'We wrestle not against flesh and blood',
      'The armor includes the shield of faith',
    ],
    'God\'s Promises': [
      'God\'s promises are yes and amen',
      'God cannot lie',
      'All God\'s promises are fulfilled in Christ',
      'God is faithful to His promises',
    ],
    'Repentance': [
      'Repent and be baptized for the forgiveness of sins',
      'Godly sorrow produces repentance',
      'Repentance leads to life',
      'Turn from your wicked ways and seek the Lord',
    ],
    'The Holy Spirit': [
      'The Holy Spirit empowers believers',
      'The Spirit intercedes for us',
      'Believers are sealed by the Holy Spirit',
      'The Spirit produces fruit in our lives',
    ],
    'Kingdom of God': [
      'The kingdom of God is within you',
      'Seek first the kingdom of God',
      'The kingdom of God is not eating and drinking',
      'The kingdom of God belongs to such as these',
    ],
    'Grace and Truth': [
      'Salvation is by grace through faith',
      'God\'s grace is sufficient for all',
      'Grace and truth came through Jesus Christ',
      'We are justified freely by His grace',
    ],
    'Peace and Unity': [
      'The peace of God surpasses understanding',
      'God is the author of peace',
      'Peace is a fruit of the Spirit',
      'Christ is our peace',
    ],
    'Discipleship': [
      'Disciples must deny themselves',
      'A disciple is not above his teacher',
      'By this all will know you are My disciples',
      'Discipleship requires counting the cost',
    ],
    'Prophecy and Fulfillment': [
      'Prophecy is a gift to be exercised',
      'No prophecy comes from one\'s own interpretation',
      'Prophecy confirms the word of God',
      'The testimony of Jesus is the spirit of prophecy',
    ],
    'The Gospel': [
      'The gospel is the power of God for salvation',
      'The gospel was preached to every creature',
      'I am not ashamed of the gospel',
      'The gospel reveals God\'s righteousness',
    ],
    'Eternal Life': [
      'Eternal life is a gift from God',
      'Whoever believes has eternal life',
      'Eternal life begins now',
      'God promises eternal life to those who believe',
    ],
    'The Cross': [
      'The message of the cross is foolishness to those perishing',
      'Christ redeemed us from the curse of the law',
      'By His wounds we are healed',
      'The cross reconciles us to God',
    ],
    'Resurrection': [
      'Christ has been raised from the dead',
      'We too will be raised',
      'The resurrection proves our justification',
      'If Christ has not been raised, faith is futile',
    ],
    'Sin and Death': [
      'All have sinned and fall short of God\'s glory',
      'The wages of sin is death',
      'Sin separates us from God',
      'If we confess our sins, He is faithful to forgive',
    ],
    'Judgment': [
      'We will all stand before God\'s judgment seat',
      'God will judge the world in righteousness',
      'Judgment begins with the household of God',
      'There is a day appointed for judgment',
    ],
    'Blessing': [
      'God blesses those who trust in Him',
      'The blessing of the Lord makes rich',
      'Blessed are those who hunger for righteousness',
      'Every spiritual blessing is ours in Christ',
    ],
    'Suffering': [
      'Suffering produces perseverance',
      'We share in Christ\'s sufferings',
      'Suffering is part of the Christian walk',
      'God comforts us in all our suffering',
    ],
    'Joy': [
      'The joy of the Lord is our strength',
      'Rejoice in the Lord always',
      'Joy comes in the morning',
      'My soul magnifies the Lord and my spirit rejoices',
    ],
    'Patience': [
      'Patience is a fruit of the Spirit',
      'Be patient and stand firm',
      'The Lord is patient, not wanting anyone to perish',
      'Patience produces character',
    ],
    'Self-Control': [
      'Self-control is a fruit of the Spirit',
      'A person without self-control is like a city broken into',
      'Exercise self-control in all things',
      'The Spirit helps us master our desires',
    ],
    'Gentleness': [
      'Gentleness is a fruit of the Spirit',
      'Answer with gentleness',
      'The gentleness of Christ',
      'Let your gentleness be evident to all',
    ],
    'Goodness': [
      'Goodness is a fruit of the Spirit',
      'Do good to all people',
      'God is good and His mercy endures forever',
      'Let us not grow weary in doing good',
    ],
    'Kindness': [
      'Be kind to one another',
      'Kindness is a mark of God\'s children',
      'God\'s kindness leads to repentance',
      'Clothe yourselves with kindness',
    ],
    'Thankfulness': [
      'Give thanks in all circumstances',
      'Enter His gates with thanksgiving',
      'Thankfulness should overflow from believers',
      'Let thankfulness mark your prayers',
    ],
    'Generosity': [
      'God loves a cheerful giver',
      'It is more blessed to give than to receive',
      'Generosity supplies the needs of saints',
      'Whoever sows generously will reap generously',
    ],
    'Holiness': [
      'Be holy, for I am holy',
      'Without holiness no one will see the Lord',
      'God has called us to holiness',
      'Holiness adorns the house of the Lord',
    ],
    'God\'s Sovereignty': [
      'God works all things according to His will',
      'The Lord establishes the steps of the righteous',
      'God\'s ways are higher than our ways',
      'He does according to His will in the heavens',
    ],
    'God\'s Faithfulness': [
      'Great is God\'s faithfulness',
      'God remains faithful even when we are faithless',
      'He who promised is faithful',
      'God\'s faithfulness endures to all generations',
    ],
  };

  const statements: { text: string; isCorrect: boolean }[] = [];

  for (const theme of themes) {
    const facts = factPatterns[theme];
    if (facts) {
      const fact = facts[Math.floor(Math.random() * facts.length)];
      statements.push({ text: fact, isCorrect: true });
    }
  }

  const incorrectThemes = (COMMON_THEMES as readonly string[]).filter(t => !themes.includes(t));
  const shuffledIncorrect = shuffleArray([...incorrectThemes]);

  for (const theme of shuffledIncorrect.slice(0, 3)) {
    const facts = factPatterns[theme];
    if (facts) {
      const fact = facts[Math.floor(Math.random() * facts.length)];
      statements.push({ text: fact, isCorrect: false });
    }
  }

  while (statements.filter(s => s.isCorrect).length < 2) {
    statements.push({ text: `This passage addresses ${themes[0]}`, isCorrect: true });
  }

  while (statements.filter(s => !s.isCorrect).length < 2) {
    const randTheme = shuffledIncorrect[Math.floor(Math.random() * shuffledIncorrect.length)];
    statements.push({ text: `This passage primarily addresses ${randTheme}`, isCorrect: false });
  }

  const correctStatements = statements.filter(s => s.isCorrect).slice(0, 3);
  const incorrectStatements = statements.filter(s => !s.isCorrect).slice(0, 3);

  const allOptions = shuffleArray([
    ...correctStatements.map(s => ({ label: s.text, isCorrect: true })),
    ...incorrectStatements.map(s => ({ label: s.text, isCorrect: false })),
  ]).slice(0, 5);

  const hasCorrect = allOptions.some(o => o.isCorrect);
  const hasIncorrect = allOptions.some(o => !o.isCorrect);
  if (!hasCorrect || !hasIncorrect) return null;

  const correctLabels = allOptions.filter(o => o.isCorrect).map(o => o.label);

  return {
    id: uuidv4(),
    type: 'facts',
    text: `According to ${scripture.reference}, the following are Facts About ${topic}`,
    options: allOptions,
    correctAnswer: correctLabels,
    explanation: `These truths are taught in ${scripture.reference}.`,
    scriptureIds: [scripture.id],
  };
}

export function generateCollectionQuestions(
  scriptures: Scripture[],
  collectionId: string
): QuestionSet {
  const questions: Question[] = [];

  for (const scripture of scriptures) {
    try {
      const refQuestion = generateReferenceQuestion(scripture);
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
      const inferenceQuestion = generateInferenceQuestion(scripture);
      questions.push(inferenceQuestion);
    } catch (e) {
      console.error(`Failed to generate inference question for ${scripture.id}:`, e);
    }

    try {
      const thematicQuestion = generateThematicQuestion(scripture);
      questions.push(thematicQuestion);
    } catch (e) {
      console.error(`Failed to generate thematic question for ${scripture.id}:`, e);
    }

    try {
      const factsQuestion = generateFactsQuestion(scripture);
      if (factsQuestion) {
        questions.push(factsQuestion);
      }
    } catch (e) {
      console.error(`Failed to generate facts question for ${scripture.id}:`, e);
    }
  }

  return {
    id: `qs_${collectionId}_${Date.now()}`,
    collectionId,
    questions,
    generatedAt: new Date().toISOString(),
  };
}
