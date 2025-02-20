import { setupGroqEnvironment } from '../providers/groq/client';
import { groqService } from '../providers/groq/service';
import { setupQianFanEnvironment } from '../providers/qianfan/client';
import { qianfanService } from '../providers/qianfan/service';
import type { QuestionWorkerTask } from '../types/worker';

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

/**
 * Worker thread for generating questions
 */
self.onmessage = async (e: MessageEvent<QuestionWorkerTask>) => {
  const { regionName, batchSize, maxAttempts } = e.data;
  
  try {
    const result = await service.generateQuestionsFromPrompt(regionName, batchSize, maxAttempts);
    self.postMessage(result);
  } catch (error: unknown) {
    if (error instanceof Error) {
      self.postMessage({ error: error.message });
    } else {
      self.postMessage({ error: 'An unknown error occurred' });
    }
  }
}; 