import { ChatCompletion, setEnvVariable } from '@baiducloud/qianfan';
import { config } from 'dotenv';
import type { Region } from '../config/config';
import { getRegionByPinyin } from '../config/config';
import type { QAItem, Question } from '../types/types';
import { isTooSimilar } from '../utils/similarity';
import { StorageManager } from '../utils/storage';
import { extractContent, extractThinkingContent, processStreamData } from '../utils/stream';
import { generateQuestionPrompt, processQuestionResponse } from './prompt';

// Load environment variables from .env file
config();

// MARK: - Environment Configuration
/**
 * Validates and sets up required environment variables for the application
 * @throws {Error} If required environment variables are missing
 */
function setupEnvironment() {
  if (!process.env.QIANFAN_ACCESS_KEY || !process.env.QIANFAN_SECRET_KEY) {
    throw new Error('QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY must be set in .env file');
  }

  setEnvVariable('QIANFAN_ACCESS_KEY', process.env.QIANFAN_ACCESS_KEY);
  setEnvVariable('QIANFAN_SECRET_KEY', process.env.QIANFAN_SECRET_KEY);
}

// MARK: - Core Client
const client = new ChatCompletion({
  ENABLE_OAUTH: true,
  QIANFAN_ACCESS_KEY: process.env.QIANFAN_ACCESS_KEY,
  QIANFAN_SECRET_KEY: process.env.QIANFAN_SECRET_KEY,
  version: 'v2',
});

// MARK: - Answer Generation Engine
/**
 * Generates answer for a given question with retry mechanism
 * @param question - Question to generate answer for
 * @param maxAttempts - Maximum number of retry attempts
 * @returns Promise<QAItem> Generated QA pair
 */
async function generateAnswer(question: string, maxAttempts: number = 3): Promise<QAItem> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`\n[API Call] Answer attempt ${attempt}/${maxAttempts}`);
      console.time('[API] Response time');
      
      const response = await client.chat({
        messages: [{ role: "user", content: question }],
        stream: true,
      }, "deepseek-r1");

      console.timeEnd('[API] Response time');
      
      if (!response) {
        throw new Error('Null response received from API');
      }
      
      const { content: rawContent, reasoning_content: rawReasoningContent } = await processStreamData(response);
      
      if (!rawContent && !rawReasoningContent) {
        throw new Error('Empty response received from API');
      }
      
      const content = extractContent(rawContent);
      const reasoningContent = rawReasoningContent || extractThinkingContent(rawContent);
      
      if (!content) {
        throw new Error('Failed to extract content from response');
      }
      
      return {
        question,
        content: content,
        reasoning_content: reasoningContent || '未提供思考过程'
      };
    } catch (error) {
      console.error(`[API Error] Attempt ${attempt}:`, error);
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const waitTime = attempt * 2000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  return {
    question,
    content: '在多次尝试后未能获取答案',
    reasoning_content: lastError ? `错误信息: ${lastError.message}` : '未提供思考过程'
  };
}

// MARK: - Question Generation Pipeline
/**
 * Generates questions for a specific region
 * @param count - Number of questions to generate
 * @param region - Target region
 * @param maxAttempts - Maximum number of retry attempts
 * @returns Promise<Question[]> Generated questions
 */
