import { spawn, type ChildProcess } from 'child_process';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const options = await request.json();
  
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        // Construct command arguments
        const args = [
          'run',
          'start',
          '--mode', options.mode,
          '--region', options.region,
          '--count', options.totalCount.toString(),
          '--workers', options.workerCount.toString(),
          '--max-q-per-worker', options.maxQPerWorker.toString(),
          '--attempts', options.maxAttempts.toString(),
          '--batch', options.batchSize.toString(),
          '--delay', options.delay.toString()
        ];

        // Log the command being executed
        const commandStr = `AI_PROVIDER=${options.provider} bun ${args.join(' ')}`;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: `Executing command: ${commandStr}` })}\n\n`));

        // Spawn the bun process with environment variables
        const childProcess: ChildProcess = spawn('bun', args, {
          env: {
            ...process.env,
            AI_PROVIDER: options.provider,
            // 传递所有 API keys
            GROQ_API_KEY: process.env.GROQ_API_KEY || '',
            QIANFAN_ACCESS_KEY: process.env.QIANFAN_ACCESS_KEY || '',
            QIANFAN_SECRET_KEY: process.env.QIANFAN_SECRET_KEY || '',
            OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
            OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || '',
            PATH: process.env.PATH || '' // 确保 PATH 环境变量也被传递
          }
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