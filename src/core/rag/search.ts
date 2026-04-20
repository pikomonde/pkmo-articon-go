import { getAllEmbeddings, embedText } from './embeddings';
import { getArticle } from '../storage/articles';
import type { Article } from '../../shared/types';
import { RAG_TOP_K } from '../../shared/constants';

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
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
  score: number;
}

// Search for top-K most relevant articles for a given query
export async function searchArticles(
  query: string,
  projectId?: string,
  topK: number = RAG_TOP_K
): Promise<SearchResult[]> {
  const [queryVector, allEmbeddings] = await Promise.all([
    embedText(query),
    getAllEmbeddings(),
  ]);

  // Score each embedding
  const scored = await Promise.all(
    allEmbeddings.map(async (embedding) => {
      const article = await getArticle(embedding.articleId);
      if (!article) return null;
      // Filter by project if specified
      if (projectId && article.projectId !== projectId) return null;
      const score = cosineSimilarity(queryVector, embedding.vector);
      return { article, score };
    })
  );

  return scored
    .filter((r): r is SearchResult => r !== null)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// Format search results as a context string for the LLM
export function formatContextForLLM(results: SearchResult[]): string {
  if (results.length === 0) return 'No relevant articles found.';

  return results
    .map((r, i) => {
      const date = r.article.savedAt
        ? new Date(r.article.savedAt).toLocaleDateString()
        : 'unknown date';
      return [
        `--- Article ${i + 1}: "${r.article.title}" ---`,
        `URL: ${r.article.url}`,
        `Saved: ${date}`,
        ``,
        r.article.content.slice(0, 1500),
        ``,
      ].join('\n');
    })
    .join('\n');
}
