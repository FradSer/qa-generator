import type { Region } from '../config/config';
import type { Question } from '../types/types';
import type { Result } from '../types/result';
import { Ok, Err } from '../types/result';
import { StorageService } from './storage-service';
import { WorkerPool } from '../workers/worker-pool';
import type { QuestionWorkerTask } from '../types/worker';
import { isTooSimilar } from '../utils/similarity';
import { InputValidator, ValidationError } from '../utils/input-validation';
import Logger from '../utils/logger';

/**
 * Options for question generation
 */
export interface QuestionGenerationOptions {
  count: number;
  maxAttempts: number;
  batchSize: number;
  workerCount: number;
  maxQPerWorker: number;
  maxRetries: number;
}

/**
 * Question generation result
 */
export interface QuestionGenerationResult {
  totalGenerated: number;
  newQuestions: number;
  existingQuestions: number;
  targetReached: boolean;
  questions: Question[];
}

/**
 * AI Provider interface for question generation
 */
export interface QuestionProvider {
  generateQuestionsFromPrompt(regionName: string, batchSize: number, maxAttempts: number): Promise<string>;
}

/**
 * Service for generating questions using AI providers
 */
export class QuestionGenerationService {
  private readonly storageService: StorageService;

  constructor(storageService: StorageService) {
    this.storageService = storageService;
  }

  /**
   * Generate questions sequentially (simple mode)
   */
  async generateQuestionsSequential(
    region: Region,
    provider: QuestionProvider,
    options: Partial<QuestionGenerationOptions> = {}
  ): Promise<Result<QuestionGenerationResult, Error>> {
    try {
      const validatedOptions = this.validateOptions(options);
      Logger.process(`Generating questions for ${region.name} (sequential mode)...`);
      
      const loadResult = await this.loadExistingQuestions(region.pinyin);
      if (!loadResult.success) return loadResult;
      
      const { questions: existingQuestions, initialCount } = loadResult.data;
      
      if (this.isTargetAlreadyReached(existingQuestions.length, validatedOptions.count)) {
        return Ok(this.createQuestionGenerationResult(existingQuestions, initialCount, validatedOptions.count));
      }
      
      const processingResult = await this.processBatchesSequentially(
        region, 
        provider, 
        validatedOptions, 
        existingQuestions
      );
      
      if (!processingResult.success) return processingResult;
      
      return Ok(this.createQuestionGenerationResult(
        processingResult.data, 
        initialCount, 
        validatedOptions.count
      ));
      
    } catch (error) {
      return Err(new Error(`Sequential question generation failed: ${error}`));
    }
  }

  /**
   * Generate questions using parallel workers
   */
  async generateQuestionsParallel(
    region: Region,
    options: Partial<QuestionGenerationOptions> = {}
  ): Promise<Result<QuestionGenerationResult, Error>> {
    const validatedOptions = this.validateOptions(options);
    
    Logger.process(`Generating questions for ${region.name} using ${validatedOptions.workerCount} workers...`);
    
    const questionPool = new WorkerPool(validatedOptions.workerCount, './workers/question-worker.ts');
    
    try {
      const loadResult = await this.loadExistingQuestions(region.pinyin);
      if (!loadResult.success) return loadResult;
      
      const { questions: allQuestions, initialCount } = loadResult.data;
      Logger.info(`Starting with ${initialCount} existing questions`);
      
      const generationResult = await this.executeParallelGenerationLoop(
        region, 
        validatedOptions, 
        allQuestions, 
        questionPool
      );
      
      if (!generationResult.success) return generationResult;
      
      const finalQuestions = generationResult.data;
      this.logFinalResults(finalQuestions.length, validatedOptions.count, validatedOptions.maxRetries);
      
      return Ok(this.createQuestionGenerationResult(
        finalQuestions, 
        initialCount, 
        validatedOptions.count
      ));
      
    } catch (error) {
      return Err(new Error(`Parallel question generation failed: ${error}`));
    } finally {
      questionPool.terminate();
    }
  }

