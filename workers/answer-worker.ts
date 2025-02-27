import { setupGroqEnvironment } from '../providers/groq/client';
import { groqService } from '../providers/groq/service';
import { setupOpenAIEnvironment } from '../providers/openai/client';
import { openaiService } from '../providers/openai/service';
import { setupQianFanEnvironment } from '../providers/qianfan/client';
import { qianfanService } from '../providers/qianfan/service';
import type { QAItem } from '../types/types';
import type { AnswerWorkerTask } from '../types/worker';
import Logger from '../utils/logger';

// Initialize the environment based on provider
const provider = process.env.AI_PROVIDER?.toLowerCase() || 'qianfan';

// Initialize service
let service: typeof qianfanService | typeof groqService | typeof openaiService;

if (provider === 'qianfan') {
  setupQianFanEnvironment();
  service = qianfanService;
} else if (provider === 'groq') {
  setupGroqEnvironment();
  service = groqService;
} else if (provider === 'openai') {
  setupOpenAIEnvironment();
  service = openaiService;
}

/**
 * Worker thread for generating answers
 */
self.onmessage = async (e: MessageEvent<AnswerWorkerTask>) => {
  const { question, maxAttempts, workerId } = e.data;
  Logger.setWorkerId(String(workerId));
  
  try {
    Logger.worker(`Generating answer for: ${question.slice(0, 50)}...`);
    const result = await service.generateAnswer(question, maxAttempts);
    
    try {
      // Validate result structure
      if (!result || typeof result !== 'object') {
        throw new Error('Invalid response format');
      }
      
      // Validate and format the answer
      if (!result.question || typeof result.question !== 'string' || result.question.trim().length === 0) {
        throw new Error('Invalid question in response');
      }
      
      if (!result.content || typeof result.content !== 'string' || result.content.trim().length === 0) {
        throw new Error('Empty or invalid answer content');
      }
      
      // Create formatted answer
      const validAnswer: QAItem = {
        question: result.question.trim(),
        content: result.content.trim(),
        reasoning_content: result.reasoning_content?.trim() || '未提供思考过程'
      };
      
      Logger.success('Generated valid answer');
      self.postMessage(validAnswer); 
    } catch (validationError) {
      Logger.error(`Validation error: ${validationError}`);
      Logger.debug('Raw result: ' + JSON.stringify(result, null, 2));
      throw validationError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    Logger.error(`Error: ${errorMessage}`);
    // Return null to indicate failure instead of sending the error message
    self.postMessage(null);
  }
}; 