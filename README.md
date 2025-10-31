# 🌍 PolyglotReader - Your Browser's New Language Superpower

> _Because switching tabs to Google Translate every 5 seconds is so 2023_

A Chrome extension that turns any webpage into your personal language learning playground. Built for the **Google Chrome Built-in AI Challenge 2025** using Chrome's fancy new on-device AI APIs (yes, Gemini Nano lives in your browser now! 🤯).

## What It Does (The Fun Version)

Ever tried reading a French article and felt like you were playing linguistic whack-a-mole? Highlight a word → new tab → Google Translate → back to article → forget what you were reading → cry.

**PolyglotReader fixes that.** Just select any text and BAM! 💥 Instant tooltip with everything you need:

- 🔤 Translation (obviously)
- 📚 Vocabulary deep-dive (with examples that actually make sense)
- 🏗️ Grammar breakdowns (no more "why is this sentence shaped weird??")
- 🔄 Verb conjugations (because languages love making verbs complicated)

**The cool part?** Everything runs locally on your device. No internet needed (after setup). No tracking. No API bills. Just you, your browser, and a 1.7GB AI model that's surprisingly good at languages.

🎯 **12 languages supported**: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, and Hindi. (We tried teaching it Klingon but Chrome said no.)

## 🤖 Chrome AI APIs: The Dream Team

This extension uses **4 production-ready Chrome AI APIs** working together like a well-oiled language-learning machine:

### ✅ **The Stable Squad** (Chrome 138+, actually works!)

- **🧠 LanguageModel/Prompt API (Gemini Nano)**: The MVP. Does vocabulary analysis, grammar breakdowns, verb stuff, and basically anything that needs actual thinking. This little AI lives rent-free in your browser and is surprisingly smart.

