import { spawn } from 'child_process';

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
        const commandStr = `bun ${args.join(' ')}`;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message: `Executing command: ${commandStr}` })}\n\n`));

        // Spawn the bun process
        const process = spawn('bun', args);

        // Handle process events
        process.stdout.on('data', (data) => {
          try {
            const message = data.toString();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'log', message })}\n\n`));
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        process.stderr.on('data', (data) => {
          try {
            const message = data.toString();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message })}\n\n`));
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        process.on('close', (code) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'end', code })}\n\n`));
            controller.close();
          } catch (error) {
            // Ignore enqueue errors if the stream is already closed
          }
        });

        process.on('error', (error: Error) => {
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