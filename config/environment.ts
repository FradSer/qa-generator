import type { Result } from '../types/result';
import { Ok, Err } from '../types/result';
import { SecureLogger } from '../utils/secure-logger';
import { InputValidator } from '../utils/input-validation';

/**
 * Environment configuration interface
 */
export interface EnvironmentConfig {
  readonly aiProvider: string;
  readonly qianfan: {
    readonly accessKey: string;
    readonly secretKey: string;
  } | null;
  readonly groq: {
    readonly apiKey: string;
  } | null;
  readonly openai: {
    readonly apiKey: string;
  } | null;
}

/**
 * Environment configuration manager
 */
export class Environment {
  private static instance: Environment;
  private config: EnvironmentConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): Environment {
    if (!Environment.instance) {
      Environment.instance = new Environment();
    }
    return Environment.instance;
  }

  /**
   * Load and validate environment configuration with security validation
   */
  load(): Result<EnvironmentConfig, Error> {
    if (this.config) {
      return Ok(this.config);
    }

    try {
      const aiProvider = process.env.AI_PROVIDER?.toLowerCase() || 'qianfan';
      
      // Security validation for provider name
      if (!InputValidator.isValidAlphanumeric(aiProvider)) {
        SecureLogger.security('Invalid AI provider attempt', {
          action: 'environment_load',
          success: false,
          error: 'Invalid provider format',
          metadata: { attempted_provider: aiProvider }
        });
        return Err(new Error(`Invalid AI_PROVIDER format: ${aiProvider}`));
      }
      
      // Validate AI provider
      const validProviders = ['qianfan', 'groq', 'openai'];
      if (!validProviders.includes(aiProvider)) {
        return Err(new Error(`Invalid AI_PROVIDER: ${aiProvider}. Must be one of: ${validProviders.join(', ')}`));
      }

      // Load provider-specific configuration
      let qianfanConfig = null;
      let groqConfig = null;
      let openaiConfig = null;

      // QianFan configuration with security validation
      if (aiProvider === 'qianfan') {
        const accessKey = process.env.QIANFAN_ACCESS_KEY;
        const secretKey = process.env.QIANFAN_SECRET_KEY;

        if (!accessKey || !secretKey) {
          return Err(new Error('QianFan configuration incomplete. QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY are required.'));
        }

        // Validate API key formats (basic security check)
        if (!InputValidator.isValidAPIKey(accessKey) || !InputValidator.isValidAPIKey(secretKey)) {
          SecureLogger.security('Invalid QianFan API key format', {
            action: 'qianfan_config_validation',
            success: false,
            error: 'Invalid API key format'
          });
          return Err(new Error('QianFan API keys have invalid format'));
        }

        qianfanConfig = { accessKey, secretKey };
      }

      // Groq configuration with security validation
      if (aiProvider === 'groq') {
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) {
          return Err(new Error('Groq configuration incomplete. GROQ_API_KEY is required.'));
        }

        if (!InputValidator.isValidAPIKey(apiKey)) {
          SecureLogger.security('Invalid Groq API key format', {
            action: 'groq_config_validation',
            success: false,
            error: 'Invalid API key format'
          });
          return Err(new Error('Groq API key has invalid format'));
        }

        groqConfig = { apiKey };
      }

      // OpenAI configuration with security validation
      if (aiProvider === 'openai') {
        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
          return Err(new Error('OpenAI configuration incomplete. OPENAI_API_KEY is required.'));
        }

        if (!InputValidator.isValidAPIKey(apiKey)) {
          SecureLogger.security('Invalid OpenAI API key format', {
            action: 'openai_config_validation',
            success: false,
            error: 'Invalid API key format'
          });
          return Err(new Error('OpenAI API key has invalid format'));
        }

        openaiConfig = { apiKey };
      }

      this.config = {
        aiProvider,
        qianfan: qianfanConfig,
        groq: groqConfig,
        openai: openaiConfig
      };

      // Log successful configuration (without sensitive data)
      SecureLogger.security('Environment configuration loaded', {
        action: 'environment_config_loaded',
        success: true,
        metadata: { 
          provider: aiProvider,
          qianfan_configured: qianfanConfig !== null,
          groq_configured: groqConfig !== null,
          openai_configured: openaiConfig !== null
        }
      });

      return Ok(this.config);
    } catch (error) {
      return Err(new Error(`Environment configuration error: ${error}`));
    }
  }

  /**
   * Get current configuration (must call load() first)
   */
  getConfig(): EnvironmentConfig | null {
    return this.config;
  }

  /**
   * Check if environment is properly configured for given provider
   */
  isConfigured(provider?: string): boolean {
    const config = this.config;
    if (!config) return false;

    const targetProvider = provider || config.aiProvider;

    switch (targetProvider) {
      case 'qianfan':
        return config.qianfan !== null;
      case 'groq':
        return config.groq !== null;
      case 'openai':
        return config.openai !== null;
      default:
        return false;
    }
  }

  /**
   * Get provider-specific configuration
   */
  getProviderConfig(provider: string): any | null {
    if (!this.config) return null;

    switch (provider) {
      case 'qianfan':
        return this.config.qianfan;
      case 'groq':
        return this.config.groq;
      case 'openai':
        return this.config.openai;
      default:
        return null;
    }
  }

  /**
   * Reset configuration (for testing)
   */
  reset(): void {
    this.config = null;
  }

  /**
   * Get helpful error message for missing configuration
   */
  getSetupInstructions(provider: string): string {
    const instructions: Record<string, string> = {
      qianfan: `
QianFan Provider Setup:
1. Set QIANFAN_ACCESS_KEY environment variable
2. Set QIANFAN_SECRET_KEY environment variable
3. Optionally set AI_PROVIDER=qianfan (default)

Example:
export QIANFAN_ACCESS_KEY=your_access_key
export QIANFAN_SECRET_KEY=your_secret_key
      `,
      groq: `
Groq Provider Setup:
1. Set GROQ_API_KEY environment variable
2. Set AI_PROVIDER=groq

Example:
export GROQ_API_KEY=your_api_key
export AI_PROVIDER=groq
      `,
      openai: `
OpenAI Provider Setup:
1. Set OPENAI_API_KEY environment variable
2. Set AI_PROVIDER=openai

Example:
export OPENAI_API_KEY=your_api_key
export AI_PROVIDER=openai
      `
    };

    return instructions[provider] || `Unknown provider: ${provider}`;
  }
}