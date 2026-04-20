import type { LLMProvider } from '../../../shared/types';
import type { LLMMessage } from '../client';
import { LLM_DEFAULTS } from '../../../shared/constants';

interface OpenAIRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface OpenAIResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  error?: { message: string; type: string };
}

export async function openaiComplete(
  provider: LLMProvider,
  messages: LLMMessage[]
): Promise<string> {
  const baseUrl =
    LLM_DEFAULTS[provider.name]?.baseUrl ?? 'https://api.openai.com/v1';

  const body: OpenAIRequest = {
    model: provider.model,
    messages,
    temperature: 0.7,
    max_tokens: 2048,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data: OpenAIResponse = await response.json();

  if (data.error) {
    throw new Error(`${provider.name} API error: ${data.error.message}`);
  }

  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error(`${provider.name} returned an empty response`);
  return text;
}
