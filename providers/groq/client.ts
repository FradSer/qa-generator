import { config } from 'dotenv';
import { Groq } from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import type { AIProviderClient } from '../../types/provider';

// Load environment variables from .env file
config();

// MARK: - Environment Configuration
/**
 * Validates and sets up required environment variables for Groq
 * @throws {Error} If required environment variables are missing
 */
export function setupGroqEnvironment() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY must be set in .env file');
  }
}

// MARK: - Core Client
class GroqClient implements AIProviderClient {
  private client: Groq;
  private defaultModel = 'deepseek-r1-distill-llama-70b';

  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  async chat(params: {
    messages: ChatCompletionMessageParam[];
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  }, model?: string) {
    return this.client.chat.completions.create({
      messages: params.messages,
      model: model || this.defaultModel,
      temperature: params.temperature || 0.6,
      max_tokens: params.maxTokens || 4096,
      top_p: params.topP || 0.95,
      stream: params.stream || true,
    });
  }
}

export const groqClient = new GroqClient(); 