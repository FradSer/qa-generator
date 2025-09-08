import type { AIProviderService } from '../types/provider';
import type { Result } from '../types/result';
import { Ok, Err } from '../types/result';
import { SecureLogger, ErrorHandler } from '../utils/secure-logger';

/**
 * Factory for creating AI provider instances
 */
export class ProviderFactory {
  private static instance: ProviderFactory;
  private cachedProvider: AIProviderService | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory();
    }
    return ProviderFactory.instance;
  }

  /**
   * Get the default provider based on environment
   */
  getDefaultProvider(): Result<AIProviderService, Error> {
    if (this.cachedProvider) {
      return Ok(this.cachedProvider);
    }

    const providerName = process.env.AI_PROVIDER?.toLowerCase() || 'qianfan';
    
    try {
      switch (providerName) {
        case 'qianfan':
          return this.createQianFanProvider();
        case 'groq':
          return this.createGroqProvider();
        case 'openai':
          return this.createOpenAIProvider();
        default:
          return Err(new Error(`Unsupported AI provider: ${providerName}`));
      }
    } catch (error) {
      return Err(ErrorHandler.handle(error, `provider factory (${providerName})`));
    }
  }

  /**
   * Create QianFan provider instance
   */
  private createQianFanProvider(): Result<AIProviderService, Error> {
    try {
      // Dynamic import to avoid loading unnecessary dependencies
      const { setupQianFanEnvironment } = require('../providers/qianfan/client');
      const { qianfanService } = require('../providers/qianfan/service');
      
      // Setup environment
      setupQianFanEnvironment();
      
      this.cachedProvider = qianfanService;
      SecureLogger.info('🤖 QianFan provider initialized');
      
      return Ok(qianfanService);
      
    } catch (error) {
      return Err(new Error(`Failed to initialize QianFan provider: ${error}`));
    }
  }

  /**
   * Create Groq provider instance
   */
  private createGroqProvider(): Result<AIProviderService, Error> {
    try {
      const { setupGroqEnvironment } = require('../providers/groq/client');
      const { groqService } = require('../providers/groq/service');
      
      setupGroqEnvironment();
      
      this.cachedProvider = groqService;
      SecureLogger.info('🤖 Groq provider initialized');
      
      return Ok(groqService);
      
    } catch (error) {
      return Err(new Error(`Failed to initialize Groq provider: ${error}`));
    }
  }

  /**
   * Create OpenAI provider instance
   */
  private createOpenAIProvider(): Result<AIProviderService, Error> {
    try {
      const { setupOpenAIEnvironment } = require('../providers/openai/client');
      const { openaiService } = require('../providers/openai/service');
      
      setupOpenAIEnvironment();
      
      this.cachedProvider = openaiService;
      SecureLogger.info('🤖 OpenAI provider initialized');
      
      return Ok(openaiService);
      
    } catch (error) {
      return Err(new Error(`Failed to initialize OpenAI provider: ${error}`));
    }
  }

  /**
   * Reset cached provider (useful for testing)
   */
  reset(): void {
    this.cachedProvider = null;
  }
}