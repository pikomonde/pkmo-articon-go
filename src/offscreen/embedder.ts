// Articon — Offscreen embedder
//
// Transformers.js (and its ONNX/WASM backend) reference `window`, which does
// NOT exist inside the MV3 background service worker. This offscreen document
// is a real (hidden) page, so it HAS a DOM/`window` and can run the model.
//
// The background service worker creates this document and relays embedding
// work to it via runtime messages tagged `target: 'offscreen'`.

import { generateAndSaveEmbedding } from '../core/rag/embeddings';
import { getDB } from '../core/storage/db';
import { STORES } from '../shared/constants';
import type { Article, Embedding } from '../shared/types';

type OffscreenMessage =
  | { target: 'offscreen'; type: 'EMBED_AND_SAVE'; articleId: string; content: string }
  | { target: 'offscreen'; type: 'BACKFILL_EMBEDDINGS' };

chrome.runtime.onMessage.addListener((message: OffscreenMessage, _sender, sendResponse) => {
  // Only handle messages explicitly addressed to the offscreen document.
  if (message?.target !== 'offscreen') return;

  (async () => {
    try {
      switch (message.type) {
        case 'EMBED_AND_SAVE': {
          await generateAndSaveEmbedding(message.articleId, message.content);
          sendResponse({ success: true });
          break;
        }
        case 'BACKFILL_EMBEDDINGS': {
          const count = await backfillMissingEmbeddings();
          sendResponse({ success: true, count });
          break;
        }
      }
    } catch (err) {
      console.error('[offscreen] embedding failed:', err);
      sendResponse({ success: false, error: String(err) });
    }
  })();

  return true; // keep the channel open for the async sendResponse
});

// Re-embed any article that doesn't yet have an embedding.
// This heals articles saved while embedding was broken.
async function backfillMissingEmbeddings(): Promise<number> {
  const db = await getDB();
  const articles: Article[] = await db.getAll(STORES.ARTICLES);
  const embeddings: Embedding[] = await db.getAll(STORES.EMBEDDINGS);
  const haveIds = new Set(embeddings.map((e) => e.articleId));

  let done = 0;
  for (const article of articles) {
    if (haveIds.has(article.id)) continue;
    await generateAndSaveEmbedding(article.id, article.content);
    done++;
  }
  if (done > 0) console.log(`[offscreen] backfilled ${done} missing embedding(s)`);
  return done;
}
