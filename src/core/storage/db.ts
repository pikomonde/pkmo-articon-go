import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from '../../shared/constants';
import type { Project, Article, Embedding, ChatMessage } from '../../shared/types';

interface ArticonDBSchema extends DBSchema {
  [STORES.PROJECTS]: {
    key: string;
    value: Project;
  };
  [STORES.ARTICLES]: {
    key: string;
    value: Article;
    indexes: { by_project: string };
  };
  [STORES.EMBEDDINGS]: {
    key: string;
    value: Embedding;
    indexes: { by_article: string };
  };
  [STORES.CHAT_MESSAGES]: {
    key: string;
    value: ChatMessage;
    indexes: { by_project: string; by_timestamp: number };
  };
  [STORES.SETTINGS]: {
    key: string;
    value: unknown;
  };
}

let dbInstance: IDBPDatabase<ArticonDBSchema> | null = null;

export async function getDB(): Promise<IDBPDatabase<ArticonDBSchema>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<ArticonDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Projects store
      if (!db.objectStoreNames.contains(STORES.PROJECTS)) {
        db.createObjectStore(STORES.PROJECTS, { keyPath: 'id' });
      }

      // Articles store with projectId index
      if (!db.objectStoreNames.contains(STORES.ARTICLES)) {
        const articleStore = db.createObjectStore(STORES.ARTICLES, { keyPath: 'id' });
        articleStore.createIndex('by_project', 'projectId');
      }

      // // Embeddings store keyed by articleId
      // if (!db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
      //   db.createObjectStore(STORES.EMBEDDINGS, { keyPath: 'articleId' });
      // }
      // Embeddings: v1 was one record per article (keyPath 'articleId').
      // v2 is one record per chunk (keyPath 'id'). Drop & rebuild via backfill.
      if (oldVersion < 2 && db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
        db.deleteObjectStore(STORES.EMBEDDINGS);
      }
      if (!db.objectStoreNames.contains(STORES.EMBEDDINGS)) {
        const store = db.createObjectStore(STORES.EMBEDDINGS, { keyPath: 'id' });
        store.createIndex('by_article', 'articleId');
      }

      // Chat messages with projectId and timestamp indexes
      if (!db.objectStoreNames.contains(STORES.CHAT_MESSAGES)) {
        const chatStore = db.createObjectStore(STORES.CHAT_MESSAGES, { keyPath: 'id' });
        chatStore.createIndex('by_project', 'projectId');
        chatStore.createIndex('by_timestamp', 'timestamp');
      }

      // Settings key-value store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }
    },
  });

  return dbInstance;
}
