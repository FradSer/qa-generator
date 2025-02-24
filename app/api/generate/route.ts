import { spawn } from 'child_process';

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    async start(controller) {
      try {
        const options = await request.json();
        
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
        const commandStr = `bun ${args.join(' ')}`;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: `Executing command: ${commandStr}` })}\n\n`));

        // Spawn the bun process
        const process = spawn('bun', args);

        // Handle process events
        process.stdout.on('data', (data) => {
          const message = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message })}\n\n`));
        });

        process.stderr.on('data', (data) => {
          const message = data.toString();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
        });

        process.on('close', (code) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', code })}\n\n`));
          controller.close();
        });

        process.on('error', (error: Error) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`));
          controller.close();
        });

      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error occurred';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
        controller.close();
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