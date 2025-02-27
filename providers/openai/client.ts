import { config } from 'dotenv';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { AIProviderClient } from '../../types/provider';

// Load environment variables from .env file
config();

// MARK: - Environment Configuration
/**
 * Validates and sets up required environment variables for OpenAI
 * @throws {Error} If required environment variables are missing
 */
export function setupOpenAIEnvironment() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY must be set in .env file');
  }
  if (!process.env.OPENAI_BASE_URL) {
    throw new Error('OPENAI_BASE_URL must be set in .env file');
  }
}

// MARK: - Core Client
class OpenAIClient implements AIProviderClient {
  private client: OpenAI;
  private defaultModel = 'ep-m-20250225150724-k45xk';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }

  async chat(params: {
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }, model?: string) {
    return this.client.chat.completions.create({
      messages: params.messages as ChatCompletionMessageParam[],
      model: model || this.defaultModel,
      temperature: params.temperature || 0.6,
      max_tokens: params.maxTokens || 4096,
      top_p: params.topP || 0.95,
      stream: true, // Always use streaming for reasoning content support
    });
  }
}

export const openaiClient = new OpenAIClient(); 