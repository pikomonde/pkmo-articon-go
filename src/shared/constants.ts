// Articon — Shared Constants

export const DB_NAME = 'articon-db';
export const DB_VERSION = 2;

// IndexedDB store names
export const STORES = {
  PROJECTS: 'projects',
  ARTICLES: 'articles',
  EMBEDDINGS: 'embeddings',
  CHAT_MESSAGES: 'chat_messages',
  SETTINGS: 'settings',
} as const;

// RAG configuration
export const RAG_TOP_K = 3;                      // Number of chunks to retrieve
export const MAX_CHAT_HISTORY = 10;              // Sliding window size
export const EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2';  // ~23MB, fast, good quality, max 256 words

// Chunking — all-MiniLM-L6-v2 truncates at 256 tokens (~190 words),
// so keep chunks safely under that.
export const CHUNK_WORDS = 200;        // ~230–260 tokens
export const CHUNK_OVERLAP_WORDS = 40; // ~20% overlap for continuity

// LLM provider defaults — model name is just a suggestion, user can override in onboarding
export const LLM_DEFAULTS: Record<string, { model: string; baseUrl?: string }> = {
  gemini: { model: 'gemini-3.5-flash' },
  openai: { model: 'gpt-4o-mini' },
  groq: { model: 'llama-3.3-70b-versatile', baseUrl: 'https://api.groq.com/openai/v1' },
};

// Model name placeholder hints shown in the onboarding input
export const MODEL_HINTS: Record<string, string> = {
  gemini: 'e.g. gemini-2.0-flash, gemini-2.5-pro, gemma-4-31b-it',
  openai: 'e.g. gpt-4o-mini, gpt-4o',
  groq:   'e.g. llama-3.3-70b-versatile, mixtral-8x7b-32768',
};

// Docs links for listing available models
export const MODEL_DOCS: Record<string, string> = {
  gemini: 'https://ai.google.dev/gemini-api/docs/models',
  openai: 'https://platform.openai.com/docs/models',
  groq:   'https://console.groq.com/docs/models',
};

// Provider info for onboarding UI
export const PROVIDER_INFO = [
  {
    name: 'gemini' as const,
    label: 'Gemini',
    note: 'Free tier available',
    keyUrl: 'https://aistudio.google.com/app/apikey',
  },
  {
    name: 'openai' as const,
    label: 'OpenAI',
    note: 'Paid only',
    keyUrl: 'https://platform.openai.com/api-keys',
  },
  {
    name: 'groq' as const,
    label: 'Groq',
    note: 'Fast + free tier',
    keyUrl: 'https://console.groq.com/keys',
  },
];

// Settings key in the settings store
export const SETTINGS_KEY = 'user-settings';

// Reader tab URL (chrome-extension://ID/src/reader/index.html?articleId=...)
export const READER_PATH = 'src/reader/index.html';
export const ONBOARDING_PATH = 'src/onboarding/index.html';