async function generateQuestions(count: number, region: Region, maxAttempts: number = 3): Promise<Question[]> {
  const storage = new StorageManager(region);
  let questions = storage.loadQuestions();
  const existingQuestions = new Set<string>();
  
  questions.forEach(q => existingQuestions.add(q.question));
  
  if (questions.length >= count) {
    return questions;
  }

  let remainingCount = count - questions.length;
  let totalNewQuestions = 0;
  
  while (remainingCount > 0) {
    const batchSize = Math.min(50, remainingCount);
    const prompt = generateQuestionPrompt(region.name, batchSize);
    
    let batchSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !batchSuccess; attempt++) {
      try {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const response = await client.chat({
          messages: [{ role: "user", content: prompt }],
          stream: true,
        }, "deepseek-r1");
        
        const result = await processStreamData(response);
        let parsedQuestions = processQuestionResponse(result.content);
        
        let newQuestionsAdded = 0;
        for (const q of JSON.parse(parsedQuestions)) {
          if (totalNewQuestions >= remainingCount) break;
          
          if (existingQuestions.has(q.question) || 
              isTooSimilar(q.question, Array.from(existingQuestions), region.name)) {
            continue;
          }

          questions.push({ question: q.question, is_answered: false });
          existingQuestions.add(q.question);
          newQuestionsAdded++;
          totalNewQuestions++;
          
          storage.saveQuestions(questions);
        }
        
        if (newQuestionsAdded > 0) {
          batchSuccess = true;
          remainingCount = count - questions.length;
          const cooldownTime = Math.max(5000, Math.min(newQuestionsAdded * 1000, 15000));
          await new Promise(resolve => setTimeout(resolve, cooldownTime));
        }
      } catch (error) {
        console.error(`[Error] Batch attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (!batchSuccess) {
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  
  return questions;
}

// MARK: - Answer Generation Pipeline
/**
 * Generates answers for unanswered questions
 * @param region - Target region
 * @param maxAnswerAttempts - Maximum number of retry attempts
 */
async function generateAnswers(region: Region, maxAnswerAttempts: number = 3): Promise<void> {
  const storage = new StorageManager(region);
  let questions = storage.loadQuestions();
  let qaItems = storage.loadQAPairs();
  
  // Update question status
  const answeredQuestions = new Set(qaItems.map(item => item.question));
  questions.forEach(q => {
    q.is_answered = answeredQuestions.has(q.question);
  });
  storage.saveQuestions(questions);
  
  const remainingQuestions = questions.filter(q => !q.is_answered);
  
  for (let i = 0; i < remainingQuestions.length; i++) {
    try {
      const qaItem = await generateAnswer(remainingQuestions[i].question, maxAnswerAttempts);
      qaItems.push(qaItem);
      
      // Update question status
      const questionIndex = questions.findIndex(q => q.question === remainingQuestions[i].question);
      if (questionIndex !== -1) {
        questions[questionIndex].is_answered = true;
        storage.saveQuestions(questions);
      }
      
      storage.saveQAPairs(qaItems);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`[Error] Failed to process question:`, error);
      if (qaItems.length > 0) {
        storage.saveQAPairs(qaItems);
      }
    }
  }
}

// MARK: - Main Entry Points
/**
 * Main entry point for question generation
 */
async function main_questions(questionCount: number, region: Region) {
  console.log(`Generating questions for ${region.name}...`);
  const questions = await generateQuestions(questionCount, region);
  const uniqueQuestions = questions.filter(q => !q.is_answered).length;
  const answeredQuestions = questions.filter(q => q.is_answered).length;
  
  console.log(`\nFinal results:`);
  console.log(`- Total questions: ${questions.length}`);
  console.log(`- Unique questions: ${uniqueQuestions}`);
  console.log(`- Answered questions: ${answeredQuestions}`);
}

/**
 * Main entry point for answer generation
 */
async function main_answers(region: Region) {
  console.log(`Getting answers for ${region.name}...`);
  await generateAnswers(region);
}

/**
 * Main application entry point
 */
async function main() {
  setupEnvironment();
  
  const mode = process.argv[2];
  const regionPinyin = process.argv[3];
  
  if (!mode || !['questions', 'answers', 'all'].includes(mode) || !regionPinyin) {
    console.error('Error: Please specify a valid mode and region');
    console.error('Usage:');
    console.error('  For generating questions: bun run start -- questions <region_pinyin> [questionCount]');
    console.error('  For generating answers: bun run start -- answers <region_pinyin> [maxAttempts]');
    console.error('  For both questions and answers: bun run start -- all <region_pinyin> [questionCount]');
    process.exit(1);
  }

  const region = getRegionByPinyin(regionPinyin);
  if (!region) {
    console.error(`Error: Region "${regionPinyin}" not found`);
    process.exit(1);
  }

  if (mode === 'all') {
    const questionCount = parseInt(process.argv[4] || '10', 10);
    await main_questions(questionCount, region);
    await main_answers(region);
    return;
  }

  if (mode === 'questions') {
    const questionCount = parseInt(process.argv[4] || '10', 10);
    await main_questions(questionCount, region);
  }
  
  if (mode === 'answers') {
    await main_answers(region);
  }
}

// Run the main function
main().catch(console.error);