  /**
   * Generate a single batch of questions using AI provider
   */
  private async generateQuestionBatch(
    region: Region,
    provider: QuestionProvider,
    batchSize: number,
    maxAttempts: number,
    existingQuestions: Set<string>
  ): Promise<Result<Question[], Error>> {
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await provider.generateQuestionsFromPrompt(
          region.name,
          batchSize,
          maxAttempts
        );
        
        const parseResult = this.parseQuestions(response);
        if (!parseResult.success) {
          Logger.warn(`Parse attempt ${attempt}/${maxAttempts} failed: ${parseResult.error.message}`);
          continue;
        }
        
        const questions = parseResult.data;
        const uniqueQuestions = this.filterUniqueQuestions(questions, existingQuestions, region.name);
        
        return Ok(uniqueQuestions);
        
      } catch (error) {
        Logger.error(`Generation attempt ${attempt}/${maxAttempts} failed: ${error}`);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    return Err(new Error(`Failed to generate questions after ${maxAttempts} attempts`));
  }

  /**
   * Generate parallel batch using worker pool
   */
  private async generateParallelBatch(
    region: Region,
    options: QuestionGenerationOptions,
    existingQuestions: Question[],
    questionPool: WorkerPool
  ): Promise<Result<Question[], Error>> {
    
    try {
      const existingSet = new Set(existingQuestions.map(q => q.question));
      const tasks: Promise<Question[]>[] = [];
      
      // Create worker tasks
      for (let i = 0; i < options.workerCount; i++) {
        const task: QuestionWorkerTask = {
          regionName: region.name,
          batchSize: options.maxQPerWorker,
          maxAttempts: options.maxAttempts,
          workerId: i + 1
        };
        tasks.push(questionPool.execute(task));
      }
      
      // Wait for all workers
      const results = await Promise.all(tasks);
      const allNewQuestions = results.flat();
      
      // Filter for unique questions
      const uniqueQuestions: Question[] = [];
      for (const q of allNewQuestions) {
        if (!q || typeof q.question !== 'string' || !q.question.trim()) {
          continue;
        }
        
        if (!existingSet.has(q.question) && !isTooSimilar(q.question, Array.from(existingSet), region.name)) {
          uniqueQuestions.push({ ...q, is_answered: false });
          existingSet.add(q.question);
        }
      }
      
      return Ok(uniqueQuestions);
      
    } catch (error) {
      return Err(new Error(`Parallel batch generation failed: ${error}`));
    }
  }

  /**
   * Parse questions from AI response
   */
  private parseQuestions(response: string): Result<Question[], Error> {
    try {
      const parsed = JSON.parse(response);
      
      if (!Array.isArray(parsed)) {
        return Err(new Error('Response is not an array'));
      }
      
      const questions = parsed.filter(item => 
        item && 
        typeof item === 'object' && 
        typeof item.question === 'string' &&
        item.question.trim().length > 0
      );
      
      return Ok(questions);
      
    } catch (error) {
      return Err(new Error(`Failed to parse JSON response: ${error}`));
    }
  }

  /**
   * Execute the parallel generation loop with retry logic
   */
  private async executeParallelGenerationLoop(
    region: Region,
    options: QuestionGenerationOptions,
    allQuestions: Question[],
    questionPool: WorkerPool
  ): Promise<Result<Question[], Error>> {
    let retryCount = 0;
    
    while (allQuestions.length < options.count && retryCount < options.maxRetries) {
      this.logRetryAttempt(retryCount, options.maxRetries, allQuestions.length, options.count);
      
      const batchResult = await this.generateParallelBatch(
        region, 
        options, 
        allQuestions,
        questionPool
      );
      
      const shouldContinue = await this.handleBatchResult(
        batchResult, 
        allQuestions, 
        region.pinyin, 
        retryCount, 
        options.maxRetries
      );
      
      if (shouldContinue.shouldRetry) {
        retryCount++;
        if (shouldContinue.shouldDelay) {
          await this.delayBeforeRetry(retryCount);
        }
      }
    }
    
    return Ok(allQuestions);
  }

  /**
   * Log retry attempt information
   */
  private logRetryAttempt(retryCount: number, maxRetries: number, current: number, target: number): void {
    if (retryCount > 0) {
      Logger.process(`Retry ${retryCount}/${maxRetries}: Current ${current}/${target}`);
    }
  }

