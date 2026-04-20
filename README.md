# ◈ Articon

> Save articles offline. Chat with your collection using AI. No account required.

Articon is a Chrome browser extension that lets you:
- **Save** any article to local browser storage with one click
- **Read offline** in a clean, distraction-free reader mode
- **Chat** with your saved articles using RAG (Retrieval-Augmented Generation)
- **Organize** articles into projects (like folders)

Everything runs locally — no backend, no account, no data leaves your machine. You bring your own LLM API key (Gemini, OpenAI, or Groq).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| UI | React 18 |
| Build | Vite + CRXJS |
| Storage | IndexedDB (via `idb`) |
| Article extraction | Readability.js (Mozilla) |
| Embeddings | Transformers.js (`all-MiniLM-L6-v2`) |
| LLM | Gemini / OpenAI / Groq (BYOK) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Chrome 114+ (for Side Panel API)
- A free API key from [Gemini](https://aistudio.google.com/app/apikey), [OpenAI](https://platform.openai.com/api-keys), or [Groq](https://console.groq.com/keys)

### Install

```bash
npm install
npm run build
```

### Load in Chrome

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder

### Development (watch mode)

```bash
npm run dev
```

Changes rebuild automatically. Reload the extension in `chrome://extensions` after each build.

---

## Project Structure

```
src/
├── background/       # Service worker — message routing, save orchestration
├── content/          # Content script — Readability.js article extraction
├── popup/            # Extension popup — save button + project selector
├── sidebar/          # Main 3-panel UI (Projects / Articles / Chat)
├── reader/           # Full-tab offline article reader
├── onboarding/       # First-launch API key setup
├── core/
│   ├── storage/      # IndexedDB CRUD (articles, projects, chat, settings)
│   ├── rag/          # Embeddings, cosine search, 2-step chat pipeline
│   └── llm/          # LLM client + Gemini / OpenAI-compatible providers
└── shared/           # Types and constants
```

---

## How It Works

### Saving an Article

1. User clicks the extension popup and selects a project
2. Popup sends a `SAVE_ARTICLE` message to the background service worker
3. Background asks the content script to run Readability.js on the current tab
4. Extracted article (title, content, author, URL) is saved to IndexedDB
5. Transformers.js generates a local embedding vector and stores it

### RAG Chat

1. User types a question in the Chat panel
2. **Step 1 LLM call**: extracts a search query from the user's question
3. **RAG search**: embeds the query, cosine-similarity against stored article embeddings, returns top-3
4. **Step 2 LLM call**: answers the question using the retrieved article context
5. Both messages are persisted to IndexedDB (sliding window of last 10 messages)

---

## Privacy

- All data is stored in `IndexedDB` in your browser — never on a server
- Your API key is stored in browser local storage and never transmitted anywhere except directly to the LLM provider you chose
- The extension requests `<all_urls>` only to allow the content script to extract articles from any page

---

## Roadmap

### Phase 1 (current)
- [x] Project scaffold (Vite + CRXJS + React + TypeScript)
- [x] `manifest.json` v3 with popup, sidebar, content script, reader tab
- [x] IndexedDB layer (articles, projects, chat history, settings)
- [x] Readability.js article extraction
- [x] Popup UI (save + project selector)
- [x] Sidebar UI (3-panel: Projects / Articles / Chat)
- [x] Offline reader mode
- [x] Onboarding flow (BYOK setup)
- [x] LLM client (Gemini + OpenAI-compatible / Groq)
- [x] Transformers.js local embeddings
- [x] Cosine similarity RAG search
- [x] 2-step chat pipeline
- [x] Chat history (sliding window, last 10 messages)

### Phase 2 (planned)
- [ ] Go backend for proxied LLM (no key needed for free tier)
- [ ] User accounts + Stripe subscription
- [ ] Chat history summarization (rolling window)
- [ ] Cross-device sync
- [ ] Export to Markdown / PDF
- [ ] Firefox support

---

## Contributing

This project is open source under the MIT License. Issues and PRs welcome.

---

## License

Apache 2.0 © 2025 pikomonde — see [LICENSE](./LICENSE) for details.
