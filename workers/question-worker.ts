import { setupGroqEnvironment } from '../providers/groq/client';
import { groqService } from '../providers/groq/service';
import { setupOpenAIEnvironment } from '../providers/openai/client';
import { openaiService } from '../providers/openai/service';
import { setupQianFanEnvironment } from '../providers/qianfan/client';
import { qianfanService } from '../providers/qianfan/service';
import type { Question } from '../types/types';
import type { QuestionWorkerTask } from '../types/worker';
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
 * Worker thread for generating questions
 */
self.onmessage = async (e: MessageEvent<QuestionWorkerTask>) => {
  const { regionName, batchSize, maxAttempts, workerId } = e.data;
  Logger.setWorkerId(String(workerId));
  
  try {
    Logger.worker(`Generating ${batchSize} questions for ${regionName}...`);
    const result = await service.generateQuestionsFromPrompt(regionName, batchSize, maxAttempts);
    
    try {
      // Parse and validate the result
      let questions: Question[];
      try {
        questions = JSON.parse(result) as Question[];
        
        if (!Array.isArray(questions)) {
          throw new Error('Parsed result is not an array');
        }
        
        if (questions.length === 0) {
          throw new Error('No questions generated');
        }
      } catch (parseError) {
        Logger.error('Failed to parse questions JSON');
        Logger.debug('Raw response: ' + result);
        throw parseError;
      }
      
      // Validate each question
      const validQuestions = questions.filter(q => {
        if (!q || typeof q !== 'object') {
          Logger.debug('Invalid question object: ' + JSON.stringify(q));
          return false;
        }
        
        if (!q.question || typeof q.question !== 'string' || q.question.trim().length === 0) {
          Logger.debug('Question missing or empty: ' + JSON.stringify(q));
          return false;
        }
        
        return true;
      });
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions found in response');
      }
      
      Logger.success(`Generated ${validQuestions.length} valid questions`);
      self.postMessage(validQuestions);
    } catch (validationError) {
      Logger.error(`Validation error: ${validationError}`);
      throw validationError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    Logger.error(`Error: ${errorMessage}`);
    // Return empty array to indicate failure instead of sending the error message
    self.postMessage([]);
  }
}; 