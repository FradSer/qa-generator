/**
 * Generates prompt for question generation
 * @param regionName - Name of the region
 * @param batchSize - Number of questions to generate
 * @returns Generated prompt
 */
export function generateQuestionPrompt(regionName: string, batchSize: number): string {
  return `作为一个本地文化专家，请生成${batchSize}个关于${regionName}的高质量问题。

要求：
1. 每行一个问题，每个问题独占一行
2. 每个问题必须以"${regionName}本地"开头
3. 问题要具体且有深度
4. 问题必须以问号"？"结尾
5. 不要输出任何其他内容，比如序号、解释、标点符号等
6. 不要使用任何JSON或其他格式，直接输出问题文本
7. 不要输出思考过程，直接输出问题列表

涵盖以下领域（每个领域的问题数量要均衡）：
- 历史文化：历史事件、文化遗产、名人轶事
- 美食特产：地方小吃、特色菜系、农产品
- 景点名胜：著名景区、历史建筑、特色街区
- 现代发展：产业特色、城市建设、经济发展
- 民俗风情：地方习俗、节日活动、方言特色
- 生活服务：休闲娱乐、教育医疗、交通出行

输出格式示例（每行一个问题，不要有空行）：
${regionName}本地最古老的寺庙是哪座建于何时？
${regionName}本地有哪些百年老字号还在经营？
${regionName}本地的丝绸产业发展历史可以追溯到什么时候？

直接开始输出问题，不要有任何开场白或结束语。`;
}

/**
 * Processes raw API response into structured question format
 * @param text - Raw API response text
 * @returns JSON string of processed questions
 */
export function processQuestionResponse(text: string): string {
  console.log('\n🔍 Processing Response');
  console.log('├── Input Length:', text.length);
  console.log('└── Input Preview:', text.slice(0, 100).replace(/\n/g, '\\n') + (text.length > 100 ? '...' : ''));
  
  // Split into lines and clean up
  const lines = text.split(/[\n\r]+/).map(line => line.trim());
  console.log('\n📝 Line Processing');
  console.log(`└── Found ${lines.length} lines`);

  // Process each line
  console.log('\n🔄 Question Processing');
  const questions = lines
    .filter(line => {
      const isValid = line && line.includes('本地') && (line.includes('？') || line.includes('?'));
      if (!isValid && line.length > 0) {
        console.log('├── Filtered:', '❌');
        console.log('│   └── Invalid:', line);
      }
      return isValid;
    })
    .map(line => {
      console.log('├── Processing:', '📝');
      console.log('│   └── Question:', line);
      
      // Ensure question ends with proper question mark
      const formatted = !line.endsWith('？') && !line.endsWith('?') ? line + '？' : line;
      if (formatted !== line) {
        console.log('├── Formatted:', '✍️');
        console.log('│   └── Added question mark');
      }
      return formatted;
    })
    .filter((line, index, self) => {
      const isUnique = self.indexOf(line) === index && line.length >= 10;
      if (!isUnique) {
        console.log('├── Duplicate/Short:', '🔄');
        console.log('│   └── Removed:', line);
      }
      return isUnique;
    });

  console.log('\n✅ Processing Complete');
  console.log(`└── Generated ${questions.length} valid questions`);

  // Create final JSON structure
  const jsonQuestions = questions.map(q => ({
    question: q.trim(),
    is_answered: false
  }));
  
  const result = JSON.stringify(jsonQuestions, null, 2);
  console.log('\n📤 Final Output Preview:');
  console.log(result.slice(0, 200) + (result.length > 200 ? '...' : ''));
  
  return result;
} 