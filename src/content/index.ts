import { extractArticle } from './extractor';

// Preventing listener registered multiple times by injecting it few times
if (!(window as any).__articonLoaded) {
  (window as any).__articonLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'EXTRACT_ARTICLE') {
      const result = extractArticle();
      sendResponse(result);
    }
    return true;
  });
}
