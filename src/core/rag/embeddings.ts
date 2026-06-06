import { getDB } from '../storage/db';
import { STORES, EMBEDDING_MODEL, CHUNK_WORDS, CHUNK_OVERLAP_WORDS } from '../../shared/constants';
import type { Embedding } from '../../shared/types';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

let pipelineInstance: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipelineInstance) return pipelineInstance;
  const { pipeline } = await import('@xenova/transformers');
  pipelineInstance = await pipeline('feature-extraction', EMBEDDING_MODEL, { quantized: true });
  return pipelineInstance;
}

// Split into overlapping word-based chunks. Stays under the model's 256-token cap.
export function chunkText(
  text: string,
  wordsPerChunk: number = CHUNK_WORDS,
  overlap: number = CHUNK_OVERLAP_WORDS
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= wordsPerChunk) return [words.join(' ')];

  const step = Math.max(1, wordsPerChunk - overlap);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += step) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim()) chunks.push(chunk);
    if (i + wordsPerChunk >= words.length) break;
  }
  return chunks;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(result.data as Float32Array);
}

// Embed every chunk and store one record per chunk.
export async function generateAndSaveEmbedding(articleId: string, content: string): Promise<void> {
  const chunks = chunkText(content);
  const db = await getDB();

  await deleteEmbeddingsForArticle(articleId); // safety on re-embed

  for (let i = 0; i < chunks.length; i++) {
    const vector = await embedText(chunks[i]);
    const embedding: Embedding = {
      id: `${articleId}::${i}`,
      articleId,
      chunkIndex: i,
      text: chunks[i],
      vector,
    };
    await db.put(STORES.EMBEDDINGS, embedding);
  }
}

export async function getEmbeddingsForArticle(articleId: string): Promise<Embedding[]> {
  const db = await getDB();
  return db.getAllFromIndex(STORES.EMBEDDINGS, 'by_article', articleId);
}

export async function deleteEmbeddingsForArticle(articleId: string): Promise<void> {
  const db = await getDB();
  const existing = await db.getAllKeysFromIndex(STORES.EMBEDDINGS, 'by_article', articleId);
  const tx = db.transaction(STORES.EMBEDDINGS, 'readwrite');
  await Promise.all([...existing.map((k) => tx.store.delete(k)), tx.done]);
}

export async function getAllEmbeddings(): Promise<Embedding[]> {
  const db = await getDB();
  return db.getAll(STORES.EMBEDDINGS);
}
