/**
 * Represents a question with its answered status
 */
export interface Question {
  question: string;
  is_answered: boolean;
}

/**
 * Represents a question-answer pair with reasoning
 */
export interface QAItem {
  question: string;
  reasoning_content: string;
  content: string;
} 