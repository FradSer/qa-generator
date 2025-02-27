/**
 * Base interface for chat message
 */
export interface ChatMessage {
  role: string;
  content: string;
}

/**
 * Base interface for stream response
 */
export interface StreamResponse {
  choices: Array<{
    delta: {
      content?: string;
      reasoning_content?: string;
    };
  }>;
}

/**
 * Base interface for AI provider client
 */
export interface AIProviderClient {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }, model?: string): Promise<any>;
}

/**
 * Base interface for AI provider service
 */
export interface AIProviderService {
  generateAnswer(question: string, maxAttempts?: number): Promise<any>;
  generateQuestionsFromPrompt(regionName: string, batchSize: number, maxAttempts?: number): Promise<string>;
}
