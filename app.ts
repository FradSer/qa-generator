#!/usr/bin/env bun

import { getRegionByPinyin, type Region } from './config/config';
import { ProviderFactory } from './providers/provider-factory';
import { StorageService } from './services/storage-service';
import { QuestionGenerationService, type QuestionGenerationOptions } from './services/question-generation-service';
import { AnswerGenerationService, type AnswerGenerationOptions } from './services/answer-generation-service';
import { ProviderAdapter } from './services/provider-adapter';
import { InputValidator, ValidationError } from './utils/input-validation';
import { SecureLogger, ErrorHandler } from './utils/secure-logger';
import { isOk } from './types/result';
import type { AIProviderService } from './types/provider';

/**
 * Application configuration after validation
 */
interface AppConfig {
  mode: 'questions' | 'answers' | 'all';
  region: Region;
  questionOptions: QuestionGenerationOptions;
  answerOptions: AnswerGenerationOptions;
}

/**
 * Main QA Generator Application
 */
export class QAGeneratorApp {
  private readonly storageService: StorageService;
  private readonly questionService: QuestionGenerationService;
  private readonly answerService: AnswerGenerationService;

  constructor() {
    this.storageService = new StorageService();
    this.questionService = new QuestionGenerationService(this.storageService);
    this.answerService = new AnswerGenerationService(this.storageService);
  }

  /**
   * Main application entry point
   */
  async run(): Promise<void> {
    try {
      SecureLogger.info('🚀 QA Generator starting up...');
      
      // Parse and validate configuration
      const config = await this.parseConfiguration();
      
      // Setup AI provider
      const provider = await this.setupProvider();
      
      // Execute based on mode
      await this.executeWorkflow(config, provider);
      
      SecureLogger.success('✅ QA Generator completed successfully!');
      
    } catch (error) {
      const handledError = ErrorHandler.handle(error, 'main application');
      SecureLogger.error('❌ Application failed:', handledError.message);
      process.exit(1);
    }
  }

  /**
   * Parse and validate command-line configuration
   */
  private async parseConfiguration(): Promise<AppConfig> {
    const args = this.parseCommandLineArgs();
    
    try {
      // Validate all arguments
      const validatedArgs = InputValidator.validateCommandArgs(args);
      
      // Get and validate region
      const region = getRegionByPinyin(validatedArgs.region);
      if (!region) {
        throw new ValidationError(`Region "${validatedArgs.region}" not found`);
      }

      // Build configuration
      const config: AppConfig = {
        mode: validatedArgs.mode as 'questions' | 'answers' | 'all',
        region,
        questionOptions: {
          count: parseInt(validatedArgs.count || '1000'),
          maxAttempts: parseInt(validatedArgs.attempts || '3'),
          batchSize: parseInt(validatedArgs.batch || '50'),
          workerCount: parseInt(validatedArgs.workers || '5'),
          maxQPerWorker: parseInt(validatedArgs['max-q-per-worker'] || '50'),
          maxRetries: 5
        },
        answerOptions: {
          maxAttempts: parseInt(validatedArgs.attempts || '3'),
          batchSize: parseInt(validatedArgs.batch || '50'),
          delay: parseInt(validatedArgs.delay || '1000'),
          workerCount: parseInt(validatedArgs.workers || '5')
        }
      };

      SecureLogger.info('📋 Configuration validated:', {
        mode: config.mode,
        region: config.region.name,
        questionTarget: config.questionOptions.count,
        workers: config.questionOptions.workerCount
      });

      return config;
      
    } catch (error) {
      throw ErrorHandler.handleValidation(error, 'command-line arguments');
    }
  }

  /**
   * Parse command-line arguments
   */
  private parseCommandLineArgs(): Record<string, string> {
    const args = process.argv.slice(2);
    const parsed: Record<string, string> = {};
    
    // Parse --key value pairs
    for (let i = 0; i < args.length; i += 2) {
      const key = args[i]?.replace('--', '');
      const value = args[i + 1];
      
      if (!key || !value) {
        if (key === 'help') {
          this.showHelp();
          process.exit(0);
        }
        throw new ValidationError(`Missing value for argument: ${key}`);
      }
      
      parsed[key] = value;
    }

    // Validate required arguments
    if (!parsed.mode || !parsed.region) {
      this.showHelp();
      throw new ValidationError('Missing required arguments: --mode and --region');
    }

    return parsed;
  }

  /**
   * Setup AI provider
   */
  private async setupProvider(): Promise<AIProviderService> {
    try {
      const providerFactory = ProviderFactory.getInstance();
      const result = providerFactory.getDefaultProvider();
      
      if (!isOk(result)) {
        throw new Error(`Provider setup failed: ${result.error.message}`);
      }
      
      const provider = result.data;
      SecureLogger.info('🤖 AI Provider ready:', {
        type: process.env.AI_PROVIDER || 'default'
      });
      
      return provider;
      
    } catch (error) {
      throw ErrorHandler.handle(error, 'provider setup');
    }
  }

