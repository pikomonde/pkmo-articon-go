import type { LLMProvider, ChatMessage } from '../../shared/types';
import { getLLMProvider } from '../storage/settings';
import { geminiComplete } from './providers/gemini';
import { openaiComplete } from './providers/openai';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type CompleteFn = (messages: LLMMessage[]) => Promise<string>;

export async function complete(messages: LLMMessage[]): Promise<string> {
  const provider = await getLLMProvider();
  if (!provider) {
    throw new Error('No LLM provider configured. Please complete onboarding.');
  }
  return completeWithProvider(provider, messages);
}

export function completeWithProvider(provider: LLMProvider, messages: LLMMessage[]): Promise<string> {
  switch (provider.name) {
    case 'gemini':
      return geminiComplete(provider, messages);
    case 'openai':
    case 'groq':
      return openaiComplete(provider, messages);
    default: {
      const _exhaustive: never = provider.name;
      throw new Error(`Unknown provider: ${_exhaustive}`);
    }
  }
}

// Convert stored ChatMessages to LLM message format
export function toHistoryMessages(history: ChatMessage[]): LLMMessage[] {
  return history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
