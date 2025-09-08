import type { Question, QAItem } from '../types/types';
import type { Result } from '../types/result';
import { Ok, Err } from '../types/result';
import { StorageService } from './storage-service';
import { WorkerPool } from '../workers/worker-pool';
import type { AnswerWorkerTask } from '../types/worker';
import { InputValidator, ValidationError } from '../utils/input-validation';
import Logger from '../utils/logger';

/**
 * Options for answer generation
 */
export interface AnswerGenerationOptions {
  maxAttempts: number;
  batchSize: number;
  delay: number;
  workerCount: number;
}

/**
 * Answer generation result
 */
export interface AnswerGenerationResult {
  totalAnswers: number;
  newAnswers: number;
  existingAnswers: number;
  questionsAnswered: number;
  completionRate: number;
  answers: QAItem[];
}

/**
 * AI Provider interface for answer generation
 */
export interface AnswerProvider {
  generateAnswer(question: string, maxAttempts?: number): Promise<QAItem>;
}

/**
 * Service for generating answers using AI providers
 */
export class AnswerGenerationService {
  private readonly storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Generate answers sequentially (simple mode)
   */
  async generateAnswersSequential(
    regionPinyin: string,
    provider: AnswerProvider,
    options: Partial<AnswerGenerationOptions> = {}
  ): Promise<Result<AnswerGenerationResult, Error>> {
    try {
      const validatedOptions = this.validateOptions(options);
      const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
      
      Logger.process(`Generating answers for region: ${validatedPinyin} (sequential mode)...`);
      
      // Load questions and answers
      const statusResult = await this.storageService.updateQuestionStatus(validatedPinyin);
      if (!statusResult.success) return statusResult;
      
      const { questions, answers: existingAnswers } = statusResult.data;
      const initialAnswerCount = existingAnswers.length;
      
      // Get unanswered questions
      const unansweredQuestions = questions.filter(q => !q.is_answered);
      Logger.info(`Found ${unansweredQuestions.length} questions without answers`);
      
      if (unansweredQuestions.length === 0) {
        return this.createResult(questions, existingAnswers, initialAnswerCount);
      }
      
      // Generate answers sequentially
      for (let i = 0; i < unansweredQuestions.length; i++) {
        const question = unansweredQuestions[i];
        Logger.process(`Generating answer ${i + 1}/${unansweredQuestions.length}: ${question.question.slice(0, 50)}...`);
        
        try {
          const qaItem = await provider.generateAnswer(question.question, validatedOptions.maxAttempts);
          
          if (this.validateQAItem(qaItem)) {
            existingAnswers.push(qaItem);
            
            // Update question status
            const questionIndex = questions.findIndex(q => q.question === question.question);
            if (questionIndex !== -1) {
              questions[questionIndex].is_answered = true;
            }
            
            Logger.success(`Answer generated: ${qaItem.content.slice(0, 100)}...`);
          } else {
            Logger.warn('Invalid QA item received, skipping');
            continue;
          }
          
        } catch (error) {
          Logger.error(`Failed to generate answer: ${error}`);
          continue;
        }
        
        // Save progress periodically
        if (i % 10 === 0 || i === unansweredQuestions.length - 1) {
          await this.saveProgress(validatedPinyin, questions, existingAnswers);
        }
        
        // Add delay between requests
        if (validatedOptions.delay > 0 && i < unansweredQuestions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, validatedOptions.delay));
        }
      }
      
