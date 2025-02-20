import type { PromptTemplate } from './base';
import { basePromptTemplate } from './base';

/**
 * QianFan-specific prompt template implementation
 */
export const qianfanPromptTemplate: PromptTemplate = {
  generateQuestionPrompt: basePromptTemplate.questionPrompt,
  processQuestionResponse: basePromptTemplate.processResponse
}; 