  /**
   * Handle batch result and determine next action
   */
  private async handleBatchResult(
    batchResult: Result<Question[], Error>,
    allQuestions: Question[],
    regionPinyin: string,
    retryCount: number,
    maxRetries: number
  ): Promise<{shouldRetry: boolean, shouldDelay: boolean}> {
    if (batchResult.success) {
      const newQuestions = batchResult.data;
      
      if (newQuestions.length === 0) {
        return { shouldRetry: retryCount < maxRetries, shouldDelay: retryCount < maxRetries };
      }
      
      allQuestions.push(...newQuestions);
      await this.saveProgressWithBatchLogging(regionPinyin, allQuestions, newQuestions.length);
      
      return { shouldRetry: false, shouldDelay: false };
    } else {
      Logger.error(`Parallel batch failed: ${batchResult.error.message}`);
      return { shouldRetry: true, shouldDelay: false };
    }
  }

  /**
   * Delay before retry with exponential backoff
   */
  private async delayBeforeRetry(retryCount: number): Promise<void> {
    const delayTime = 5000 * retryCount;
    Logger.process(`No new questions added, waiting ${delayTime/1000}s before retry...`);
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }

  /**
   * Save progress and log batch completion
   */
  private async saveProgressWithBatchLogging(
    regionPinyin: string, 
    allQuestions: Question[], 
    newQuestionsCount: number
  ): Promise<void> {
    const saveResult = await this.storageService.saveQuestions(regionPinyin, allQuestions);
    if (!saveResult.success) {
      Logger.error(`Failed to save progress: ${saveResult.error.message}`);
    }
    
    Logger.success(`Batch complete: ${newQuestionsCount} new questions added`);
    Logger.info(`Progress: ${allQuestions.length} total questions`);
  }

  /**
   * Log final generation results
   */
  private logFinalResults(finalCount: number, targetCount: number, maxRetries: number): void {
    const targetReached = finalCount >= targetCount;
    
    if (targetReached) {
      Logger.success(`Target reached: ${finalCount}/${targetCount} questions`);
    } else {
      Logger.warn(`Target not reached: ${finalCount}/${targetCount} questions after ${maxRetries} retries`);
    }
  }

  /**
   * Filter questions for uniqueness and similarity
   */
  private filterUniqueQuestions(
    questions: Question[],
    existingQuestions: Set<string>,
    regionName: string
  ): Question[] {
    const uniqueQuestions: Question[] = [];
    
    for (const q of questions) {
      if (!q || typeof q.question !== 'string' || !q.question.trim()) {
        continue;
      }
      
      const questionText = q.question.trim();
      
      if (this.shouldSkipQuestion(questionText, existingQuestions, regionName)) {
        continue;
      }
      
      uniqueQuestions.push({
        question: questionText,
        is_answered: false
      });
    }
    
    return uniqueQuestions;
  }

  /**
   * Determine if a question should be skipped (duplicate or too similar)
   */
  private shouldSkipQuestion(
    questionText: string, 
    existingQuestions: Set<string>, 
    regionName: string
  ): boolean {
    // Check for duplicates
    if (existingQuestions.has(questionText)) {
      Logger.debug(`Skipping duplicate: ${questionText.slice(0, 50)}...`);
      return true;
    }
    
    // Check for similarity
    const existingArray = Array.from(existingQuestions);
    if (isTooSimilar(questionText, existingArray, regionName)) {
      Logger.debug(`Skipping similar: ${questionText.slice(0, 50)}...`);
      return true;
    }
    
    return false;
  }

  /**
   * Load existing questions and return with initial count
   */
  private async loadExistingQuestions(regionPinyin: string): Promise<Result<{questions: Question[], initialCount: number}, Error>> {
    const questionsResult = await this.storageService.loadQuestions(regionPinyin);
    if (!questionsResult.success) return questionsResult;
    
    const existingQuestions = questionsResult.data;
    return Ok({ questions: existingQuestions, initialCount: existingQuestions.length });
  }

  /**
   * Check if target question count is already reached
   */
  private isTargetAlreadyReached(currentCount: number, targetCount: number): boolean {
    if (currentCount >= targetCount) {
      Logger.info(`Already have ${currentCount} questions, target reached`);
      return true;
    }
    return false;
  }