- **🔄 Translator API**: Handles translations with style. Supports streaming for longer text (watch it translate in real-time, it's oddly satisfying). Works with tons of language pairs.

- **📝 Summarizer API**: TL;DR generator for when you selected too much text. Currently works with English, Spanish, and Japanese (other languages fall back to LanguageModel, which is honestly just as good).

- **🔍 Language Detector API**: Figures out what language you're staring at. Surprisingly accurate, even with those weird sentences that mix three languages.

### ⚠️ **The Experimental Crew** (Origin Trial - may or may not show up)

- **✍️ Writer API**: Supposed to generate example sentences. In origin trial, only supports EN/ES/JA. We tried using it but it was slow, so now LanguageModel does this job.

- **📝 Rewriter API**: Can make definitions clearer. Also origin trial. Also kinda slow. LanguageModel handles this now too.

- **✏️ Proofreader API**: Grammar checking for English only (Chrome 144+). We use it when available, but LanguageModel is the reliable backup.

**TL;DR**: The extension is optimized to use the **4 stable APIs** that actually work in production. The experimental ones are nice-to-have bonuses but we don't depend on them (because hackathons have deadlines and experimental APIs have... moods 😅).

### 🚀 Why Multiple APIs Though?

Because running everything on your device means:

- ⚡ **Faster**: No round-trip to the cloud
- 🔒 **Private**: Your data never leaves your browser
- 💰 **Free**: No API credits burning
- ✈️ **Offline**: Works without internet (after initial model download)

Plus, using specialized APIs for specific tasks is just smarter. Would you use a sledgehammer to crack a nut? (Okay, maybe for fun, but not in production.)

## ✨ Features (What You Actually Get)

### 📱 Four Learning Modes (Pick Your Poison)

- **🔤 Translate Mode**: Straight-up translation. No frills, just facts. Optional pronunciation for when you want to pretend you can actually say the word. Streams longer text so you can watch the magic happen.

- **📚 Vocabulary Mode**: The deep dive. Get definitions, pronunciation guides, example sentences, synonyms, difficulty levels, and enough linguistic data to impress your language teacher. Perfect for when you want to actually _learn_ the word, not just know what it means.

- **🏗️ Grammar Mode**: "Why is this sentence backwards?" - we got you. Breaks down structure, explains the rules, shows you what's happening grammatically. Grammar nerds will love this. Everyone else will finally understand subjunctive mood (maybe).

- **🔄 Verbs Mode**: Conjugation tables, tense explanations, usage examples. Because every language decided to make verbs as complicated as possible and we're here to decode them.

### 🧠 Smart Stuff (The Under-the-Hood Magic)

- **Auto-detects languages** even when you don't know what you're reading (works with Cyrillic, Arabic, CJK, all the scripts)
- **Adaptive detail levels** - selected one word? Get the full analysis. Selected a paragraph? Get a helpful summary instead of a novel
- **Graceful fallbacks** when certain language pairs aren't available (we always find a way)
- **Smart caching** - select the same text twice? Instant results the second time
- **Optimized for speed** - single API calls instead of doing the round-robin dance

### 🎨 Clean Interface (We're Not Monsters)

- Side-by-side view (original text | translation)
- One-click copy button (because you want to save that translation)
- Settings panel for customizing defaults
- Works on literally any website
- Doesn't break your page layout (we tested on some _wild_ websites)

## 🚀 Installation (Let's Get This Party Started)

### **What You Need**

- Chrome Canary 138+ (the bleeding edge, baby 🩸)
- At least 22GB free disk space (Gemini Nano is a chunky boi)
- Windows, macOS, or Linux (sorry, ChromeOS users, we haven't tested that yet)
- Patience for the initial model download (~1.7GB of AI goodness)

### **Setup (The "I Promise It's Not That Hard" Guide)**

1. **Check your disk space** - Seriously, 22GB+. The AI model doesn't compress well.

2. **Download or clone this repo**

   ```bash
   git clone https://github.com/YourUsername/polyglotreader.git
   ```

3. **Open Chrome Canary** and go to `chrome://extensions/`

4. **Turn on "Developer mode"** (toggle in top right)

5. **Click "Load unpacked"** and select the `polyglotreader` folder

6. **Done!** 🎉 The icon should appear in your toolbar (probably hiding in the extensions menu because Chrome likes to do that)

### **Enabling the AI APIs (The Slightly Annoying Part)**

The stable APIs need some flags enabled. Don't worry, it's easier than it sounds:

1. Go to `chrome://flags/`

2. Search for and **Enable** these flags:

   - `#prompt-api-for-gemini-nano` (the big brain)
   - `#summarization-api-for-gemini-nano` (the TL;DR maker)
   - `#translation-api` (the polyglot)
   - `#language-detection-api` (the detective)
   - `#optimization-guide-on-device-model` → Set to **"Enabled BypassPerfRequirement"** (this is important!)

3. **Restart Chrome** (like, actually close it completely, not just the tab. Kill it in Task Manager if you have to)

4. Go to `chrome://components/`

5. Find **"Optimization Guide On Device Model"**

6. Click **"Check for update"** to download Gemini Nano (~1.7GB, grab a coffee ☕)

7. Wait for it to say "up-to-date"

8. **Refresh chrome://components/** to make sure it's actually installed

9. Try selecting some text on any webpage - the tooltip should pop up!

**Troubleshooting**: If it's not working, check `CHROME_AI_SETUP.md` for detailed debugging steps, or open the browser console (F12) to see what's yelling at you.

## 🎮 Usage (How to Actually Use This Thing)

1. **Go to any webpage** with text in a language you're learning (or just curious about)

2. **Highlight some text** (sweet spot: 2-500 characters. Less than 2 and we're confused, more than 500 and we'll summarize it)

3. **Tooltip pops up automatically** (like magic, but it's actually JavaScript)

4. **Pick your target language** from the dropdown (defaults to your preference)

5. **Choose a mode**:

   - Want a quick translation? → **Translate**
   - Want to actually learn the words? → **Vocabulary**
   - Confused about sentence structure? → **Grammar**
   - Verbs being weird? → **Verbs**

6. **Get instant AI-powered analysis** (usually takes 1-2 seconds, sometimes faster if cached)

7. **Copy the translation** if you want to save it for later (one-click button)

8. **Click the extension icon** anytime to change default settings

**Pro tip**: Your preferences stick around between sessions. Set your target language once and forget about it! 🎯

**Another pro tip**: The vocabulary mode is adaptive. Select one word = detailed analysis. Select a paragraph = quick overview. We're smart like that.

## 🔧 How It Works (For the Nerds)

### **File Structure**

```
polyglotreader/
├── manifest.json              # Extension config + origin trial tokens
├── background.js              # Service worker doing background things
├── content.js                 # The tooltip master (2000+ lines of selection handling)
├── ai-utils.js                # AI session manager (the API whisperer)
├── ai-enhanced.js             # High-level AI logic + smart caching
├── lang-utils.js              # Language detection sorcery
├── vocab-utils.js             # Vocabulary data formatting
├── tooltip.css                # Makes things pretty
├── popup.html/js/css          # Settings panel
└── icons/                     # Extension icons (we got 4 sizes!)
```

### **The Flow (Behind the Scenes)**

1. **You select text** → Content script catches the selection
2. **Language detection** → Figures out what language it is (LanguageDetector API)
3. **AI session initialization** → Spins up only the APIs needed for your chosen mode
4. **Smart caching check** → Already processed this text? Return cached result instantly
5. **AI processing** → Uses the optimal API combo:
   - **Translate mode**: Translator API (with streaming for long text)
   - **Summary mode**: Summarizer API → generates points in source language → Translator API translates each point individually
   - **Vocabulary mode**: Single LanguageModel call for example + definition + transliteration (optimized for speed!)
   - **Grammar mode**: Proofreader API (if available) → LanguageModel fallback
   - **Verbs mode**: LanguageModel (does all the conjugation magic)
6. **Results displayed** → Tooltip updates with formatted content
7. **Cache saved** → Next time is instant

### **Performance Tricks We Use**

- **Lazy loading**: Only loads AI sessions when you actually need them (saves memory)
- **Result caching**: Same text selected twice? Instant results (we remember!)
- **Debouncing**: Rapid selection changes don't spam the AI (we're not monsters)
- **Single API calls**: Vocabulary mode used to make 4-6 calls per word. Now it's just 1-2. Speed boost: 2-3x faster! 🚀
- **Adaptive processing**: Long text gets summarized. Short text gets detailed analysis. We're smart about it.

### **Offline Support**

Most features work offline after initial setup:

- ✅ Vocabulary analysis (fully offline)
- ✅ Grammar breakdowns (fully offline)
- ✅ Verb conjugations (fully offline)
- ⚠️ Translation (needs internet for language model downloads first, then works offline)
- ⚠️ Summary (mostly offline, but some languages need LanguageModel which requires initial download)

## 🔒 Privacy and Performance (The Good Stuff)

### **Privacy**

- 🔐 **Everything runs locally** - Your text never leaves your device. Like, actually never. We couldn't track you even if we wanted to (we don't).
- 🚫 **No external servers** - Zero API calls to the cloud (unless you count downloading the model once)
- 💾 **Local storage only** - Settings saved in Chrome's local storage, not some random database
- 👀 **No tracking** - We don't know what you're reading. We don't care what you're reading. We're just here to help you understand it.
- 🕵️ **No telemetry** - No analytics, no "anonymous" data collection, nada

**TL;DR**: Your Japanese manga reading habits are safe with us. 😉

### **Performance**

- ⚡ **Fast AF** - Most requests complete in 1-2 seconds. Cached results are instant.
- 🧠 **Memory efficient** - Only loads AI sessions when needed. Your browser won't explode.
- 🎯 **Smart caching** - Same text = instant results. We're not going to reprocess the same paragraph 47 times.
- 🏃 **No lag** - Debounced selection handling means rapid clicking won't break anything
- 📦 **Optimized prompts** - Single combined API call instead of multiple sequential ones (2-3x faster than before!)

### **Offline Mode**

Works offline after initial setup! Here's what you need to download once:

- Gemini Nano model (~1.7GB) - downloads automatically
- Translation language models - download on first use per language pair
- After that? ✈️ **Full offline support** for most features!

Internet only needed for:

- Initial model downloads
- New translation language pairs
- Updating the extension

Everything else? Works on a plane, works in a tunnel, works in your basement where WiFi fears to tread.

## 🏆 Why This Project (The Hackathon Pitch)

Built for the **Google Chrome Built-in AI Challenge 2025**. Here's why this project slaps:

### **🎯 Problem We're Solving**

Language learning sucks when you're context-switching every 5 seconds. You're reading an article, hit a word you don't know, open a new tab for Google Translate, lose your place, forget the context, repeat 47 times per page. By the end you've learned nothing and you're exhausted.

**PolyglotReader fixes this.** Everything you need, right where you're reading. No context switching. No new tabs. No breaking your flow.

### **🔥 API Integration (The Technical Flex)**

We're using **4 stable Chrome AI APIs** in production (LanguageModel, Translator, Summarizer, LanguageDetector) and gracefully falling back when needed. Each API does what it's best at:

- **Translator API** → Fast, accurate translations with streaming support
- **Summarizer API** → Bullet-point summaries in source language
- **LanguageModel (Gemini Nano)** → The swiss army knife - vocabulary analysis, grammar breakdowns, verb conjugations, definitions, examples
- **LanguageDetector API** → Auto-detects languages with high accuracy

**The secret sauce**: Using them together intelligently. Summary mode uses Summarizer for points, then Translator for individual translation (better results than a single prompt). Vocabulary mode combines everything in a single LanguageModel call (2-3x faster).

### **💫 User Experience**

- Instant results (1-2 seconds average)
- Clean, non-intrusive UI (doesn't break your webpage)
- Adaptive detail levels (short text = detailed, long text = summary)
- Works on ANY website (tested on some truly cursed HTML)
- Remembers your preferences
- One-click copy for saving translations

### **🚀 Technical Approach**

- Smart caching (same text = instant results)
- Optimized for speed (single API calls instead of sequential chains)
- Graceful degradation (language not supported? We find another way)
- Memory efficient (lazy loading of AI sessions)
- Error handling that doesn't make users cry

### **📈 Scalability**

- **12 languages** supported currently (EN, ES, FR, DE, IT, PT, RU, ZH, JA, KO, AR, HI)
- **4 learning modes** (translate, vocabulary, grammar, verbs)
- **Easily extensible** - add new languages by updating language maps
- **Framework for more modes** - the architecture supports adding new analysis types

Plus we optimized the hell out of it during development. Vocabulary mode went from 6 API calls per word to 2. That's a 3x speedup! 🚀

### **🎨 Innovation**

Using specialized AI APIs for specific tasks instead of throwing everything at a single model. It's like having a team of experts instead of one overworked generalist. Faster, more accurate, and more efficient.

Also, we made it actually fun to use. Language learning doesn't have to be boring. 😎

## ⚠️ Limitations (The Honest Section)

Look, we're not perfect. Here's what doesn't work (yet):

- 📝 **Summarizer only supports EN, ES, JA** - Other languages fall back to LanguageModel (which works fine, but isn't the "official" Summarizer API)
- 🔄 **Not all language pairs support streaming translation** - Some just do regular translate (still fast though)
- 💾 **First model download is THICC** - 1.7GB + whatever space Chrome needs. Make sure you have 22GB+ free
- 🐌 **Performance depends on your hardware** - Potato laptop? Might be slower. Gaming rig? Blazing fast.
- 🌐 **Chrome Canary only (for now)** - Once the APIs go stable in regular Chrome, we'll support that too
- 🔬 **Origin trial APIs are flaky** - Writer, Rewriter, Proofreader sometimes just... don't show up. We handle it gracefully but still.
- 🎯 **Not all languages are created equal** - Some language pairs just work better than others. That's on the AI models, not us.

**Known bugs we're working on:**

- Sometimes the tooltip appears in a weird position on pages with fancy CSS (we're fixing this)
- Very long texts (500+ chars) get truncated (intentional, but we might make it smarter)
- ~~Summarizer was translating the entire summary as one block instead of individual points~~ **FIXED!** 🎉

If you find bugs, please report them! Or better yet, fix them and send a PR. 😄

## 🚀 Future Ideas (The Dream List)

If we had infinite time (we don't, it's a hackathon), here's what we'd add:

- 📊 **Spaced repetition system** - Track words you've looked up, remind you to review them before you forget
- 🎯 **Personal difficulty ratings** - Mark words as "easy/medium/hard" based on how often you look them up
- 🔊 **Audio pronunciation** - Hear how words are actually pronounced (Chrome has a speech API, we just ran out of time)
- 💾 **Export saved words** - Download your vocabulary list as CSV/Anki deck
- 🔗 **Integration with language learning apps** - Sync with Anki, Duolingo, whatever you use
- 📱 **Mobile support** - If Chrome on mobile ever gets these APIs (please Google?)
- 🎨 **Custom themes** - Dark mode, light mode, "I'm learning at 3am and my eyes hurt" mode
- 📈 **Learning statistics** - Track your progress, see what languages/words you look up most
- 🤖 **More AI modes** - Cultural context, etymology, common mistakes, etc.
- 🌍 **Community word lists** - Share commonly looked-up words for specific content (e.g., "technical German," "anime Japanese")

Got other ideas? Open an issue! Or build it yourself! The code is right there! 👆

## 🤝 Contributing

Found a bug? Have a feature idea? Want to add support for your favorite obscure language?

**We'd love your help!** Here's how:

1. 🐛 **Report bugs** - Open an issue with details (what broke, how to reproduce it, screenshots if possible)
2. 💡 **Suggest features** - Open an issue with the "enhancement" label
3. 🔧 **Submit PRs** - Fix bugs, add features, improve docs, whatever helps
4. ⭐ **Star the repo** - Makes us feel good and helps others find it

**Guidelines for PRs:**

- Keep code clean and commented
- Test your changes (like, actually test them)
- Update the README if you add new features
- Don't break existing functionality (we have users now!)
- Have fun with it! This is open source, not corporate code review

**Good first issues:**

- Add new languages to the language map
- Improve tooltip positioning logic
- Add more example sentences for common words
- Write better error messages
- Make the settings panel prettier

No contribution is too small! Even fixing typos helps. 📝

## 📜 License

MIT License - Do whatever you want with this code. Build on it, break it, make it better, sell it, we don't care. Just don't sue us if something breaks. 😅

See LICENSE file for the boring legal stuff.

## 🙏 Thanks

**Huge thanks to:**

- The **Google Chrome Team** for making these AI APIs available and actually making them usable (not just "technically possible but practically impossible")
- **Gemini Nano** for being surprisingly good at languages despite living in my browser
- **The Chrome Built-in AI Challenge 2025** for the motivation (and hopefully the prize money 💰)
- **Stack Overflow** for answering weird questions about Chrome extension APIs at 3am
- **Coffee** ☕ for making this hackathon possible
- **You** for reading this far! Seriously, you actually read the whole README? That's dedication. Have a cookie. 🍪

## 🎯 Dev Notes (For the Technically Curious)

### **Version**

v1.0.0 - Initial release (the "it actually works!" version)

### **Testing**

We have test files! They're in the repo! Use them!

- `test.html` - Basic text selection testing
- `canary-test.html` - Full feature testing page
- `test-apis.js` - Check which APIs are available on your system
- `quick-api-check.js` - Console script for quick API diagnostics

Run `validate-extension.js` with Node.js to validate before submitting (we should probably automate this but... hackathon).

### **Compatibility**

- **Minimum**: Chrome Canary 138+ with flags enabled
- **Recommended**: Chrome Canary 140+ for best stability
- **Future**: Regular Chrome when APIs go stable (fingers crossed for Q2 2025?)

### **Architecture Decisions We Made**

- Single combined prompt for vocabulary (3x faster than separate calls)
- Summarizer + Translator combo for summaries (better than LanguageModel alone)
- Lazy loading of AI sessions (saves memory)
- Aggressive caching (same text = instant results)
- Graceful degradation (always have a fallback plan)

### **What We Learned**

- Origin trial APIs are flaky. Build your MVP with stable APIs.
- Caching is your friend. Like, seriously, cache everything.
- Users will select the weirdest text. Handle all edge cases.
- 22GB free space requirement is a lot. Make sure to warn users.
- Chrome's AI APIs are actually really good when they work.

### **Random Stats**

- Total lines of code: ~3500
- Coffee consumed: Too much ☕
- Bugs squashed: Lost count
- Languages tested: 12
- Weird edge cases found: 47+
- Times we thought it wouldn't work: 12
- Times it actually worked: 13 (we got lucky once)

---

## 🌟 Final Words

This project exists because language learning online sucks. Tab switching breaks flow, external tools miss context, and most solutions feel bolted-on.

PolyglotReader is different. It's not perfect (yet), but it's fast, private, and actually useful. It uses Chrome's new AI APIs the way they're meant to be used - together, intelligently, on-device.

If you're learning a language, give it a try. If you're a developer, check out the code. If you're a judge for the Chrome Built-in AI Challenge... hi! We hope you like it. 👋

**Happy language learning! 🌍📚**

---

_Built with ❤️ (and lots of coffee) for the Google Chrome Built-in AI Challenge 2025_
