import { readFileSync, writeFileSync } from 'node:fs';
import type { Region } from './config/config';
import { getRegionByPinyin, getRegionFileNames } from './config/config';
import { setupGroqEnvironment } from './providers/groq/client';
import { groqService } from './providers/groq/service';
import { setupQianFanEnvironment } from './providers/qianfan/client';
import { qianfanService } from './providers/qianfan/service';
import type { QAItem, Question } from './types/types';
import type { AnswerWorkerTask, QuestionWorkerTask } from './types/worker';
import { isTooSimilar } from './utils/similarity';
import { WorkerPool } from './workers/worker-pool';

// MARK: - Question Generation Pipeline
/**
 * Generates questions for a specific region
 * @param count - Number of questions to generate
 * @param region - Target region
 * @param maxAttempts - Maximum number of retry attempts
 * @param generateQuestionsFromPrompt - Function to generate questions from prompt
 * @returns Promise<Question[]> Generated questions
 */
async function generateQuestions(
  count: number, 
  region: Region, 
  maxAttempts: number = 3,
  generateQuestionsFromPrompt: (regionName: string, batchSize: number, maxAttempts: number) => Promise<string>
): Promise<Question[]> {
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
 * @param generateAnswer - Function to generate answer
 */
async function generateAnswers(
  region: Region, 
  maxAnswerAttempts: number = 3,
  generateAnswer: (question: string, maxAttempts: number) => Promise<QAItem>
): Promise<void> {
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
async function main_questions(
  questionCount: number, 
  region: Region, 
  generateQuestionsFromPrompt: (regionName: string, batchSize: number, maxAttempts: number) => Promise<string>
) {
  console.log(`Generating questions for ${region.name}...`);
  const questions = await generateQuestions(questionCount, region, 3, generateQuestionsFromPrompt);
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
async function main_answers(
  region: Region, 
  generateAnswer: (question: string, maxAttempts: number) => Promise<QAItem>
) {
  console.log(`Getting answers for ${region.name}...`);
  await generateAnswers(region, 3, generateAnswer);
}

/**
 * Main entry point for parallel question generation
 */
async function main_questions_parallel(
  questionCount: number,
  region: Region,
  workerCount: number = Math.max(1, navigator.hardwareConcurrency - 1)
) {
  console.log(`Generating questions for ${region.name} using ${workerCount} workers...`);
  
  const questionPool = new WorkerPool(workerCount, './workers/question-worker.ts');
  const batchSize = Math.ceil(questionCount / workerCount);
  const tasks: Promise<Question[]>[] = [];

  // Load existing questions first
  const { questionFile } = getRegionFileNames(region.pinyin);
  let existingQuestions: Question[] = [];
  try {
    existingQuestions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
    console.log(`Loaded ${existingQuestions.length} existing questions`);
  } catch (error) {
    console.log('No existing questions found, starting fresh');
  }

  // Calculate remaining questions needed
  const remainingCount = Math.max(0, questionCount - existingQuestions.length);
  if (remainingCount === 0) {
    console.log('Already have enough questions, no need to generate more');
    return existingQuestions;
  }

  // Distribute work among workers
  for (let i = 0; i < workerCount && remainingCount > 0; i++) {
    const workerBatchSize = Math.min(batchSize, remainingCount - i * batchSize);
    if (workerBatchSize <= 0) break;

    const task: QuestionWorkerTask = {
      regionName: region.name,
      batchSize: workerBatchSize,
      maxAttempts: 3,
      workerId: i + 1
    };
    tasks.push(questionPool.execute(task));
  }

  try {
    // Wait for all workers to complete
    const results = await Promise.all(tasks);
    
    // Combine and deduplicate results
    const newQuestions = results.flat();
    const allQuestions = [...existingQuestions];
    const existingSet = new Set(existingQuestions.map(q => q.question));
    
    // Add new unique questions
    for (const q of newQuestions) {
      if (!existingSet.has(q.question) && !isTooSimilar(q.question, Array.from(existingSet), region.name)) {
        allQuestions.push({ ...q, is_answered: false });
        existingSet.add(q.question);
      }
    }

    // Save combined results
    writeFileSync(questionFile, JSON.stringify(allQuestions, null, 2), 'utf-8');
    console.log(`Generated and saved ${allQuestions.length - existingQuestions.length} new questions`);
    console.log(`Total questions in file: ${allQuestions.length}`);
    
    return allQuestions;
  } finally {
    questionPool.terminate();
  }
}

/**
 * Main entry point for parallel answer generation
 */
async function main_answers_parallel(
  questions: Question[],
  workerCount: number = Math.max(1, navigator.hardwareConcurrency - 1),
  options: { maxAttempts: number; batchDelay: number; batchSize: number },
  regionPinyin: string
) {
  console.log(`Generating answers using ${workerCount} workers...`);
  console.log(`Options: maxAttempts=${options.maxAttempts}, batchSize=${options.batchSize}, delay=${options.batchDelay}ms`);
  
  // Create worker status display
  console.log('\nWorker Status:');
  for (let i = 0; i < workerCount; i++) {
    console.log(`Worker ${i + 1}: Initializing...`);
  }
  console.log('\n');  // Add extra line for separation
  
  const answerPool = new WorkerPool(workerCount, './workers/answer-worker.ts');
  const unansweredQuestions = questions.filter(q => !q.is_answered);
  const answers: QAItem[] = [];
  
  // Process questions in batches
  for (let i = 0; i < unansweredQuestions.length; i += options.batchSize) {
    const batchQuestions = unansweredQuestions.slice(i, i + options.batchSize);
    console.log(`\nProcessing batch ${Math.floor(i / options.batchSize) + 1}/${Math.ceil(unansweredQuestions.length / options.batchSize)}`);

    const batchPromises: Promise<QAItem>[] = batchQuestions.map((q, idx) => {
      const workerId = (idx % workerCount) + 1;
      const task: AnswerWorkerTask = {
        question: q.question,
        maxAttempts: options.maxAttempts,
        workerId
      };
      return answerPool.execute<QAItem>(task);
    });

    try {
      // Wait for current batch to complete
      const batchAnswers = await Promise.all(batchPromises);
      answers.push(...batchAnswers);
      
      // Update progress
      console.log(`Completed ${answers.length}/${unansweredQuestions.length} answers`);
      
      // Save answers to file after each batch
      const { qaFile } = getRegionFileNames(regionPinyin);
      writeFileSync(qaFile, JSON.stringify(answers, null, 2), 'utf-8');
      console.log(`Saved answers to ${qaFile}`);
      
      // Add delay between batches if not the last batch
      if (i + options.batchSize < unansweredQuestions.length) {
        console.log(`Waiting ${options.batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, options.batchDelay));
      }
    } catch (error) {
      console.error(`Error processing batch:`, error);
      // Continue with next batch even if current batch fails
    }
  }

  try {
    console.log(`\nGeneration complete!`);
    console.log(`Generated ${answers.length} answers out of ${unansweredQuestions.length} questions`);
    
    // Update question status
    questions.forEach(q => {
      q.is_answered = answers.some(a => a.question === q.question);
    });
    
    // Save updated questions
    const { questionFile } = getRegionFileNames(regionPinyin);
    writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
    console.log(`Updated question status in ${questionFile}`);
    
    return answers;
  } finally {
    answerPool.terminate();
  }
}

/**
 * Main application entry point
 */
async function main() {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || 'qianfan';
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  let options = {
    mode: '',
    region: '',
    count: 100,
    workerCount: Math.max(1, navigator.hardwareConcurrency - 1),
    maxAttempts: 3,
    batchSize: 50,
    delay: 1000, // delay between batches in ms
  };

  // Parse named arguments
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace('--', '');
    const value = args[i + 1];
    
    if (!value) {
      console.error(`Error: Missing value for argument ${key}`);
      process.exit(1);
    }

    switch (key) {
      case 'mode':
        if (!['questions', 'answers', 'all'].includes(value)) {
          console.error('Error: Invalid mode. Must be one of: questions, answers, all');
          process.exit(1);
        }
        options.mode = value;
        break;
      case 'region':
        options.region = value;
        break;
      case 'count':
        const count = parseInt(value);
        if (isNaN(count) || count <= 0) {
          console.error('Error: count must be a positive number');
          process.exit(1);
        }
        options.count = count;
        break;
      case 'workers':
        const workers = parseInt(value);
        if (isNaN(workers) || workers <= 0) {
          console.error('Error: workers must be a positive number');
          process.exit(1);
        }
        options.workerCount = workers;
        break;
      case 'attempts':
        const attempts = parseInt(value);
        if (isNaN(attempts) || attempts <= 0) {
          console.error('Error: attempts must be a positive number');
          process.exit(1);
        }
        options.maxAttempts = attempts;
        break;
      case 'batch':
        const batch = parseInt(value);
        if (isNaN(batch) || batch <= 0) {
          console.error('Error: batch must be a positive number');
          process.exit(1);
        }
        options.batchSize = batch;
        break;
      case 'delay':
        const delay = parseInt(value);
        if (isNaN(delay) || delay < 0) {
          console.error('Error: delay must be a non-negative number');
          process.exit(1);
        }
        options.delay = delay;
        break;
      default:
        console.error(`Error: Unknown argument ${key}`);
        process.exit(1);
    }
  }

  // Validate required arguments
  if (!options.mode || !options.region) {
    console.error('Error: Missing required arguments');
    console.error('Usage:');
    console.error('  bun run start --mode <type> --region <name> [options]');
    console.error('');
    console.error('Required:');
    console.error('  --mode <type>    Operation mode (questions|answers|all)');
    console.error('  --region <name>  Region name in pinyin');
    console.error('');
    console.error('Optional:');
    console.error('  --count <number>    Number of questions to generate (default: 100)');
    console.error('  --workers <number>  Number of worker threads (default: CPU cores - 1)');
    console.error('  --attempts <number> Maximum retry attempts (default: 3)');
    console.error('  --batch <number>    Batch size for processing (default: 50)');
    console.error('  --delay <number>    Delay between batches in ms (default: 1000)');
    process.exit(1);
  }

  const region = getRegionByPinyin(options.region);
  if (!region) {
    console.error(`Error: Region "${options.region}" not found`);
    process.exit(1);
  }

  console.log(`Using ${provider.toUpperCase()} as AI provider`);
  console.log('Options:', options);

  // Setup provider environment
  try {
    switch (provider) {
      case 'qianfan':
        setupQianFanEnvironment();
        break;
      case 'groq':
        setupGroqEnvironment();
        break;
      default:
        throw new Error(`Unsupported AI provider: ${provider}`);
    }
  } catch (error) {
    console.error(`Failed to setup ${provider} environment:`, error);
    process.exit(1);
  }

  // Select provider functions
  const { generateAnswer, generateQuestionsFromPrompt } = provider === 'groq' 
    ? { generateAnswer: groqService.generateAnswer.bind(groqService), generateQuestionsFromPrompt: groqService.generateQuestionsFromPrompt.bind(groqService) }
    : { generateAnswer: qianfanService.generateAnswer.bind(qianfanService), generateQuestionsFromPrompt: qianfanService.generateQuestionsFromPrompt.bind(qianfanService) };

  // Execute requested mode
  try {
    let questions: Question[] = [];
    
    if (options.mode === 'questions' || options.mode === 'all') {
      questions = await main_questions_parallel(options.count, region, options.workerCount);
      console.log(`Generated ${questions.length} questions`);
    } else if (options.mode === 'answers') {
      // Load existing questions from file
      const { questionFile } = getRegionFileNames(region.pinyin);
      try {
        questions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
        console.log(`Loaded ${questions.length} questions from file`);
      } catch (error) {
        console.error('Error loading questions file:', error);
        process.exit(1);
      }
    }
    
    if (options.mode === 'answers' || options.mode === 'all') {
      const answers = await main_answers_parallel(
        questions,
        options.workerCount,
        {
          maxAttempts: options.maxAttempts,
          batchDelay: options.delay,
          batchSize: options.batchSize
        },
        options.region
      );
      console.log(`Generated ${answers.length} answers`);
    }
  } catch (error) {
    console.error('Error executing requested mode:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);