  /**
   * Process question generation batches sequentially
   */
  private async processBatchesSequentially(
    region: Region,
    provider: QuestionProvider,
    options: QuestionGenerationOptions,
    existingQuestions: Question[]
  ): Promise<Result<Question[], Error>> {
    const existingSet = new Set(existingQuestions.map(q => q.question));
    let remainingCount = options.count - existingQuestions.length;
    let newQuestionsAdded = 0;
    
    while (remainingCount > 0 && newQuestionsAdded < options.count) {
      const batchResult = await this.generateAndProcessBatch(
        region, 
        provider, 
        options, 
        existingSet, 
        remainingCount, 
        existingQuestions
      );
      
      if (!batchResult.success) {
        Logger.error(`Batch generation failed: ${batchResult.error.message}`);
        break;
      }
      
      const addedCount = batchResult.data;
      if (addedCount === 0) {
        Logger.warn('No new questions generated in this batch, stopping');
        break;
      }
      
      newQuestionsAdded += addedCount;
      remainingCount = options.count - existingQuestions.length;
      
      await this.saveProgressWithLogging(region.pinyin, existingQuestions, options.count);
    }
    
    return Ok(existingQuestions);
  }

  /**
   * Generate and process a single batch of questions
   */
  private async generateAndProcessBatch(
    region: Region,
    provider: QuestionProvider,
    options: QuestionGenerationOptions,
    existingSet: Set<string>,
    remainingCount: number,
    existingQuestions: Question[]
  ): Promise<Result<number, Error>> {
    const batchSize = Math.min(options.batchSize, remainingCount);
    Logger.process(`Generating batch of ${batchSize} questions...`);
    
    const batchResult = await this.generateQuestionBatch(
      region,
      provider,
      batchSize,
      options.maxAttempts,
      existingSet
    );
    
    if (!batchResult.success) return batchResult;
    
    const newQuestions = batchResult.data;
    let addedCount = 0;
    
    for (const question of newQuestions) {
      if (addedCount >= remainingCount) break;
      existingQuestions.push({ ...question, is_answered: false });
      existingSet.add(question.question);
      addedCount++;
    }
    
    return Ok(addedCount);
  }

  /**
   * Save progress with logging
   */
  private async saveProgressWithLogging(
    regionPinyin: string, 
    questions: Question[], 
    targetCount: number
  ): Promise<void> {
    const saveResult = await this.storageService.saveQuestions(regionPinyin, questions);
    if (!saveResult.success) {
      Logger.error(`Failed to save progress: ${saveResult.error.message}`);
    }
    Logger.info(`Progress: ${questions.length}/${targetCount} questions`);
  }

  /**
   * Create standardized question generation result
   */
  private createQuestionGenerationResult(
    questions: Question[], 
    initialCount: number, 
    targetCount: number
  ): QuestionGenerationResult {
    const targetReached = questions.length >= targetCount;
    return {
      totalGenerated: questions.length,
      newQuestions: questions.length - initialCount,
      existingQuestions: initialCount,
      targetReached,
      questions
    };
  }

  /**
   * Validate and set default options
   */
  private validateOptions(options: Partial<QuestionGenerationOptions>): QuestionGenerationOptions {
    try {
      return {
        count: InputValidator.validateNumeric(options.count ?? 1000, 'count', 1, 10000),
        maxAttempts: InputValidator.validateNumeric(options.maxAttempts ?? 3, 'maxAttempts', 1, 10),
        batchSize: InputValidator.validateNumeric(options.batchSize ?? 50, 'batchSize', 1, 1000),
        workerCount: InputValidator.validateNumeric(options.workerCount ?? 5, 'workerCount', 1, 20),
        maxQPerWorker: InputValidator.validateNumeric(options.maxQPerWorker ?? 50, 'maxQPerWorker', 1, 1000),
        maxRetries: InputValidator.validateNumeric(options.maxRetries ?? 5, 'maxRetries', 1, 20)
      };
    } catch (error) {
      throw new ValidationError(`Invalid question generation options: ${error}`);
    }
  }
}