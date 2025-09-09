import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export interface AuthConfig {
  readonly apiKey: string;
  readonly rateLimitPerMinute: number;
}

export class APIAuthenticator {
  private static readonly API_KEY = process.env.QA_GENERATOR_API_KEY;
  private static readonly RATE_LIMIT_PER_MINUTE = 30;
  private static readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  /**
   * Validates API key from request headers
   */
  static validateApiKey(request: NextRequest): boolean {
    if (!this.API_KEY) {
      // If no API key is configured, allow access (for development)
      return true;
    }

    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    let providedKey: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      providedKey = apiKeyHeader;
    }
    
    if (!providedKey) {
      return false;
    }
    
    // Use timing-safe comparison to prevent timing attacks
    return this.timingSafeEqual(providedKey, this.API_KEY);
  }

  /**
   * Implements rate limiting based on IP address
   */
  static checkRateLimit(request: NextRequest): boolean {
    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    const clientData = this.requestCounts.get(clientIP);
    
    if (!clientData || clientData.resetTime < windowStart) {
      // Reset or initialize counter
      this.requestCounts.set(clientIP, { count: 1, resetTime: now });
      return true;
    }
    
    if (clientData.count >= this.RATE_LIMIT_PER_MINUTE) {
      return false;
    }
    
    clientData.count++;
    return true;
  }

  /**
   * Middleware wrapper for API authentication with enhanced error handling
   */
  static withAuth(handler: (request: NextRequest) => Promise<NextResponse>) {
    return async (request: NextRequest): Promise<NextResponse> => {
      const authResult = this.performAuthentication(request);
      if (!authResult.success) {
        return authResult.response;
      }

      try {
        return await handler(request);
      } catch (error) {
        console.error('Handler error:', error);
        return NextResponse.json(
          { error: 'Request processing failed' }, 
          { status: 500 }
        );
      }
    };
  }

  /**
   * Perform authentication checks and return structured result
   */
  private static performAuthentication(request: NextRequest): 
    { success: true } | { success: false; response: NextResponse } {
    
    // Check API key
    if (!this.validateApiKey(request)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid API key' }, 
          { status: 401 }
        )
      };
    }

    // Check rate limiting
    if (!this.checkRateLimit(request)) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Rate limit exceeded' }, 
          { status: 429 }
        )
      };
    }

    return { success: true };
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private static timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }
    
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    
    return crypto.timingSafeEqual(bufferA, bufferB);
  }

  /**
   * Extract client IP address from request
   */
  private static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    // Fallback to default for development
    return '127.0.0.1';
  }

  /**
   * Clean up old rate limit entries (call periodically)
   */
  static cleanupRateLimitData(): void {
    const now = Date.now();
    const windowStart = now - 60000;
    
    for (const [ip, data] of this.requestCounts.entries()) {
      if (data.resetTime < windowStart) {
        this.requestCounts.delete(ip);
      }
    }
  }
}

// Clean up rate limit data every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    APIAuthenticator.cleanupRateLimitData();
  }, 5 * 60 * 1000);
}