import { NextRequest, NextResponse } from 'next/server';
import { SecureLogger } from '../../../utils/secure-logger';
import fs from 'fs/promises';
import path from 'path';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    filesystem: ServiceHealth;
    memory: ServiceHealth;
    environment: ServiceHealth;
    workers: ServiceHealth;
  };
  metrics?: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
    activeHandles: number;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime?: number;
  lastCheck?: string;
}

class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime = Date.now();
  private cpuStartTime = process.cpuUsage();

  static getInstance(): HealthCheckService {
    if (!this.instance) {
      this.instance = new HealthCheckService();
    }
    return this.instance;
  }

  async performHealthCheck(includeMetrics = false): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const uptime = Date.now() - this.startTime;

    const services = await this.checkAllServices();
    const overallStatus = this.determineOverallStatus(services);

    const health: HealthStatus = {
      status: overallStatus,
      timestamp,
      version: process.env.npm_package_version || '0.0.5',
      uptime,
      services
    };

    if (includeMetrics) {
      health.metrics = this.getSystemMetrics();
    }

    // Log health check results for monitoring
    if (overallStatus !== 'healthy') {
      SecureLogger.warn('Health check degraded', { status: overallStatus, services });
    }

    return health;
  }

  private async checkAllServices(): Promise<HealthStatus['services']> {
    const [filesystem, memory, environment, workers] = await Promise.allSettled([
      this.checkFilesystem(),
      this.checkMemory(),
      this.checkEnvironment(),
      this.checkWorkers()
    ]);

    return {
      filesystem: filesystem.status === 'fulfilled' ? filesystem.value : { status: 'unhealthy', message: 'Check failed' },
      memory: memory.status === 'fulfilled' ? memory.value : { status: 'unhealthy', message: 'Check failed' },
      environment: environment.status === 'fulfilled' ? environment.value : { status: 'unhealthy', message: 'Check failed' },
      workers: workers.status === 'fulfilled' ? workers.value : { status: 'unhealthy', message: 'Check failed' }
    };
  }

  private async checkFilesystem(): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      // Check if data directory exists and is writable
      const dataDir = path.join(process.cwd(), 'data');
      
      try {
        await fs.access(dataDir, fs.constants.F_OK);
      } catch {
        await fs.mkdir(dataDir, { recursive: true });
      }

      // Test write capability
      const testFile = path.join(dataDir, '.health-check');
      await fs.writeFile(testFile, JSON.stringify({ timestamp: Date.now() }));
      await fs.unlink(testFile);

      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        message: 'Filesystem accessible and writable',
        responseTime,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Filesystem error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private async checkMemory(): Promise<ServiceHealth> {
    const memUsage = process.memoryUsage();
    const memoryMB = Math.round(memUsage.rss / 1024 / 1024);
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Define memory thresholds
    const MAX_MEMORY_MB = parseInt(process.env.MAX_MEMORY_MB || '2048');
    const WARNING_THRESHOLD = MAX_MEMORY_MB * 0.8;
    const CRITICAL_THRESHOLD = MAX_MEMORY_MB * 0.95;

    let status: ServiceHealth['status'] = 'healthy';
    let message = `Memory usage: ${memoryMB}MB (heap: ${heapUsedMB}MB)`;

    if (memoryMB > CRITICAL_THRESHOLD) {
      status = 'unhealthy';
      message = `Critical memory usage: ${memoryMB}MB (>${CRITICAL_THRESHOLD}MB)`;
    } else if (memoryMB > WARNING_THRESHOLD) {
      status = 'degraded';
      message = `High memory usage: ${memoryMB}MB (>${WARNING_THRESHOLD}MB)`;
    }

    return {
      status,
      message,
      lastCheck: new Date().toISOString()
    };
  }

  private async checkEnvironment(): Promise<ServiceHealth> {
    const requiredVars = ['NODE_ENV'];
    const optionalVars = ['QA_GENERATOR_API_KEY', 'AI_PROVIDER'];
    
    const missing = requiredVars.filter(key => !process.env[key]);
    const warnings = optionalVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing required environment variables: ${missing.join(', ')}`,
        lastCheck: new Date().toISOString()
      };
    }

    if (warnings.length > 0) {
      return {
        status: 'degraded',
        message: `Missing optional environment variables: ${warnings.join(', ')}`,
        lastCheck: new Date().toISOString()
      };
    }

    return {
      status: 'healthy',
      message: 'All environment variables configured',
      lastCheck: new Date().toISOString()
    };
  }

  private async checkWorkers(): Promise<ServiceHealth> {
    // Check if worker files exist
    const workerFiles = [
      'workers/question-worker.ts',
      'workers/answer-worker.ts',
      'workers/worker-pool.ts'
    ];

    try {
      for (const workerFile of workerFiles) {
        await fs.access(path.join(process.cwd(), workerFile));
      }

      return {
        status: 'healthy',
        message: 'Worker system ready',
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Worker system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date().toISOString()
      };
    }
  }

  private determineOverallStatus(services: HealthStatus['services']): HealthStatus['status'] {
    const statuses = Object.values(services).map(service => service.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }
    
    if (statuses.includes('degraded')) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private getSystemMetrics() {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage(this.cpuStartTime);
    
    return {
      memoryUsage,
      cpuUsage,
      activeHandles: (process as any)._getActiveHandles?.().length || 0
    };
  }
}

/**
 * Health check endpoint - no authentication required
 * Returns system health status for monitoring tools
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const includeMetrics = url.searchParams.get('metrics') === 'true';
  const format = url.searchParams.get('format') || 'json';

  try {
    const healthService = HealthCheckService.getInstance();
    const health = await healthService.performHealthCheck(includeMetrics);

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503;

    if (format === 'text') {
      // Simple text format for basic monitoring tools
      const textResponse = `${health.status.toUpperCase()}\n` +
        `Version: ${health.version}\n` +
        `Uptime: ${Math.round(health.uptime / 1000)}s\n` +
        `Services: ${Object.entries(health.services)
          .map(([name, service]) => `${name}=${service.status}`)
          .join(', ')}`;
      
      return new Response(textResponse, {
        status: statusCode,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': health.status
      }
    });

  } catch (error) {
    SecureLogger.error('Health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    };

    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * Deep health check endpoint - requires authentication
 * Returns detailed system metrics for administrative monitoring
 */
export async function POST(request: NextRequest) {
  // Simple API key check for deep health endpoint
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.QA_GENERATOR_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const healthService = HealthCheckService.getInstance();
    const health = await healthService.performHealthCheck(true);

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 207 : 503;

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': health.status
      }
    });

  } catch (error) {
    SecureLogger.error('Deep health check failed', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Deep health check failed'
    }, { status: 503 });
  }
}