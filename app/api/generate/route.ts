import { spawn, type ChildProcess } from 'child_process';
import { NextRequest } from 'next/server';
import { ApiValidators } from '../../../utils/input-validation';
import { SecureLogger } from '../../../utils/secure-logger';
import { APIAuthenticator } from '../../../utils/auth';

export const POST = APIAuthenticator.withAuth(async (request: NextRequest) => {
  const encoder = new TextEncoder();
  let options;
  
  try {
    const rawOptions = await request.json();
    // Validate and sanitize all input options
    options = ApiValidators.generateOptions(rawOptions);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Invalid request format';
    return new Response(
      JSON.stringify({ type: 'error', message: `Validation error: ${errorMessage}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Construct validated command arguments
        const args = [
          'run',
          'start',
          '--mode', options.mode,
          '--region', options.region,
          '--count', options.totalCount.toString(),
          '--workers', options.workerCount.toString(),
          '--max-q-per-worker', options.maxQPerWorker?.toString() || '50',
          '--attempts', options.maxAttempts.toString(),
          '--batch', options.batchSize.toString(),
          '--delay', options.delay.toString()
        ];

        // Log sanitized command (without sensitive information)
        const sanitizedCommand = `bun run start --mode ${options.mode} --region ${options.region} --count ${options.totalCount}`;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: `Starting generation: ${sanitizedCommand}` })}\n\n`));

        // Validate provider parameter
        const validProviders = ['qianfan', 'groq', 'openai'];
        const provider = validProviders.includes(options.provider || '') ? options.provider : 'qianfan';
        
        // Build secure environment with provider-specific configuration
        const secureEnv = buildSecureEnvironment(provider);

        // Additional argument validation to prevent injection
        const safeArgs = args.filter(arg => {
          // Only allow known safe patterns
          return /^[a-zA-Z0-9\-_\.]+$/.test(arg) && !arg.includes('..');
        });
        
        // Verify we have the expected number of arguments
        if (safeArgs.length !== args.length) {
          throw new Error('Invalid characters detected in arguments');
        }

        // Spawn the bun process with enhanced security and resource limits
        const childProcess: ChildProcess = spawn('bun', safeArgs, {
          env: secureEnv,
          stdio: ['ignore', 'pipe', 'pipe'],
          timeout: 300000, // 5 minute timeout
          windowsHide: true, // Hide window on Windows
          // Resource limits (Unix-like systems)
          ...(process.platform !== 'win32' && {
            uid: process.getuid?.(), // Run as current user
            gid: process.getgid?.(),
          }),
        });

        // Process monitoring and cleanup
        let isProcessCleanedUp = false;
        const cleanupProcess = () => {
          if (!isProcessCleanedUp && childProcess && !childProcess.killed) {
            isProcessCleanedUp = true;
            try {
              childProcess.kill('SIGTERM');
              setTimeout(() => {
                if (!childProcess.killed) {
                  childProcess.kill('SIGKILL');
                }
              }, 5000);
            } catch (error) {
              SecureLogger.warn('Process cleanup warning', { error: error instanceof Error ? error.message : 'Unknown error' });
            }
          }
        };

        // Set up automatic cleanup after timeout
        const timeoutHandle = setTimeout(() => {
          SecureLogger.warn('Process timeout reached, cleaning up');
          cleanupProcess();
        }, 300000);

        // Handle process events with enhanced monitoring
        childProcess.stdout?.on('data', (data: Buffer) => {
          try {
            const message = data.toString();
            // Log large output warnings
            if (message.length > 10000) {
              SecureLogger.warn('Large process output detected', { size: message.length });
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message })}\n\n`));
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        childProcess.stderr?.on('data', (data: Buffer) => {
          try {
            const message = data.toString();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        childProcess.on('close', (code: number | null) => {
          try {
            clearTimeout(timeoutHandle);
            isProcessCleanedUp = true;
            SecureLogger.info('Process completed', { code, pid: childProcess.pid });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', code })}\n\n`));
            controller.close();
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        childProcess.on('error', (error: Error) => {
          try {
            clearTimeout(timeoutHandle);
            cleanupProcess();
            SecureLogger.error('Process error', { error: error.message, pid: childProcess.pid });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
            controller.close();
          } catch (err) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        // Handle stream cancellation by client
        return () => {
          clearTimeout(timeoutHandle);
          cleanupProcess();
        };
      } catch (error) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Failed to start generation process' })}\n\n`));
          controller.close();
        } catch (err) {
          // Ignore enqueue errors if the stream is already closed
        }
      }
    },
    cancel(controller) {
      // Handle stream cancellation
      try {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: 'Stream cancelled by client' })}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', code: -1 })}\n\n`));
      } catch (error) {
        // Ignore enqueue errors if the stream is already closed
      }
    }
  });

  return new Response(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}); 
/**
 * Build secure environment configuration for child process
 */
function buildSecureEnvironment(provider: string): Record<string, string> {
  const baseEnv = {
    NODE_ENV: process.env.NODE_ENV || 'production',
    PATH: process.env.PATH || '',
    AI_PROVIDER: provider
  };

  // Provider-specific environment variables mapping
  const providerEnvMap: Record<string, string[]> = {
    groq: ['GROQ_API_KEY'],
    qianfan: ['QIANFAN_ACCESS_KEY', 'QIANFAN_SECRET_KEY'],
    openai: ['OPENAI_API_KEY', 'OPENAI_BASE_URL']
  };

  const envKeys = providerEnvMap[provider] || [];
  
  for (const key of envKeys) {
    if (process.env[key]) {
      baseEnv[key] = process.env[key]!;
    }
  }

  return baseEnv;
}
