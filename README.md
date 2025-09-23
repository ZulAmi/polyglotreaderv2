# PolyglotReader - AI Language Learning Chrome Extension

A professional language learning Chrome extension that leverages all available Chrome AI APIs to provide intelligent translation, grammar analysis, vocabulary enhancement, and verb conjugation help.

## Features

### 🌟 Core Features

- **Smart Text Translation**: Highlight any text and get instant, context-aware translations
- **AI-Powered Language Detection**: Automatically detects the source language
- **Multiple Learning Modes**:
  - Vocabulary enhancement with definitions and examples
  - Grammar analysis and corrections
  - Verb conjugation and tense analysis
  - General translation
- **Professional Tooltip Interface**: Clean, responsive design that works on any website
- **12 Supported Languages**: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi

### 🤖 Chrome AI Integration

- **Language Model API**: For advanced prompting and contextual analysis
- **Translator API**: For high-quality text translation
- **Summarizer API**: For text summarization
- **Writer API**: For generative writing assistance
- **Rewriter API**: For text improvement and modification
- **Proofreader API**: For grammar and style checking
- **Language Detector API**: For automatic language detection

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The PolyglotReader icon should appear in your browser toolbar

## Usage

### Basic Translation

1. Navigate to any webpage
2. Highlight text you want to translate
3. A professional tooltip will appear with translation options
4. Select your target language and learning focus
5. View translation, pronunciation, and learning content

### Settings

- Click the extension icon to open settings
- Set your default translation language
- Choose your preferred learning focus
- Enable/disable features like pronunciation guides and examples

### Learning Modes

- **Vocabulary**: Get detailed word definitions, synonyms, and usage examples
- **Grammar**: Analyze grammatical structures and get correction suggestions
- **Verbs**: Learn about verb tenses, conjugations, and irregular forms
- **General**: Basic translation without additional learning content

## Files Structure

```
polyglotreader/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for AI API management
├── content.js            # Content script for text selection and tooltip
├── popup.html            # Extension settings popup
├── popup.js              # Popup functionality
├── popup.css             # Popup styling
├── tooltip.css           # Tooltip styling
├── icons/                # Extension icons
└── README.md             # This file
```

## Chrome AI APIs Usage

This extension demonstrates how to use all available Chrome AI APIs:

### New APIs

- `window.LanguageModel` - For general prompting and analysis
- `window.Translator` - For text translation

### Legacy APIs

- `window.ai.languageModel` - Fallback for language model
- `window.ai.translator` - Fallback for translation
- `window.ai.summarizer` - Text summarization
- `window.ai.writer` - Generative writing
- `window.ai.rewriter` - Text improvement
- `window.ai.proofreader` - Grammar checking
- `window.ai.languageDetector` - Language detection

## Privacy

- No data is sent to external servers
- All AI processing happens locally using Chrome's built-in AI
- User settings are stored locally using Chrome's storage API
- No tracking or analytics

## Browser Support

- Chrome 121+ (with AI APIs enabled)
- Requires Chrome AI origin trial participation
- Works on all websites (with appropriate permissions)

## Contributing

Feel free to contribute to this project by:

- Reporting bugs
- Suggesting new features
- Submitting pull requests
- Improving documentation

## License

MIT License - feel free to use and modify as needed.

## Troubleshooting

### AI APIs Not Working

- Ensure you're using Chrome 121+
- Check if Chrome AI features are enabled in your browser
- Verify the extension has proper permissions

### Tooltip Not Appearing

- Check if the extension is enabled
- Ensure you're highlighting text (2-500 characters)
- Try refreshing the page

### Translation Quality

- The extension uses Chrome's built-in AI, which may have limitations
- For best results, highlight complete sentences or phrases
- Consider using the "More Details" button for complex translations

## Changelog

### v1.0.0

- Initial release
- All Chrome AI APIs integrated
- Professional tooltip interface
- Multiple learning modes
- Settings management
- Responsive design
