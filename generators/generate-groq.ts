import { config } from 'dotenv';
import { Groq } from 'groq-sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Region } from '../config/config';
import { getRegionByPinyin, getRegionFileNames } from '../config/config';

// Load environment variables from .env file
config();

// Define interfaces for our data structures
interface Question {
  question: string;
  is_answered: boolean;   // 标记是否已回答
}

interface QAItem {
  question: string;
  reasoning_content: string;
  content: string;
}

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

if (!process.env.GROQ_API_KEY) {
  console.error('Error: GROQ_API_KEY environment variable is required');
  process.exit(1);
}

// Function to collect stream data into a single string
async function collectStreamData(stream: AsyncIterable<any>): Promise<string> {
  let result = '';
  for await (const chunk of stream) {
    result += chunk.choices[0]?.delta?.content || '';
  }
  return result;
}

// Function to extract thinking content
function extractThinkingContent(text: string): string {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  let content = thinkMatch ? thinkMatch[1].trim() : '';
  
  // Limit thinking content to 1000 characters
  return content.slice(0, 1000);
}

// Function to extract content excluding thinking content
function extractContent(text: string): string {
  // Remove thinking content
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  
  // Remove any repeated paragraphs (common in AI responses)
  const paragraphs = text.split('\n\n');
  const uniqueParagraphs = [...new Set(paragraphs)];
  
  // Join unique paragraphs and limit to reasonable length (about 2000 characters)
  return uniqueParagraphs.join('\n\n').slice(0, 2000);
}

// Function to extract JSON array from the response
function extractJSONArray(text: string): string {
  // Remove any non-printable characters and normalize whitespace
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Find the outermost array containing questions
  const match = text.match(/\[\s*\{[^]*\}\s*\]/);
  if (!match) {
    // Try to find any JSON array
    const arrayMatch = text.match(/\[[^\]]*\]/);
    if (!arrayMatch) return '';
    return arrayMatch[0];
  }
  
  // Clean up the JSON string
  return match[0]
    .replace(/[\u0000-\u0019]+/g, '') // Remove control characters
    .replace(/。}/g, '}') // Remove Chinese period before closing brace
    .replace(/。"/g, '"') // Remove Chinese period before quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/,\s*]/g, ']') // Remove trailing commas
    .replace(/,\s*,/g, ',') // Remove duplicate commas
    .replace(/"\s*"/g, '","') // Fix adjacent quotes
    .replace(/}\s*{/g, '},{') // Fix adjacent objects
    .trim();
}

// Function to check if a question is similar to existing ones using basic text similarity
function calculateSimilarity(str1: string, str2: string, regionName: string): number {
  // 移除地区前缀进行比较
  const normalizeQuestion = (q: string) => q.replace(new RegExp(`^${regionName}本地`), '').trim();
  const s1 = normalizeQuestion(str1);
  const s2 = normalizeQuestion(str2);
  
  // 将问题分词（这里简单按空格和标点分词）
  const words1 = new Set(s1.split(/[\s,.，。？?！!]/));
  const words2 = new Set(s2.split(/[\s,.，。？?！!]/));
  
  // 计算交集
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  
  // 计算并集
  const union = new Set([...words1, ...words2]);
  
  // 计算 Jaccard 相似度
  return intersection.size / union.size;
}

// Function to check if a question is too similar to any existing question
function isTooSimilar(newQuestion: string, existingQuestions: string[], regionName: string): boolean {
  const SIMILARITY_THRESHOLD = 0.6; // 相似度阈值，可以根据需要调整
  
  for (const existing of existingQuestions) {
    const similarity = calculateSimilarity(newQuestion, existing, regionName);
    if (similarity > SIMILARITY_THRESHOLD) {
      return true;
    }
  }
  return false;
}

