import { spawn, type ChildProcess } from 'child_process';
import { ApiValidators } from '../../../utils/input-validation';
import { SecureLogger } from '../../../utils/secure-logger';

export async function POST(request: Request) {
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
        
        // Build secure environment with only necessary variables
        const secureEnv: Record<string, string> = {
          NODE_ENV: process.env.NODE_ENV || 'production',
          PATH: process.env.PATH || '',
          AI_PROVIDER: provider
        };

        // Add only relevant API keys based on provider
        if (provider === 'groq' && process.env.GROQ_API_KEY) {
          secureEnv.GROQ_API_KEY = process.env.GROQ_API_KEY;
        } else if (provider === 'qianfan') {
          if (process.env.QIANFAN_ACCESS_KEY) secureEnv.QIANFAN_ACCESS_KEY = process.env.QIANFAN_ACCESS_KEY;
          if (process.env.QIANFAN_SECRET_KEY) secureEnv.QIANFAN_SECRET_KEY = process.env.QIANFAN_SECRET_KEY;
        } else if (provider === 'openai') {
          if (process.env.OPENAI_API_KEY) secureEnv.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
          if (process.env.OPENAI_BASE_URL) secureEnv.OPENAI_BASE_URL = process.env.OPENAI_BASE_URL;
        }

        // Spawn the bun process with controlled environment
        const childProcess: ChildProcess = spawn('bun', args, {
          env: secureEnv,
          stdio: ['ignore', 'pipe', 'pipe'], // Secure stdio handling
          timeout: 300000, // 5 minute timeout
        });

        // Handle process events
        childProcess.stdout?.on('data', (data: Buffer) => {
          try {
            const message = data.toString();
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
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', code })}\n\n`));
            controller.close();
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        childProcess.on('error', (error: Error) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
            controller.close();
          } catch (err) {
            // Ignore enqueue errors if the stream is already closed
          }
        });
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
} 