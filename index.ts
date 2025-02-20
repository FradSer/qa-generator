import { readFileSync, writeFileSync } from 'node:fs';
import type { Region } from './config/config';
import { getRegionByPinyin, getRegionFileNames } from './config/config';
import { setupQianFanEnvironment } from './providers/qianfan/client';
import { generateAnswer, generateQuestionsFromPrompt } from './providers/qianfan/service';
import type { QAItem, Question } from './types/types';
import { isTooSimilar } from './utils/similarity';

// MARK: - Question Generation Pipeline
/**
 * Generates questions for a specific region
 * @param count - Number of questions to generate
 * @param region - Target region
 * @param maxAttempts - Maximum number of retry attempts
 * @returns Promise<Question[]> Generated questions
 */
async function generateQuestions(count: number, region: Region, maxAttempts: number = 3): Promise<Question[]> {
  const { questionFile } = getRegionFileNames(region.pinyin);
  let questions: Question[] = [];
  const existingQuestions = new Set<string>();
  
  try {
    const existingQuestionsData = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
    questions = existingQuestionsData;
    existingQuestionsData.forEach(q => existingQuestions.add(q.question));
    console.log(`Loaded ${questions.length} existing questions for similarity check`);
    
    const answeredCount = existingQuestionsData.filter(q => q.is_answered).length;
    console.log(`Current stats: ${answeredCount} answered, ${existingQuestionsData.length - answeredCount} unanswered`);
  } catch (error) {
    console.log('No existing questions found, starting fresh');
  }

  if (questions.length >= count) {
    console.log(`Already have ${questions.length} questions, no need to generate more.`);
    return questions;
  }

  let remainingCount = count - questions.length;
  let totalNewQuestions = 0;
  
  while (remainingCount > 0) {
    const batchSize = Math.min(50, remainingCount);
    console.log(`\nGenerating batch of ${batchSize} questions (${totalNewQuestions}/${count - questions.length} total)...`);
    
    let batchSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !batchSuccess; attempt++) {
      try {
        const result = await generateQuestionsFromPrompt(region.name, batchSize, maxAttempts);
        let parsedQuestions: Question[];
        
        try {
          parsedQuestions = JSON.parse(result) as Question[];
          
          if (!Array.isArray(parsedQuestions)) {
            console.error('Parsed result is not an array');
            continue;
          }
          
          if (parsedQuestions.length === 0) {
            console.error('No valid questions found in parsed result');
            continue;
          }
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          console.error('Received JSON string:', result);
          continue;
        }
        
        let newQuestionsAdded = 0;
        let skippedQuestions = 0;
        
        for (const q of parsedQuestions) {
          if (totalNewQuestions >= remainingCount) {
            break;
          }
          
          if (existingQuestions.has(q.question)) {
            console.log(`Skipping duplicate question: ${q.question}`);
            skippedQuestions++;
            continue;
          }
          
          if (isTooSimilar(q.question, Array.from(existingQuestions), region.name)) {
            console.log(`Skipping similar question: ${q.question}`);
            skippedQuestions++;
            continue;
          }

          questions.push({ ...q, is_answered: false });
          existingQuestions.add(q.question);
          newQuestionsAdded++;
          totalNewQuestions++;
          console.log(`New unique question added: ${q.question}`);
          
          writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
        }
        
        console.log(`\nBatch summary:`);
        console.log(`- New questions added: ${newQuestionsAdded}`);
        console.log(`- Questions skipped: ${skippedQuestions}`);
        console.log(`- Total new questions so far: ${totalNewQuestions}/${count - questions.length}`);
        
        if (newQuestionsAdded > 0) {
          batchSuccess = true;
          remainingCount = count - questions.length;
        } else {
          console.log('\nNo new questions added in this batch attempt, will try again...');
        }
        
      } catch (error) {
        console.error(`Error in batch attempt ${attempt}:`, error);
      }
      
      if (!batchSuccess && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    if (!batchSuccess) {
      console.log(`\nFailed to generate questions after ${maxAttempts} attempts, taking a longer break...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }

  console.log(`\nFinal results:`);
  console.log(`- Total questions in file: ${questions.length}`);
  console.log(`- New questions added: ${totalNewQuestions}`);
  
  return questions;
}

// MARK: - Answer Generation Pipeline
/**
 * Generates answers for unanswered questions
 * @param region - Target region
 * @param maxAnswerAttempts - Maximum number of retry attempts
 */
async function generateAnswers(region: Region, maxAnswerAttempts: number = 3): Promise<void> {
  const { questionFile, qaFile } = getRegionFileNames(region.pinyin);
  let qaItems: QAItem[] = [];
  
  try {
    const questions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
    console.log(`Loaded ${questions.length} questions from ${questionFile}`);
    
    try {
      qaItems = JSON.parse(readFileSync(qaFile, 'utf-8')) as QAItem[];
      console.log(`Loaded ${qaItems.length} existing answers from ${qaFile}`);
      
      const answeredQuestions = new Set(qaItems.map(item => item.question));
      questions.forEach(q => {
        q.is_answered = answeredQuestions.has(q.question);
      });
      
      writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
    } catch (error) {
      console.log('No existing answers found, starting from scratch');
    }
    
    const remainingQuestions = questions.filter(q => !q.is_answered);
    
    console.log(`Found ${remainingQuestions.length} questions without answers`);
    
    for (let i = 0; i < remainingQuestions.length; i++) {
      try {
        console.log(`\nGetting answer for question ${i + 1}/${remainingQuestions.length}:`);
        console.log(remainingQuestions[i].question);
        const qaItem = await generateAnswer(remainingQuestions[i].question, maxAnswerAttempts);
        console.log('Answer received:', qaItem.content.slice(0, 100) + '...');
        qaItems.push(qaItem);
        
        const questionIndex = questions.findIndex(q => q.question === remainingQuestions[i].question);
        if (questionIndex !== -1) {
          questions[questionIndex].is_answered = true;
          writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
        }
        
        writeFileSync(qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error getting answer for question:`, error);
      }
    }
    
    console.log(`\nCompleted answer generation:`);
    console.log(`- Total QA pairs: ${qaItems.length}`);
  } catch (error) {
    console.error('Error reading questions file:', error);
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
  setupQianFanEnvironment();
  
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