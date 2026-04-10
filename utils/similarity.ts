export const normalizeString = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // remove punctuation
    .replace(/\s+/g, ' ') // replace multiple spaces with single space
    .trim();
};

export const calculateLevenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  let i;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  let j;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          )
        );
      }
    }
  }

  return matrix[b.length][a.length];
};

export const calculateWordJaccardIndex = (a: string, b: string): number => {
  const wordsA = new Set(a.split(' ').filter(w => w.length > 0));
  const wordsB = new Set(b.split(' ').filter(w => w.length > 0));

  if (wordsA.size === 0 && wordsB.size === 0) return 100;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersectionCount = 0;
  wordsA.forEach(word => {
    if (wordsB.has(word)) {
      intersectionCount++;
    }
  });

  const unionCount = wordsA.size + wordsB.size - intersectionCount;
  return (intersectionCount / unionCount) * 100;
};

export const evaluateRecitation = (transcript: string, targetText: string): number => {
  const normTarget = normalizeString(targetText);
  const normTranscript = normalizeString(transcript);

  // Get raw string similarity percentage
  if (normTarget.length === 0 && normTranscript.length === 0) return 100;
  if (normTarget.length === 0 || normTranscript.length === 0) return 0;

  const distance = calculateLevenshteinDistance(normTarget, normTranscript);
  const maxLength = Math.max(normTarget.length, normTranscript.length);
  const levenshteinScore = ((maxLength - distance) / maxLength) * 100;

  // Get word Jaccard index
  const jaccardScore = calculateWordJaccardIndex(normTarget, normTranscript);

  // Blend them 60% Levenshtein, 40% Jaccard
  // This favors overall correct phrasing while still awarding partial credit for exact words out of order.
  const finalScore = (levenshteinScore * 0.6) + (jaccardScore * 0.4);
  
  return finalScore;
};
