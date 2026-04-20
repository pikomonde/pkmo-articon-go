import { saveArticle, articleExistsByUrl } from '../core/storage/articles';
import { generateAndSaveEmbedding } from '../core/rag/embeddings';
import { isOnboardingComplete } from '../core/storage/settings';
import { ONBOARDING_PATH, READER_PATH } from '../shared/constants';
import type { ExtensionMessage, ExtractedArticle } from '../shared/types';

// Explicitly disable "open sidebar on icon click" so the popup takes over.
// The sidebar is opened via the "Open Sidebar" button inside the popup.
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: false })
  .catch(console.error);

// Handle messages from popup, content scripts, and sidebar
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
        // Ask content script on the active tab to extract article
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
          sendResponse({ error: 'No active tab' });
          return;
        }
        const result = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        sendResponse(result);
        break;
      }

      case 'SAVE_ARTICLE': {
        const { projectId } = message;
        // Get the active tab's extracted article
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) {
          sendResponse({ error: 'No active tab' });
          return;
        }

        // Guard: content script might not be injected yet (e.g. tab was open
        // before the extension loaded). Ask user to refresh the page.
        let extracted: ExtractedArticle;
        try {
          extracted = await chrome.tabs.sendMessage(tab.id, { type: 'EXTRACT_ARTICLE' });
        } catch {
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
          url: extracted.url,
          author: extracted.author,
          publishedAt: extracted.publishedAt,
        });

        // Generate embedding in background (non-blocking for popup)
        generateAndSaveEmbedding(article.id, article.content).catch((err) =>
          console.error('Embedding generation failed:', err)
        );

        sendResponse({ success: true, article });
        break;
      }

      case 'OPEN_SIDEBAR': {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab.windowId) {
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

// Check onboarding on install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const complete = await isOnboardingComplete();
    if (!complete) {
      const onboardingUrl = chrome.runtime.getURL(ONBOARDING_PATH);
      chrome.tabs.create({ url: onboardingUrl });
    }
  }
});