      return this.createResult(questions, existingAnswers, initialAnswerCount);
      
    } catch (error) {
      return Err(new Error(`Sequential answer generation failed: ${error}`));
    }
  }

  /**
   * Generate answers using parallel workers
   */
  async generateAnswersParallel(
    regionPinyin: string,
    options: Partial<AnswerGenerationOptions> = {}
  ): Promise<Result<AnswerGenerationResult, Error>> {
    const validatedOptions = this.validateOptions(options);
    const validatedPinyin = InputValidator.validateRegionPinyin(regionPinyin);
    
    Logger.process(`Generating answers using ${validatedOptions.workerCount} workers...`);
    
    const answerPool = new WorkerPool(validatedOptions.workerCount, './workers/answer-worker.ts');
    
    try {
      // Load questions and answers
      const statusResult = await this.storageService.updateQuestionStatus(validatedPinyin);
      if (!statusResult.success) return statusResult;
      
      let { questions, answers: existingAnswers } = statusResult.data;
      const initialAnswerCount = existingAnswers.length;
      
      // Get unanswered questions
      const unansweredQuestions = questions.filter(q => !q.is_answered);
      Logger.info(`Found ${unansweredQuestions.length} questions without answers`);
      
      if (unansweredQuestions.length === 0) {
        return this.createResult(questions, existingAnswers, initialAnswerCount);
      }
      
      const answeredQuestions = new Set(existingAnswers.map(item => item.question));
      
      // Calculate batches
      const batchConfig = this.calculateBatchConfiguration(unansweredQuestions.length, validatedOptions.workerCount);
      Logger.process(`Processing in ${batchConfig.totalBatches} batches`);
      
      // Process in batches
      for (let batchIndex = 0; batchIndex < batchConfig.totalBatches; batchIndex++) {
        const batchQuestions = this.getBatchQuestions(unansweredQuestions, batchIndex, batchConfig);
        
        Logger.process(`Processing batch ${batchIndex + 1}/${batchConfig.totalBatches} (${batchQuestions.length} questions)`);
        
        const batchResult = await this.processBatch(
          batchQuestions,
          validatedOptions,
          answerPool
        );
        
        if (batchResult.success) {
          const validResults = batchResult.data.filter(this.validateQAItem);
          Logger.info(`Batch completed: ${validResults.length}/${batchResult.data.length} valid answers`);
          
          // Add new answers
          for (const result of validResults) {
            if (!answeredQuestions.has(result.question)) {
              existingAnswers.push(result);
              answeredQuestions.add(result.question);
              
              // Update question status
              const questionIndex = questions.findIndex(q => q.question === result.question);
              if (questionIndex !== -1) {
                questions[questionIndex].is_answered = true;
              }
            }
          }
          
          // Save progress after each batch
          await this.saveProgress(validatedPinyin, questions, existingAnswers);
          
          Logger.info(`Progress: ${existingAnswers.length} total answers`);
          
        } else {
          Logger.error(`Batch ${batchIndex + 1} failed: ${batchResult.error.message}`);
        }
        
        // Add delay between batches
        if (validatedOptions.delay > 0 && batchIndex < batchConfig.totalBatches - 1) {
          Logger.process(`Waiting ${validatedOptions.delay}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, validatedOptions.delay));
        }
      }
      
      return this.createResult(questions, existingAnswers, initialAnswerCount);
      
    } catch (error) {
      return Err(new Error(`Parallel answer generation failed: ${error}`));
    } finally {
      answerPool.terminate();
    }
  }

  /**
   * Process a single batch of questions
   */
  private async processBatch(
    batchQuestions: Question[],
    options: AnswerGenerationOptions,
    answerPool: WorkerPool
  ): Promise<Result<QAItem[], Error>> {
    try {
      const tasks: Promise<QAItem>[] = [];
      
      // Create worker tasks
      for (let i = 0; i < batchQuestions.length; i++) {
        const task: AnswerWorkerTask = {
          question: batchQuestions[i].question,
          maxAttempts: options.maxAttempts,
          workerId: i + 1
        };
        tasks.push(answerPool.execute(task));
      }
      
      // Wait for all tasks
      const results = await Promise.all(tasks);
      return Ok(results.filter(result => result !== null));
      
    } catch (error) {
      return Err(new Error(`Batch processing failed: ${error}`));
    }
  }

  /**
   * Calculate batch configuration
   */
  private calculateBatchConfiguration(totalQuestions: number, workerCount: number): {
    totalBatches: number;
    lastBatchSize: number;
    shouldMergeLastBatch: boolean;
  } {
    const tenPercentWorkers = Math.floor(workerCount * 0.1);
    let totalBatches = Math.ceil(totalQuestions / workerCount);
    const lastBatchSize = totalQuestions % workerCount;
    const shouldMergeLastBatch = lastBatchSize > 0 && lastBatchSize <= tenPercentWorkers;
    
    if (shouldMergeLastBatch) {
      totalBatches--;
      Logger.debug(`Merging small last batch (${lastBatchSize} <= ${tenPercentWorkers})`);
    }
    
    return { totalBatches, lastBatchSize, shouldMergeLastBatch };
  }

  /**
   * Get questions for a specific batch
   */
  private getBatchQuestions(
    questions: Question[],
    batchIndex: number,
    batchConfig: { totalBatches: number; shouldMergeLastBatch: boolean; workerCount?: number }
  ): Question[] {
    const workerCount = batchConfig.workerCount || 5;
    const start = batchIndex * workerCount;
    const isLastBatch = batchIndex === batchConfig.totalBatches - 1;
    
    let end: number;
    if (isLastBatch && batchConfig.shouldMergeLastBatch) {
      end = questions.length;
    } else {
      end = Math.min(start + workerCount, questions.length);
    }
    
    return questions.slice(start, end);
  }

  /**
   * Save progress to storage
   */
  private async saveProgress(
    regionPinyin: string,
    questions: Question[],
    answers: QAItem[]
  ): Promise<void> {
    const [questionsResult, answersResult] = await Promise.all([
      this.storageService.saveQuestions(regionPinyin, questions),
      this.storageService.saveAnswers(regionPinyin, answers)
    ]);
    
    if (!questionsResult.success || !answersResult.success) {
      Logger.warn('Failed to save some progress data');
    }
  }

  /**
   * Validate QA item structure
   */
  private validateQAItem(item: unknown): item is QAItem {
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

  /**
   * Create standardized result object
   */
  private createResult(
    questions: Question[],
    answers: QAItem[],
    initialAnswerCount: number
  ): Result<AnswerGenerationResult, Error> {
    const totalQuestions = questions.length;
    const questionsAnswered = questions.filter(q => q.is_answered).length;
    const completionRate = totalQuestions > 0 ? (questionsAnswered / totalQuestions) * 100 : 0;
    
    return Ok({
      totalAnswers: answers.length,
      newAnswers: answers.length - initialAnswerCount,
      existingAnswers: initialAnswerCount,
      questionsAnswered,
      completionRate,
      answers
    });
  }

  /**
   * Validate and set default options
   */
  private validateOptions(options: Partial<AnswerGenerationOptions>): AnswerGenerationOptions {
    try {
      return {
        maxAttempts: InputValidator.validateNumeric(options.maxAttempts ?? 3, 'maxAttempts', 1, 10),
        batchSize: InputValidator.validateNumeric(options.batchSize ?? 50, 'batchSize', 1, 1000),
        delay: InputValidator.validateNumeric(options.delay ?? 1000, 'delay', 0, 60000),
        workerCount: InputValidator.validateNumeric(options.workerCount ?? 5, 'workerCount', 1, 20)
      };
    } catch (error) {
      throw new ValidationError(`Invalid answer generation options: ${error}`);
    }
  }
}