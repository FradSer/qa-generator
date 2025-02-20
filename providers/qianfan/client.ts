import { ChatCompletion, setEnvVariable } from '@baiducloud/qianfan';
import { config } from 'dotenv';

// Load environment variables from .env file
config();

// MARK: - Environment Configuration
/**
 * Validates and sets up required environment variables for the application
 * @throws {Error} If required environment variables are missing
 */
export function setupQianFanEnvironment() {
  if (!process.env.QIANFAN_ACCESS_KEY || !process.env.QIANFAN_SECRET_KEY) {
    throw new Error('QIANFAN_ACCESS_KEY and QIANFAN_SECRET_KEY must be set in .env file');
  }

  setEnvVariable('QIANFAN_ACCESS_KEY', process.env.QIANFAN_ACCESS_KEY);
  setEnvVariable('QIANFAN_SECRET_KEY', process.env.QIANFAN_SECRET_KEY);
}

// MARK: - Core Client
export const qianfanClient = new ChatCompletion({
  ENABLE_OAUTH: true,
  QIANFAN_ACCESS_KEY: process.env.QIANFAN_ACCESS_KEY,
  QIANFAN_SECRET_KEY: process.env.QIANFAN_SECRET_KEY,
  version: 'v2',
}); 