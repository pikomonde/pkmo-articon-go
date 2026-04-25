import { complete, toHistoryMessages } from '../llm/client';
import { searchArticles, formatContextForLLM } from './search';
import { getRecentHistory, saveMessage } from '../storage/chat';
import type { ChatMessage } from '../../shared/types';

const QUERY_EXTRACTION_SYSTEM = `You are a search query extractor for an article research assistant.
Given a user's question and recent chat history, output ONLY a concise search query (3-10 words) 
that would help find relevant articles to answer the question.
Output just the search query, no explanation, no quotes.`;

const ANSWER_SYSTEM = `You are Articon, an AI research assistant that helps users explore their saved articles.
You answer questions based on the user's personal article collection.
Be conversational, accurate, and cite article titles when relevant.
If the provided articles don't contain enough information, say so honestly.
Keep responses focused and useful — avoid padding.`;

export interface PipelineResult {
  answer: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  retrievedCount: number;
}

export async function runChatPipeline(
  projectId: string,
  userInput: string
): Promise<PipelineResult> {
  // Step 0: Fetch recent chat history (sliding window)
  const history = await getRecentHistory(projectId);
  const historyMessages = toHistoryMessages(history);

  // Step 1: Ask the LLM what to search for
  const queryMessages = [
    { role: 'system' as const, content: QUERY_EXTRACTION_SYSTEM },
    ...historyMessages,
    { role: 'user' as const, content: userInput },
  ];

  console.log("---> 1.A queryMessages", queryMessages);

  let searchQuery: string;
  try {
    searchQuery = (await complete(queryMessages)).trim();
    console.log("---> 1.B searchQuery A", searchQuery);
  } catch {
    // Fallback: use the user's message directly as the search query
    searchQuery = userInput;
    console.log("---> 1.C searchQuery B", searchQuery);
  }

  // Step 2: RAG search
  const results = await searchArticles(searchQuery, projectId);
  const context = formatContextForLLM(results);
  console.log("---> 2.A results", results);
  console.log("---> 2.B context", context);

  // Step 3: Generate final answer with retrieved context
  const answerMessages = [
    { role: 'system' as const, content: ANSWER_SYSTEM },
    ...historyMessages,
    {
      role: 'user' as const,
      content: `${userInput}\n\n---\nRelevant articles from your collection:\n${context}`,
    },
  ];
  console.log("---> 3.A answerMessages", answerMessages);

  const answer = await complete(answerMessages);

  // Persist both messages
  const [userMessage, assistantMessage] = await Promise.all([
    saveMessage(projectId, 'user', userInput),
    saveMessage(projectId, 'assistant', answer),
  ]);

  return {
    answer,
    userMessage,
    assistantMessage,
    retrievedCount: results.length,
  };
}
