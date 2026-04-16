const BOOK_NAMES: Record<string, string> = {
    '1': 'First', '2': 'Second', '3': 'Third',
    '1st': 'First', '2nd': 'Second', '3rd': 'Third',
    'I': 'First', 'II': 'Second', 'III': 'Third',
}

function expandBookPrefix(book: string): string {
    const parts = book.split(/\s+/)
    if (parts.length > 1) {
        const prefix = parts[0].replace(/\.$/, '')
        const expanded = BOOK_NAMES[prefix] || BOOK_NAMES[prefix.toLowerCase()]
        if (expanded) {
            return `${expanded} ${parts.slice(1).join(' ')}`
        }
    }
    return book
}

function expandVersePart(versePart: string): string {
    return versePart
        .replace(/(\d+)-(\d+)/g, (_, start, end) => `${start} through ${end}`)
        .replace(/(\d+),(\d+)/g, (_, a, b) => `${a} and ${b}`)
}

export function expandScriptureReference(reference: string): string {
    const match = reference.match(/^(.+?)\s+(\d+)(?::(\d+(?:[,-]\d+)*))?(?:\s+(.*))?$/)
    if (!match) return reference

    const rawBook = match[1].trim()
    const chapter = match[2]
    const verses = match[3]
    const suffix = match[4]

    const book = expandBookPrefix(rawBook)

    if (!verses) {
        return suffix ? `${book} chapter ${chapter} ${suffix}` : `${book} chapter ${chapter}`
    }

    const expandedVerses = expandVersePart(verses)

    if (verses.includes('-')) {
        return `${book} chapter ${chapter} verses ${expandedVerses}`
    }
    if (verses.includes(',')) {
        return `${book} chapter ${chapter} verses ${expandedVerses}`
    }
    return `${book} chapter ${chapter} verse ${expandedVerses}`
}

export function formatTextForTTS(text: string): string {
    return text.replace(
        /\b((?:1|2|3|1st|2nd|3rd|I|II|III)\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(\d+):(\d+(?:[,-]\d+)*)\b/g,
        (full, prefix, book, chapter, verses) => {
            const rawBook = prefix ? `${prefix}${book}` : book
            const ref = prefix
                ? `${prefix.trim()} ${book} ${chapter}:${verses}`
                : `${book} ${chapter}:${verses}`
            return expandScriptureReference(ref)
        }
    )
}