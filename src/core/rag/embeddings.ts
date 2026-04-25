import { getDB } from '../storage/db';
import { STORES, EMBEDDING_MODEL, MAX_ARTICLE_CHUNK_LENGTH } from '../../shared/constants';
import type { Embedding } from '../../shared/types';
import type { FeatureExtractionPipeline } from '@xenova/transformers';

// Lazy-loaded pipeline — only downloaded once, cached in browser
let pipelineInstance: FeatureExtractionPipeline | null = null;

async function getEmbeddingPipeline(): Promise<FeatureExtractionPipeline> {
  if (pipelineInstance) return pipelineInstance;
  const { pipeline } = await import('@xenova/transformers');
  pipelineInstance = await pipeline('feature-extraction', EMBEDDING_MODEL, {
    quantized: true,
  });
  return pipelineInstance;
}

// Chunk article text into overlapping segments for better retrieval
export function chunkText(text: string, chunkSize: number = MAX_ARTICLE_CHUNK_LENGTH): string[] {
  const words = text.split(/\s+/);
  const wordsPerChunk = Math.floor(chunkSize / 6);
  const overlap = Math.floor(wordsPerChunk / 4);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += wordsPerChunk - overlap) {
    const chunk = words.slice(i, i + wordsPerChunk).join(' ');
    if (chunk.trim()) chunks.push(chunk);
    if (i + wordsPerChunk >= words.length) break;
  }

  return chunks.length > 0 ? chunks : [text.slice(0, chunkSize)];
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getEmbeddingPipeline();
  // Transformers.js returns a Tensor; { pooling, normalize } produces a
  // mean-pooled, L2-normalised vector directly.
  const result = await extractor(text, { pooling: 'mean', normalize: true });
  // result.data is a Float32Array — spread into a plain number[]
  return Array.from(result.data as Float32Array);
}

export async function generateAndSaveEmbedding(
  articleId: string,
  content: string
): Promise<void> {
  const textToEmbed = content.slice(0, MAX_ARTICLE_CHUNK_LENGTH * 9);
  console.log("----> textToEmbed", textToEmbed)
  const vector = await embedText(textToEmbed);
  console.log("----> vector", vector)

  const db = await getDB();
  const embedding: Embedding = { articleId, vector };
  await db.put(STORES.EMBEDDINGS, embedding);
}

export async function getEmbedding(articleId: string): Promise<Embedding | undefined> {
  const db = await getDB();
  return db.get(STORES.EMBEDDINGS, articleId);
}

export async function getAllEmbeddings(): Promise<Embedding[]> {
  const db = await getDB();
  return db.getAll(STORES.EMBEDDINGS);
}