// Function to get answer for a question
async function getAnswer(question: string, maxAttempts: number = 3): Promise<QAItem> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Answer attempt ${attempt}/${maxAttempts}`);
      const chatCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: question
          }
        ],
        model: "deepseek-r1-distill-llama-70b",
        temperature: 0.6,
        max_tokens: 4096,
        top_p: 0.95,
        stream: true,
      });

      const result = await collectStreamData(chatCompletion);
      const reasoningContent = extractThinkingContent(result);
      const content = extractContent(result);
      
      if (!content) {
        throw new Error('Empty answer received');
      }
      
      return {
        question,
        content: content,
        reasoning_content: reasoningContent || '未提供思考过程'
      };
    } catch (error) {
      console.error(`Error in attempt ${attempt}:`, error);
      lastError = error as Error;
      if (attempt < maxAttempts) {
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  
  // If all attempts failed, return error state
  return {
    question,
    content: '在多次尝试后未能获取答案',
    reasoning_content: lastError ? `错误信息: ${lastError.message}` : '未提供思考过程'
  };
}

async function generateQuestions(count: number, region: Region, maxAttempts: number = 3): Promise<Question[]> {
  let questions: Question[] = [];
  const existingQuestions = new Set<string>();
  const { questionFile } = getRegionFileNames(region.pinyin);

  // 尝试加载现有问题
  try {
    const existingQuestionsData = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
    questions = existingQuestionsData;
    // 所有问题都要参与相似度检查，无论是否已回答
    existingQuestionsData.forEach(q => existingQuestions.add(q.question));
    console.log(`Loaded ${questions.length} existing questions for similarity check`);
    
    // 显示当前问题的统计信息
    const answeredCount = existingQuestionsData.filter(q => q.is_answered).length;
    console.log(`Current stats: ${answeredCount} answered, ${existingQuestionsData.length - answeredCount} unanswered`);
  } catch (error) {
    console.log('No existing questions found, starting fresh');
  }

  // 如果已有问题数量达到或超过目标数量，直接返回
  if (questions.length >= count) {
    console.log(`Already have ${questions.length} questions, no need to generate more.`);
    return questions;
  }

  // 计算需要生成的新问题数量
  let remainingCount = count - questions.length;
  let totalNewQuestions = 0;
  
  // 分批生成问题，每批最多20个
  while (remainingCount > 0) {
    const batchSize = Math.min(50, remainingCount);
    console.log(`\nGenerating batch of ${batchSize} questions (${totalNewQuestions}/${count - questions.length} total)...`);
    
    const prompt = `请一次性生成${batchSize}个关于${region.name}本地的问题，每个问题必须以"${region.name}本地"开头。问题要多样化，包括历史、文化、美食、景点、特产等不同方面。
    
格式要求：
1. 必须严格按照 JSON 格式返回，不要包含任何其他内容
2. JSON 数组必须完整，以 [ 开始，以 ] 结束
3. 每个问题对象必须包含 "question" 和 "is_answered" 两个字段
4. 所有字符串必须使用双引号，不能用单引号
5. 每个问题必须以"${region.name}本地"开头
6. 问题要具体且有意义
7. 问题之间要有明显区别，避免相似内容
8. 生成的问题不能与已有问题相似，需要探索新的主题和角度
9. 返回的 JSON 必须是一个完整的数组，不能有任何中断或截断

示例返回：
[
  {"question": "${region.name}本地有什么特色美食？", "is_answered": false},
  {"question": "${region.name}本地的历史遗迹有哪些？", "is_answered": false}
]

