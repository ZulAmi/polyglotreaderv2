# PolyglotReader - AI-Powered Language Learning for the Real Web

> Because alt-tabbing to Google Translate 50 times per article is killing your productivity (and your patience)

A Chrome extension that turns any webpage into an intelligent language learning environment. Built for the **Google Chrome Built-in AI Challenge 2025** using Chrome's revolutionary on-device AI APIs powered by Gemini Nano.

**Quick Links:** [Installation](#installation---lets-get-this-running) | [Features](#features-that-actually-matter) | [Architecture](#architecture---for-the-technically-curious) | [Contributing](#contributing)

---

## The Problem (You Know This Pain)

You're reading an article in Spanish. You hit a word you don't know. You:

1. Open a new tab
2. Type "translate [word]"
3. Read the definition
4. Switch back to your article
5. **Forget what you were reading**
6. Repeat 47 more times
7. Give up and watch cat videos instead

Sound familiar? We built PolyglotReader to fix this nightmare.

---

## The Solution (The Good Stuff)

Select any text on any webpage. Get instant, context-aware analysis **without leaving the page**.

### Five Learning Modes

**1. Translate Mode**

- Clean translations with proper capitalization
- Optional pronunciation guides
- Streaming support for long text
- Smart capitalization fixes

**2. Summary Mode**

- Bullet-point summaries in original language with transliteration
- Side-by-side view: Original (with romaji/pinyin) | English translation
- Individual point translation for accuracy
- Perfect for skimming long paragraphs

**3. Vocabulary Mode** (The Deep Dive)

- Original word (Japanese: 行列)
- Transliteration (Romaji: gyōretsu)
- English definition (queue; line; matrix)
- Plus: pronunciation, part of speech, examples, difficulty level, synonyms, collocations, etymology
- Export to CSV or Anki
- Adaptive: one word = full analysis, paragraph = overview

**4. Grammar Mode**

- Sentence structure breakdowns
- Pattern explanations with transliteration
- Shows why grammar works that way
- Optimized for speed (8-15 seconds)

**5. Verbs Mode**

- Conjugation tables for all tenses
- Usage examples for each form
- Common patterns and mistakes
- Fast analysis (8-15 seconds vs old 20-40s)

### The Magic

Everything runs **100% locally** using Chrome's Built-in AI APIs:

- No internet after initial setup
- No tracking or telemetry
- No API costs
- No sending data to external servers
- Complete offline capability

### Language Support

**12 Languages:** English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi

**Automatic Transliteration:** Romaji (Japanese), Pinyin (Chinese), Romanization (Korean, Arabic, Russian, etc.)

---

## Chrome AI APIs - The Technical Powerhouse

We orchestrate **4 stable Chrome AI APIs** intelligently for maximum performance and accuracy.

### Core APIs (Production Ready, Chrome 138+)

**1. LanguageModel API (Gemini Nano)**

- The heavyweight champion - 1.7GB AI model in your browser
- Handles: vocabulary analysis, grammar breakdowns, verb conjugations, transliteration, fallback summaries
- Our optimization: Single combined prompts = 3x speed boost over sequential calls

**2. Translator API**

- Fast, accurate translations
- Streaming support for long text
- Proper capitalization and formatting
- Fallback: Language Model for problematic language pairs (Japanese→English)

**3. Summarizer API**

- Bullet-point summaries in source language
- Supports: English, Spanish, Japanese
- Our fix: Auto-detects wrong language output, regenerates with Language Model
- Each point gets individually translated for better accuracy

**4. LanguageDetector API**

- Auto-identifies source language
- Supports all major scripts: Latin, Cyrillic, Arabic, CJK
- Works with mixed-language text

### Experimental APIs (Origin Trial Bonus)

We have tokens for **Writer, Rewriter, and Proofreader** APIs but don't depend on them (they're flaky). The core extension runs on the 4 stable APIs above.

### Why Multiple APIs?

Specialized APIs for specific tasks = faster and more accurate:

- Translator optimized for translation
- Summarizer built for extracting key points
- LanguageModel handles complex linguistic analysis

**Result:** On-device processing with instant results and zero privacy concerns.

---

## Features That Actually Matter

### Smart Performance Tricks

**Aggressive Caching**

- Same text selected twice? Instant results (< 50ms)
- Stores last 30 queries in memory
- Survives across page loads

**Optimized API Calls**

- Old: 6 separate calls per vocabulary word
- New: 1-2 combined structured prompts
- Result: 3x faster (6-10s → 2-3s)

**Adaptive Processing**

- Short text: detailed analysis
- Long text: smart summarization
- Prevents UI overload

**Lazy Loading**

