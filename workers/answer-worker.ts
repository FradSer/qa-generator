import { setupGroqEnvironment } from '../providers/groq/client';
import { groqService } from '../providers/groq/service';
import { setupQianFanEnvironment } from '../providers/qianfan/client';
import { qianfanService } from '../providers/qianfan/service';
import type { AnswerWorkerTask } from '../types/worker';

// Initialize the environment based on provider
const provider = process.env.AI_PROVIDER?.toLowerCase() || 'qianfan';

// Initialize service
let service: typeof qianfanService | typeof groqService;

if (provider === 'qianfan') {
  setupQianFanEnvironment();
  service = qianfanService;
} else if (provider === 'groq') {
  setupGroqEnvironment();
  service = groqService;
}

// Helper function to update worker status
function updateWorkerStatus(workerId: number, status: string) {
  // Move cursor up to worker status line and update it
  process.stdout.write(`\x1b[${workerId}A`);  // Move up workerId lines
  process.stdout.write(`\rWorker ${workerId}: ${status}`);
  process.stdout.write(`\x1b[${workerId}B`);  // Move back down
}

/**
 * Worker thread for generating answers
 */
self.onmessage = async (e: MessageEvent<AnswerWorkerTask>) => {
  const { question, maxAttempts, workerId } = e.data;
  
  try {
    updateWorkerStatus(workerId, `Processing: ${question.slice(0, 30)}...`);
    const result = await service.generateAnswer(question, maxAttempts);
    updateWorkerStatus(workerId, `Generated: ${result.content.slice(0, 50)}...`);
    self.postMessage({ ...result, workerId });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    updateWorkerStatus(workerId, `Error: ${errorMessage}`);
    if (error instanceof Error) {
      self.postMessage({ error: error.message, workerId });
    } else {
      self.postMessage({ error: 'An unknown error occurred', workerId });
    }
  }
}; 