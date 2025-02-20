/**
 * Enhanced similarity calculation between questions
 * Supports Chinese text and multiple similarity metrics
 */

import { Jieba } from '@node-rs/jieba';
import { dict } from '@node-rs/jieba/dict';

// Cache for segmented words to improve performance
const segmentationCache = new Map<string, string[]>();

const jieba = Jieba.withDict(dict)


/**
 * Text preprocessing and normalization
 * @param text - Input text
 * @param regionName - Region name for context
 * @returns Normalized text
 */
function normalizeText(text: string, regionName: string): string {
  return text
    .replace(new RegExp(`^${regionName}本地`), '')
    .trim()
    .toLowerCase()
    .replace(/[,.，。？?！!]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Get segmented words with caching
 * @param text - Input text
 * @returns Array of words
 */
function getSegmentedWords(text: string): string[] {

  
  if (segmentationCache.has(text)) {
    return segmentationCache.get(text)!;
  }
  const words = jieba.cut(text);
  segmentationCache.set(text, words);
  return words;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param a - First string
 * @param b - Second string
 * @returns Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
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
}

/**
 * Calculate Jaccard similarity between two sets of words
 * @param words1 - First set of words
 * @param words2 - Second set of words
 * @returns Jaccard similarity score
 */
function jaccardSimilarity(words1: Set<string>, words2: Set<string>): number {
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

/**
 * Calculate cosine similarity between word frequency vectors
 * @param words1 - First array of words
 * @param words2 - Second array of words
 * @returns Cosine similarity score
 */
function cosineSimilarity(words1: string[], words2: string[]): number {
  // Create word frequency maps
  const freq1 = new Map<string, number>();
  const freq2 = new Map<string, number>();
  
  words1.forEach(word => freq1.set(word, (freq1.get(word) || 0) + 1));
  words2.forEach(word => freq2.set(word, (freq2.get(word) || 0) + 1));
  
  // Get all unique words
  const allWords = new Set([...freq1.keys(), ...freq2.keys()]);
  
  // Calculate dot product and magnitudes
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  
  allWords.forEach(word => {
    const f1 = freq1.get(word) || 0;
    const f2 = freq2.get(word) || 0;
    dotProduct += f1 * f2;
    magnitude1 += f1 * f1;
    magnitude2 += f2 * f2;
  });
  
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  
  if (magnitude1 === 0 || magnitude2 === 0) return 0;
  return dotProduct / (magnitude1 * magnitude2);
}

/**
 * Calculate weighted similarity score between two questions
 * @param str1 - First question
 * @param str2 - Second question
 * @param regionName - Region name for context
 * @returns Similarity score between 0 and 1
 */
export function calculateSimilarity(str1: string, str2: string, regionName: string): number {
  // Normalize texts
  const s1 = normalizeText(str1, regionName);
  const s2 = normalizeText(str2, regionName);
  
  // Get segmented words
  const words1 = getSegmentedWords(s1);
  const words2 = getSegmentedWords(s2);
  
  // Calculate Levenshtein-based similarity
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const levenshteinScore = 1 - (distance / maxLength);
  
  // Calculate Jaccard similarity
  const wordSet1 = new Set(words1);
  const wordSet2 = new Set(words2);
  const jaccardScore = jaccardSimilarity(wordSet1, wordSet2);
  
  // Calculate cosine similarity
  const cosineScore = cosineSimilarity(words1, words2);
  
  // Weighted combination of scores
  // Levenshtein: 30% - Good for character-level differences
  // Jaccard: 30% - Good for word overlap
  // Cosine: 40% - Good for semantic similarity with word frequencies
  return levenshteinScore * 0.3 + jaccardScore * 0.3 + cosineScore * 0.4;
}

/**
 * Check if a question is too similar to existing ones
 * @param newQuestion - Question to check
 * @param existingQuestions - Array of existing questions
 * @param regionName - Region name for context
 * @returns boolean indicating if question is too similar
 */
export function isTooSimilar(newQuestion: string, existingQuestions: string[], regionName: string): boolean {
  // Adjust threshold based on question length
  const baseThreshold = 0.6;
  const normalizedQuestion = normalizeText(newQuestion, regionName);
  const questionLength = getSegmentedWords(normalizedQuestion).length;
  
  // Slightly lower threshold for longer questions
  const threshold = questionLength > 10 ? baseThreshold * 0.9 : baseThreshold;
  
  return existingQuestions.some(existing => 
    calculateSimilarity(newQuestion, existing, regionName) > threshold
  );
} 