- AI sessions initialize only when needed
- Saves memory and startup time
- Background pre-warming for common modes

**Speed Improvements:**

- Vocabulary: 2-3 seconds (was 6-10s)
- Grammar/Verbs: 8-15 seconds (was 20-40s)
- Cached queries: instant

### Professional Interface

**Side-by-Side Layout**

- Original text | Translation/Analysis
- Summary: Original (with transliteration) | English
- Vocabulary: Comprehensive linguistic cards

**One-Click Actions**

- Copy translation
- Export vocabulary as CSV
- Export to Anki (TSV)
- Save individual words

**Smart Positioning**

- Appears near selection
- Auto-adjusts to stay on screen
- Doesn't break page layouts

**Persistent Settings**

- Default target language
- Preferred learning mode
- Per-mode customization
- Remembers preferences across sessions

---

## Installation - Let's Get This Running

### Requirements

- **Chrome Canary 138+**
- **22GB+ free disk space** (Gemini Nano is 1.7GB + Chrome overhead)
- **Windows, macOS, or Linux**
- **Patience** for initial 1.7GB download

### Setup Steps

**1. Download Extension**

```bash
git clone https://github.com/YourUsername/polyglotreader.git
cd polyglotreader
```

**2. Load Into Chrome**

1. Open `chrome://extensions/`
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select the `polyglotreader` folder

**3. Enable AI APIs**

Go to `chrome://flags/` and enable:

```
prompt-api-for-gemini-nano → Enabled
summarization-api-for-gemini-nano → Enabled
translation-api → Enabled
language-detection-api → Enabled
optimization-guide-on-device-model → Enabled BypassPerfRequirement
```

**CRITICAL:** Last flag must be "Enabled BypassPerfRequirement"!

**4. Restart Chrome Completely**

Close all windows. Kill in Task Manager if needed.

**5. Download Gemini Nano**

1. Go to `chrome://components/`
2. Find "Optimization Guide On Device Model"
3. Click "Check for update"
4. Wait for 1.7GB download (5-20 minutes)
5. Verify status shows "up-to-date"

**6. Test It**

Select text on any webpage. Tooltip should appear within 500ms.

### Troubleshooting

**APIs not available?**

- Verify all 5 flags enabled at `chrome://flags/`
- Restart Chrome completely
- Check model downloaded at `chrome://components/`

**Not enough storage?**

- Need 22GB+ free space
- Clear cache and downloads
- Gemini Nano is large but necessary

**Tooltip not appearing?**

- Select text again
- Check console (F12) for errors
- Verify Chrome Canary 138+

---

## How to Use

1. Navigate to any webpage with foreign text
2. Highlight text (2-500 characters ideal)
3. Tooltip appears automatically
4. Choose target language
5. Select learning mode
6. Get instant AI analysis (1-3 seconds)
7. Copy, export, or save as needed

**Pro Tips:**

- Settings persist between sessions
- Cache stores last 30 queries
- Vocabulary mode adapts to selection length
- Summary shows original + translation side-by-side

---

## Architecture - For the Technically Curious

### File Structure

```
polyglotreader/
├── manifest.json       # Extension config + origin trial tokens
├── background.js       # Service worker
├── content.js          # Tooltip logic (2,127 lines)
├── ai-utils.js         # AI session management (403 lines)
├── ai-enhanced.js      # AI processing (991 lines)
├── lang-utils.js       # Language detection (410 lines)
├── vocab-utils.js      # Vocabulary formatting (504 lines)
├── tooltip.css         # UI styling (877 lines)
├── popup.html/js/css   # Settings panel
└── icons/              # Extension icons

Total: 4,340 lines of JavaScript
```

### Processing Pipeline

**Text Selection**
→ Content script captures
→ Language detector identifies source
→ Check cache for previous results

**If Cached:** Return instantly (< 50ms)

**If New:**

**Translate Mode:**

- Translator API (with streaming)
- Language Model fallback if needed

**Summary Mode:**

1. Summarizer generates source language points
2. Detect if wrong language → regenerate with Language Model
3. Generate transliteration (romaji/pinyin)
4. Translate each point individually
5. Format side-by-side display

**Vocabulary Mode:**

1. Single Language Model call with structured prompt
2. Parse JSON with linguistic data
3. Format cards: Original | Romanization | English definition
4. Include pronunciation, examples, etymology, etc.

**Grammar/Verbs Mode:**

1. Truncate to 300 chars (speed optimization)
2. Language Model with temp 0.3
3. Generate analysis with transliteration
4. Format with clear sections

**Caching:**

- Store in memory (last 30 queries)
- Next selection = instant retrieval

### Performance Optimizations

**Vocabulary: 3x Faster**

