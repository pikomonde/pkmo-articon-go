import { getDB } from './db';
import { STORES } from '../../shared/constants';
import type { Article } from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

export async function saveArticle(data: Omit<Article, 'id' | 'savedAt'>): Promise<Article> {
  const db = await getDB();
  const article: Article = {
    ...data,
    id: uuidv4(),
    savedAt: Date.now(),
  };
  await db.put(STORES.ARTICLES, article);
  return article;
}

export async function getArticle(id: string): Promise<Article | undefined> {
  const db = await getDB();
  return db.get(STORES.ARTICLES, id);
}

export async function getArticlesByProject(projectId: string): Promise<Article[]> {
  const db = await getDB();
  const articles = await db.getAllFromIndex(STORES.ARTICLES, 'by_project', projectId);
  return articles.sort((a, b) => b.savedAt - a.savedAt);
}

export async function getAllArticles(): Promise<Article[]> {
  const db = await getDB();
  return db.getAll(STORES.ARTICLES);
}

export async function deleteArticle(id: string): Promise<void> {
  const db = await getDB();
  const chunkKeys = await db.getAllKeysFromIndex(STORES.EMBEDDINGS, 'by_article', id);
  const tx = db.transaction([STORES.ARTICLES, STORES.EMBEDDINGS], 'readwrite');
  await Promise.all([
    tx.objectStore(STORES.ARTICLES).delete(id),
    ...chunkKeys.map((k) => tx.objectStore(STORES.EMBEDDINGS).delete(k)),
    tx.done,
  ]);
}

// Check for duplicate URL within the same project
export async function articleExistsByUrl(projectId: string, url: string): Promise<Article | undefined> {
  const articles = await getArticlesByProject(projectId);
  return articles.find((a) => a.url === url);
}
