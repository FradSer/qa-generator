import { ChatCompletion, setEnvVariable } from '@baiducloud/qianfan';
import { config } from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import type { Region } from './config';
import { getRegionByPinyin, getRegionFileNames } from './config';

// Load environment variables from .env file
config();

// Check if environment variables are set
if (!process.env.QIANFAN_ACCESS_KEY || !process.env.QIANFAN_SECRET_KEY) {
  throw new Error('QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY must be set in .env file');
}

setEnvVariable('QIANFAN_ACCESS_KEY', process.env.QIANFAN_ACCESS_KEY);
setEnvVariable('QIANFAN_SECRET_KEY', process.env.QIANFAN_SECRET_KEY);

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

// Initialize Qianfan client
const client = new ChatCompletion({
  ENABLE_OAUTH: true,
  QIANFAN_ACCESS_KEY: process.env.QIANFAN_ACCESS_KEY,
  QIANFAN_SECRET_KEY: process.env.QIANFAN_SECRET_KEY,
  version: 'v2',
});

// Function to collect stream data into a single string
async function collectStreamData(response: any): Promise<{ content: string; reasoning_content: string }> {
  console.log('[Stream] Response type:', typeof response);
  console.log('[Stream] Response keys:', Object.keys(response));
  
  // Handle non-stream response
  if (response.result) {
    console.log('[Stream] Direct result found');
    return {
      content: response.result,
      reasoning_content: ''
    };
  }
  
  // Handle stream response
  if (response[Symbol.asyncIterator]) {
    console.log('[Stream] Async iterator found, processing stream');
    let content = '';
    let reasoningContent = '';
    let chunkCount = 0;
    
    try {
      for await (const chunk of response) {
        chunkCount++;
        console.log(`[Stream] Processing chunk ${chunkCount}`);
        
        if (chunk?.choices?.[0]?.delta) {
          const delta = chunk.choices[0].delta;
          console.log('[Stream] Delta keys:', Object.keys(delta));
          
          if (delta.content !== undefined && delta.content !== null) {
            content += delta.content;
            console.log('[Stream] Added content chunk:', delta.content);
          }
          
          if (delta.reasoning_content) {
            reasoningContent += delta.reasoning_content;
            console.log('[Stream] Added reasoning chunk:', delta.reasoning_content);
          }
        } else {
          console.log('[Stream] Unexpected chunk format:', JSON.stringify(chunk, null, 2));
        }
      }
      
      console.log(`[Stream] Processed ${chunkCount} chunks`);
      console.log('[Stream] Final content length:', content.length);
      console.log('[Stream] Final reasoning length:', reasoningContent.length);
      
      if (!content && !reasoningContent) {
        throw new Error('No content or reasoning content found in response');
      }
      
      return {
        content: content,
        reasoning_content: reasoningContent
      };
    } catch (error) {
      console.error('[Stream] Error collecting stream data:', error);
      throw error;
    }
  }
  
  // If we get here, we don't know how to handle the response
  console.error('[Stream] Unknown response format:', JSON.stringify(response, null, 2));
  throw new Error('Unknown response format from API');
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
  // Remove any non-printable characters
  text = text.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // 按行分割并清理
  const lines = text.split(/[\n\r]+/);
  const questions = lines
    .map(line => line.trim())
    .filter(line => {
      // 确保行不为空且包含"本地"和问号
      return line && 
             line.includes('本地') && 
             (line.includes('？') || line.includes('?'));
    })
    .map(line => {
      // 如果问题末尾没有问号，添加问号
      if (!line.endsWith('？') && !line.endsWith('?')) {
        line += '？';
      }
      return line;
    })
    .filter((line, index, self) => {
      // 去重并确保是有效的问题
      return self.indexOf(line) === index && 
             line.length >= 10;  // 确保问题长度合理
    });
  
  console.log('\n[Debug] Found questions:');
  questions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  console.log(`Total questions found: ${questions.length}`);
  
  // 转换为 JSON 格式
  const jsonQuestions = questions.map(q => ({
    question: q.trim(),
    is_answered: false
  }));
  
  return JSON.stringify(jsonQuestions, null, 2);
}

