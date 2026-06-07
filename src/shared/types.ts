// Articon — Shared Types

export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface Article {
  id: string;
  projectId: string;
  title: string;
  content: string;       // clean text from Readability.js
  markdown: string;      // markdown for reader + download
  url: string;
  author?: string;
  savedAt: number;
  publishedAt?: number;
}

export interface Embedding {
  id: string;          // `${articleId}::${chunkIndex}`
  articleId: string;
  chunkIndex: number;
  text: string;        // the chunk text this vector represents
  vector: number[];    // float32 array from Transformers.js
}

export interface ChatMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface LLMProvider {
  name: 'gemini' | 'openai' | 'groq';
  apiKey: string;
  model: string;
}

export interface Settings {
  provider?: LLMProvider;
  onboardingComplete: boolean;
}

// Chrome extension message types
export type MessageType =
  | 'EXTRACT_ARTICLE'
  | 'SAVE_ARTICLE'
  | 'ARTICLE_SAVED'
  | 'OPEN_SIDEBAR'
  | 'OPEN_READER';

export interface ExtractArticleMessage {
  type: 'EXTRACT_ARTICLE';
}

export interface SaveArticleMessage {
  type: 'SAVE_ARTICLE';
  projectId: string;
}

export interface OpenReaderMessage {
  type: 'OPEN_READER';
  articleId: string;
}

export interface OpenSidebarMessage {
  type: 'OPEN_SIDEBAR';
}

export type ExtensionMessage =
  | ExtractArticleMessage
  | SaveArticleMessage
  | OpenReaderMessage
  | OpenSidebarMessage;

export interface ExtractedArticle {
  title: string;
  content: string;
  markdown: string;
  url: string;
  author?: string;
  publishedAt?: number;
}
