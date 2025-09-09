import { describe, test, expect, beforeEach } from 'bun:test';
import { Environment, type EnvironmentConfig } from '../../config/environment';

describe('Environment Configuration', () => {
  let environment: Environment;

  beforeEach(() => {
    environment = Environment.getInstance();
    environment.reset();
  });

  describe('singleton pattern', () => {
    test('returns same instance', () => {
      const instance1 = Environment.getInstance();
      const instance2 = Environment.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('QianFan provider configuration', () => {
    test('loads valid QianFan configuration', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'qianfan',
        QIANFAN_ACCESS_KEY: 'test-access-key-123',
        QIANFAN_SECRET_KEY: 'test-secret-key-456'
      };

      const result = environment.load();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.aiProvider).toBe('qianfan');
        expect(result.data.qianfan).not.toBeNull();
        expect(result.data.qianfan?.accessKey).toBe('test-access-key-123');
        expect(result.data.qianfan?.secretKey).toBe('test-secret-key-456');
      }

      process.env = originalEnv;
    });

    test('fails with missing QianFan keys', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'qianfan'
        // Missing QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY
      };

      const result = environment.load();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('QianFan configuration incomplete');
      }

      process.env = originalEnv;
    });
  });

  describe('Groq provider configuration', () => {
    test('loads valid Groq configuration', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'groq',
        GROQ_API_KEY: 'gsk-test-api-key-123'
      };

      const result = environment.load();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.aiProvider).toBe('groq');
        expect(result.data.groq).not.toBeNull();
        expect(result.data.groq?.apiKey).toBe('gsk-test-api-key-123');
      }

      process.env = originalEnv;
    });

    test('fails with missing Groq API key', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'groq'
        // Missing GROQ_API_KEY
      };

      const result = environment.load();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('Groq configuration incomplete');
      }

      process.env = originalEnv;
    });
  });

  describe('OpenAI provider configuration', () => {
    test('loads valid OpenAI configuration', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'openai',
        OPENAI_API_KEY: 'sk-test-openai-key-123'
      };

      const result = environment.load();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.aiProvider).toBe('openai');
        expect(result.data.openai).not.toBeNull();
        expect(result.data.openai?.apiKey).toBe('sk-test-openai-key-123');
      }

      process.env = originalEnv;
    });

    test('fails with missing OpenAI API key', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'openai'
        // Missing OPENAI_API_KEY
      };

      const result = environment.load();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('OpenAI configuration incomplete');
      }

      process.env = originalEnv;
    });
  });

  describe('provider validation', () => {
    test('defaults to qianfan when AI_PROVIDER not set', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        QIANFAN_ACCESS_KEY: 'test-access-key',
        QIANFAN_SECRET_KEY: 'test-secret-key'
      };
      delete process.env.AI_PROVIDER;

      const result = environment.load();
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.aiProvider).toBe('qianfan');
      }

      process.env = originalEnv;
    });

    test('fails with invalid provider', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'invalid-provider'
      };

      const result = environment.load();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('Invalid AI_PROVIDER');
      }

      process.env = originalEnv;
    });

    test('rejects malicious provider names', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: '../../../malicious'
      };

      const result = environment.load();
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.message).toContain('Invalid AI_PROVIDER format');
      }

      process.env = originalEnv;
    });
  });

  describe('configuration helpers', () => {
    beforeEach(() => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'qianfan',
        QIANFAN_ACCESS_KEY: 'test-key',
        QIANFAN_SECRET_KEY: 'test-secret'
      };
      environment.load();
      process.env = originalEnv;
    });

    test('isConfigured returns true for valid configuration', () => {
      expect(environment.isConfigured('qianfan')).toBe(true);
    });

    test('isConfigured returns false for unconfigured provider', () => {
      expect(environment.isConfigured('groq')).toBe(false);
    });

    test('getProviderConfig returns correct configuration', () => {
      const config = environment.getProviderConfig('qianfan');
      expect(config).not.toBeNull();
      expect(config?.accessKey).toBe('test-key');
    });

    test('getProviderConfig returns null for unconfigured provider', () => {
      const config = environment.getProviderConfig('groq');
      expect(config).toBeNull();
    });

    test('getSetupInstructions returns helpful text', () => {
      const instructions = environment.getSetupInstructions('groq');
      expect(instructions).toContain('GROQ_API_KEY');
      expect(instructions).toContain('export');
    });
  });

  describe('caching behavior', () => {
    test('loads configuration only once', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'qianfan',
        QIANFAN_ACCESS_KEY: 'test-key',
        QIANFAN_SECRET_KEY: 'test-secret'
      };

      const result1 = environment.load();
      const result2 = environment.load();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      
      // Should return the same cached config
      if (result1.success && result2.success) {
        expect(result1.data).toBe(result2.data);
      }

      process.env = originalEnv;
    });

    test('reset clears cached configuration', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_PROVIDER: 'qianfan',
        QIANFAN_ACCESS_KEY: 'test-key',
        QIANFAN_SECRET_KEY: 'test-secret'
      };

      environment.load();
      expect(environment.getConfig()).not.toBeNull();
      
      environment.reset();
      expect(environment.getConfig()).toBeNull();

      process.env = originalEnv;
    });
  });
});