  /**
   * Execute workflow based on mode
   */
  private async executeWorkflow(config: AppConfig, provider: AIProviderService): Promise<void> {
    const startTime = Date.now();

    try {
      switch (config.mode) {
        case 'questions':
          await this.executeQuestions(config, provider);
          break;
          
        case 'answers':
          await this.executeAnswers(config, provider);
          break;
          
        case 'all':
          await this.executeQuestions(config, provider);
          await this.executeAnswers(config, provider);
          break;
          
        default:
          throw new ValidationError(`Unknown mode: ${config.mode}`);
      }

      // Log performance metrics
      const duration = Date.now() - startTime;
      SecureLogger.performance('workflow_execution', {
        duration,
        mode: config.mode,
        region: config.region.pinyin
      });
      
    } catch (error) {
      throw ErrorHandler.handle(error, `${config.mode} workflow`);
    }
  }

  /**
   * Execute question generation workflow
   */
  private async executeQuestions(config: AppConfig, provider: AIProviderService): Promise<void> {
    SecureLogger.info('📝 Starting question generation phase...');
    
    // For parallel mode, we use workers which have their own provider setup
    // For sequential mode (future), we'd use the adapter
    const result = await this.questionService.generateQuestionsParallel(
      config.region,
      config.questionOptions
    );
    
    if (!isOk(result)) {
      throw new Error(`Question generation failed: ${result.error.message}`);
    }
    
    const summary = result.data;
    SecureLogger.info('📝 Question generation completed:', {
      totalGenerated: summary.totalGenerated,
      newQuestions: summary.newQuestions,
      targetReached: summary.targetReached,
      completionRate: ((summary.totalGenerated / config.questionOptions.count) * 100).toFixed(1) + '%'
    });
  }

  /**
   * Execute answer generation workflow
   */
  private async executeAnswers(config: AppConfig, provider: AIProviderService): Promise<void> {
    SecureLogger.info('💬 Starting answer generation phase...');
    
    const result = await this.answerService.generateAnswersParallel(
      config.region.pinyin,
      config.answerOptions
    );
    
    if (!isOk(result)) {
      throw new Error(`Answer generation failed: ${result.error.message}`);
    }
    
    const summary = result.data;
    SecureLogger.info('💬 Answer generation completed:', {
      totalAnswers: summary.totalAnswers,
      newAnswers: summary.newAnswers,
      questionsAnswered: summary.questionsAnswered,
      completionRate: summary.completionRate.toFixed(1) + '%'
    });
  }

  /**
   * Show help message
   */
  private showHelp(): void {
    console.log(`
🤖 QA Generator - AI-powered Question and Answer Generation Tool

USAGE:
    bun run app.ts --mode <type> --region <name> [OPTIONS]

REQUIRED ARGUMENTS:
    --mode <type>       Operation mode (questions|answers|all)
    --region <name>     Region name in pinyin (e.g., "chibi", "changzhou")

OPTIONAL ARGUMENTS:
    --count <number>            Total questions to generate (default: 1000)
    --workers <number>          Number of worker threads (default: 5)
    --max-q-per-worker <number> Maximum questions per worker (default: 50)
    --attempts <number>         Maximum retry attempts (default: 3)
    --batch <number>            Batch size for processing (default: 50)
    --delay <number>            Delay between batches in ms (default: 1000)
    --help                      Show this help message

EXAMPLES:
    # Generate 100 questions for Chibi region
    bun run app.ts --mode questions --region chibi --count 100
    
    # Generate answers for existing questions
    bun run app.ts --mode answers --region chibi --workers 3
    
    # Full workflow: questions + answers
    bun run app.ts --mode all --region chibi --count 500 --workers 10

ENVIRONMENT VARIABLES:
    AI_PROVIDER    AI provider to use (qianfan|groq|openai, default: qianfan)
    
For provider-specific setup, check the README or provider documentation.
`);
  }
}

/**
 * Application startup with error handling
 */
async function main(): Promise<void> {
  // Setup global error handlers
  process.on('uncaughtException', (error) => {
    ErrorHandler.handle(error, 'uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    ErrorHandler.handle(reason, 'unhandled rejection');
    process.exit(1);
  });

  // Graceful shutdown handlers
  process.on('SIGINT', () => {
    SecureLogger.info('👋 Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    SecureLogger.info('👋 Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  // Run the application
  const app = new QAGeneratorApp();
  await app.run();
}

// Start the application
if (import.meta.main) {
  main().catch((error) => {
    ErrorHandler.handle(error, 'application startup');
    process.exit(1);
  });
}

export { QAGeneratorApp };