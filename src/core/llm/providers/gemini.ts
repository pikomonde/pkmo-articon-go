import type { LLMProvider } from '../../../shared/types';
import type { LLMMessage } from '../client';

interface GeminiPart {
  text: string;
  thought?: boolean; // Gemini thinking models return thought=true for internal reasoning
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<GeminiPart>;
}

interface GeminiRequest {
  system_instruction?: { parts: Array<{ text: string }> };
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<GeminiPart>;
    };
  }>;
  error?: { message: string; code: number };
}

export async function geminiComplete(
  provider: LLMProvider,
  messages: LLMMessage[]
): Promise<string> {
  // Separate system messages from the conversation
  const systemMessages = messages.filter((m) => m.role === 'system');
  const conversationMessages = messages.filter((m) => m.role !== 'system');

  const systemInstruction =
    systemMessages.length > 0
      ? { parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }] }
      : undefined;

  // Convert to Gemini format (user/model alternating)
  const contents: GeminiContent[] = conversationMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: GeminiRequest = {
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 2048 },
  };

  if (systemInstruction) {
    body.system_instruction = systemInstruction;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${provider.model}:generateContent?key=${provider.apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data: GeminiResponse = await response.json();

  if (data.error) {
    throw new Error(`Gemini API error ${data.error.code}: ${data.error.message}`);
  }

  const parts = data.candidates?.[0]?.content?.parts ?? [];
  // Thinking models (e.g. gemma, gemini-2.0-flash-thinking) return parts with
  // thought=true for internal reasoning — we want the final output part only.
  const outputPart = parts.find((p) => !p.thought) ?? parts[parts.length - 1];
  const text = outputPart?.text;
  if (!text) throw new Error('Gemini returned an empty response');
  return text;
}
