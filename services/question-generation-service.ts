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
      
      // Load existing questions
      const questionsResult = await this.storageService.loadQuestions(region.pinyin);
      if (!questionsResult.success) return questionsResult;
      
      const existingQuestions = questionsResult.data;
      const initialCount = existingQuestions.length;
      
      if (existingQuestions.length >= validatedOptions.count) {
        Logger.info(`Already have ${existingQuestions.length} questions, target reached`);
        return Ok({
          totalGenerated: existingQuestions.length,
          newQuestions: 0,
          existingQuestions: existingQuestions.length,
          targetReached: true,
          questions: existingQuestions
        });
      }
      
      const existingSet = new Set(existingQuestions.map(q => q.question));
      let remainingCount = validatedOptions.count - existingQuestions.length;
      let newQuestionsAdded = 0;
      
      while (remainingCount > 0 && newQuestionsAdded < validatedOptions.count) {
        const batchSize = Math.min(validatedOptions.batchSize, remainingCount);
        Logger.process(`Generating batch of ${batchSize} questions...`);
        
        const batchResult = await this.generateQuestionBatch(
          region,
          provider,
          batchSize,
          validatedOptions.maxAttempts,
          existingSet
        );
        
        if (!batchResult.success) {
          Logger.error(`Batch generation failed: ${batchResult.error.message}`);
          break;
        }
        
        const newQuestions = batchResult.data;
        if (newQuestions.length === 0) {
          Logger.warn('No new questions generated in this batch, stopping');
          break;
        }
        
        // Add new questions
        for (const question of newQuestions) {
          if (newQuestionsAdded >= remainingCount) break;
          existingQuestions.push({ ...question, is_answered: false });
          existingSet.add(question.question);
          newQuestionsAdded++;
        }
        
        // Save progress
        const saveResult = await this.storageService.saveQuestions(region.pinyin, existingQuestions);
        if (!saveResult.success) {
          Logger.error(`Failed to save progress: ${saveResult.error.message}`);
        }
        
        remainingCount = validatedOptions.count - existingQuestions.length;
        Logger.info(`Progress: ${existingQuestions.length}/${validatedOptions.count} questions`);
      }
      
      const targetReached = existingQuestions.length >= validatedOptions.count;
      
      return Ok({
        totalGenerated: existingQuestions.length,
        newQuestions: existingQuestions.length - initialCount,
        existingQuestions: initialCount,
        targetReached,
        questions: existingQuestions
      });
      
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
    let retryCount = 0;
    
    try {
      // Load existing questions
      const questionsResult = await this.storageService.loadQuestions(region.pinyin);
      if (!questionsResult.success) return questionsResult;
      
      let allQuestions = questionsResult.data;
      const initialCount = allQuestions.length;
      
      Logger.info(`Starting with ${initialCount} existing questions`);
      
      // Generate until target reached or max retries exceeded
      while (allQuestions.length < validatedOptions.count && retryCount < validatedOptions.maxRetries) {
        if (retryCount > 0) {
          Logger.process(`Retry ${retryCount}/${validatedOptions.maxRetries}: Current ${allQuestions.length}/${validatedOptions.count}`);
        }
        
        const batchResult = await this.generateParallelBatch(
          region, 
          validatedOptions, 
          allQuestions,
          questionPool
        );
        
        if (batchResult.success) {
          const newQuestions = batchResult.data;
          if (newQuestions.length === 0) {
            retryCount++;
            if (retryCount < validatedOptions.maxRetries) {
              const delayTime = 5000 * retryCount;
              Logger.process(`No new questions added, waiting ${delayTime/1000}s before retry...`);
              await new Promise(resolve => setTimeout(resolve, delayTime));
            }
            continue;
          }
          
          allQuestions.push(...newQuestions);
          
          // Save progress
          const saveResult = await this.storageService.saveQuestions(region.pinyin, allQuestions);
          if (!saveResult.success) {
            Logger.error(`Failed to save progress: ${saveResult.error.message}`);
          }
          
          Logger.success(`Batch complete: ${newQuestions.length} new questions added`);
          Logger.info(`Progress: ${allQuestions.length}/${validatedOptions.count}`);
        } else {
          Logger.error(`Parallel batch failed: ${batchResult.error.message}`);
          retryCount++;
        }
      }
      
      const targetReached = allQuestions.length >= validatedOptions.count;
      
      if (targetReached) {
        Logger.success(`Target reached: ${allQuestions.length}/${validatedOptions.count} questions`);
      } else {
        Logger.warn(`Target not reached: ${allQuestions.length}/${validatedOptions.count} questions after ${retryCount} retries`);
      }
      
      return Ok({
        totalGenerated: allQuestions.length,
        newQuestions: allQuestions.length - initialCount,
        existingQuestions: initialCount,
        targetReached,
        questions: allQuestions
      });
      
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
      
      // Check for duplicates
      if (existingQuestions.has(questionText)) {
        Logger.debug(`Skipping duplicate: ${questionText.slice(0, 50)}...`);
        continue;
      }
      
      // Check for similarity
      const existingArray = Array.from(existingQuestions);
      if (isTooSimilar(questionText, existingArray, regionName)) {
        Logger.debug(`Skipping similar: ${questionText.slice(0, 50)}...`);
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