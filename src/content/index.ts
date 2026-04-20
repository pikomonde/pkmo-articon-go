import { extractArticle } from './extractor';

// Listen for messages from the background service worker
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_ARTICLE') {
    const result = extractArticle();
    sendResponse(result);
  }
  return true;
});
