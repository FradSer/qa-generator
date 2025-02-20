/**
 * Calculates similarity between two questions
 * @param str1 - First question
 * @param str2 - Second question
 * @param regionName - Region name for normalization
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string, regionName: string): number {
  const normalizeQuestion = (q: string) => {
    return q.replace(new RegExp(`^${regionName}本地`), '')
      .trim()
      .toLowerCase()
      .replace(/[,.，。？?！!]/g, ' ')
      .replace(/\s+/g, ' ');
  };
  
  const s1 = normalizeQuestion(str1);
  const s2 = normalizeQuestion(str2);
  
  // Levenshtein distance calculation
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    
    for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
      }
    }
    
    return matrix[b.length][a.length];
  };

  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const normalizedDistance = 1 - (distance / maxLength);

  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const jaccardSimilarity = intersection.size / union.size;

  return normalizedDistance * 0.7 + jaccardSimilarity * 0.3;
}

/**
 * Checks if a question is too similar to existing ones
 * @param newQuestion - Question to check
 * @param existingQuestions - Array of existing questions
 * @param regionName - Region name for context
 * @returns boolean indicating if question is too similar
 */
export function isTooSimilar(newQuestion: string, existingQuestions: string[], regionName: string): boolean {
  const SIMILARITY_THRESHOLD = 0.6;
  return existingQuestions.some(existing => 
    calculateSimilarity(newQuestion, existing, regionName) > SIMILARITY_THRESHOLD
  );
} 