# 🚀 Chrome AI APIs Setup Guide for Chrome Canary

## Prerequisites

- **Chrome Canary** (latest version)
- This extension installed

## Step-by-Step Setup

### 1. Enable Chrome AI Flags

1. Open Chrome Canary
2. Go to `chrome://flags/`
3. Search for and enable these flags:
   - **`prompt-api-for-gemini-nano`** → Set to "Enabled"
   - **`optimization-guide-on-device-model`** → Set to "Enabled BypassPerfRequirement"
   - **`translation-api`** → Set to "Enabled" (if available)

- **`translation-api-streaming-by-sentence`** → Set to "Enabled" (for sentence-by-sentence streaming)
- **`summarization-api-for-gemini-nano`** → Set to "Enabled" (if available)
- **`rewriter-api-for-gemini-nano`** → Set to "Enabled" (if available)

### 2. Restart Chrome Canary

- Close all Chrome Canary windows
- Restart Chrome Canary

### 3. Download AI Models

1. Go to `chrome://components/`
2. Find **"Optimization Guide On Device Model"**
3. Click **"Check for update"**
4. Wait for download to complete (this may take a few minutes)

### 4. Verify Setup

1. Install the PolyglotReader extension
2. Open any webpage
3. Open Developer Tools (F12)
4. Look for console messages showing AI API status
5. Try highlighting text to test the extension
6. To verify streaming translation, highlight text containing multiple sentences. You should see the translation appear sentence by sentence.

Tip: The Translator API may require a user gesture if the on-device model is still “downloadable” or “downloading.” Selecting text (mouseup) counts as a gesture and will trigger the model initialization.

## Troubleshooting

### If APIs Still Not Available:

1. **Check Chrome Version**: Ensure you're using Chrome Canary 121+
2. **Clear Browser Data**: Clear cache and restart
3. **Check Flags Again**: Some flags may reset after updates
4. **Wait for Model Download**: AI models need to download first
5. **Check System Requirements**: Some features may require specific hardware
6. **Trigger with a User Gesture**: Some APIs (especially Translator) can only be created during a user gesture when models are downloading. Try selecting text again after a few seconds.

### Common Warnings

- “No output language was specified…”: The LanguageModel API prefers an explicit output language. The extension now sets one automatically based on your target language, but you can change the target language in the tooltip.
- “Requires a user gesture when availability is ‘downloading’ or ‘downloadable’”: Wait for the model to finish downloading, or trigger initialization by selecting text to provide a user gesture.

### Console Debug Commands:

```javascript
// Check if AI objects exist
console.log("window.ai:", window.ai);
console.log("window.LanguageModel:", window.LanguageModel);
console.log("window.Translator:", window.Translator);

// Check capabilities (if available)
if (window.ai?.languageModel) {
  window.ai.languageModel.capabilities().then(console.log);
}
```

## Expected Console Output (When Working):

```
🔍 Checking Chrome AI API availability...
window.LanguageModel: function
window.Translator: function
window.ai available: false
New APIs available: true
✅ New LanguageModel API initialized
✅ New Translator API initialized
🎉 Successfully initialized 2/7 AI APIs
```

**Note**: In newer Chrome Canary versions, you may see the new APIs (`window.LanguageModel`, `window.Translator`) instead of the legacy `window.ai` APIs. This is expected and the extension will use whichever APIs are available.

## Important Notes:

- Chrome AI APIs are **experimental** and may change
- Not all APIs may be available in every Chrome version
- Some features require internet connection for initial setup
- Performance may vary based on system specs

## Extension Features That Will Work:

- ✅ **Text Selection**: Always works
- ✅ **Professional Tooltip**: Always works
- ✅ **Language Translation**: Works when Translator API is available
- ✅ **Grammar Analysis**: Works when Language Model API is available
- ✅ **Vocabulary Help**: Works when Language Model API is available
- ✅ **Settings Management**: Always works

---

🆘 **Still Having Issues?**

1. Check the browser console for detailed error messages
2. Ensure you're using the latest Chrome Canary version
3. Try disabling and re-enabling the extension
4. Restart Chrome Canary completely
