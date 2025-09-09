#!/usr/bin/env bun

import { type Region } from './config/config';
import { ProviderFactory } from './providers/provider-factory';
import { StorageService } from './services/storage-service';
import { QuestionGenerationService, type QuestionGenerationOptions } from './services/question-generation-service';
import { AnswerGenerationService, type AnswerGenerationOptions } from './services/answer-generation-service';
import { ProviderAdapter } from './services/provider-adapter';
import { ValidationError } from './utils/input-validation';
import { SecureLogger, ErrorHandler } from './utils/secure-logger';
import { CLIParser, CLIPrompts, CLIDisplay, type CLIConfig } from './utils/cli-utils';
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
      // Parse CLI arguments
      const cliConfig = await this.parseCLI();
      
      if (!cliConfig) {
        // Help, version, or list was shown - exit gracefully
        return;
      }
      
      SecureLogger.info('🚀 QA Generator starting up...');
      CLIDisplay.showConfig(cliConfig);
      
      // Convert CLI config to app config
      const config = this.convertToAppConfig(cliConfig);
      
      // Setup AI provider
      const provider = await this.setupProvider(cliConfig.provider);
      
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
   * Parse CLI arguments with modern interface
   */
  private async parseCLI(): Promise<CLIConfig | null> {
    try {
      const parser = new CLIParser();
      const args = parser.parse();
      
      // Handle special flags first
      if (args.help) {
        CLIDisplay.showHelp();
        return null;
      }
      
      if (args.version) {
        CLIDisplay.showVersion();
        return null;
      }
      
      if (args.list) {
        CLIDisplay.showRegions();
        return null;
      }
      
      // Interactive mode for missing arguments
      if (args.interactive || (!args.mode && !args.region)) {
        return await this.runInteractiveMode(args);
      }
      
      // Validate and convert arguments
      return CLIParser.validateAndConvert(args);
      
    } catch (error) {
      if (error instanceof ValidationError) {
        SecureLogger.error('❌ CLI Error:', error.message);
        console.log('\nUse --help for usage information or --interactive for guided setup.');
        process.exit(1);
      }
      throw error;
    }
  }

  /**
   * Interactive mode for missing arguments
   */
  private async runInteractiveMode(args: any): Promise<CLIConfig> {
    SecureLogger.info('🎯 Interactive Mode - Let\'s set up your QA generation!');
    
    // Prompt for missing arguments
    const mode = args.mode || await CLIPrompts.promptForMode();
    const region = args.region ? 
      CLIParser.validateAndConvert({...args, mode, region: args.region}).region :
      await CLIPrompts.promptForRegion();
    
    let count = 1000;
    if (mode === 'questions' || mode === 'all') {
      count = args.count ? parseInt(args.count) : await CLIPrompts.promptForCount();
    }
    
    // Build final config with prompts and defaults
    const finalArgs = {
      mode,
      region: region.pinyin,
      count: count.toString(),
      workers: args.workers || '5',
      'max-q-per-worker': args['max-q-per-worker'] || '50',
      attempts: args.attempts || '3',
      batch: args.batch || '50',
      delay: args.delay || '1000',
      provider: args.provider
    };
    
    return CLIParser.validateAndConvert(finalArgs);
  }

  /**
   * Convert CLI config to app config
   */
  private convertToAppConfig(cliConfig: CLIConfig): AppConfig {
    return {
      mode: cliConfig.mode,
      region: cliConfig.region,
      questionOptions: {
        count: cliConfig.count,
        maxAttempts: cliConfig.attempts,
        batchSize: cliConfig.batch,
        workerCount: cliConfig.workers,
        maxQPerWorker: cliConfig.maxQPerWorker,
        maxRetries: 5
      },
      answerOptions: {
        maxAttempts: cliConfig.attempts,
        batchSize: cliConfig.batch,
        delay: cliConfig.delay,
        workerCount: cliConfig.workers
      }
    };
  }

  /**
   * Setup AI provider with explicit provider name
   */
  private async setupProvider(providerName?: string): Promise<AIProviderService> {
    try {
      // Set environment variable if provider specified
      if (providerName) {
        process.env.AI_PROVIDER = providerName;
      }
      
      const providerFactory = ProviderFactory.getInstance();
      const result = providerFactory.getDefaultProvider();
      
      if (!isOk(result)) {
        throw new Error(`Provider setup failed: ${result.error.message}`);
      }
      
      const provider = result.data;
      SecureLogger.info('🤖 AI Provider ready:', {
        type: providerName || process.env.AI_PROVIDER || 'default'
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