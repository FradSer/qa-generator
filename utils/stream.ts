/**
 * Processes stream data from API response and collects it into structured format
 * @param response - Raw API response
 * @returns Promise<{content: string, reasoning_content: string}>
 */
export async function processStreamData(response: any): Promise<{ content: string; reasoning_content: string }> {
  console.log('\n📡 Stream Processing Started');
  console.log('├── Type:', typeof response);
  console.log('└── Available Keys:', Object.keys(response).join(', '));
  
  // Handle non-stream response
  if (response.result) {
    console.log('✨ Direct Result Found');
    return {
      content: response.result,
      reasoning_content: ''
    };
  }
  
  // Handle stream response
  if (response[Symbol.asyncIterator]) {
    console.log('\n🔄 Processing Stream');
    let content = '';
    let reasoningContent = '';
    let chunkCount = 0;
    
    try {
      for await (const chunk of response) {
        chunkCount++;
        console.log(`\n📦 Chunk #${chunkCount}`);
        
        if (chunk?.choices?.[0]?.delta) {
          const delta = chunk.choices[0].delta;
          
          if (delta.content !== undefined && delta.content !== null) {
            const prevLength = content.length;
            content += delta.content;
            console.log('├── Content:', delta.content.replace(/\n/g, '\\n'));
            console.log(`└── Length: +${content.length - prevLength} chars (Total: ${content.length})`);
          }
          if (delta.reasoning_content) {
            const prevLength = reasoningContent.length;
            reasoningContent += delta.reasoning_content;
            console.log('├── Reasoning:', delta.reasoning_content.replace(/\n/g, '\\n'));
            console.log(`└── Length: +${reasoningContent.length - prevLength} chars (Total: ${reasoningContent.length})`);
          }
        }
      }
      
      if (!content && !reasoningContent) {
        throw new Error('No content or reasoning content found in response');
      }
      
      console.log('\n✅ Stream Processing Complete');
      console.log('├── Content Length:', content.length);
      console.log('├── Reasoning Length:', reasoningContent.length);
      console.log('└── Preview:', content.slice(0, 100).replace(/\n/g, '\\n') + (content.length > 100 ? '...' : ''));
      
      return { content, reasoning_content: reasoningContent };
    } catch (error) {
      console.error('\n❌ Stream Processing Error:', error);
      throw error;
    }
  }
  
  throw new Error('Unknown response format from API');
}

/**
 * Extracts and processes thinking content from response
 * @param text - Raw response text
 * @returns Processed thinking content
 */
export function extractThinkingContent(text: string): string {
  const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
  return thinkMatch ? thinkMatch[1].trim().slice(0, 1000) : '';
}

/**
 * Extracts and processes main content from response
 * @param text - Raw response text
 * @returns Processed content
 */
export function extractContent(text: string): string {
  text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const paragraphs = [...new Set(text.split('\n\n'))];
  return paragraphs.join('\n\n').slice(0, 2000);
} 