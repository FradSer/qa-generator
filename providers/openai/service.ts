import type { StreamResponse } from '../../types/provider';
import { BaseAIService } from '../base/service';
import { openaiClient } from './client';

/**
 * OpenAI service implementation
 */
export class OpenAIService extends BaseAIService {
  constructor() {
    super(openaiClient, 'ep-m-20250225150724-k45xk');
  }

  /**
   * Process stream response for OpenAI
   * @param response - Stream response from OpenAI
   * @returns Promise<{content: string, reasoning_content: string}>
   */
  protected async processStreamResponse(response: any): Promise<{content: string, reasoning_content: string}> {
    let rawContent = '';
    let rawReasoningContent = '';
    
    for await (const chunk of response) {
      const streamChunk = chunk as StreamResponse;
      const content = streamChunk.choices[0]?.delta?.content || '';
      const reasoningContent = streamChunk.choices[0]?.delta?.reasoning_content || '';
      
      if (reasoningContent) {
        process.stdout.write(reasoningContent);
        rawReasoningContent += reasoningContent;
      } else {
        process.stdout.write(content);
        rawContent += content;
      }
    }
    
    return {
      content: rawContent,
      reasoning_content: rawReasoningContent
    };
  }
}

export const openaiService = new OpenAIService(); 