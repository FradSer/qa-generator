import path from 'node:path';

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Secure input validation utilities to prevent injection attacks
 */
export class InputValidator {
  /**
   * Validate and sanitize region pinyin input
   */
  static validateRegionPinyin(input: string): string {
    if (typeof input !== 'string') {
      throw new ValidationError('Region pinyin must be a string');
    }
    
    const cleaned = input.toLowerCase().trim();
    
    if (cleaned.length === 0) {
      throw new ValidationError('Region pinyin cannot be empty');
    }
    
    if (cleaned.length > 50) {
      throw new ValidationError('Region pinyin too long');
    }
    
    if (!/^[a-z]+$/.test(cleaned)) {
      throw new ValidationError('Region pinyin must contain only lowercase letters');
    }
    
    return cleaned;
  }

  /**
   * Validate mode parameter
   */
  static validateMode(input: string): 'questions' | 'answers' | 'all' {
    if (typeof input !== 'string') {
      throw new ValidationError('Mode must be a string');
    }
    
    const validModes: Array<'questions' | 'answers' | 'all'> = ['questions', 'answers', 'all'];
    const cleaned = input.toLowerCase().trim() as 'questions' | 'answers' | 'all';
    
    if (!validModes.includes(cleaned)) {
      throw new ValidationError('Mode must be one of: questions, answers, all');
    }
    
    return cleaned;
  }

  /**
   * Validate numeric parameters with bounds
   */
  static validateNumeric(
    input: string | number, 
    fieldName: string,
    min: number = 1,
    max: number = 10000
  ): number {
    const value = typeof input === 'string' ? parseInt(input, 10) : input;
    
    if (isNaN(value)) {
      throw new ValidationError(`${fieldName} must be a valid number`);
    }
    
    if (!Number.isInteger(value)) {
      throw new ValidationError(`${fieldName} must be an integer`);
    }
    
    if (value < min) {
      throw new ValidationError(`${fieldName} must be at least ${min}`);
    }
    
    if (value > max) {
      throw new ValidationError(`${fieldName} cannot exceed ${max}`);
    }
    
    return value;
  }

  /**
   * Validate and sanitize text input for configuration
   */
  static validateText(
    input: string,
    fieldName: string,
    maxLength: number = 100
  ): string {
    if (typeof input !== 'string') {
      throw new ValidationError(`${fieldName} must be a string`);
    }
    
    const cleaned = input.trim();
    
    if (cleaned.length === 0) {
      throw new ValidationError(`${fieldName} cannot be empty`);
    }
    
    if (cleaned.length > maxLength) {
      throw new ValidationError(`${fieldName} cannot exceed ${maxLength} characters`);
    }
    
    if (!/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]+$/.test(cleaned)) {
      throw new ValidationError(`${fieldName} contains invalid characters`);
    }
    
