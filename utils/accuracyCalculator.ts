/**
 * Utility functions for calculating text accuracy using Levenshtein distance
 */

interface AccuracyResult {
    accuracy: number;
    distance: number;
    maxLength: number;
}

/**
 * Calculate accuracy between original and spoken text
 * @param original The original reference text
 * @param spoken The spoken/transcribed text to compare
 * @returns Accuracy percentage (0-100)
 */
export function calculateTextAccuracy(original: string, spoken: string): number {
    if (!original || !spoken) return 0;

    // Normalize texts for comparison
    const normalizedOriginal = normalizeText(original);
    const normalizedSpoken = normalizeText(spoken);

    if (normalizedOriginal === normalizedSpoken) return 100;
    if (normalizedOriginal.length === 0) return 0;
    if (normalizedSpoken.length === 0) return 0;

    // Calculate Levenshtein distance
    const distance = calculateLevenshteinDistance(normalizedOriginal, normalizedSpoken);
    const maxLength = Math.max(normalizedOriginal.length, normalizedSpoken.length);

    // Calculate similarity percentage
    const similarity = 1 - (distance / maxLength);
    return Math.round(similarity * 100);
}

/**
 * Normalize text for comparison by removing punctuation and extra spaces
 */
function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 */
function calculateLevenshteinDistance(s1: string, s2: string): number {
    const track = Array(s2.length + 1).fill(null).map(() =>
        Array(s1.length + 1).fill(null)
    );

    // Initialize first row and column
    for (let i = 0; i <= s1.length; i += 1) {
        track[0][i] = i;
    }
    for (let j = 0; j <= s2.length; j += 1) {
        track[j][0] = j;
    }

    // Fill the matrix
    for (let j = 1; j <= s2.length; j += 1) {
        for (let i = 1; i <= s1.length; i += 1) {
            const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
            track[j][i] = Math.min(
                track[j][i - 1] + 1, // deletion
                track[j - 1][i] + 1, // insertion
                track[j - 1][i - 1] + indicator, // substitution
            );
        }
    }

    return track[s2.length][s1.length];
}

/**
 * Get accuracy label based on percentage
 */
export function getAccuracyLabel(accuracy: number): string {
    if (accuracy >= 95) return 'MARKSMAN';
    if (accuracy >= 85) return 'SHARPSHOOTER';
    if (accuracy >= 75) return 'QUALIFIED';
    return 'TRAINEE';
}

/**
 * Get accuracy color based on percentage
 */
export function getAccuracyColor(accuracy: number, colors: any): string {
    if (accuracy >= 95) return colors.excellent;
    if (accuracy >= 85) return colors.good;
    if (accuracy >= 75) return colors.fair;
    return colors.poor;
}
