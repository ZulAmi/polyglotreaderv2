// Background script for Chrome extension
class AIServiceManager {
  constructor() {
    this.apis = {
      languageModel: null,
      translator: null,
      summarizer: null,
      writer: null,
      rewriter: null,
      proofreader: null,
      languageDetector: null
    };
    // Don't initialize APIs in background script - they need window object
    // APIs will be initialized in content script instead
  }

  // Placeholder methods that will delegate to content script
  async detectLanguage(text) {
    return { language: 'unknown', confidence: 0 };
  }

  async translateText(text, targetLanguage, sourceLanguage = 'auto') {
    return { translatedText: text };
  }

  async analyzeGrammar(text) {
    return { suggestions: 'Grammar analysis not available in background script' };
  }

  async getVocabularyHelp(text, targetLanguage) {
    return 'Vocabulary help not available in background script';
  }

  async analyzeVerbs(text, targetLanguage) {
    return 'Verb analysis not available in background script';
  }

  async summarizeText(text) {
    return 'Summary not available in background script';
  }
}

// Remove unused aiManager initialization
// const aiManager = new AIServiceManager();

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      // All AI operations are now handled in content script
      // Background script just handles extension management
      switch (request.action) {
        case 'extensionStatus':
          sendResponse({ success: true, data: 'Extension active' });
          break;

        default:
          sendResponse({ success: false, error: 'Action should be handled in content script' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  return true; // Keep message channel open for async response
});

// Install/update event
chrome.runtime.onInstalled.addListener(() => {
  console.log('PolyglotReader extension installed/updated');
});