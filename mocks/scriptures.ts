// ─── Starter Verses (Basic Training Collection) ────────────────────────────
// The 10 most essential, widely-known scriptures for new users

const STARTER_SCRIPTURES: Scripture[] = [
  {
    id: 'john-3-16',
    book: 'John',
    chapter: 3,
    verse: 16,
    text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
    reference: 'John 3:16',
    isJesusWords: true,
  },
  {
    id: 'psalm-23-1',
    book: 'Psalms',
    chapter: 23,
    verse: 1,
    text: 'The LORD is my shepherd; I shall not want.',
    reference: 'Psalm 23:1',
  },
  {
    id: 'romans-8-28',
    book: 'Romans',
    chapter: 8,
    verse: 28,
    text: 'And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
    reference: 'Romans 8:28',
  },
  {
    id: 'phil-4-13',
    book: 'Philippians',
    chapter: 4,
    verse: 13,
    text: 'I can do all things through Christ which strengtheneth me.',
    reference: 'Philippians 4:13',
  },
  {
    id: 'prov-3-5-6',
    book: 'Proverbs',
    chapter: 3,
    verse: 5,
    endVerse: 6,
    text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    reference: 'Proverbs 3:5-6',
  },
  {
    id: 'isaiah-41-10',
    book: 'Isaiah',
    chapter: 41,
    verse: 10,
    text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.',
    reference: 'Isaiah 41:10',
  },
  {
    id: 'jer-29-11',
    book: 'Jeremiah',
    chapter: 29,
    verse: 11,
    text: 'For I know the thoughts that I think toward you, saith the LORD, thoughts of peace, and not of evil, to give you an expected end.',
    reference: 'Jeremiah 29:11',
  },
  {
    id: 'romans-6-23',
    book: 'Romans',
    chapter: 6,
    verse: 23,
    text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.',
    reference: 'Romans 6:23',
  },
  {
    id: 'ephes-2-8-9',
    book: 'Ephesians',
    chapter: 2,
    verse: 8,
    endVerse: 9,
    text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.',
    reference: 'Ephesians 2:8-9',
  },
  {
    id: 'matt-28-19-20',
    book: 'Matthew',
    chapter: 28,
    verse: 19,
    endVerse: 20,
    text: 'Go ye therefore, and teach all nations, baptizing them in the name of the Father, and of the Son, and of the Holy Ghost: Teaching them to observe all things whatsoever I have commanded you: and, lo, I am with you always, even unto the end of the world. Amen.',
    reference: 'Matthew 28:19-20',
    isJesusWords: true,
  },
];

// ─── All Scriptures ────────────────────────────────────────────────────────

export const SCRIPTURES: Scripture[] = [
  ...STARTER_SCRIPTURES,
  {
    id: 'acts-16-16',
    book: 'Acts',
    chapter: 16,
    verse: 16,
    endVerse: 18,
    text: 'And it came to pass, as we went to prayer, a certain damsel possessed with a spirit of divination met us, which brought her masters much gain by soothsaying:',
    reference: 'Acts 16:16-18',
    mnemonic: 'ACTS 16:16 - Prayer interrupted by a fortune-telling girl. Remember: ACTion at 16:16 hours (4:16 PM) - divination disrupted!'
  },
  {
    id: 'mark-1-16',
    book: 'Mark',
    chapter: 1,
    verse: 16,
    endVerse: 17,
    text: 'Now as he walked by the sea of Galilee, he saw Simon and Andrew his brother casting a net into the sea: for they were fishers.',
    reference: 'Mark 1:16-17',
    mnemonic: 'MARK 1:16 - First chapter, verse 16: Fishermen by the sea. Remember: MARK the spot where 1 + 16 fishermen were called!'
  },
  {
    id: 'romans-10-17',
    book: 'Romans',
    chapter: 10,
    verse: 17,
    text: 'So then faith cometh by hearing, and hearing by the word of God.',
    reference: 'Romans 10:17',
    mnemonic: 'ROMANS 10:17 - Faith comes by hearing. Remember: 10-17 is the radio code for "message received" - hearing the Word!'
  },
  {
    id: 'ezekiel-2-2',
    book: 'Ezekiel',
    chapter: 2,
    verse: 2,
    text: 'And the spirit entered into me when he spake unto me, and set me upon my feet, that I heard him that spake unto me.',
    reference: 'Ezekiel 2:2',
    mnemonic: 'EZEKIEL 2:2 - Spirit entered, stood him up. Remember: At 2:02, the spirit entered like oxygen (O2) and made him stand at attention!'
  },
  {
    id: 'john-1-12',
    book: 'John',
    chapter: 1,
    verse: 12,
    text: 'But as many as received him, to them gave he power to become the sons of God, even to them that believe on his name:',
    reference: 'John 1:12',
    mnemonic: 'JOHN 1:12 - Receiving Christ gives power to become God\'s children. Remember: JOHN 1:12 is like a power outlet (1 socket, 12 volts) - plug in to become God\'s child!'
  }
];

export { STARTER_SCRIPTURES };