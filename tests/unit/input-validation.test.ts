import { describe, it, expect, test } from 'bun:test';
import { InputValidator, ValidationError, ApiValidators } from '../../utils/input-validation';

describe('InputValidator', () => {
  describe('isValidAPIKey', () => {
    it('should accept valid API keys', () => {
      expect(InputValidator.isValidAPIKey('abc123def456ghi789')).toBe(true);
      expect(InputValidator.isValidAPIKey('sk-1234567890abcdef')).toBe(true);
      expect(InputValidator.isValidAPIKey('key_with_underscores_123')).toBe(true);
    });

    it('should reject invalid API keys', () => {
      expect(InputValidator.isValidAPIKey('')).toBe(false);
      expect(InputValidator.isValidAPIKey('short')).toBe(false);
      expect(InputValidator.isValidAPIKey('key with spaces')).toBe(false);
      expect(InputValidator.isValidAPIKey('key@with#special')).toBe(false);
      expect(InputValidator.isValidAPIKey(null as any)).toBe(false);
    });
  });

  describe('isValidAlphanumeric', () => {
    it('should accept valid alphanumeric strings', () => {
      expect(InputValidator.isValidAlphanumeric('qianfan')).toBe(true);
      expect(InputValidator.isValidAlphanumeric('groq123')).toBe(true);
      expect(InputValidator.isValidAlphanumeric('OpenAI')).toBe(true);
    });

    it('should reject invalid strings', () => {
      expect(InputValidator.isValidAlphanumeric('')).toBe(false);
      expect(InputValidator.isValidAlphanumeric('with spaces')).toBe(false);
      expect(InputValidator.isValidAlphanumeric('with-dashes')).toBe(false);
      expect(InputValidator.isValidAlphanumeric('a'.repeat(51))).toBe(false);
      expect(InputValidator.isValidAlphanumeric(null as any)).toBe(false);
    });
  });

  describe('validatePlatform', () => {
    it('should handle valid platforms', () => {
      expect(InputValidator.validatePlatform('win32')).toBe('win32');
      expect(InputValidator.validatePlatform('darwin')).toBe('unix');
      expect(InputValidator.validatePlatform('linux')).toBe('unix');
    });

    it('should reject invalid platforms', () => {
      expect(() => InputValidator.validatePlatform('invalid')).toThrow(ValidationError);
      expect(() => InputValidator.validatePlatform('')).toThrow(ValidationError);
    });
  });

  describe('validateRegionPinyin', () => {
    it('should accept valid region pinyin', () => {
      expect(InputValidator.validateRegionPinyin('chibi')).toBe('chibi');
      expect(InputValidator.validateRegionPinyin('CHANGZHOU')).toBe('changzhou');
      expect(InputValidator.validateRegionPinyin('  beijing  ')).toBe('beijing');
    });

    it('should reject invalid region pinyin', () => {
      expect(() => InputValidator.validateRegionPinyin('')).toThrow('cannot be empty');
      expect(() => InputValidator.validateRegionPinyin('with123')).toThrow('must contain only lowercase letters');
      expect(() => InputValidator.validateRegionPinyin('with-dash')).toThrow('must contain only lowercase letters');
      expect(() => InputValidator.validateRegionPinyin(123 as any)).toThrow('must be a string');
    });
  });

  describe('validateNumeric', () => {
    it('should accept valid numbers', () => {
      expect(InputValidator.validateNumeric(5, 'test')).toBe(5);
      expect(InputValidator.validateNumeric('10', 'test')).toBe(10);
      expect(InputValidator.validateNumeric(100, 'test', 1, 200)).toBe(100);
    });

    it('should reject invalid numbers', () => {
      expect(() => InputValidator.validateNumeric('abc', 'test')).toThrow('must be a valid number');
      expect(() => InputValidator.validateNumeric(0, 'test', 1, 10)).toThrow('must be at least 1');
      expect(() => InputValidator.validateNumeric(15, 'test', 1, 10)).toThrow('cannot exceed 10');
      expect(() => InputValidator.validateNumeric(5.5, 'test')).toThrow('must be an integer');
    });
  });
});

describe('ApiValidators', () => {
  describe('generateOptions', () => {
    const validOptions = {
      mode: 'questions',
      region: 'chibi',
      totalCount: 100,
      workerCount: 5,
      maxAttempts: 3,
      batchSize: 50,
      delay: 1000,
      maxQPerWorker: 20,
      provider: 'qianfan'
    };

    it('should accept valid options', () => {
      const result = ApiValidators.generateOptions(validOptions);
      expect(result.mode).toBe('questions');
      expect(result.region).toBe('chibi');
      expect(result.totalCount).toBe(100);
      expect(result.provider).toBe('qianfan');
    });

    it('should handle optional fields', () => {
      const minimalOptions = {
        mode: 'questions',
        region: 'chibi',
        totalCount: 100,
        workerCount: 5,
        maxAttempts: 3,
        batchSize: 50,
        delay: 1000
      };
      
      const result = ApiValidators.generateOptions(minimalOptions);
      expect(result.maxQPerWorker).toBeUndefined();
      expect(result.provider).toBeUndefined();
    });

    it('should reject invalid options', () => {
      expect(() => ApiValidators.generateOptions(null)).toThrow('must be an object');
      expect(() => ApiValidators.generateOptions({ ...validOptions, mode: 'invalid' }))
        .toThrow('must be one of: questions, answers, all');
      expect(() => ApiValidators.generateOptions({ ...validOptions, provider: 'invalid' }))
        .toThrow('must be one of: qianfan, groq, openai');
    });

    it('should validate numeric bounds', () => {
      expect(() => ApiValidators.generateOptions({ ...validOptions, totalCount: 0 }))
        .toThrow('must be at least 1');
      expect(() => ApiValidators.generateOptions({ ...validOptions, workerCount: 25 }))
        .toThrow('cannot exceed 20');
    });
  });

  describe('regionConfig', () => {
    const validConfig = {
      name: '赤壁市',
      pinyin: 'chibi',
      description: '湖北省咸宁市赤壁市'
    };

    it('should accept valid region config', () => {
      const result = ApiValidators.regionConfig(validConfig);
      expect(result.name).toBe('赤壁市');
      expect(result.pinyin).toBe('chibi');
      expect(result.description).toBe('湖北省咸宁市赤壁市');
    });

    it('should reject invalid config', () => {
      expect(() => ApiValidators.regionConfig(null)).toThrow('must be an object');
      expect(() => ApiValidators.regionConfig({ ...validConfig, name: '' }))
        .toThrow('cannot be empty');
      expect(() => ApiValidators.regionConfig({ ...validConfig, pinyin: 'with123' }))
        .toThrow('must contain only lowercase letters');
    });

    it('should handle empty description', () => {
      const result = ApiValidators.regionConfig({ ...validConfig, description: '' });
      expect(result.description).toBe('');
    });
  });
});