import { saveArticle, articleExistsByUrl } from '../core/storage/articles';
import { isOnboardingComplete } from '../core/storage/settings';
import { ONBOARDING_PATH, READER_PATH } from '../shared/constants';
import type { ExtensionMessage, ExtractedArticle } from '../shared/types';
import contentScript from '../content/index?script';

const OFFSCREEN_PATH = 'src/offscreen/index.html';

// Explicitly disable "open sidebar on icon click" so the popup takes over.
// The sidebar is opened via the "Open Sidebar" button inside the popup.
// chrome.sidePanel
//   .setPanelBehavior({ openPanelOnActionClick: false })
//   .catch(console.error);

// --- Offscreen document: hosts Transformers.js (needs a DOM/window) --------

let offscreenCreating: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  // De-dupe concurrent creates (createDocument throws if one is already pending).
  if (!offscreenCreating) {
    offscreenCreating = chrome.offscreen
      .createDocument({
        url: OFFSCREEN_PATH,
        reasons: [chrome.offscreen.Reason.WORKERS],
        justification: 'Run Transformers.js locally to generate article embeddings.',
      })
      .finally(() => {
        offscreenCreating = null;
      });
  }
  await offscreenCreating;
}

// Send a message to the offscreen doc, retrying until its listener is ready.
// (createDocument resolves before the module script finishes evaluating.)
async function sendToOffscreen(message: object, retries = 6): Promise<unknown> {
  await ensureOffscreenDocument();
  let lastErr: unknown;
  for (let i = 0; i < retries; i++) {
    try {
      return await chrome.runtime.sendMessage(message);
    } catch (err) {
      lastErr = err; // "Receiving end does not exist" while the doc boots
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  throw lastErr ?? new Error('Offscreen document did not respond');
}

// --- Message routing -------------------------------------------------------

chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(
  message: ExtensionMessage,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) {
  try {
    switch (message.type) {
      case 'EXTRACT_ARTICLE': {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (!tab?.id) {
          sendResponse({ error: 'No active tab' });
          return;
        }
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [contentScript] });
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        sendResponse(result);
        break;
      }

      case 'SAVE_ARTICLE': {
        const { projectId, tabId } = message;
        let tab: chrome.tabs.Tab | undefined;
        if (tabId != null) {
          tab = await chrome.tabs.get(tabId);
        } else {
          [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        }
        if (!tab?.id) {
          sendResponse({ error: 'No active tab found. Buka halaman web dulu.' });
          return;
        }

        // Guard: content script might not be injected yet (e.g. tab was open
        // before the extension loaded). Ask user to refresh the page.
        let extracted: ExtractedArticle | null;
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: [contentScript], // on-demand injection
          });
          extracted = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        } catch (err) {
          sendResponse({
            error: 'Could not reach the page. Please refresh the tab (F5) and try again.',
          });
          return;
        }

        if (!extracted || !extracted.content) {
          sendResponse({ error: 'Could not extract article content from this page.' });
          return;
        }

        // Check for duplicate URL
        const existing = await articleExistsByUrl(projectId, extracted.url);
        if (existing) {
          sendResponse({ warning: 'This article is already saved in this project.', article: existing });
          return;
        }

        // Save article to IndexedDB
        const article = await saveArticle({
          projectId,
          title: extracted.title || tab.title || 'Untitled',
          content: extracted.content,
          markdown: extracted.markdown,
          url: extracted.url,
          author: extracted.author,
          publishedAt: extracted.publishedAt,
        });

        // Generate embedding in the OFFSCREEN document (it has a DOM/window).
        // Fire-and-forget so the popup gets a fast response.
        sendToOffscreen({
          target: 'offscreen',
          type: 'EMBED_AND_SAVE',
          articleId: article.id,
          content: article.content,
        }).catch((err) => console.error('Embedding generation failed:', err));

        sendResponse({ success: true, article });
        break;
      }

      case 'OPEN_SIDEBAR': {
        const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        if (tab?.windowId) {
          await chrome.sidePanel.open({ windowId: tab.windowId });
        }
        sendResponse({ success: true });
        break;
      }

      case 'OPEN_READER': {
        const { articleId } = message;
        const readerUrl = chrome.runtime.getURL(`${READER_PATH}?articleId=${articleId}`);
        await chrome.tabs.create({ url: readerUrl });
        sendResponse({ success: true });
        break;
      }
    }
  } catch (err) {
    console.error('Background message handler error:', err);
    sendResponse({ error: String(err) });
  }
}

// --- Lifecycle: onboarding + auto-heal missing embeddings ------------------

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const complete = await isOnboardingComplete();
    if (!complete) {
      const onboardingUrl = chrome.runtime.getURL(ONBOARDING_PATH);
      chrome.tabs.create({ url: onboardingUrl });
    }
  }
  // Re-embed any articles that were saved before this fix landed.
  backfillEmbeddings();
});

chrome.runtime.onStartup.addListener(() => {
  backfillEmbeddings();
});

function backfillEmbeddings() {
  sendToOffscreen({ target: 'offscreen', type: 'BACKFILL_EMBEDDINGS' }).catch((err) =>
    console.error('Backfill failed:', err)
  );
}