// Function to check if a question is similar to existing ones using basic text similarity
function calculateSimilarity(str1: string, str2: string, regionName: string): number {
  // 移除地区前缀进行比较
  const normalizeQuestion = (q: string) => {
    let normalized = q.replace(new RegExp(`^${regionName}本地`), '').trim()
      .toLowerCase()
      .replace(/[,.，。？?！!]/g, ' ')
      .replace(/\s+/g, ' ');
    return normalized;
  };
  
  const s1 = normalizeQuestion(str1);
  const s2 = normalizeQuestion(str2);
  
  // 计算字符级别的编辑距离
  const levenshteinDistance = (a: string, b: string): number => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  };

  // 结合编辑距离和词重叠计算相似度
  const distance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  const normalizedDistance = 1 - (distance / maxLength);

  // 计算词重叠
  const words1 = new Set(s1.split(' '));
  const words2 = new Set(s2.split(' '));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  const jaccardSimilarity = intersection.size / union.size;

  // 综合评分 (70% 编辑距离 + 30% 词重叠)
  return normalizedDistance * 0.7 + jaccardSimilarity * 0.3;
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
      console.log(`\n[API Call] Answer attempt ${attempt}/${maxAttempts}`);
      console.log(`[API Request] Question: ${question}`);
      console.time('[API] Response time');
      
      const response = await client.chat({
        messages: [
          {
            role: "user",
            content: question
          }
        ],
        stream: true,
      }, "deepseek-r1");

      console.timeEnd('[API] Response time');
      console.log('[API] Response received:', typeof response);
      
      if (!response) {
        throw new Error('Null response received from API');
      }
      
      const { content: rawContent, reasoning_content: rawReasoningContent } = await collectStreamData(response);
      console.log('[API] Result preview:', rawContent.slice(0, 100));
      
      if (!rawContent && !rawReasoningContent) {
        throw new Error('Empty response received from API');
      }
      
      const content = extractContent(rawContent);
      const reasoningContent = rawReasoningContent || extractThinkingContent(rawContent);
      
      if (!content) {
        throw new Error('Failed to extract content from response');
      }
      
      console.log('[API] Successfully processed response');
      console.log('[API] Content length:', content.length);
      console.log('[API] Reasoning length:', reasoningContent.length);
      
      return {
        question,
        content: content,
        reasoning_content: reasoningContent || '未提供思考过程'
      };
    } catch (error) {
      console.error(`[API Error] Attempt ${attempt}:`, error);
      if (error instanceof Error) {
        console.error('[API Error] Name:', error.name);
        console.error('[API Error] Message:', error.message);
        console.error('[API Error] Stack:', error.stack);
      } else {
        console.error('[API Error] Unknown error type:', typeof error);
        console.error('[API Error] Error details:', JSON.stringify(error, null, 2));
      }
      lastError = error as Error;
      if (attempt < maxAttempts) {
        const waitTime = attempt * 2000; // 增加重试等待时间
        console.log(`[API] Waiting ${waitTime/1000}s before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  console.error('[API] All attempts failed');
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
  
  // 分批生成问题，每批最多50个
  while (remainingCount > 0) {
    const batchSize = Math.min(50, remainingCount);
    console.log(`\nGenerating batch of ${batchSize} questions (${totalNewQuestions}/${count - questions.length} total)...`);
    
    const prompt = `作为一个本地文化专家，请生成${batchSize}个关于${region.name}的高质量问题。

要求：
1. 必须严格按照 JSON 格式返回，不要包含任何其他内容
2. JSON 数组必须完整，以 [ 开始，以 ] 结束
3. 每个问题对象必须包含 "question" 字段
4. 所有字符串必须使用双引号，不能用单引号
5. 每个问题必须以"${region.name}本地"开头
6. 问题要具体且有深度
7. 问题必须以问号结尾

涵盖以下领域：
- 历史文化（历史事件、文化遗产、名人轶事）
- 美食特产（地方小吃、特色菜系、农产品）
- 景点名胜（著名景区、历史建筑、特色街区）
- 现代发展（产业特色、城市建设、经济发展）
- 民俗风情（地方习俗、节日活动、方言特色）
- 生活服务（休闲娱乐、教育医疗、交通出行）

示例 JSON 格式：
[
  {"question": "${region.name}本地最古老的寺庙是哪座，建于何时？"},
  {"question": "${region.name}本地有哪些百年老字号还在经营？"},
  {"question": "${region.name}本地的丝绸产业发展历史可以追溯到什么时候？"}
]

注意：请确保返回的是一个完整的、格式正确的 JSON 数组，不要包含任何其他内容，包括思考过程或额外的说明。`;

    let batchSuccess = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !batchSuccess; attempt++) {
      try {
        console.log(`\n[API Call] Batch attempt ${attempt}/${maxAttempts}...`);
        console.log('[API Request] Prompt length:', prompt.length);
        console.time('[API] Question generation time');
        
        // 在每次 API 调用前增加延迟
        await new Promise(resolve => setTimeout(resolve, 5000)); // 增加5秒延迟
        
        const response = await client.chat({
          messages: [{ 
            role: "user", 
            content: prompt
          }],
          stream: true,
        }, "deepseek-r1");

        console.timeEnd('[API] Question generation time');
        console.log('[API] Response received:', typeof response);
        
        if (!response) {
          throw new Error('Null response received from API');
        }
        
        const result = await collectStreamData(response);
        console.log('\n[Debug] Raw response:');
        console.log(result.content.slice(0, 500));
        
        // 尝试直接解析 JSON
        let parsedQuestions: Question[];
        try {
          // 清理响应文本，只保留 JSON 部分
          const jsonStr = result.content.trim()
            .replace(/^[\s\S]*?\[/, '[')  // 删除 JSON 数组开始前的所有内容
            .replace(/\][\s\S]*$/, ']');  // 删除 JSON 数组结束后的所有内容
          
          parsedQuestions = JSON.parse(jsonStr) as Question[];
          console.log('\n[Debug] Parsed questions:');
          parsedQuestions.slice(0, 3).forEach(q => console.log(q.question));
          
          // 验证解析后的问题
          if (!Array.isArray(parsedQuestions)) {
            console.error('[Error] Parsed result is not an array');
            continue;
          }
          
          // 过滤无效问题
          parsedQuestions = parsedQuestions.filter(q => 
            q && 
            typeof q === 'object' && 
            typeof q.question === 'string' && 
            q.question.trim().startsWith(`${region.name}本地`) &&
            (q.question.endsWith('？') || q.question.endsWith('?'))
          );
          
          if (parsedQuestions.length === 0) {
            console.error('[Error] No valid questions found in parsed result');
            continue;
          }
        } catch (error) {
          console.error('[Error] Failed to parse questions:', error);
          console.error('[Error] Raw response:', result.content);
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

            questions.push({ question: q.question, is_answered: false });
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
        
        // 在处理 API 响应后增加延迟
        if (batchSuccess) {
          const cooldownTime = Math.max(5000, Math.min(newQuestionsAdded * 1000, 15000));
          console.log(`\nCooling down for ${cooldownTime/1000} seconds before next batch...`);
          await new Promise(resolve => setTimeout(resolve, cooldownTime));
        }
      } catch (error) {
        console.error(`[Error] Batch attempt ${attempt} failed:`, error);
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
      console.log('No existing answers found, starting fresh');
    }
    
    // Get the questions that haven't been answered yet
    const remainingQuestions = questions.filter(q => !q.is_answered);
    
    console.log(`Found ${remainingQuestions.length} questions without answers`);
    
    for (let i = 0; i < remainingQuestions.length; i++) {
      try {
        console.log(`\nGetting answer for question ${i + 1}/${remainingQuestions.length}:`);
        console.log(remainingQuestions[i].question);
        
        // 添加重试机制
        let retryCount = 0;
        let qaItem: QAItem | null = null;
        
        while (retryCount < maxAnswerAttempts && !qaItem) {
          try {
            qaItem = await getAnswer(remainingQuestions[i].question, maxAnswerAttempts);
            if (!qaItem.content || qaItem.content === '在多次尝试后未能获取答案') {
              console.log(`[Retry] Empty or error response, retrying... (${retryCount + 1}/${maxAnswerAttempts})`);
              qaItem = null;
              retryCount++;
              // 增加等待时间
              await new Promise(resolve => setTimeout(resolve, retryCount * 3000));
              continue;
            }
          } catch (error) {
            console.error(`[Retry] Error getting answer:`, error);
            retryCount++;
            if (retryCount < maxAnswerAttempts) {
              console.log(`[Retry] Retrying in ${retryCount * 3} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryCount * 3000));
            }
          }
        }
        
        if (!qaItem) {
          console.error(`[Error] Failed to get answer after ${maxAnswerAttempts} attempts`);
          continue;
        }
        
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
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Error] Failed to process question:`, error);
        // 保存当前进度
        if (qaItems.length > 0) {
          console.log('[Recovery] Saving current progress...');
          writeFileSync(qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
        }
      }
    }
    
    console.log(`\nCompleted answer generation:`);
    console.log(`- Total QA pairs: ${qaItems.length}`);
  } catch (error) {
    console.error('[Error] Error reading questions file:', error);
    // 保存当前进度
    if (qaItems.length > 0) {
      console.log('[Recovery] Saving current progress...');
      writeFileSync(qaFile, JSON.stringify(qaItems, null, 2), 'utf-8');
    }
  }
}

// Run the main function
main().catch(console.error);
