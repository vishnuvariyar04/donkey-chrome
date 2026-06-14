# Donkey 🫏

Persistent memory layer across AI tools. Save AI conversation context as structured memory with `@donkey save`, and inject it into any AI chat with `@donkey use project X` or `@donkey avoid mistakes in X`.

## Structure

- **`donkey-extension/`** — Chrome extension (Manifest V3). All memory is stored locally in IndexedDB; retrieval is pure keyword search and field filtering, with no AI at retrieval time.
- **`donkey-proxy/`** — Cloudflare Worker that holds the Groq API key server-side and extracts structured memory from scraped conversations. No user API keys required.

Supported providers (V1): claude.ai, chatgpt.com / chat.openai.com, gemini.google.com.

## Setup

### 1. Deploy the proxy

```bash
cd donkey-proxy
wrangler secret put GROQ_API_KEY   # paste your Groq key when prompted
wrangler deploy                    # copy the worker URL
```

Test locally first with `wrangler dev` and a sample POST:

```bash
curl -X POST http://localhost:8787 \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","text":"Let us use Postgres for the auth service"},{"role":"assistant","text":"Agreed, Postgres fits because we need transactions."}]}'
```

### 2. Configure and load the extension

1. Edit `donkey-extension/background.js` and set `PROXY_URL` to your deployed worker URL.
2. Open `chrome://extensions`, enable Developer mode, click **Load unpacked**, and select the `donkey-extension/` folder.

## Commands

Type these into the chat input on a supported site and press Enter:

| Command | Effect |
| --- | --- |
| `@donkey save` | Scrape the current conversation, extract structured memory via the proxy, store in IndexedDB |
| `@donkey use project X` | Inject the full memory for project X into the chat input |
| `@donkey avoid mistakes in X` | Inject only mistakes/rejected approaches from project X |
| `@donkey decisions from X` | Inject only decisions |
| `@donkey learnings from X` | Inject only learnings |
| `@donkey constraints from X` | Inject only constraints |

## Maintenance notes

- **Selector drift** — AI chat sites change their DOM frequently. If scraping returns empty, inspect the page in DevTools and update `PROVIDER_SELECTORS` in `donkey-extension/content/scraper.js` (and the input selectors in `injector.js` / `commandListener.js`).
- **ProseMirror execCommand** — `execCommand` is deprecated but still works. If it breaks on Claude, fall back to dispatching `beforeinput` events with `inputType: 'insertText'`.
- **MV3 fetch restriction** — content scripts cannot call external URLs; all proxy calls go through `background.js` via `chrome.runtime.sendMessage`. Keep it that way.