    return cleaned;
  }

  /**
   * Safely construct file paths to prevent directory traversal
   */
  static validateFilePath(pinyin: string, baseDir: string = './data'): {
    questionFile: string;
    qaFile: string;
  } {
    // Validate pinyin input
    const safePinyin = this.validateRegionPinyin(pinyin);
    
    // Resolve base directory to prevent traversal
    const resolvedBaseDir = path.resolve(baseDir);
    
    // Construct safe file paths
    const questionFile = path.join(resolvedBaseDir, `${safePinyin}_q_results.json`);
    const qaFile = path.join(resolvedBaseDir, `${safePinyin}_qa_results.json`);
    
    // Verify files are within base directory
    if (!questionFile.startsWith(resolvedBaseDir) || !qaFile.startsWith(resolvedBaseDir)) {
      throw new Error('Invalid file path detected');
    }
    
    return { questionFile, qaFile };
  }

  /**
   * Escape strings for safe TypeScript code generation
   */
  static escapeTypeScriptString(input: string): string {
    return input
      .replace(/\\/g, '\\\\')  // Escape backslashes
      .replace(/"/g, '\\"')    // Escape double quotes
      .replace(/'/g, "\\'")    // Escape single quotes
      .replace(/\n/g, '\\n')   // Escape newlines
      .replace(/\r/g, '\\r')   // Escape carriage returns
      .replace(/\t/g, '\\t');  // Escape tabs
  }

  /**
   * Validate command-line arguments for safe execution
   */
  static validateCommandArgs(args: Record<string, unknown>): Record<string, string> {
    const validatedArgs: Record<string, string> = {};
    
    // Validate each argument based on its key
    for (const [key, value] of Object.entries(args)) {
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new Error(`Invalid argument type for ${key}`);
      }
      
      const stringValue = String(value);
      
      switch (key) {
        case 'mode':
          validatedArgs[key] = this.validateMode(stringValue);
          break;
        case 'region':
          validatedArgs[key] = this.validateRegionPinyin(stringValue);
          break;
        case 'count':
        case 'workers':
        case 'attempts':
        case 'batch':
          validatedArgs[key] = this.validateNumeric(stringValue, key).toString();
          break;
        case 'delay':
          validatedArgs[key] = this.validateNumeric(stringValue, key, 0, 60000).toString();
          break;
        case 'max-q-per-worker':
          validatedArgs[key] = this.validateNumeric(stringValue, key, 1, 1000).toString();
          break;
        default:
          // Only allow known argument keys
          throw new Error(`Unknown argument: ${key}`);
      }
    }
    
    return validatedArgs;
  }
}

/**
 * Validation schemas for API endpoints
 */
export const ApiValidators = {
  /**
   * Validate region configuration data
   */
  regionConfig(data: unknown): { name: string; pinyin: string; description: string } {
    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Region config must be an object');
    }
    
    const obj = data as Record<string, unknown>;
    
    const name = InputValidator.validateText(
      typeof obj.name === 'string' ? obj.name : '',
      'Region name',
      100
    );
    
    // More restrictive validation for region name
    if (!/^[a-zA-Z\u4e00-\u9fa5\s\-]+$/.test(name)) {
      throw new ValidationError('Invalid characters in region name');
    }
    
    const pinyin = InputValidator.validateRegionPinyin(
      typeof obj.pinyin === 'string' ? obj.pinyin : ''
    );
    
    const description = typeof obj.description === 'string' ? obj.description.trim() : '';
    if (description.length > 500) {
      throw new ValidationError('Description too long');
    }
    if (description.length > 0 && !/^[a-zA-Z0-9\u4e00-\u9fa5\s\-_.,!?]*$/.test(description)) {
      throw new ValidationError('Invalid characters in description');
    }
    
    return { name, pinyin, description };
  },

  /**
   * Validate generation options
   */
  generateOptions(data: unknown): {
    mode: 'questions' | 'answers' | 'all';
    region: string;
    totalCount: number;
    workerCount: number;
    maxAttempts: number;
    batchSize: number;
    delay: number;
  } {
    if (typeof data !== 'object' || data === null) {
      throw new ValidationError('Generate options must be an object');
    }
    
    const obj = data as Record<string, unknown>;
    
    return {
      mode: InputValidator.validateMode(typeof obj.mode === 'string' ? obj.mode : ''),
      region: InputValidator.validateRegionPinyin(typeof obj.region === 'string' ? obj.region : ''),
      totalCount: InputValidator.validateNumeric(obj.totalCount, 'totalCount', 1, 10000),
      workerCount: InputValidator.validateNumeric(obj.workerCount, 'workerCount', 1, 20),
      maxAttempts: InputValidator.validateNumeric(obj.maxAttempts, 'maxAttempts', 1, 10),
      batchSize: InputValidator.validateNumeric(obj.batchSize, 'batchSize', 1, 1000),
      delay: InputValidator.validateNumeric(obj.delay, 'delay', 0, 60000)
    };
  }
};

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private static requests = new Map<string, number[]>();
  
  static isAllowed(
    identifier: string, 
    windowMs: number = 60000, 
    maxRequests: number = 10
  ): boolean {
    const now = Date.now();
    const requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  static reset(identifier?: string): void {
    if (identifier) {
      this.requests.delete(identifier);
    } else {
      this.requests.clear();
    }
  }
}