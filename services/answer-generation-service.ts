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
      
      const loadResult = await this.loadQuestionsAndAnswers(validatedPinyin);
      if (!loadResult.success) return loadResult;
      
      const { questions, answers: existingAnswers, unanswered: unansweredQuestions, initialCount } = loadResult.data;
      
      if (unansweredQuestions.length === 0) {
        return this.createResult(questions, existingAnswers, initialCount);
      }
      
      const processingResult = await this.processQuestionsSequentially(
        unansweredQuestions, 
        provider, 
        validatedOptions, 
        questions, 
        existingAnswers, 
        validatedPinyin
      );
      
      if (!processingResult.success) return processingResult;
      
      return this.createResult(questions, existingAnswers, initialCount);
      
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
      const loadResult = await this.loadQuestionsAndAnswers(validatedPinyin);
      if (!loadResult.success) return loadResult;
      
      const { questions, answers: existingAnswers, unanswered: unansweredQuestions, initialCount } = loadResult.data;
      
      if (unansweredQuestions.length === 0) {
        return this.createResult(questions, existingAnswers, initialCount);
      }
      
      const processingResult = await this.processAnswerBatches(
        unansweredQuestions, 
        validatedOptions, 
        questions, 
        existingAnswers, 
        validatedPinyin, 
        answerPool
      );
      
      if (!processingResult.success) return processingResult;
      
      return this.createResult(questions, existingAnswers, initialCount);
      
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
   * Process all answer batches with progress tracking
   */
  private async processAnswerBatches(
    unansweredQuestions: Question[],
    validatedOptions: AnswerGenerationOptions,
    questions: Question[],
    existingAnswers: QAItem[],
    regionPinyin: string,
    answerPool: WorkerPool
  ): Promise<Result<void, Error>> {
    const answeredQuestions = new Set(existingAnswers.map(item => item.question));
    const batchConfig = this.calculateBatchConfiguration(unansweredQuestions.length, validatedOptions.workerCount);
    
    Logger.process(`Processing in ${batchConfig.totalBatches} batches`);
    
    for (let batchIndex = 0; batchIndex < batchConfig.totalBatches; batchIndex++) {
      const batchResult = await this.processSingleAnswerBatch(
        unansweredQuestions, 
        batchIndex, 
        batchConfig, 
        validatedOptions, 
        answerPool
      );
      
      if (batchResult.success) {
        const validResults = batchResult.data.filter(this.validateQAItem);
        
        this.updateAnswersAndQuestions(
          validResults, 
          answeredQuestions, 
          existingAnswers, 
          questions
        );
        
        await this.saveProgressWithBatchLogging(regionPinyin, questions, existingAnswers, validResults.length, batchResult.data.length);
      } else {
        Logger.error(`Batch ${batchIndex + 1} failed: ${batchResult.error.message}`);
      }
      
      await this.delayBetweenBatches(validatedOptions.delay, batchIndex, batchConfig.totalBatches);
    }
    
    return Ok(undefined);
  }

  /**
   * Process a single batch of questions
   */
  private async processSingleAnswerBatch(
    unansweredQuestions: Question[],
    batchIndex: number,
    batchConfig: {totalBatches: number; shouldMergeLastBatch: boolean},
    options: AnswerGenerationOptions,
    answerPool: WorkerPool
  ): Promise<Result<QAItem[], Error>> {
    const batchQuestions = this.getBatchQuestions(
      unansweredQuestions, 
      batchIndex, 
      {...batchConfig, workerCount: options.workerCount}
    );
    
    Logger.process(`Processing batch ${batchIndex + 1}/${batchConfig.totalBatches} (${batchQuestions.length} questions)`);
    
    return await this.processBatch(batchQuestions, options, answerPool);
  }

  /**
   * Update answers and question status after batch processing
   */
  private updateAnswersAndQuestions(
    validResults: QAItem[],
    answeredQuestions: Set<string>,
    existingAnswers: QAItem[],
    questions: Question[]
  ): void {
    for (const result of validResults) {
      if (!answeredQuestions.has(result.question)) {
        existingAnswers.push(result);
        answeredQuestions.add(result.question);
        this.updateQuestionStatus(questions, result.question);
      }
    }
  }

  /**
   * Save progress and log batch results
   */
  private async saveProgressWithBatchLogging(
    regionPinyin: string,
    questions: Question[],
    existingAnswers: QAItem[],
    validCount: number,
    totalCount: number
  ): Promise<void> {
    await this.saveProgress(regionPinyin, questions, existingAnswers);
    Logger.info(`Batch completed: ${validCount}/${totalCount} valid answers`);
    Logger.info(`Progress: ${existingAnswers.length} total answers`);
  }

  /**
   * Handle delay between batches
   */
  private async delayBetweenBatches(
    delay: number, 
    currentBatchIndex: number, 
    totalBatches: number
  ): Promise<void> {
    if (delay > 0 && currentBatchIndex < totalBatches - 1) {
      Logger.process(`Waiting ${delay}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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
   * Load questions and answers, return with unanswered questions
   */
  private async loadQuestionsAndAnswers(
    regionPinyin: string
  ): Promise<Result<{questions: Question[], answers: QAItem[], unanswered: Question[], initialCount: number}, Error>> {
    const statusResult = await this.storageService.updateQuestionStatus(regionPinyin);
    if (!statusResult.success) return statusResult;
    
    const { questions, answers } = statusResult.data;
    const initialAnswerCount = answers.length;
    const unansweredQuestions = questions.filter(q => !q.is_answered);
    
    Logger.info(`Found ${unansweredQuestions.length} questions without answers`);
    
    return Ok({
      questions,
      answers,
      unanswered: unansweredQuestions,
      initialCount: initialAnswerCount
    });
  }

  /**
   * Process questions sequentially with progress tracking
   */
  private async processQuestionsSequentially(
    unansweredQuestions: Question[],
    provider: AnswerProvider,
    options: AnswerGenerationOptions,
    questions: Question[],
    existingAnswers: QAItem[],
    regionPinyin: string
  ): Promise<Result<void, Error>> {
    for (let i = 0; i < unansweredQuestions.length; i++) {
      const question = unansweredQuestions[i];
      
      const answerResult = await this.processSingleQuestion(
        question, 
        provider, 
        options.maxAttempts, 
        i + 1, 
        unansweredQuestions.length
      );
      
      if (answerResult.success && answerResult.data) {
        existingAnswers.push(answerResult.data);
        this.updateQuestionStatus(questions, question.question);
      }
      
      await this.handleProgressAndDelay(
        i, 
        unansweredQuestions.length, 
        regionPinyin, 
        questions, 
        existingAnswers, 
        options.delay
      );
    }
    
    return Ok(undefined);
  }

  /**
   * Process a single question and generate answer
   */
  private async processSingleQuestion(
    question: Question,
    provider: AnswerProvider,
    maxAttempts: number,
    currentIndex: number,
    totalQuestions: number
  ): Promise<Result<QAItem | null, Error>> {
    Logger.process(`Generating answer ${currentIndex}/${totalQuestions}: ${question.question.slice(0, 50)}...`);
    
    try {
      const qaItem = await provider.generateAnswer(question.question, maxAttempts);
      
      if (this.validateQAItem(qaItem)) {
        Logger.success(`Answer generated: ${qaItem.content.slice(0, 100)}...`);
        return Ok(qaItem);
      } else {
        Logger.warn('Invalid QA item received, skipping');
        return Ok(null);
      }
      
    } catch (error) {
      Logger.error(`Failed to generate answer: ${error}`);
      return Ok(null);
    }
  }

  /**
   * Update question status to answered
   */
  private updateQuestionStatus(questions: Question[], questionText: string): void {
    const questionIndex = questions.findIndex(q => q.question === questionText);
    if (questionIndex !== -1) {
      questions[questionIndex].is_answered = true;
    }
  }

  /**
   * Handle progress saving and delays
   */
  private async handleProgressAndDelay(
    currentIndex: number,
    totalQuestions: number,
    regionPinyin: string,
    questions: Question[],
    answers: QAItem[],
    delay: number
  ): Promise<void> {
    // Save progress periodically
    if (currentIndex % 10 === 0 || currentIndex === totalQuestions - 1) {
      await this.saveProgress(regionPinyin, questions, answers);
    }
    
    // Add delay between requests
    if (delay > 0 && currentIndex < totalQuestions - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
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