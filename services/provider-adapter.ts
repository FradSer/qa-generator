import type { AIProviderService } from '../types/provider';
import type { Question, QAItem } from '../types/types';
import type { QuestionProvider } from './question-generation-service';
import type { AnswerProvider } from './answer-generation-service';
import { SecureLogger, ErrorHandler } from '../utils/secure-logger';

/**
 * Adapter to bridge AI provider services with generation services
 */
export class ProviderAdapter implements QuestionProvider, AnswerProvider {
  constructor(private readonly provider: AIProviderService) {}

  /**
   * Generate questions from prompt (implements QuestionProvider)
   */
  async generateQuestionsFromPrompt(
    regionName: string, 
    batchSize: number, 
    maxAttempts: number = 3
  ): Promise<string> {
    try {
      SecureLogger.debug('Generating questions via provider', {
        regionName,
        batchSize,
        maxAttempts
      });

      const result = await this.provider.generateQuestionsFromPrompt(
        regionName,
        batchSize,
        maxAttempts
      );

      if (typeof result !== 'string') {
        throw new Error('Provider returned non-string result');
      }

      return result;
      
    } catch (error) {
      throw ErrorHandler.handle(error, 'question generation via provider');
    }
  }

  /**
   * Generate answer (implements AnswerProvider)
   */
  async generateAnswer(question: string, maxAttempts: number = 3): Promise<QAItem> {
    try {
      SecureLogger.debug('Generating answer via provider', {
        questionPreview: question.slice(0, 50),
        maxAttempts
      });

      const result = await this.provider.generateAnswer(question, maxAttempts);

      // Validate result structure
      if (!this.isValidQAItem(result)) {
        throw new Error('Provider returned invalid QA item structure');
      }

      return result;
      
    } catch (error) {
      throw ErrorHandler.handle(error, 'answer generation via provider');
    }
  }

  /**
   * Validate QA item structure
   */
  private isValidQAItem(item: unknown): item is QAItem {
    return (
      typeof item === 'object' &&
      item !== null &&
      'question' in item &&
      'content' in item &&
      typeof (item as any).question === 'string' &&
      typeof (item as any).content === 'string' &&
      (item as any).question.trim().length > 0 &&
      (item as any).content.trim().length > 0
    );
  }
}