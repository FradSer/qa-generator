import { describe, test, expect } from 'bun:test';
import { SecureLogger } from '../../utils/secure-logger';

describe('SecureLogger', () => {
  describe('sanitize method', () => {
    test('sanitizes API keys in strings', () => {
      const input = 'API_KEY=sk-1234567890abcdef';
      const result = SecureLogger.sanitize(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    test('sanitizes JWT tokens', () => {
      const input = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature';
      const result = SecureLogger.sanitize(input);
      expect(result).toContain('[REDACTED]');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature');
    });

    test('sanitizes credit card numbers', () => {
      const input = 'Credit card: 4532-1234-5678-9012';
      const result = SecureLogger.sanitize(input);
      expect(result).toContain('XXXX-XXXX-XXXX-XXXX');
      expect(result).not.toContain('4532-1234-5678-9012');
    });

    test('sanitizes email addresses', () => {
      const input = 'Contact: user@example.com';
      const result = SecureLogger.sanitize(input);
      expect(result).toContain('***@example.com');
      expect(result).not.toContain('user@example.com');
    });

    test('handles null and undefined', () => {
      expect(SecureLogger.sanitize(null)).toBeNull();
      expect(SecureLogger.sanitize(undefined)).toBeUndefined();
    });

    test('truncates overly long strings', () => {
      const longString = 'a'.repeat(15000);
      const result = SecureLogger.sanitize(longString) as string;
      expect(result.length).toBeLessThan(longString.length);
      expect(result).toContain('[TRUNCATED]');
    });
  });

  describe('sanitize objects', () => {
    test('sanitizes sensitive keys in objects', () => {
      const input = {
        apiKey: 'secret-key-123',
        password: 'mypassword',
        normalField: 'should not be redacted'
      };
      const result = SecureLogger.sanitize(input) as Record<string, unknown>;
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.password).toBe('[REDACTED]');
      expect(result.normalField).toBe('should not be redacted');
    });

    test('sanitizes nested objects', () => {
      const input = {
        user: {
          email: 'user@example.com',
          token: 'secret-token-123'
        },
        config: {
          apiKey: 'sk-123456789'
        }
      };
      const result = SecureLogger.sanitize(input) as any;
      expect(result.user.email).toContain('***@example.com');
      expect(result.config.apiKey).toBe('[REDACTED]');
    });
  });

  describe('sanitizeProcessEnv', () => {
    test('redacts sensitive environment variables', () => {
      // Mock process.env temporarily
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        AI_API_KEY: 'secret-key-123',
        NORMAL_VAR: 'normal-value',
        TEST_SECRET: 'secret-value',
        PUBLIC_URL: 'https://example.com'
      };

      const result = SecureLogger.sanitizeProcessEnv();
      
      expect(result.AI_API_KEY).toBe('[REDACTED]');
      expect(result.TEST_SECRET).toBe('[REDACTED]');
      expect(result.NORMAL_VAR).toBe('normal-value');
      expect(result.PUBLIC_URL).toBe('https://example.com');

      // Restore original env
      process.env = originalEnv;
    });

    test('handles pattern-based environment variables', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CUSTOM_API_KEY: 'secret-123',
        MY_SECRET_TOKEN: 'token-456',
        DATABASE_PASSWORD: 'db-pass',
        NORMAL_CONFIG: 'normal-value'
      };

      const result = SecureLogger.sanitizeProcessEnv();
      
      expect(result.CUSTOM_API_KEY).toBe('[REDACTED]');
      expect(result.MY_SECRET_TOKEN).toBe('[REDACTED]');
      expect(result.DATABASE_PASSWORD).toBe('[REDACTED]');
      expect(result.NORMAL_CONFIG).toBe('normal-value');

      process.env = originalEnv;
    });
  });

  describe('sanitize arrays', () => {
    test('sanitizes arrays recursively', () => {
      const input = [
        'normal string',
        { apiKey: 'secret-123' },
        'Bearer eyJhbGciOiJIUzI1NiIs.test.sig'
      ];
      const result = SecureLogger.sanitize(input) as any[];
      
      expect(result[0]).toBe('normal string');
      expect(result[1].apiKey).toBe('[REDACTED]');
      expect(result[2]).toContain('[REDACTED]');
    });
  });
});