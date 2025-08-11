// Test utility to debug PDF extraction
export function debugPdfText(rawText: string): {
  original: string;
  cleaned: string;
  potentialVerses: string[];
  biblicalContent: string[];
} {
  console.log('🔍 Debugging PDF text extraction...');
  
  // Show original text sample
  const originalSample = rawText.substring(0, 500);
  console.log('📄 Original text sample:', originalSample);
  
  // Clean the text
  const cleaned = rawText
    // Remove PDF encoding artifacts
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Control characters
    .replace(/þÿ/g, '') // BOM markers
    .replace(/\\[0-7]{3}/g, '') // Octal escapes
    .replace(/\\[rnt]/g, ' ') // Escape sequences
    .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII and whitespace
    // Remove PDF structure artifacts
    .replace(/endstream\s+endobj/g, ' ')
    .replace(/stream\s+x[A-Za-z0-9+/=]+/g, ' ')
    .replace(/obj<</g, ' ')
    .replace(/>>/g, ' ')
    .replace(/\d+\s+0\s+obj/g, ' ')
    // Clean up whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  const cleanedSample = cleaned.substring(0, 500);
  console.log('🧹 Cleaned text sample:', cleanedSample);
  
  // Look for potential verse patterns
  const versePatterns = [
    /\b\w+\s+\d+:\d+/g, // Book chapter:verse
    /\d+:\d+\s+\w+/g,   // chapter:verse text
    /\d+\.\s*[A-Z]/g,   // Numbered verses
  ];
  
  const potentialVerses: string[] = [];
  versePatterns.forEach(pattern => {
    const matches = cleaned.match(pattern) || [];
    potentialVerses.push(...matches);
  });
  
  console.log('🎯 Potential verse patterns found:', potentialVerses.slice(0, 10));
  
  // Look for biblical content
  const biblicalWords = ['God', 'Lord', 'Jesus', 'Christ', 'heaven', 'earth', 'love', 'faith', 'spirit', 'word', 'truth'];
  const sentences = cleaned.split(/[.!?]+/).filter(sentence => {
    const trimmed = sentence.trim();
    return trimmed.length > 20 && 
           trimmed.length < 300 && 
           biblicalWords.some(word => trimmed.toLowerCase().includes(word.toLowerCase()));
  });
  
  console.log('📖 Biblical content found:', sentences.slice(0, 5));
  
  return {
    original: originalSample,
    cleaned: cleanedSample,
    potentialVerses: potentialVerses.slice(0, 10),
    biblicalContent: sentences.slice(0, 10),
  };
}

// Test function to analyze PDF content
export function analyzePdfContent(text: string): {
  hasReadableText: boolean;
  confidence: number;
  suggestions: string[];
} {
  const suggestions: string[] = [];
  let confidence = 0;
  
  // Check for readable text
  const readableChars = text.match(/[a-zA-Z]/g)?.length || 0;
  const totalChars = text.length;
  const readableRatio = totalChars > 0 ? readableChars / totalChars : 0;
  
  if (readableRatio > 0.5) {
    confidence += 40;
  } else if (readableRatio > 0.2) {
    confidence += 20;
    suggestions.push('Text appears to be partially encoded. Try a different PDF extraction method.');
  } else {
    suggestions.push('Text appears to be heavily encoded or image-based. Consider OCR extraction.');
  }
  
  // Check for common PDF artifacts
  if (text.includes('þÿ')) {
    suggestions.push('PDF contains BOM markers - text cleaning applied.');
  }
  
  if (text.includes('endstream') || text.includes('endobj')) {
    suggestions.push('PDF contains raw stream data - structure cleaning applied.');
  }
  
  // Check for verse-like patterns
  const versePatterns = text.match(/\d+:\d+/g)?.length || 0;
  if (versePatterns > 5) {
    confidence += 30;
    suggestions.push(`Found ${versePatterns} potential verse references.`);
  }
  
  // Check for biblical words
  const biblicalWords = ['God', 'Lord', 'Jesus', 'Christ', 'heaven', 'earth', 'love', 'faith'];
  const biblicalMatches = biblicalWords.filter(word => 
    text.toLowerCase().includes(word.toLowerCase())
  ).length;
  
  if (biblicalMatches > 3) {
    confidence += 20;
    suggestions.push(`Found ${biblicalMatches} biblical terms.`);
  }
  
  const hasReadableText = readableRatio > 0.2 && confidence > 30;
  
  return {
    hasReadableText,
    confidence: Math.min(100, confidence),
    suggestions,
  };
}