注意：请确保返回的是一个完整的、格式正确的 JSON 数组，不要包含任何其他内容，包括思考过程或额外的说明。`;

    let batchSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !batchSuccess; attempt++) {
      try {
        console.log(`\nBatch attempt ${attempt}/${maxAttempts}...`);
        
        const chatCompletion = await groq.chat.completions.create({
          messages: [{ 
            role: "user", 
            content: prompt
          }],
          model: "deepseek-r1-distill-llama-70b",
          temperature: 0.9,
          max_tokens: 2000, // 减少 token 限制，因为每批问题更少
          top_p: 0.95,
          stream: true,
        });

        const result = await collectStreamData(chatCompletion);
        
        // 尝试从结果中提取 JSON
        let jsonStr = result.trim();
        
        // 如果结果包含 JSON 数组的开始和结束，提取它
        jsonStr = extractJSONArray(jsonStr);
        
        if (!jsonStr) {
          console.error('No valid JSON array found in response');
          continue;
        }

        let parsedQuestions: Question[];
        try {
          parsedQuestions = JSON.parse(jsonStr) as Question[];
          
          // Validate the parsed questions
          if (!Array.isArray(parsedQuestions)) {
            console.error('Parsed result is not an array');
            continue;
          }
          
          // Filter out invalid questions
          parsedQuestions = parsedQuestions.filter(q => 
            q && 
            typeof q === 'object' && 
            typeof q.question === 'string' && 
            q.question.trim().startsWith(`${region.name}本地`)
          );
          
          if (parsedQuestions.length === 0) {
            console.error('No valid questions found in parsed result');
            continue;
          }
        } catch (error) {
          console.error('Failed to parse JSON:', error);
          console.error('Received JSON string:', jsonStr);
          continue;
        }
        
        let newQuestionsAdded = 0;
        let skippedQuestions = 0;
        
        for (const q of parsedQuestions) {
          if (totalNewQuestions >= remainingCount) {
            break;
          }
          
          if (typeof q.question === 'string' && q.question.trim().startsWith(`${region.name}本地`)) {
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
            
            // 每添加一个新问题就保存一次
            writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
          }
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
      
      // 在重试之前等待一下
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

// Main function to generate QA pairs
async function main() {
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
    
    // 先生成问题
    console.log(`=== Generating Questions for ${region.name} ===`);
    await main_questions(questionCount, region);
    
    // 然后生成答案
    console.log(`\n=== Generating Answers for ${region.name} ===`);
    await main_answers(region);
    
    return;
  }

  // 处理单独的 questions 模式
  if (mode === 'questions') {
    const questionCount = parseInt(process.argv[4] || '10', 10);
    await main_questions(questionCount, region);
  }
  
  // 处理单独的 answers 模式
  if (mode === 'answers') {
    await main_answers(region);
  }
}

// 处理问题生成的主函数
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

// 处理答案生成的主函数
async function main_answers(region: Region, maxAnswerAttempts: number = 3) {
  console.log(`Getting answers for ${region.name}...`);
  let qaItems: QAItem[] = [];
  const { questionFile, qaFile } = getRegionFileNames(region.pinyin);
  
  try {
    // Read questions from q_results.json
    const questions = JSON.parse(readFileSync(questionFile, 'utf-8')) as Question[];
    console.log(`Loaded ${questions.length} questions from ${questionFile}`);
    
    // Try to load existing answers
    try {
      qaItems = JSON.parse(readFileSync(qaFile, 'utf-8')) as QAItem[];
      console.log(`Loaded ${qaItems.length} existing answers from ${qaFile}`);
      
      // 更新问题的回答状态
      const answeredQuestions = new Set(qaItems.map(item => item.question));
      questions.forEach(q => {
        q.is_answered = answeredQuestions.has(q.question);
      });
      
      // 保存更新后的问题状态
      writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
    } catch (error) {
      console.log('No existing answers found, starting from scratch');
    }
    
    // Get the questions that haven't been answered yet
    const remainingQuestions = questions.filter(q => !q.is_answered);
    
    console.log(`Found ${remainingQuestions.length} questions without answers`);
    
    for (let i = 0; i < remainingQuestions.length; i++) {
      try {
        console.log(`\nGetting answer for question ${i + 1}/${remainingQuestions.length}:`);
        console.log(remainingQuestions[i].question);
        const qaItem = await getAnswer(remainingQuestions[i].question, maxAnswerAttempts);
        console.log('Answer received:', qaItem.content.slice(0, 100) + '...');
        qaItems.push(qaItem);
        
        // 更新问题状态
        const questionIndex = questions.findIndex(q => q.question === remainingQuestions[i].question);
        if (questionIndex !== -1) {
          questions[questionIndex].is_answered = true;
          // 保存更新后的问题状态
          writeFileSync(questionFile, JSON.stringify(questions, null, 2), 'utf-8');
        }
        
        // 保存答案
        writeFileSync(qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
        
        // 等待一下再继续下一个问题
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

// Run the main function
main().catch(console.error);