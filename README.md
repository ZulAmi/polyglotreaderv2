# PolyglotReader — AI Language Learning Chrome Extension

A professional language learning Chrome extension that leverages Chrome’s on‑device AI APIs for fast translation, vocabulary, grammar, and verb analysis — all inside a sleek, side‑by‑side tooltip UI on any page.

## Highlights

- Streaming translation (sentence‑by‑sentence) when supported by the Translator API
- 4 learning modes with strict mode isolation:
  - Translate (clean translation only)
  - Vocabulary (definitions/examples)
  - Grammar (structure and corrections)
  - Verbs (tenses and conjugation notes)
- Side‑by‑side tooltip layout (original vs. results) with copy‑to‑clipboard
- Smart language detection with robust character fallback
- Vocabulary detail strategy: Adaptive by default (Fast / Detailed / Adaptive switcher in the tooltip)
- Built‑in caching + in‑flight de‑duplication to avoid duplicate work
- Request lifecycle guards to prevent stale UI updates when switching focus
- 12 languages: en, es, fr, de, it, pt, ru, zh, ja, ko, ar, hi
- All processing is local to Chrome’s on‑device AI (no external servers)

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable “Developer mode” in the top right
4. Click “Load unpacked” and select this folder
5. The PolyglotReader icon should appear in your toolbar

## Enable Chrome AI APIs (Canary/Dev builds)

Chrome’s AI APIs are experimental and often gated behind flags. See CHROME_AI_SETUP.md for step‑by‑step instructions to enable:

- Prompt API for on‑device model
- Translator API (and optional sentence streaming)
- Optimization Guide On Device Model (component download)

Tip: The Translator may require a user gesture while its model is “downloadable/downloading.” Selecting text (mouseup) satisfies this.

## Usage

1. Navigate to any webpage and highlight 2–500 characters of text
2. The tooltip appears near the selection
3. Pick a target language and a learning focus (Translate, Vocabulary, Grammar, Verbs)
4. View streaming translation (Translate mode) or learning analysis (other modes)
5. Use “Copy Translation” in Translate mode; pronunciation is optional via settings

Notes

- Translate runs only in Translate focus. Other focuses skip translation by design.
- Vocabulary defaults to Adaptive: short selections get Detailed analysis; long selections use a Fast compact JSON path with local pretty rendering. You can switch between Fast / Detailed / Adaptive from the tooltip.
- Rapid dropdown changes are debounced; repeated requests for identical inputs are cached.

## Settings (popup)

- Default translation language
- Preferred learning focus
- Auto‑detect source language
- Show pronunciation guide
- Show example sentences (for vocabulary)

Your settings are saved in Chrome storage and applied to the tooltip.

## Permissions

- `activeTab` — enable the tooltip and content processing on the active page
- `storage` — save user settings
- `host_permissions: <all_urls>` — allow the tooltip to work on any site

## File structure

```
polyglotreader/
├── manifest.json              # Extension configuration and permissions
├── background.js              # Extension lifecycle plumbing (AI runs in content)
├── content.js                 # Selection handling, AI integration, tooltip UI
├── tooltip.css                # Tooltip styles (side‑by‑side layout, vocab cards)
├── popup.html | popup.js | popup.css  # Settings UI
├── CHROME_AI_SETUP.md         # How to enable Chrome AI APIs
├── test.html                  # Simple test page
├── enhanced-test.html         # Enhanced interactive test page
├── test-apis.js               # Quick API sanity test in a page
├── validate-extension.js      # Node script to validate packaging
└── icons/                     # Extension icons
```

## Chrome AI APIs used

New APIs

- `window.LanguageModel` — general prompting and analysis
- `window.Translator` — translation (+ optional sentence streaming)

## Privacy

- No data is sent to external servers by this extension
- All AI processing happens locally in Chrome (on‑device model)
- Settings are stored with Chrome’s storage API
- No tracking or analytics

## Troubleshooting

AI APIs not working

- Use Chrome Canary/Dev 121+ and enable the flags in CHROME_AI_SETUP.md
- After enabling flags, visit `chrome://components/` and update the on‑device model
- Open DevTools console to see detailed API availability logs

Tooltip not appearing

- Ensure you highlighted 2–500 characters
- Check the console for any content‑script errors
- Make sure the site isn’t blocking third‑party scripts or selections

Translator requires a gesture

- Select text to provide a user gesture; the extension lazily creates the Translator then

Vocabulary seems slow

- The extension now uses a fast JSON path by default and caches results
- Rapid focus/language changes are debounced; repeated inputs are served from cache

Streaming not happening

- Ensure the Translator streaming flag is enabled (see CHROME_AI_SETUP.md)
- Some language pairs or builds may not support streaming yet; the code falls back gracefully

## Contributing

PRs welcome! Ideas, bug reports, and docs improvements are appreciated.

## License

MIT License

## Changelog

### v1.1.0

- Streaming translation UI with sentence‑by‑sentence updates
- Mode isolation (translate vs. learning); side‑by‑side tooltip
- Fast vocabulary strategy (compact JSON) + local pretty render
- Caching and in‑flight de‑duplication; debounced dropdown changes
- Request lifecycle guards to avoid stale renders
- LanguageModel warm‑up to reduce first‑token latency
- Removed “More Details” button from UI

### v1.0.0

- Initial release with Chrome AI integrations and tooltip interface
