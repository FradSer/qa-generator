import type { StreamResponse } from '../../types/provider';
import { BaseAIService } from '../base/service';
import { groqClient } from './client';

/**
 * Groq service implementation
 */
export class GroqService extends BaseAIService {
  constructor() {
    super(groqClient, 'deepseek-r1-distill-llama-70b');
  }

  /**
   * Process stream response for Groq
   * @param response - Stream response from Groq
   * @returns Promise<{content: string, reasoning_content: string}>
   */
  protected async processStreamResponse(response: any): Promise<{content: string, reasoning_content: string}> {
    let rawContent = '';
    let rawReasoningContent = '';
    
    for await (const chunk of response) {
      const streamChunk = chunk as StreamResponse;
      const content = streamChunk.choices[0]?.delta?.content || '';
      process.stdout.write(content);
      rawContent += content;
    }
    
    return {
      content: rawContent,
      reasoning_content: rawReasoningContent
    };
  }
}

export const groqService = new GroqService(); 