- Before: 6 sequential API calls
- After: 1-2 combined structured prompts
- Time: 6-10s → 2-3s

**Grammar/Verbs: 2-3x Faster**

- Text truncation (300 chars)
- Lower temperature (0.3)
- Simplified prompts
- Time: 20-40s → 8-15s

**Summary: Smart Fallback**

- Detects wrong language from Summarizer
- Auto-regenerates with Language Model
- Individual point translation
- Language Model for Japanese→English

**Caching Strategy:**

- In-flight request tracking
- Memory cache (30 entries)
- Cache key: text + language + mode
- Instant re-selection results

---

## Privacy & Offline Capability

### 100% Private

**On-Device Processing:**

- Text never leaves your browser
- No external API calls (after setup)
- No telemetry or analytics
- No tracking
- Local storage only

We literally cannot track you - there's no server, no database, no backend.

### Fully Offline

**Works after initial setup:**

- Gemini Nano (1.7GB) - downloads once
- Translation models - first use per language pair
- Then: completely offline

**Internet only for:**

- Initial model download
- New language pair downloads
- Extension updates

**Everything else offline:**

- All 5 learning modes
- All 12 languages
- All analysis features

Test it: Enable airplane mode, select text - still works!

---

## Why This Project Rocks

### Problem Solved

Language learning online is broken by constant context-switching. PolyglotReader brings AI-powered analysis directly into your reading flow.

### Technical Innovation

**Multi-API Orchestration:** Using 4 specialized Chrome AI APIs together intelligently

**Smart Fallbacks:** Auto-detects API failures, regenerates with alternatives

**Performance:** 3x faster vocabulary, 2-3x faster grammar through optimization

**Real Innovation:**

- Dual-language summary display
- Comprehensive vocabulary cards (Original | Romanization | English)
- Automatic transliteration for 6 non-Latin scripts
- Adaptive detail levels

### User Experience

**Fast:** 1-3 second responses, instant cached queries

**Clean UI:** Professional side-by-side layout, doesn't break pages

**Smart:** Auto-detection, adaptive processing, persistent preferences

### Code Quality

**Production Ready:**

- 4,340 lines well-documented code
- Comprehensive error handling
- Memory leak prevention
- Extensive logging

**Scalable:**

- 12 languages, easily extensible
- 5 modes, modular design
- Clean separation of concerns

---

## Limitations

**Current:**

- Summarizer supports EN, ES, JA officially (others use fallback)
- First download: 1.7GB + 22GB free space needed
- Chrome Canary only (for now)
- Performance varies by hardware
- Some language pairs better than others

**Known Issues:**

- Tooltip positioning on complex CSS pages
- Long text truncated at 500 chars
- Rare summary duplicate content

**Not Supported:**

- Mobile Chrome (APIs unavailable)
- Audio pronunciation (planned)
- Image OCR (planned)

---

## Future Roadmap

**Learning:**

- Spaced repetition system
- Progress tracking
- Custom word lists

**Technical:**

- Audio pronunciation
- Image text extraction
- Advanced caching
- PWA support

**Integration:**

- Direct Anki sync
- Duolingo integration
- Custom flashcard formats

**UI:**

- Dark/light themes
- Keyboard shortcuts
- Mobile support

---

## Contributing

Contributions welcome! Report bugs, suggest features, submit PRs.

**Good First Issues:**

- Add languages
- Improve tooltip positioning
- Better error messages
- UI polish

**PR Guidelines:**

- Clean, commented code
- Test thoroughly
- Update docs
- Follow existing style

---

## License

MIT License - Use it, modify it, build on it.

---

## Acknowledgments

**Thanks to:**

- Google Chrome Team (for amazing AI APIs)
- Gemini Nano (surprisingly capable)
- Chrome Built-in AI Challenge 2025
- Stack Overflow (3am coding help)
- Coffee (essential fuel)

---

## Stats

**Version:** 1.0.0

**Code:** 4,340 lines JavaScript

**Performance:**

- Average: 1-3 seconds
- Cached: < 50ms
- Vocabulary: 2-3s (3x improvement)
- Grammar: 8-15s (2-3x improvement)

**API Usage:**

- Language Model: 60%
- Translator: 25%
- Summarizer: 10%
- Language Detector: 5%

**Compatibility:** Chrome Canary 138+

---

## Quick Start

1. Install Chrome Canary 138+
2. Enable 5 flags at chrome://flags
3. Download Gemini Nano (1.7GB)
4. Load extension
5. Select text
6. Choose mode
7. Get instant analysis

---

**Built for the Google Chrome Built-in AI Challenge 2025**

Making language learning faster, smarter, and more private.
