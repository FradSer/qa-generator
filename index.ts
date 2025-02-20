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
        
        // Log the QA file path
        console.log('Writing to QA file:', qaFile);

        // Log the QA items to be written
        console.log('QA Items to write:', qaItems);

        try {
          writeFileSync(qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
          console.log('Successfully wrote to QA file.');
        } catch (error) {
          console.error('Error writing to QA file:', error);
        }
        
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
  maxAttempts: number = 3,
  generateQuestionsFromPrompt: (regionName: string, batchSize: number, maxAttempts: number) => Promise<string>
) {
  console.log(`Generating questions for ${region.name}...`);
  const questions = await generateQuestions(questionCount, region, maxAttempts, generateQuestionsFromPrompt);
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
  maxAnswerAttempts: number = 3,
  generateAnswer: (question: string, maxAttempts: number) => Promise<QAItem>
) {
  console.log(`Getting answers for ${region.name}...`);
  await generateAnswers(region, maxAnswerAttempts, generateAnswer);
}

/**
 * Main entry point for parallel question generation
 */
async function main_questions_parallel(
  totalQuestionCount: number,  // Total questions needed
  region: Region,
  workerCount: number,
  maxPerWorker: number = 50,  // Maximum questions per worker
  maxRetries: number = 5      // Maximum number of retries for reaching target count
) {
  console.log(`Target to generate ${totalQuestionCount} questions using ${workerCount} workers (max ${maxPerWorker} per worker)...`);
  
  const questionPool = new WorkerPool(workerCount, './workers/question-worker.ts');
  let retryCount = 0;
  let allQuestions: Question[] = [];

  try {
    // Load existing questions first
    const { questionFile } = getRegionFileNames(region.pinyin);
    try {
      allQuestions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
      console.log(`Loaded ${allQuestions.length} existing questions`);
    } catch (error) {
      console.log('No existing questions found, starting fresh');
    }

    // Keep generating until we reach the target or max retries
    while (allQuestions.length < totalQuestionCount && retryCount < maxRetries) {
      if (retryCount > 0) {
        console.log(`\nRetry #${retryCount}: Current questions count (${allQuestions.length}) is below target (${totalQuestionCount})`);
      }

      // Calculate remaining questions needed
      const remainingCount = totalQuestionCount - allQuestions.length;
      
      // Calculate optimal number of workers needed based on remaining count and max per worker
      const optimalWorkerCount = Math.ceil(remainingCount / maxPerWorker);
      const actualWorkerCount = Math.min(workerCount, optimalWorkerCount);
      
      // Calculate questions per worker for this batch
      const basePerWorker = Math.min(maxPerWorker, Math.ceil(remainingCount / actualWorkerCount));
      console.log(`\nBatch ${retryCount + 1}: Will use ${actualWorkerCount} workers to generate ${remainingCount} questions (approximately ${basePerWorker} per worker)`);
      
      // Distribute work among workers
      let remainingToDistribute = remainingCount;
      const tasks: Promise<Question[]>[] = [];
      
      for (let i = 0; i < actualWorkerCount && remainingToDistribute > 0; i++) {
        const workerBatchSize = Math.min(basePerWorker, remainingToDistribute);
        if (workerBatchSize <= 0) break;

        const task: QuestionWorkerTask = {
          regionName: region.name,
          batchSize: workerBatchSize,
          maxAttempts: 3,
          workerId: i + 1
        };
        tasks.push(questionPool.execute(task));
        remainingToDistribute -= workerBatchSize;
      }

      // Wait for all workers in this batch to complete
      const results = await Promise.all(tasks);
      
      // Process new questions
      const newQuestions = results.flat();
      const existingSet = new Set(allQuestions.map(q => q.question));
      let newAddedCount = 0;
      
      // Add new unique questions
      for (const q of newQuestions) {
        // Skip invalid questions
        if (!q || typeof q.question !== 'string' || !q.question.trim()) {
          console.log('Skipping invalid question:', q);
          continue;
        }

        if (!existingSet.has(q.question) && !isTooSimilar(q.question, Array.from(existingSet), region.name)) {
          allQuestions.push({ ...q, is_answered: false });
          existingSet.add(q.question);
          newAddedCount++;
        }
      }

      // Save progress after each batch
      writeFileSync(questionFile, JSON.stringify(allQuestions, null, 2), 'utf-8');
      
      console.log(`\nBatch ${retryCount + 1} Summary:`);
      console.log(`- New unique questions added: ${newAddedCount}`);
      console.log(`- Current total: ${allQuestions.length}/${totalQuestionCount}`);
      console.log(`- Progress: ${((allQuestions.length / totalQuestionCount) * 100).toFixed(2)}%`);

      // If no new questions were added in this batch, increment retry counter
      if (newAddedCount === 0) {
        retryCount++;
        console.log(`\nNo new questions added in this batch. Retry ${retryCount}/${maxRetries}`);
        
        // Add a delay before next retry to avoid rate limiting
        if (retryCount < maxRetries) {
          const delayTime = 5000 * retryCount; // Increasing delay with each retry
          console.log(`Waiting ${delayTime/1000} seconds before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delayTime));
        }
      }
    }

    // Final status
    if (allQuestions.length >= totalQuestionCount) {
      console.log(`\n✅ Successfully generated target number of questions: ${allQuestions.length}/${totalQuestionCount}`);
    } else {
      console.log(`\n⚠️ Could not reach target count after ${maxRetries} retries:`);
      console.log(`- Final question count: ${allQuestions.length}/${totalQuestionCount}`);
      console.log(`- Achievement rate: ${((allQuestions.length / totalQuestionCount) * 100).toFixed(2)}%`);
    }
    
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
  workerCount: number,
  options: { maxAttempts: number; batchDelay: number; batchSize: number },
  regionPinyin: string
) {
  console.log(`Generating answers using ${workerCount} workers...`);
  console.log(`Options: maxAttempts=${options.maxAttempts}, batchSize=${options.batchSize}, delay=${options.batchDelay}ms`);
  
  const answerPool = new WorkerPool(workerCount, './workers/answer-worker.ts');
  const { qaFile, questionFile } = getRegionFileNames(regionPinyin);
  
  console.log('Initialized worker pool and got file paths:');
  console.log('- QA File:', qaFile);
  console.log('- Question File:', questionFile);
  
  // Load existing answers first
  let existingAnswers: QAItem[] = [];
  try {
    existingAnswers = JSON.parse(readFileSync(qaFile, 'utf-8')) as QAItem[];
    console.log(`Loaded ${existingAnswers.length} existing answers`);
  } catch (error) {
    console.log('No existing answers found, starting fresh');
  }

  // Create a set of answered questions for quick lookup
  const answeredQuestions = new Set(existingAnswers.map(item => item.question));
  
  // Update questions status based on existing answers
  questions.forEach(q => {
    q.is_answered = answeredQuestions.has(q.question);
  });
  
  console.log('Writing updated question status to file...');
  try {
    writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
    console.log('Successfully updated question file');
  } catch (error) {
    console.error('Error updating question file:', error);
  }

  // Get unanswered questions
  const unansweredQuestions = questions.filter(q => !q.is_answered);
  console.log(`Found ${unansweredQuestions.length} questions without answers`);

  if (unansweredQuestions.length === 0) {
    console.log('No unanswered questions found, nothing to do');
    return existingAnswers;
  }

  // 计算批次
  const tenPercentWorkers = Math.floor(workerCount * 0.1);
  let totalBatches = Math.ceil(unansweredQuestions.length / workerCount);
  const lastBatchSize = unansweredQuestions.length % workerCount;
  
  // 如果最后一批的大小小于等于10%的worker数，减少一个批次
  if (lastBatchSize > 0 && lastBatchSize <= tenPercentWorkers) {
    totalBatches--;
    console.log(`Last batch size (${lastBatchSize}) is <= 10% of workers, merging with previous batch`);
  }
  
  console.log(`Will process in ${totalBatches} batches using ${workerCount} workers`);

  // 按批次处理
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const isLastBatch = batchIndex === totalBatches - 1;
    const start = batchIndex * workerCount;
    let end;
    
    if (isLastBatch && lastBatchSize <= tenPercentWorkers) {
      // 如果是最后一批且剩余数量小于等于10%，处理所有剩余问题
      end = unansweredQuestions.length;
    } else {
      end = Math.min(start + workerCount, unansweredQuestions.length);
    }
    
    const batchQuestions = unansweredQuestions.slice(start, end);
    
    console.log(`\nProcessing batch ${batchIndex + 1}/${totalBatches}`);
    console.log(`Batch size: ${batchQuestions.length} questions`);

    const tasks: Promise<QAItem>[] = [];

    // 分配任务给workers
    for (let i = 0; i < batchQuestions.length; i++) {
      const workerId = i + 1;
      const question = batchQuestions[i];
      
      console.log(`Assigning question to worker ${workerId}: ${question.question.slice(0, 50)}...`);
      
      const task: AnswerWorkerTask = {
        question: question.question,
        maxAttempts: options.maxAttempts,
        workerId
      };
      tasks.push(answerPool.execute(task));
    }

    try {
      console.log(`Waiting for batch ${batchIndex + 1} results...`);
      const batchResults = await Promise.all(tasks.splice(0, tasks.length));
      console.log(`Received ${batchResults.length} results from workers`);
      
      // Process valid results
      const validResults = batchResults.filter((result): result is QAItem => 
        result !== null && !('error' in result)
      );
      
      console.log(`Valid results: ${validResults.length}/${batchResults.length}`);
      
      if (validResults.length > 0) {
        // Add new answers
        for (const result of validResults) {
          if (!answeredQuestions.has(result.question)) {
            console.log(`Adding new answer for question: ${result.question.slice(0, 50)}...`);
            existingAnswers.push(result);
            answeredQuestions.add(result.question);
            
            // Update question status
            const questionIndex = questions.findIndex(q => q.question === result.question);
            if (questionIndex !== -1) {
              questions[questionIndex].is_answered = true;
            }
          }
        }
        
        // Save results after each successful batch
        console.log('Writing results to files...');
        try {
          writeFileSync(qaFile, JSON.stringify(existingAnswers, null, 2), 'utf-8');
          writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
          console.log('Successfully saved batch results');
        } catch (error) {
          console.error('Error saving batch results:', error);
        }
        
        console.log(`Progress: ${existingAnswers.length}/${questions.length} total answers`);
      }

      // Add delay between batches if not the last batch
      if (batchIndex < totalBatches - 1) {
        console.log(`Waiting ${options.batchDelay}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, options.batchDelay));
      }
    } catch (error) {
      console.error(`Error processing batch:`, error);
      // Save current progress even if batch fails
      try {
        console.log('Saving current progress after error...');
        writeFileSync(qaFile, JSON.stringify(existingAnswers, null, 2), 'utf-8');
        writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
        console.log('Successfully saved current progress');
      } catch (saveError) {
        console.error('Error saving current progress:', saveError);
      }
    }
  }

  try {
    console.log(`\nGeneration complete!`);
    console.log(`Total answers in file: ${existingAnswers.length}`);
    console.log(`Questions answered: ${questions.filter(q => q.is_answered).length}/${questions.length}`);
    
    return existingAnswers;
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
    totalCount: 1000,    // Changed from perWorkerCount to totalCount
    workerCount: 5,
    maxQPerWorker: 50,    // Renamed from maxPerWorker
    maxAttempts: 3,
    batchSize: 50,
    delay: 1000,
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
        options.totalCount = count;
        break;
      case 'workers':
        const workers = parseInt(value);
        if (isNaN(workers) || workers <= 0) {
          console.error('Error: workers must be a positive number');
          process.exit(1);
        }
        options.workerCount = workers;
        break;
      case 'max-q-per-worker':  // Renamed from max-per-worker
        const maxQPerWorker = parseInt(value);
        if (isNaN(maxQPerWorker) || maxQPerWorker <= 0) {
          console.error('Error: max-q-per-worker must be a positive number');
          process.exit(1);
        }
        options.maxQPerWorker = maxQPerWorker;
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
    console.error('  --count <number>            Total questions to generate (default: 1000)');
    console.error('  --workers <number>          Number of worker threads (default: 5)');
    console.error('  --max-q-per-worker <number> Maximum questions per worker (default: 50)');
    console.error('  --attempts <number>         Maximum retry attempts (default: 3)');
    console.error('  --batch <number>            Batch size for processing (default: 50)');
    console.error('  --delay <number>            Delay between batches in ms (default: 1000)');
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
    let answers: QAItem[] = [];
    
    // Handle question generation
    if (options.mode === 'questions' || options.mode === 'all') {
      console.log('\n=== Question Generation Phase ===');
      questions = await main_questions_parallel(
        options.totalCount,
        region,
        options.workerCount,
        options.maxQPerWorker  // Updated parameter name
      );
      
      const totalGenerated = questions.length;
      const targetCount = options.totalCount;
      console.log(`\nQuestion Generation Summary:`);
      console.log(`- Target count: ${targetCount}`);
      console.log(`- Total generated: ${totalGenerated}`);
      console.log(`- Generation rate: ${((totalGenerated / targetCount) * 100).toFixed(2)}%`);
    }
    
    // Handle answer generation
    if (options.mode === 'answers' || options.mode === 'all') {
      console.log('\n=== Answer Generation Phase ===');
      
      // If we're in 'answers' mode or if we need to load questions
      if (options.mode === 'answers' || questions.length === 0) {
        const { questionFile } = getRegionFileNames(region.pinyin);
        try {
          questions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
          console.log(`Loaded ${questions.length} questions from file`);
        } catch (error) {
          console.error('Error loading questions file:', error);
          process.exit(1);
        }
      }

      // Calculate answer statistics before generation
      const totalQuestions = questions.length;
      const answeredBefore = questions.filter(q => q.is_answered).length;
      const unansweredBefore = totalQuestions - answeredBefore;
      
      console.log(`\nPre-generation Status:`);
      console.log(`- Total questions: ${totalQuestions}`);
      console.log(`- Already answered: ${answeredBefore}`);
      console.log(`- Pending answers: ${unansweredBefore}`);

      if (unansweredBefore > 0) {
        answers = await main_answers_parallel(
          questions,
          options.workerCount,
          {
            maxAttempts: options.maxAttempts,
            batchDelay: options.delay,
            batchSize: options.batchSize
          },
          options.region
        );

        // Calculate final statistics
        const answeredAfter = answers.length;
        const newlyAnswered = answeredAfter - answeredBefore;
        
        console.log(`\nAnswer Generation Summary:`);
        console.log(`- Previously answered: ${answeredBefore}`);
        console.log(`- Newly answered: ${newlyAnswered}`);
        console.log(`- Total answered: ${answeredAfter}`);
        console.log(`- Answer completion rate: ${((answeredAfter / totalQuestions) * 100).toFixed(2)}%`);
      } else {
        console.log('\nAll questions are already answered, no need for answer generation.');
      }
    }

    // Final summary for 'all' mode
    if (options.mode === 'all') {
      const { questionFile, qaFile } = getRegionFileNames(region.pinyin);
      console.log('\n=== Final Status ===');
      try {
        const finalQuestions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
        const finalAnswers = JSON.parse(readFileSync(qaFile, 'utf-8')) as QAItem[];
        
        console.log(`Questions:`);
        console.log(`- Total in file: ${finalQuestions.length}`);
        console.log(`- Target count: ${options.totalCount}`);
        console.log(`- Completion rate: ${((finalQuestions.length / options.totalCount) * 100).toFixed(2)}%`);
        
        console.log(`\nAnswers:`);
        console.log(`- Total answers: ${finalAnswers.length}`);
        console.log(`- Answer rate: ${((finalAnswers.length / finalQuestions.length) * 100).toFixed(2)}%`);
      } catch (error) {
        console.error('Error reading final status:', error);
      }
    }
    
  } catch (error) {
    console.error('Error executing requested mode:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);