import type { Provider } from '../components/Navbar';

/**
 * Available AI providers configuration
 */
export const providers: Provider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
  },
  {
    id: 'groq',
    name: 'Groq',
  },
  {
    id: 'qianfan',
    name: '百度千帆',
  }
];

/**
 * Default provider ID
 */
export const DEFAULT_PROVIDER = 'openai';

/**
 * Get provider display name by ID
 */
export function getProviderName(id: string): string {
  const provider = providers.find(p => p.id === id);
  return provider?.name || id;
}

/**
 * Validate if provider ID is supported
 */
export function isValidProvider(id: string): boolean {
  return providers.some(p => p.id === id);
} 