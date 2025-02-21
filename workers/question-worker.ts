import { setupGroqEnvironment } from '../providers/groq/client';
import { groqService } from '../providers/groq/service';
import { setupQianFanEnvironment } from '../providers/qianfan/client';
import { qianfanService } from '../providers/qianfan/service';
import type { Question } from '../types/types';
import type { QuestionWorkerTask } from '../types/worker';
import Logger from '../utils/logger';

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
  const { regionName, batchSize, maxAttempts, workerId } = e.data;
  Logger.setWorkerId(String(workerId));
  
  try {
    Logger.worker(`Generating ${batchSize} questions for ${regionName}...`);
    const result = await service.generateQuestionsFromPrompt(regionName, batchSize, maxAttempts);
    
    try {
      const parsedQuestions = JSON.parse(result) as Question[];
      
      if (!Array.isArray(parsedQuestions)) {
        throw new Error('Parsed result is not an array');
      }
      
      if (parsedQuestions.length === 0) {
        throw new Error('No valid questions found in parsed result');
      }
      
      // Validate and format each question
      const validQuestions = parsedQuestions
        .filter(q => q && typeof q.question === 'string' && q.question.trim().length > 0)
        .map(q => ({
          question: q.question.trim(),
          is_answered: false
        }));
      
      if (validQuestions.length === 0) {
        throw new Error('No valid questions after filtering');
      }
      
      Logger.success(`Generated ${validQuestions.length} valid questions`);
      self.postMessage(validQuestions);
    } catch (parseError) {
      Logger.error(`Failed to parse questions: ${parseError}`);
      Logger.debug('Raw result: ' + result);
      throw parseError;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    Logger.error(`Error: ${errorMessage}`);
    self.postMessage({ error: errorMessage });
  }
}; 