# PolyglotReader - AI Language Learning Chrome Extension

A Chrome extension for learning languages while you browse the web. Built for the Google Chrome Built-in AI Challenge 2025, it uses Chrome's on-device AI models (including Gemini Nano) to give you instant translations, vocabulary help, grammar explanations, and verb conjugations right on any webpage.

## What It Does

Reading something in a foreign language? Just highlight the text and PolyglotReader shows you a helpful tooltip with exactly what you need. Want a translation? You got it. Need to understand tricky vocabulary? It's there. Wondering about grammar or verb forms? Covered. Everything runs locally on your device, so it's fast and private.

Currently supports 12 languages: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, and Hindi. All the AI magic happens right in Chrome, so your data stays on your device and works offline once you've downloaded the models.

## Chrome AI APIs Used

This extension uses six different Chrome AI APIs working together:

**Stable APIs (Chrome 138+)**

- **Translator API**: Handles the actual translation, supports streaming for longer text
- **Summarizer API**: Creates quick summaries of what you selected
- **Language Detector API**: Figures out what language you're looking at

**Origin Trial APIs**

- **Prompt API (LanguageModel)**: Powers the vocabulary analysis, grammar help, and general learning stuff using Gemini Nano
- **Writer API**: Helps generate example sentences
- **Rewriter API**: Makes explanations clearer when needed
- **Proofreader API**: Double-checks grammar corrections

Why use all these APIs together? Because running everything on your device means it's faster, more private, and doesn't cost you API credits. Plus it works offline.

## Features

### Four Learning Modes

- **Translate Mode**: Straightforward translation with optional pronunciation and streaming for longer text
- **Vocabulary Mode**: Deep dive into words with definitions, pronunciation, examples, synonyms, and difficulty levels
- **Grammar Mode**: Breaks down sentence structure, shows corrections, explains patterns
- **Verbs Mode**: Conjugation tables, tense info, and usage examples

### Smart Stuff

- Auto-detects languages (works with non-Latin scripts too)
- Adjusts detail level based on how much text you select
- Falls back gracefully when certain languages aren't supported by specific APIs
- Caches results so you don't waste time on repeat requests

### Clean Interface

- Side-by-side view of original text and translation
- Copy button for saving translations
- Settings to customize language defaults and display options
- Works on any website

## Installation

**What You Need**

- Chrome Canary 138+
- At least 22GB free disk space (AI models are chunky)
- Windows, macOS, or Linux

**Setup**

1. Make sure you have 22GB+ free space
2. Download or clone this repo
3. Open Chrome Canary and go to chrome://extensions/
4. Turn on "Developer mode" (top right)
5. Click "Load unpacked" and pick the polyglotreader folder
6. Done! Icon should show up in your toolbar

**Enabling the AI APIs**

The APIs need some flags enabled in Chrome Canary:

1. Go to chrome://flags/
2. Enable these:
   - Prompt API for Gemini Nano
   - Summarizer API
   - Translation API
   - Language Detection API
   - Optimization Guide On Device Model (set to Enabled BypassPerfRequirement)
3. Restart Chrome (fully close it, don't just close tabs)
4. Go to chrome://components/ and find "Optimization Guide On Device Model"
5. Click "Check for update" to download Gemini Nano (about 1.7GB)
6. Wait for it to finish

Check CHROME_AI_SETUP.md for more detailed setup help if you need it.

## Usage

1. Go to any webpage with foreign language text
2. Highlight some text (between 2-500 characters)
3. Tooltip pops up automatically
4. Pick your target language
5. Choose a mode (Translate, Vocabulary, Grammar, or Verbs)
6. Get instant AI analysis
7. Copy the translation if you want to save it

Your preferences stick around between sessions. Click the extension icon to change default settings.

## How It Works

**Files**

```
polyglotreader/
├── manifest.json              Config and trial tokens
├── background.js              Service worker
├── content.js                 Handles text selection and tooltip
├── ai-utils.js                Manages AI API sessions
├── ai-enhanced.js             Higher-level AI stuff and caching
├── lang-utils.js              Language detection logic
├── vocab-utils.js             Vocabulary formatting
├── tooltip.css                Tooltip styles
├── popup.html/js/css          Settings UI
└── icons/                     Extension icons
```

**Behind the Scenes**

1. Detects the language of your selected text
2. Initializes the AI APIs you need based on your chosen mode
3. Caches results so repeated requests are instant
4. Falls back gracefully when something's not available

Translation tries streaming first for better UX, but falls back to regular mode if needed. Vocabulary mode is adaptive: quick for long selections, detailed for short ones.

## Privacy and Performance

**Privacy**

- Everything runs locally on your device
- Nothing gets sent to external servers
- Settings saved locally in Chrome
- No tracking or data collection

**Performance**

- Only loads AI sessions when needed to save memory
- Caches results so you don't process the same text twice
- Handles rapid changes without getting confused
- Models download once and stick around

**Offline**
Most stuff works offline once you've downloaded the models. Translation needs internet for downloading language-specific models first, but vocabulary, grammar, and verb modes work completely offline.

## Why This Project

Built for the Google Chrome Built-in AI Challenge 2025. Here's how it fits:

**API Integration**: Uses six Chrome AI APIs together (Translator, Summarizer, Language Detector, Prompt/LanguageModel, Writer, Rewriter, Proofreader), each doing what it does best.

**Problem It Solves**: Ever tried learning a language while reading online? You have to keep switching tabs to look stuff up. This brings everything right to where you're reading.

**User Experience**: Instant results, clean interface, everything adapts to what you need. No waiting, no context switching.

**Technical Approach**: Shows what you can do when APIs work together, handles edge cases gracefully, adapts processing based on what you select.

**Scalability**: Works with 12 languages and four learning modes. Easy to add more.

## Limitations

- Summarizer only works with English, Spanish, and Japanese right now (falls back to LanguageModel for others)
- Not all language pairs support streaming translation yet
- First model download is big and takes a while
- Performance depends on your computer

## Future Ideas

- Track vocabulary with spaced repetition
- Personal difficulty ratings based on what you struggle with
- Audio pronunciation
- Export your saved words and phrases
- Connect with other language learning apps

## Contributing

Found a bug? Have an idea? Open an issue or submit a pull request. Just keep the code clean and document what you add.

## License

MIT License

## Thanks

Built for the Google Chrome Built-in AI Challenge 2025. Big thanks to the Chrome team for making these AI APIs available and actually useful.

## Dev Notes

**Version**

v1.0.0 - Initial release with all the main features

**Testing**

Test files included:

- test.html: Basic selection testing
- enhanced-test.html: Try out features
- test-apis.js: Check if APIs are working

Run validate-extension.js (Node.js) to validate before submitting.

**Compatibility**

Needs Chrome Canary 138+ with flags enabled right now. When these APIs go stable, the flags won't be needed.
