import { BaseAIService } from '../base/service';
import { qianfanClient } from './client';

/**
 * QianFan service implementation
 */
export class QianFanService extends BaseAIService {
  constructor() {
    super(qianfanClient, 'deepseek-r1');
  }

  /**
   * Process stream response for QianFan
   * @param response - Stream response from QianFan
   * @returns Promise<{content: string, reasoning_content: string}>
   */
  protected async processStreamResponse(response: any): Promise<{content: string, reasoning_content: string}> {
    let rawContent = '';
    let rawReasoningContent = '';
    
    for await (const chunk of response) {
      if (chunk?.choices?.[0]?.delta) {
        const delta = chunk.choices[0].delta;
        
        if (delta.content !== undefined && delta.content !== null) {
          process.stdout.write(delta.content);
          rawContent += delta.content;
        }
        
        if (delta.reasoning_content) {
          process.stdout.write(delta.reasoning_content);
          rawReasoningContent += delta.reasoning_content;
        }
      } else if (chunk.result) {
        // 兼容旧的格式
        process.stdout.write(chunk.result);
        rawContent += chunk.result;
      }
    }
    
    return {
      content: rawContent,
      reasoning_content: rawReasoningContent
    };
  }
}

export const qianfanService = new QianFanService(); 