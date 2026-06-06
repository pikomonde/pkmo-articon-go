import { getAllEmbeddings, embedText } from './embeddings';
import { getAllArticles } from '../storage/articles';
import type { Article } from '../../shared/types';
import { RAG_TOP_K } from '../../shared/constants';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

export interface SearchResult {
  article: Article;
  chunkText: string;
  score: number;
}

export async function searchArticles(
  query: string,
  projectId?: string,
  topK: number = RAG_TOP_K
): Promise<SearchResult[]> {
  const [queryVector, allEmbeddings, allArticles] = await Promise.all([
    embedText(query),
    getAllEmbeddings(),
    getAllArticles(),
  ]);
  const articleById = new Map(allArticles.map((a) => [a.id, a]));

  return allEmbeddings
    .map((e) => {
      const article = articleById.get(e.articleId);
      if (!article) return null;
      if (projectId && article.projectId !== projectId) return null;
      return { article, chunkText: e.text, score: cosineSimilarity(queryVector, e.vector) };
    })
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

export function formatContextForLLM(results: SearchResult[]): string {
  if (results.length === 0) return 'No relevant articles found.';
  return results
    .map((r, i) => {
      const date = r.article.savedAt ? new Date(r.article.savedAt).toLocaleDateString() : 'unknown date';
      return [
        `--- Result ${i + 1}: "${r.article.title}" ---`,
        `URL: ${r.article.url}`,
        `Saved: ${date}`,
        ``,
        r.chunkText, // the actual matched chunk, not a blind content.slice()
        ``,
      ].join('\n');
    })
    .join('\n');
}
