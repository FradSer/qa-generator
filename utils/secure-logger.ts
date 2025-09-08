import Logger from './logger';

/**
 * Sensitive data patterns to redact from logs
 */
const SENSITIVE_PATTERNS = [
  /api[_-]?key[s]?/i,
  /secret[s]?/i,
  /token[s]?/i,
  /password[s]?/i,
  /credential[s]?/i,
  /auth[_-]?token/i,
  /bearer[_-]?token/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session[_-]?id/i,
  /cookie[s]?/i
];

/**
 * Environment variables that should be redacted
 */
const SENSITIVE_ENV_VARS = [
  'AI_API_KEY',
  'QIANFAN_ACCESS_KEY', 
  'QIANFAN_SECRET_KEY',
  'GROQ_API_KEY',
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'JWT_SECRET',
  'SESSION_SECRET'
];

/**
 * Secure logging utility that prevents sensitive data exposure
 */
export class SecureLogger {
  private static readonly REDACTED_PLACEHOLDER = '[REDACTED]';
  private static readonly MAX_LOG_LENGTH = 10000; // Prevent log bombing

  /**
   * Sanitize data before logging to remove sensitive information
   */
  static sanitize(data: unknown): unknown {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string') {
      return this.sanitizeString(data);
    }

    if (typeof data === 'object') {
      return this.sanitizeObject(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    return data;
  }

  /**
   * Sanitize string content
   */
  private static sanitizeString(str: string): string {
    let sanitized = str;

    // Truncate overly long strings to prevent log bombing
    if (sanitized.length > this.MAX_LOG_LENGTH) {
      sanitized = sanitized.substring(0, this.MAX_LOG_LENGTH) + '...[TRUNCATED]';
    }

    // Redact potential API keys (patterns like: key=abc123, "key": "abc123")
    sanitized = sanitized.replace(
      /(["\s](?:api[_-]?key|secret|token|password)["\s]*[:=]\s*["\']?)[\w\-+/=]{8,}(["\']?)/gi,
      `$1${this.REDACTED_PLACEHOLDER}$2`
    );

    // Redact JWT tokens (patterns like: eyJhbGciOiJIUzI1NiIs...)
    sanitized = sanitized.replace(
      /eyJ[\w\-+/=]+\.[\w\-+/=]+\.[\w\-+/=]+/g,
      this.REDACTED_PLACEHOLDER
    );

    // Redact potential credit card numbers
    sanitized = sanitized.replace(
      /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
      'XXXX-XXXX-XXXX-XXXX'
    );

    // Redact email addresses in some contexts (keep domain for debugging)
    sanitized = sanitized.replace(
      /\b[\w\.-]+@([\w\.-]+)\b/g,
      `***@$1`
    );

    return sanitized;
  }

  /**
   * Sanitize object by recursively cleaning properties
   */
  private static sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Check if key matches sensitive patterns
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
      
      if (isSensitiveKey) {
        sanitized[key] = this.REDACTED_PLACEHOLDER;
      } else if (key === 'env' || key === 'environment') {
        // Special handling for environment objects
        sanitized[key] = this.sanitizeEnvironment(value as Record<string, unknown>);
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Sanitize environment variables
   */
  private static sanitizeEnvironment(env: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(env)) {
      if (SENSITIVE_ENV_VARS.includes(key) || SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
        sanitized[key] = this.REDACTED_PLACEHOLDER;
      } else {
        sanitized[key] = this.sanitize(value);
      }
    }

    return sanitized;
  }

  /**
   * Secure logging methods that wrap the original logger
   */
  static info(message: string, data?: unknown): void {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    Logger.info(message, sanitizedData);
  }

  static warn(message: string, data?: unknown): void {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    Logger.warn(message, sanitizedData);
  }

  static error(message: string, error?: unknown): void {
    const sanitizedError = error ? this.sanitize(error) : undefined;
    Logger.error(message, sanitizedError);
  }

  static debug(message: string, data?: unknown): void {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    Logger.debug(message, sanitizedData);
  }

  static process(message: string, data?: unknown): void {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    Logger.process(message, sanitizedData);
  }

  static success(message: string, data?: unknown): void {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    Logger.success(message, sanitizedData);
  }

  /**
   * Log security events with special handling
   */
  static security(event: string, details: {
    action: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }): void {
    const sanitizedDetails = {
      ...details,
      userId: details.userId ? `user_${details.userId.slice(-4)}` : undefined,
      ip: details.ip ? this.maskIP(details.ip) : undefined,
      userAgent: details.userAgent ? details.userAgent.substring(0, 50) : undefined,
      metadata: details.metadata ? this.sanitize(details.metadata) : undefined
    };

    Logger.info(`SECURITY_EVENT: ${event}`, sanitizedDetails);
  }

  /**
   * Mask IP address for privacy (keep first and last octet)
   */
  private static maskIP(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.*.*.${parts[3]}`;
    }
    return 'x.x.x.x';
  }

  /**
   * Log performance metrics safely
   */
  static performance(operation: string, metrics: {
    duration: number;
    memoryUsage?: number;
    itemsProcessed?: number;
    errors?: number;
    metadata?: Record<string, unknown>;
  }): void {
    const sanitizedMetrics = {
      ...metrics,
      metadata: metrics.metadata ? this.sanitize(metrics.metadata) : undefined
    };

    Logger.info(`PERFORMANCE: ${operation}`, sanitizedMetrics);
  }

  /**
   * Test the sanitization function (for development/testing)
   */
  static testSanitization(): void {
    const testData = {
      apiKey: 'sk-1234567890abcdef',
      password: 'mySecretPassword',
      user: {
        email: 'user@example.com',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.signature'
      },
      normal: 'this should not be redacted',
      creditCard: '4532-1234-5678-9012'
    };

    console.log('Original:', JSON.stringify(testData, null, 2));
    console.log('Sanitized:', JSON.stringify(this.sanitize(testData), null, 2));
  }
}

/**
 * Unified error handling with secure logging
 */
export class ErrorHandler {
  /**
   * Handle and log errors securely
   */
  static handle(error: unknown, context?: string): Error {
    const normalizedError = this.normalizeError(error);
    
    SecureLogger.error(
      context ? `Error in ${context}` : 'Unhandled error',
      {
        message: normalizedError.message,
        name: normalizedError.name,
        stack: process.env.NODE_ENV === 'development' ? normalizedError.stack : undefined
      }
    );

    return normalizedError;
  }

  /**
   * Handle validation errors specifically
   */
  static handleValidation(error: unknown, field?: string): Error {
    const normalizedError = this.normalizeError(error);
    
    SecureLogger.warn(
      field ? `Validation error for ${field}` : 'Validation error',
      {
        message: normalizedError.message,
        name: normalizedError.name
      }
    );

    return normalizedError;
  }

  /**
   * Create error response for APIs
   */
  static createErrorResponse(error: unknown, includeStack: boolean = false): {
    error: string;
    message: string;
    stack?: string;
  } {
    const normalizedError = this.normalizeError(error);
    
    return {
      error: normalizedError.name,
      message: normalizedError.message,
      ...(includeStack && process.env.NODE_ENV === 'development' && {
        stack: normalizedError.stack
      })
    };
  }

  /**
   * Normalize various error types to Error instances
   */
  private static normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      return error;
    }

    if (typeof error === 'string') {
      return new Error(error);
    }

    if (typeof error === 'object' && error !== null) {
      const obj = error as Record<string, unknown>;
      const message = typeof obj.message === 'string' ? obj.message : 'Unknown error';
      return new Error(message);
    }

    return new Error('Unknown error occurred');
  }
}

// Export default instance for backward compatibility
export default SecureLogger;