import { getDB } from './db';
import { STORES, MAX_CHAT_HISTORY } from '../../shared/constants';
import type { ChatMessage } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export async function saveMessage(
  projectId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage> {
  const db = await getDB();
  const message: ChatMessage = {
    id: uuidv4(),
    projectId,
    role,
    content,
    timestamp: Date.now(),
  };
  await db.put(STORES.CHAT_MESSAGES, message);
  return message;
}

export async function getChatHistory(projectId: string): Promise<ChatMessage[]> {
  const db = await getDB();
  const messages = await db.getAllFromIndex(STORES.CHAT_MESSAGES, 'by_project', projectId);
  return messages.sort((a, b) => a.timestamp - b.timestamp);
}

// Returns the last N messages for the sliding window sent to the LLM
export async function getRecentHistory(
  projectId: string,
  limit: number = MAX_CHAT_HISTORY
): Promise<ChatMessage[]> {
  const all = await getChatHistory(projectId);
  return all.slice(-limit);
}

export async function clearChatHistory(projectId: string): Promise<void> {
  const db = await getDB();
  const messages = await db.getAllFromIndex(STORES.CHAT_MESSAGES, 'by_project', projectId);
  const tx = db.transaction(STORES.CHAT_MESSAGES, 'readwrite');
  await Promise.all([
    ...messages.map((m) => tx.store.delete(m.id)),
    tx.done,
  ]);
}
