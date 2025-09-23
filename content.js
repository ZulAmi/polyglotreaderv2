// Content script for PolyglotReader extension
class PolyglotReader {
  constructor() {
    this.tooltip = null;
    this.settings = {
      defaultLanguage: 'en',
      learningFocus: 'translate',
      autoDetectLanguage: true,
      showPronunciation: true,
      showExamples: true
    };
    this.selectedText = '';
    this.isTooltipVisible = false;
    this.aiApis = {};
    // Track in-flight processing to avoid race conditions when user changes focus/language
    this.requestCounter = 0;     // Monotonically increasing id
    this.activeRequestId = 0;    // The latest request id; only this one may update the UI
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    console.log('🔍 Checking Chrome AI API availability...');
    this.checkAIAvailability();
    await this.initializeAIAPIs();
    this.createTooltip();
    this.bindEvents();
    console.log('✅ PolyglotReader initialized');
    
    // Show API status
    this.logAPIStatus();
  }

  checkAIAvailability() {
    console.log('\n🔬 Chrome AI Environment Check:');
    console.log('================================');
    console.log('User Agent:', navigator.userAgent);
    console.log('Chrome Version:', navigator.userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown');
    
    console.log('\n🔍 API Object Detection:');
    console.log('window.ai exists:', typeof window.ai);
    console.log('window.ai object:', window.ai);
    
    if (window.ai) {
      console.log('window.ai.languageModel:', typeof window.ai.languageModel);
      console.log('window.ai.translator:', typeof window.ai.translator);
      console.log('window.ai.summarizer:', typeof window.ai.summarizer);
      console.log('window.ai.writer:', typeof window.ai.writer);
      console.log('window.ai.rewriter:', typeof window.ai.rewriter);
      console.log('window.ai.proofreader:', typeof window.ai.proofreader);
      console.log('window.ai.languageDetector:', typeof window.ai.languageDetector);
    }
    
    console.log('\n🆕 New API Detection:');
    console.log('window.LanguageModel:', typeof window.LanguageModel);
    console.log('window.Translator:', typeof window.Translator);
    
    if (typeof window.ai === 'undefined' && typeof window.LanguageModel === 'undefined') {
      console.log('\n❌ No Chrome AI APIs detected!');
      console.log('📋 To enable Chrome AI APIs in Chrome Canary:');
      console.log('1. Go to chrome://flags/');
      console.log('2. Search for "Optimization Guide On Device Model"');
      console.log('3. Enable "BypassPerfRequirement"');
      console.log('4. Search for "prompt-api-for-gemini-nano"');
      console.log('5. Enable it');
      console.log('6. Restart Chrome Canary');
      console.log('7. Go to chrome://components/');
      console.log('8. Find "Optimization Guide On Device Model" and click "Check for update"');
    }
  }

  logAPIStatus() {
    console.log('\n🤖 Chrome AI API Status:');
    console.log('========================');
    
    const apiStatus = {
      'Language Model': this.aiApis.languageModel ? '✅ Available' : '❌ Not available',
      'Translator': this.aiApis.translator ? '✅ Available' : '❌ Not available', 
      'Summarizer': this.aiApis.summarizer ? '✅ Available' : '❌ Not available',
      'Writer': this.aiApis.writer ? '✅ Available' : '❌ Not available',
      'Rewriter': this.aiApis.rewriter ? '✅ Available' : '❌ Not available',
      'Proofreader': this.aiApis.proofreader ? '✅ Available' : '❌ Not available',
      'Language Detector': this.aiApis.languageDetector ? '✅ Available' : '❌ Not available'
    };
    
    Object.entries(apiStatus).forEach(([api, status]) => {
      console.log(`${api}: ${status}`);
    });
    
    const availableCount = Object.values(this.aiApis).filter(api => api !== null).length;
    console.log(`\n📊 Total: ${availableCount}/7 APIs available`);
    
    if (availableCount === 0) {
      console.log('\n⚠️ No Chrome AI APIs are available. Make sure you are using Chrome 121+ with AI features enabled.');
      console.log('💡 The extension will still work with basic translation fallbacks.');
    }
  }

  async loadSettings() {
    try {
      const stored = await chrome.storage.sync.get(this.settings);
      this.settings = { ...this.settings, ...stored };
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async initializeAIAPIs() {
    console.log('🔍 Checking for Chrome AI APIs...');
    
    // Check if Chrome AI is available at all
    const hasWindowAI = typeof window.ai !== 'undefined';
    const hasNewAPIs = typeof window.LanguageModel !== 'undefined' || typeof window.Translator !== 'undefined';
    
    console.log(`window.ai available: ${hasWindowAI}`);
    console.log(`New APIs available: ${hasNewAPIs}`);
    
    if (!hasWindowAI && !hasNewAPIs) {
      console.log('❌ No Chrome AI APIs detected. Please enable them in Chrome Canary.');
      return;
    }
    
    try {
      // Initialize Language Model with proper configuration
      if (window.LanguageModel?.create) {
        try {
          // New API doesn't have capabilities method, try direct creation
          this.aiApis.languageModel = await window.LanguageModel.create({
            systemPrompt: "You are a helpful language learning assistant.",
            temperature: 0.7,
            topK: 40
          });
          console.log('✅ New LanguageModel API initialized');
        } catch (error) {
          console.log('⚠️ New LanguageModel API failed:', error.message);
          
          // Try without parameters
          try {
            this.aiApis.languageModel = await window.LanguageModel.create();
            console.log('✅ New LanguageModel API initialized (no params)');
          } catch (error2) {
            console.log('⚠️ New LanguageModel API failed (no params):', error2.message);
          }
        }
      }
      
      if (!this.aiApis.languageModel && window.ai?.languageModel?.create) {
        try {
          // Check capabilities first
          const capabilities = await window.ai.languageModel.capabilities();
          console.log('Legacy Language Model capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.languageModel = await window.ai.languageModel.create({
              systemPrompt: "You are a helpful language learning assistant.",
              temperature: 0.7,
              topK: 40
            });
            console.log('✅ Legacy LanguageModel API initialized');
          } else {
            console.log('⚠️ Language Model not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Legacy LanguageModel API failed:', error.message);
        }
      }

      // Initialize Translator: deferred to user gesture.
      // We'll lazily create the Translator in ensureTranslatorReady() when
      // the user selects text or otherwise interacts with the page.
        // NOTE: Do NOT initialize Translator here. Creating a Translator often
        // requires a user gesture when availability is "downloadable" or "downloading".
        // We'll lazily create it during a user interaction (e.g., mouseup) via
        // ensureTranslatorReady().

      // Initialize Summarizer
      if (window.ai?.summarizer?.create) {
        try {
          const capabilities = await window.ai.summarizer.capabilities();
          console.log('Summarizer capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.summarizer = await window.ai.summarizer.create({
              type: 'key-points',
              format: 'markdown',
              length: 'medium'
            });
            console.log('✅ Summarizer API initialized');
          } else {
            console.log('⚠️ Summarizer not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Summarizer API failed:', error.message);
        }
      }

      // Initialize Writer
      if (window.ai?.writer?.create) {
        try {
          const capabilities = await window.ai.writer.capabilities();
          console.log('Writer capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.writer = await window.ai.writer.create({
              tone: 'formal',
              format: 'plain-text',
              length: 'medium'
            });
            console.log('✅ Writer API initialized');
          } else {
            console.log('⚠️ Writer not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Writer API failed:', error.message);
        }
      }

      // Initialize Rewriter
      if (window.ai?.rewriter?.create) {
        try {
          const capabilities = await window.ai.rewriter.capabilities();
          console.log('Rewriter capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.rewriter = await window.ai.rewriter.create({
              tone: 'as-is',
              format: 'as-is',
              length: 'as-is'
            });
            console.log('✅ Rewriter API initialized');
          } else {
            console.log('⚠️ Rewriter not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Rewriter API failed:', error.message);
        }
      }

      // Initialize Proofreader
      if (window.ai?.proofreader?.create) {
        try {
          const capabilities = await window.ai.proofreader.capabilities();
          console.log('Proofreader capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.proofreader = await window.ai.proofreader.create();
            console.log('✅ Proofreader API initialized');
          } else {
            console.log('⚠️ Proofreader not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Proofreader API failed:', error.message);
        }
      }

      // Initialize Language Detector
      if (window.ai?.languageDetector?.create) {
        try {
          const capabilities = await window.ai.languageDetector.capabilities();
          console.log('Language Detector capabilities:', capabilities);
          
          if (capabilities.available === 'readily') {
            this.aiApis.languageDetector = await window.ai.languageDetector.create();
            console.log('✅ Language Detector API initialized');
          } else {
            console.log('⚠️ Language Detector not readily available:', capabilities.available);
          }
        } catch (error) {
          console.log('⚠️ Language Detector API failed:', error.message);
        }
      }

      const initializedApis = Object.entries(this.aiApis).filter(([key, value]) => value !== null);
      console.log(`🎉 Successfully initialized ${initializedApis.length}/7 AI APIs:`, initializedApis.map(([key]) => key));
      
    } catch (error) {
      console.error('Error initializing AI APIs:', error);
    }
  }

  /**
   * Ensure a Translator instance is created (preferably during a user gesture).
   * Stores the instance on this.aiApis.translator for reuse and returns it.
   * Will use the new Translator API if available, otherwise attempts legacy API.
   */
  async ensureTranslatorReady(targetLanguage = 'es', sourceLanguage = 'auto') {
    try {
      // If already created, return it
      if (this.aiApis.translator) return this.aiApis.translator;

      // Prefer new API when available
      if (window.Translator?.create) {
        // Try the requested language first - avoid 'auto' and same-language pairs
        let sourceLang = (sourceLanguage && sourceLanguage !== 'auto') ? sourceLanguage : 'en';
        let targetLang = targetLanguage || 'es';
        
        // Avoid same-language pairs
        if (sourceLang === targetLang) {
          console.log(`⚠️ Same language pair ${sourceLang}→${targetLang} detected, adjusting...`);
          if (targetLang === 'en') {
            targetLang = 'es'; // If targeting English, switch to Spanish
          } else {
            sourceLang = 'en'; // Otherwise, use English as source
          }
        }
        
        const params = { 
          sourceLanguage: sourceLang,
          targetLanguage: targetLang 
        };
        
        try {
          this.aiApis.translator = await window.Translator.create(params);
          console.log('✅ Translator ready (new API)');
          // Reflect updated availability in console status
          this.logAPIStatus();
          return this.aiApis.translator;
        } catch (languagePairError) {
          console.log(`⚠️ Language pair ${params.sourceLanguage}→${params.targetLanguage} unsupported, trying fallback...`);
          // Try common supported pairs as fallback - no 'auto' language
          const fallbackPairs = [
            { sourceLanguage: 'en', targetLanguage: 'es' },
            { sourceLanguage: 'en', targetLanguage: 'fr' },
            { sourceLanguage: 'es', targetLanguage: 'en' },
            { sourceLanguage: 'fr', targetLanguage: 'en' }
          ];
          
          for (const fallbackParams of fallbackPairs) {
            try {
              this.aiApis.translator = await window.Translator.create(fallbackParams);
              console.log(`✅ Translator ready with fallback pair ${fallbackParams.sourceLanguage}→${fallbackParams.targetLanguage}`);
              this.logAPIStatus();
              return this.aiApis.translator;
            } catch (fallbackError) {
              console.log(`⚠️ Fallback pair ${fallbackParams.sourceLanguage}→${fallbackParams.targetLanguage} also failed`);
            }
          }
          throw languagePairError; // If all fallbacks fail, throw original error
        }
      }

      // Fallback to legacy API if available and readily available
      if (window.ai?.translator?.create) {
        try {
          const capabilities = await window.ai.translator.capabilities();
          console.log('Legacy Translator capabilities:', capabilities);
          if (capabilities.available === 'readily') {
            const params = { 
              sourceLanguage: (sourceLanguage && sourceLanguage !== 'auto') ? sourceLanguage : 'en',
              targetLanguage: targetLanguage || 'es' 
            };
            
            try {
              this.aiApis.translator = await window.ai.translator.create(params);
              console.log('✅ Translator ready (legacy API)');
              // Reflect updated availability in console status
              this.logAPIStatus();
              return this.aiApis.translator;
            } catch (languagePairError) {
              console.log(`⚠️ Legacy language pair ${params.sourceLanguage}→${params.targetLanguage} unsupported, trying fallback...`);
              // Try fallback pairs for legacy API too - no 'auto' language
              const fallbackPairs = [
                { sourceLanguage: 'en', targetLanguage: 'es' },
                { sourceLanguage: 'en', targetLanguage: 'fr' },
                { sourceLanguage: 'es', targetLanguage: 'en' }
              ];
              
              for (const fallbackParams of fallbackPairs) {
                try {
                  this.aiApis.translator = await window.ai.translator.create(fallbackParams);
                  console.log(`✅ Legacy Translator ready with fallback pair ${fallbackParams.sourceLanguage}→${fallbackParams.targetLanguage}`);
                  this.logAPIStatus();
                  return this.aiApis.translator;
                } catch (fallbackError) {
                  console.log(`⚠️ Legacy fallback pair ${fallbackParams.sourceLanguage}→${fallbackParams.targetLanguage} also failed`);
                }
              }
            }
          }
        } catch (err) {
          console.log('⚠️ Legacy Translator create failed:', err?.message || err);
        }
      }

      return null;
    } catch (error) {
      // Common case: requires user gesture when availability is downloading/downloadable
      console.log('⚠️ Translator not ready:', error?.message || error);
      return null;
    }
  }

  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'polyglot-tooltip';
    this.tooltip.innerHTML = this.getTooltipHTML();
    document.body.appendChild(this.tooltip);
    
    this.bindTooltipEvents();
    
    // Set initial dropdown values from settings
    this.updateTooltipSettings();
  }

  getTooltipHTML() {
    return `
      <div class="polyglot-tooltip-arrow top"></div>
      <div class="polyglot-tooltip-header">
        <div class="polyglot-tooltip-title">
          <div class="polyglot-tooltip-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L13.09 8.26L19 7L18.74 13.74L23 12L16.74 18.26L21 19L13.74 16.74L12 23L10.26 16.74L3 19L5.26 12.74L1 12L7.26 5.26L2 4L9.26 7.26L12 2Z" fill="currentColor"/>
            </svg>
            PolyglotReader
          </div>
          <button class="polyglot-tooltip-close">&times;</button>
        </div>
        <div class="polyglot-tooltip-controls">
          <select class="polyglot-select" id="polyglot-target-language">
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ru">Russian</option>
            <option value="zh">Chinese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="ar">Arabic</option>
            <option value="hi">Hindi</option>
          </select>
          <select class="polyglot-select" id="polyglot-learning-focus">
            <option value="translate">Translate</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="verbs">Verbs</option>
          </select>
        </div>
      </div>
      <div class="polyglot-tooltip-content">
        <div class="polyglot-loading">
          <div class="polyglot-spinner"></div>
          Analyzing text...
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Text selection events
    document.addEventListener('mouseup', (e) => this.handleTextSelection(e));
    document.addEventListener('keyup', (e) => this.handleTextSelection(e));
    
    // Hide tooltip when clicking elsewhere
    document.addEventListener('mousedown', (e) => {
      // Don't hide tooltip if clicking on a select element or its options
      if (e.target.tagName === 'SELECT' || e.target.tagName === 'OPTION') {
        return;
      }
      
      if (!this.tooltip.contains(e.target) && this.isTooltipVisible) {
        this.hideTooltip();
      }
    });

    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.action === 'settingsUpdated') {
        this.settings = { ...this.settings, ...request.settings };
        this.updateTooltipSettings();
      } else if (request.action === 'testTooltip') {
        this.showTestTooltip(request.text);
      }
    });

    // Escape key to close tooltip
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isTooltipVisible) {
        this.hideTooltip();
      }
    });
  }

  bindTooltipEvents() {
    const closeBtn = this.tooltip.querySelector('.polyglot-tooltip-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.hideTooltip());
    }

    const targetLanguageSelect = this.tooltip.querySelector('#polyglot-target-language');
    const learningFocusSelect = this.tooltip.querySelector('#polyglot-learning-focus');

    if (targetLanguageSelect) {
      targetLanguageSelect.addEventListener('change', () => {
        console.log('🌐 Target language changed to:', targetLanguageSelect.value);
        // Only reprocess if user has selected text and made a conscious change
        if (this.selectedText && this.isTooltipVisible) {
          console.log('🔄 Reprocessing text with new target language...');
          this.processText(this.selectedText);
        }
      });
      
      // Test dropdown functionality
      targetLanguageSelect.addEventListener('click', () => {
        console.log('Target language dropdown clicked');
      });
    } else {
      console.error('Target language select not found');
    }

    if (learningFocusSelect) {
      learningFocusSelect.addEventListener('change', () => {
        console.log('🎯 Learning focus changed to:', learningFocusSelect.value);
        // Only reprocess if user has selected text and made a conscious change
        if (this.selectedText && this.isTooltipVisible) {
          console.log('🔄 Reprocessing text with new learning focus...');
          this.processText(this.selectedText);
        }
      });
      
      // Test dropdown functionality
      learningFocusSelect.addEventListener('click', () => {
        console.log('Learning focus dropdown clicked');
      });
    } else {
      console.error('Learning focus select not found');
    }
    
    // Additional verification
    console.log('Tooltip event binding complete. Elements found:', {
      closeBtn: !!closeBtn,
      targetLanguageSelect: !!targetLanguageSelect,
      learningFocusSelect: !!learningFocusSelect
    });
  }

  async handleTextSelection(e) {
    // Ignore interactions inside the tooltip to avoid unnecessary reprocessing
    if (this.tooltip && this.tooltip.contains(e.target)) {
      return;
    }

    // Try to leverage the user gesture to kick off translator creation (only for Translate mode)
    const selection = window.getSelection();
    const textNow = selection.toString().trim();
    const currentFocus = this.tooltip?.querySelector?.('#polyglot-learning-focus')?.value || this.settings.learningFocus || 'translate';

    // Attempt translator initialization on any non-empty selection (gesture)
    if (textNow && textNow.length > 0) {
      const targetLanguageSelect = this.tooltip?.querySelector?.('#polyglot-target-language');
      const targetLangForInit = targetLanguageSelect?.value || this.settings.defaultLanguage || 'es';
      // Don't block UI; fire and forget to satisfy gesture requirement
      if (currentFocus === 'translate') {
        this.ensureTranslatorReady(targetLangForInit);
      }
    }

    if (textNow && textNow.length > 2 && textNow.length < 500) {
      this.selectedText = textNow;

      // Read target language from UI or settings
      const targetLanguageSelect = this.tooltip?.querySelector?.('#polyglot-target-language');
      const targetLang = targetLanguageSelect?.value || this.settings.defaultLanguage || 'es';

      // Fire translator creation during the user gesture only for Translate mode; don't await UI
      // If models need to download, this user activation will satisfy the requirement
      if (currentFocus === 'translate') {
        this.ensureTranslatorReady(targetLang);
      }

      // Defer tooltip placement slightly to allow selection range to settle
      setTimeout(() => {
        try {
          const range = selection.getRangeAt(0);
          this.showTooltip(range, textNow);
        } catch (err) {
          // Selection may have changed
        }
      }, 10);
    } else if (textNow.length === 0 && this.isTooltipVisible) {
      this.hideTooltip();
    }
  }

  showTooltip(range, text) {
    const rect = range.getBoundingClientRect();
    const tooltipRect = this.tooltip.getBoundingClientRect();
    
    // Position tooltip (adjusted for wider tooltip)
    let top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX + (rect.width / 2) - 275; // Center wider tooltip
    
    // Adjust if tooltip would go off screen
    if (left < 10) left = 10;
    if (left + 550 > window.innerWidth) left = window.innerWidth - 560; // Account for wider tooltip
    
    // If tooltip would go below viewport, show above selection
    if (top + 300 > window.innerHeight + window.scrollY) {
      top = rect.top + window.scrollY - 310; // Account for taller tooltip
      this.tooltip.querySelector('.polyglot-tooltip-arrow').className = 'polyglot-tooltip-arrow bottom';
    } else {
      this.tooltip.querySelector('.polyglot-tooltip-arrow').className = 'polyglot-tooltip-arrow top';
    }
    
    this.tooltip.style.left = `${left}px`;
    this.tooltip.style.top = `${top}px`;
    
    // Show tooltip with animation
    this.tooltip.classList.add('visible');
    this.isTooltipVisible = true;
    
    // Process the selected text
    this.processText(text);
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
    this.isTooltipVisible = false;
    this.selectedText = '';
  }

  updateTooltipSettings() {
    const targetLanguageSelect = this.tooltip.querySelector('#polyglot-target-language');
    const learningFocusSelect = this.tooltip.querySelector('#polyglot-learning-focus');
    
    if (targetLanguageSelect) {
      targetLanguageSelect.value = this.settings.defaultLanguage;
    }
    if (learningFocusSelect) {
      learningFocusSelect.value = this.settings.learningFocus;
    }
  }

  async processText(text) {
    // Increment request id to invalidate any in-flight renders
    const requestId = ++this.requestCounter;
    this.activeRequestId = requestId;

    const content = this.tooltip.querySelector('.polyglot-tooltip-content');
    content.innerHTML = `
      <div class="polyglot-loading">
        <div class="polyglot-spinner"></div>
        Analyzing text...
      </div>
    `;

    try {
      const targetLang = this.tooltip.querySelector('#polyglot-target-language').value;
      const learningFocus = this.tooltip.querySelector('#polyglot-learning-focus').value;

      // Detect source language
      let detectedLang = 'auto';
      if (this.settings.autoDetectLanguage && this.aiApis.languageDetector) {
        try {
          const detection = await this.aiApis.languageDetector.detect(text);
          detectedLang = detection.detectedLanguage || 'auto';
        } catch (error) {
          console.error('Language detection failed:', error);
        }
      }
      
      // Fallback language detection when Language Detector API is not available
      if (detectedLang === 'auto') {
        detectedLang = this.detectLanguageFallback(text);
        console.log(`🔍 Fallback language detection: ${detectedLang} for text: "${text.substring(0, 50)}..."`);
      }

      // Handle same-language translation scenarios for ALL languages
      let actualTargetLang = targetLang;
      if (detectedLang !== 'auto' && detectedLang === targetLang) {
        // If source and target are the same, pick a different target language
        console.log(`⚠️ Same language detected (${detectedLang}→${targetLang}), switching target...`);
        
        // Smart fallback based on detected language
        const languageFallbacks = {
          'en': 'es',  // English → Spanish
          'es': 'en',  // Spanish → English
          'fr': 'en',  // French → English
          'de': 'en',  // German → English
          'it': 'en',  // Italian → English
          'pt': 'en',  // Portuguese → English
          'ru': 'en',  // Russian → English
          'zh': 'en',  // Chinese → English
          'ja': 'en',  // Japanese → English
          'ko': 'en',  // Korean → English
          'ar': 'en',  // Arabic → English
          'hi': 'en'   // Hindi → English
        };
        
        actualTargetLang = languageFallbacks[detectedLang] || 'en';
        console.log(`🔄 Changed target language from ${targetLang} to ${actualTargetLang}`);
      }

      // Get translation (streaming if available) - ONLY if learning focus is 'translate'
      let translation = '';
      let pronunciation = '';
      let actualSourceLang = detectedLang; // Initialize with detected language
      
      if (learningFocus === 'translate') {
        console.log('🔤 Translation mode: Running translation...');
        // If we don't yet have a translator, try to create one now
        if (!this.aiApis.translator) {
          await this.ensureTranslatorReady(actualTargetLang, detectedLang);
        }
        if (this.aiApis.translator) {
          try {
            // For new translator API, we might need to create a new instance with specific languages
            let translatorInstance = this.aiApis.translator;

            // Check if we need to create a new translator for specific language pair
            if (window.Translator?.create && (detectedLang !== 'auto' || actualTargetLang !== 'en')) {
              try {
                // Avoid same-language translation pairs
                let sourceLang = (detectedLang && detectedLang !== 'auto') ? detectedLang : 'en';
                if (sourceLang === actualTargetLang) {
                  console.log(`⚠️ Same language pair ${sourceLang}→${actualTargetLang}, using fallback`);
                  sourceLang = sourceLang === 'en' ? 'es' : 'en';
                }
                
                const params = { 
                  sourceLanguage: sourceLang,
                  targetLanguage: actualTargetLang 
                };
                translatorInstance = await window.Translator.create(params);
                console.log(`✅ Created specific translator ${params.sourceLanguage}→${params.targetLanguage}`);
                
                // Update the actual source language to match what the translator expects
                actualSourceLang = sourceLang;
              } catch (error) {
                console.log('Failed to create specific translator, using default:', error);
                // When using default translator, ensure we have compatible source language
                actualSourceLang = (detectedLang && detectedLang !== 'auto') ? detectedLang : 'en';
              }
            } else {
              // When using default translator, ensure we have compatible source language
              actualSourceLang = (detectedLang && detectedLang !== 'auto') ? detectedLang : 'en';
            }

            // Prefer streaming when available
            if (typeof translatorInstance.translateStreaming === 'function') {
              translation = await this.startStreamingTranslation(
                translatorInstance,
                text,
                actualSourceLang,
                actualTargetLang,
                requestId
              );
            } else {
              const result = await translatorInstance.translate(text);
              translation = result.translatedText || result || text;
              console.log('Translation result:', result);
            }
          } catch (error) {
            console.error('Translation failed:', error);
            translation = 'Translation not available';
          }
        } else {
          // Fallback when no translator API is available or creation requires a gesture
          translation = `[Translation unavailable] ${text}`;
          console.log('⚠️ No translation API available, showing original text');
        }

        // Get pronunciation if enabled
        if (this.settings.showPronunciation && this.aiApis.languageModel) {
          try {
            const langCode = this.getLanguageCode(actualTargetLang);
            const prompt = `Provide phonetic pronunciation for "${translation}" in ${actualTargetLang}. Just return the pronunciation guide.`;
            pronunciation = await this.aiApis.languageModel.prompt(prompt, {
              language: langCode
            });
          } catch (error) {
            console.error('Pronunciation failed:', error);
          }
        }
      } else {
        console.log(`🎯 Learning mode "${learningFocus}": Skipping translation...`);
        // For learning modes, we don't need translation
        translation = '';
        pronunciation = '';
      }

      // If a newer request started while we were working, abort before generating/printing results
      if (requestId !== this.activeRequestId) {
        console.log('⏭️ Skipping work for stale request (pre-learning-content).');
        return;
      }

      // Get learning content based on focus
      let learningContent = '';
      if (learningFocus !== 'translate') {
        console.log(`🎯 Getting learning content for focus: ${learningFocus}`);
        learningContent = await this.getLearningContent(text, actualTargetLang, learningFocus);
        console.log(`📝 Learning content generated (${learningContent.length} chars):`, learningContent.substring(0, 100) + '...');
      }

      // If a newer request started while we were working, abort rendering
      if (requestId !== this.activeRequestId) {
        console.log('⏭️ Skipping render for stale request.');
        return;
      }

      // Display results
      this.displayResults(text, translation, pronunciation, actualSourceLang, actualTargetLang, learningContent, learningFocus, requestId);

    } catch (error) {
      console.error('Error processing text:', error);
      content.innerHTML = `
        <div class="polyglot-error">
          Error processing text. Chrome AI APIs may not be available.
        </div>
      `;
    }
  }

  /**
   * Stream translation sentence-by-sentence when supported by the Translator API.
   * Updates the tooltip UI incrementally and returns the final translated string.
   */
  async startStreamingTranslation(translatorInstance, text, sourceLang, targetLang, requestId) {
    console.log(`🔄 Starting streaming translation: ${sourceLang}→${targetLang} for text: "${text}"`);
    
    const content = this.tooltip.querySelector('.polyglot-tooltip-content');
    const langNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
      'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi', 'auto': 'Detected'
    };

    // Abort immediately if this request is already stale
    if (requestId !== this.activeRequestId) {
      console.log('⏭️ Streaming start aborted (stale request).');
      return '';
    }

    // Prepare a minimal streaming layout
    if (content && requestId === this.activeRequestId && !content.querySelector('#polyglot-translation-stream')) {
      content.innerHTML = `
        <div class="polyglot-content-row">
          <div class="polyglot-content-column">
            <div class="polyglot-original-text polyglot-fade-in">
              <div class="label">Original Text (${langNames[sourceLang] || sourceLang})</div>
              <div class="text">${text}</div>
            </div>
          </div>
          
          <div class="polyglot-content-column">
            <div class="polyglot-translation-section polyglot-fade-in">
              <div class="polyglot-section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12L21 12M15 6L21 12L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Translation (streaming) ${sourceLang}→${targetLang}
              </div>
              <div class="polyglot-translation">
                <div id="polyglot-translation-stream" class="polyglot-translation-text"></div>
                <div class="polyglot-language-info">${langNames[targetLang] || targetLang}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    const outEl = content?.querySelector('#polyglot-translation-stream');
    let combined = '';
    try {
      console.log('🚀 Starting translateStreaming...');
      const stream = translatorInstance.translateStreaming(text);
      console.log('📡 Stream created, processing chunks...');
      
      for await (const chunk of stream) {
        if (requestId !== this.activeRequestId) {
          console.log('⏹️ Streaming aborted due to newer request.');
          break;
        }
        const piece = typeof chunk === 'string'
          ? chunk
          : (chunk?.translatedText ?? chunk?.text ?? '');
        console.log('📦 Received chunk:', piece);
        if (!piece) continue;
        combined += (combined && !combined.endsWith(' ') ? ' ' : '') + piece;
        if (outEl && requestId === this.activeRequestId) outEl.textContent = combined;
      }
      console.log('✅ Streaming completed. Final result:', combined);
    } catch (err) {
      console.log('⚠️ Streaming translation failed, falling back to non-streaming:', err?.message || err);
      // Fall back to non-streaming
      try {
        const result = await translatorInstance.translate(text);
        combined = result.translatedText || result || text;
        console.log('✅ Non-streaming fallback result:', combined);
        if (outEl && requestId === this.activeRequestId) outEl.textContent = combined;
      } catch (err2) {
        console.log('❌ Both streaming and non-streaming failed:', err2?.message || err2);
        combined = 'Translation not available';
      }
    }
    return combined || text;
  }

  detectLanguageFallback(text) {
    // Simple character-based language detection fallback
    const sample = text.substring(0, 100); // Check first 100 characters
    
    // Japanese detection (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(sample)) {
      return 'ja';
    }
    
    // Chinese detection (Chinese characters, but not Japanese context)
    if (/[\u4E00-\u9FAF]/.test(sample) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(sample)) {
      return 'zh';
    }
    
    // Korean detection (Hangul)
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(sample)) {
      return 'ko';
    }
    
    // Arabic detection
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(sample)) {
      return 'ar';
    }
    
    // Russian detection (Cyrillic)
    if (/[\u0400-\u04FF]/.test(sample)) {
      return 'ru';
    }
    
    // Spanish detection (common Spanish words and accents)
    if (/[ñáéíóúü]/.test(sample.toLowerCase()) || 
        /\b(el|la|los|las|de|del|que|en|un|una|es|se|no|te|lo|le|da|su|por|son|con|para|al|todo|pero|más|hacer|muy|aquí|sido|está|hasta|donde)\b/.test(sample.toLowerCase())) {
      return 'es';
    }
    
    // French detection (common French words and accents)
    if (/[àâäéèêëïîôùûüÿç]/.test(sample.toLowerCase()) || 
        /\b(le|la|les|de|des|du|et|en|un|une|il|elle|est|sont|avec|pour|par|sur|dans|mais|plus|tout|vous|nous|ils|elles|ce|cette|qui|que)\b/.test(sample.toLowerCase())) {
      return 'fr';
    }
    
    // German detection (common German words and characters)
    if (/[äöüß]/.test(sample.toLowerCase()) || 
        /\b(der|die|das|den|dem|des|ein|eine|einen|einem|eines|und|in|zu|mit|auf|für|von|an|bei|nach|über|unter|durch|gegen|ohne|um|vor|hinter|neben)\b/.test(sample.toLowerCase())) {
      return 'de';
    }
    
    // Default to English if no other language detected
    return 'en';
  }

  getLanguageCode(lang) {
    // Map language codes to supported output languages for Language Model
    const languageMap = {
      'en': 'en',
      'es': 'es', 
      'ja': 'ja',
      'fr': 'en', // Fallback to English for unsupported languages
      'de': 'en',
      'it': 'en',
      'pt': 'en',
      'ru': 'en',
      'zh': 'en',
      'ko': 'en',
      'ar': 'en',
      'hi': 'en'
    };
    return languageMap[lang] || 'en';
  }

  async getLearningContent(text, targetLang, focus) {
    try {
      const langCode = this.getLanguageCode(targetLang);
      let prompt = '';
      
      switch (focus) {
        case 'vocabulary':
          console.log(`📚 Vocabulary analysis requested for: "${text}"`);
          console.log(`🤖 Language Model available:`, !!this.aiApis.languageModel);
          if (this.aiApis.languageModel) {
            const isLong = text.length > 400;
            if (isLong) {
              // Faster, more concise prompt for long passages
              prompt = `Analyze the vocabulary in: "${text}"

Return ONLY the top 8–12 most important words. For each, include:
- Word: [word]
- Definition: [short and simple]
- Part of speech: [noun/verb/adj/etc.]
- Difficulty: [Beginner/Intermediate/Advanced]
- 1 example sentence (very short, numbered as "1. ...")

Be concise. Do not translate the entire passage. Use clear bullet points. Respond in ${targetLang === 'en' ? 'English' : targetLang}.`;
            } else {
              // Full prompt for shorter texts
              prompt = `Analyze the vocabulary in: "${text}"

Please provide a structured vocabulary breakdown:

**🔤 WORD ANALYSIS:**
For each important word, provide:
- Word: [word]
- Definition: [clear, simple definition]
- Part of speech: [noun/verb/adjective/etc.]
- Difficulty: [Beginner/Intermediate/Advanced]

**📊 LANGUAGE LEVEL:**
- Overall text difficulty: [assessment]
- Academic vs conversational style
- Formal vs informal register

**🎯 KEY VOCABULARY HIGHLIGHTS:**
- Most important words to learn
- Words with multiple meanings
- Context-specific usage

**💡 LEARNING TIPS:**
- Word families and related terms
- Common collocations
- Memory aids or patterns

**📝 EXAMPLE SENTENCES:**
Provide 2-3 simple example sentences using key vocabulary.

Format with clear headings and bullet points. Keep explanations concise but helpful. Respond in ${targetLang === 'en' ? 'English' : targetLang}.`;
            }
            console.log(`📝 Vocabulary prompt created, length: ${prompt.length}`);
          } else {
            console.log('❌ Language Model not available for vocabulary analysis');
          }
          break;
          
        case 'grammar':
          if (this.aiApis.proofreader) {
            try {
              const result = await this.aiApis.proofreader.proofread(text);
              if (result.suggestions || result) {
                return `🔍 **Grammar Analysis:**\n\n${result.suggestions || result}`;
              }
            } catch (error) {
              console.error('Proofreader failed:', error);
            }
          }
          
          if (this.aiApis.languageModel) {
            prompt = `Analyze the grammar of "${text}" in detail. Provide:

🏗️ **Grammatical Structure:**
- Sentence type and structure
- Subject, verb, object identification
- Clause analysis (main/subordinate)

📝 **Grammar Points:**
- Tenses used and their functions
- Parts of speech breakdown
- Grammatical rules demonstrated
- Any complex constructions explained

✏️ **Learning Notes:**
- Common grammar patterns shown
- Mistakes to avoid
- Alternative ways to express the same idea
- Grammar level (beginner/intermediate/advanced)

🔧 **Corrections & Improvements:**
- Any errors found and corrections
- Style suggestions
- More natural alternatives

Format as clear sections with emojis. Respond in ${targetLang}.`;
          }
          break;
          
        case 'verbs':
          if (this.aiApis.languageModel) {
            prompt = `Analyze all verbs in "${text}" comprehensively. Provide:

⚡ **Verb Identification:**
- List all verbs found (main verbs, auxiliary verbs, modal verbs)
- Verb types (action, linking, helping)

⏰ **Tense & Aspect Analysis:**
- Present tenses used: ${text}
- Past tenses used: ${text}  
- Future tenses used: ${text}
- Perfect/progressive aspects
- Time expressions and their relationship to verbs

🔄 **Conjugation Patterns:**
- Regular vs irregular verbs identified
- Full conjugation of key verbs
- Stem changes or pattern rules

📖 **Usage & Meaning:**
- Verb meanings in context
- Different meanings of the same verb
- Phrasal verbs or compound verbs
- Formal vs informal verb usage

🎯 **Learning Focus:**
- Difficulty level of verb constructions
- Common mistakes with these verbs
- Practice suggestions

Format as clear sections with emojis. Respond in ${targetLang}.`;
          }
          break;
          
        case 'translate':
          // For translate mode, we don't need additional learning content
          return '';
      }

      if (prompt && this.aiApis.languageModel) {
        console.log(`🚀 Executing ${focus} prompt with Language Model...`);
        try {
          const result = await this.aiApis.languageModel.prompt(prompt, {
            language: langCode
          });
          console.log(`✅ ${focus} analysis completed successfully, length: ${result.length}`);
          
          // Format vocabulary analysis for better display
          if (focus === 'vocabulary') {
            return this.formatVocabularyAnalysis(result);
          }
          
          return result;
        } catch (error) {
            console.error(`❌ Language model prompt failed for ${focus}:`, error);
            // Retry with safe default language to satisfy output language requirement
            try {
              console.log(`🔄 Retrying ${focus} prompt with English language...`);
              const result = await this.aiApis.languageModel.prompt(prompt, { language: 'en' });
              console.log(`✅ ${focus} analysis completed with fallback, length: ${result.length}`);
              
              // Format vocabulary analysis for better display
              if (focus === 'vocabulary') {
                return this.formatVocabularyAnalysis(result);
              }
              
              return result;
            } catch (retryError) {
              console.error(`❌ ${focus} prompt failed even with fallback:`, retryError);
              return `${focus} analysis failed: ${retryError.message}`;
            }
        }
      }
      
      console.log(`⚠️ Cannot generate ${focus} content - missing prompt or Language Model`);
      return focus === 'translate' ? '' : 'Learning content not available - Chrome AI Language Model required';
    } catch (error) {
      console.error(`${focus} analysis failed:`, error);
      return focus === 'translate' ? '' : `${focus} analysis failed`;
    }
  }

  formatVocabularyAnalysis(rawAnalysis) {
    // Enhanced formatting for vocabulary analysis
    let formatted = rawAnalysis;
    
    // Convert markdown-style headers to HTML
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\*\*([^:]+):\*\*/gm, '<h3>$1</h3>');
    
    // Format bullet points
    formatted = formatted.replace(/^- (.*)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
    
    // Format word entries (Word: Definition pattern)
    formatted = formatted.replace(/- Word: ([^,\n]+)/g, '<div class="word-card"><div class="word-title">$1</div>');
    formatted = formatted.replace(/- Definition: ([^\n]+)/g, '<div>Definition: $1</div>');
    formatted = formatted.replace(/- Part of speech: ([^\n]+)/g, '<div>Part of speech: <em>$1</em></div>');
    formatted = formatted.replace(/- Difficulty: (Beginner|Intermediate|Advanced)/g, '<span class="difficulty-badge difficulty-$1">$1</span></div>');
    
    // Format example sentences
    formatted = formatted.replace(/^(\d+\.\s.*)/gm, '<div class="example-sentence">$1</div>');
    
    // Add learning tip styling
    formatted = formatted.replace(/(Memory aid|Tip|Remember):\s*([^\n]+)/gi, '<div class="learning-tip">$1: $2</div>');
    
    // Clean up any loose formatting
    formatted = formatted.replace(/\n\n/g, '<br><br>');
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  displayResults(originalText, translation, pronunciation, sourceLang, targetLang, learningContent, learningFocus, requestId) {
    // Guard against stale renders
    if (requestId !== this.activeRequestId) {
      console.log('⏭️ Ignoring display for stale request.');
      return;
    }
    const content = this.tooltip.querySelector('.polyglot-tooltip-content');
    
    const langNames = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
      'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi', 'auto': 'Detected'
    };

    let html = '';
    
    // Always show original text
    html += `
      <div class="polyglot-content-row">
        <div class="polyglot-content-column">
          <div class="polyglot-original-text polyglot-fade-in">
            <div class="label">Original Text (${langNames[sourceLang] || sourceLang})</div>
            <div class="text">${originalText}</div>
          </div>
        </div>
    `;
    
    // Only show translation if learning focus is 'translate'
    if (learningFocus === 'translate') {
      html += `
        <div class="polyglot-content-column">
          <div class="polyglot-translation-section polyglot-fade-in">
            <div class="polyglot-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M3 12L21 12M15 6L21 12L15 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Translation
            </div>
            <div class="polyglot-translation">
              <div class="polyglot-translation-text">${translation}</div>
              ${pronunciation ? `<div class="polyglot-pronunciation">[${pronunciation}]</div>` : ''}
              <div class="polyglot-language-info">${langNames[targetLang] || targetLang}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      // For learning modes, show a placeholder or leave empty
      html += `
        <div class="polyglot-content-column">
          <div class="polyglot-learning-mode-indicator polyglot-fade-in">
            <div class="polyglot-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 6V4M6 18V16M18 18V16M4 12V10M20 12V10M12 20V18M12 14V12M12 8V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              ${learningFocus.charAt(0).toUpperCase() + learningFocus.slice(1)} Analysis Mode
            </div>
            <div class="polyglot-mode-description">Analyzing text for ${learningFocus} learning...</div>
          </div>
        </div>
      `;
    }
    
    html += `</div>`;

    if (learningContent && learningFocus !== 'translate') {
      console.log(`📊 Displaying ${learningFocus} content in UI (${learningContent.length} chars)`);
      html += `
        <div class="polyglot-learning-content polyglot-fade-in">
          <div class="polyglot-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 6V4M6 18V16M18 18V16M4 12V10M20 12V10M12 20V18M12 14V12M12 8V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${learningFocus.charAt(0).toUpperCase() + learningFocus.slice(1)} Analysis
          </div>
          <div class="polyglot-${learningFocus}-analysis">
            ${learningContent}
          </div>
        </div>
      `;
    } else {
      console.log(`ℹ️ No learning content to display: content=${!!learningContent}, focus=${learningFocus}`);
    }

  if (this.settings.showExamples && learningFocus === 'vocabulary') {
      html += `
        <div class="polyglot-examples polyglot-fade-in">
          <div class="polyglot-section-title">Example Usage</div>
          <div class="polyglot-example">The word appears in formal contexts.</div>
          <div class="polyglot-example">Common in everyday conversation.</div>
        </div>
      `;
    }

    // Show action buttons only in Translate mode
    if (learningFocus === 'translate') {
      html += `
        <div class="polyglot-action-buttons">
          <button class="polyglot-button" onclick="navigator.clipboard.writeText('${translation}')">Copy Translation</button>
          <button class="polyglot-button primary" onclick="window.open('https://translate.google.com/?sl=${sourceLang}&tl=${targetLang}&text=${encodeURIComponent(originalText)}', '_blank')">More Details</button>
        </div>
      `;
    }

    content.innerHTML = html;
  }

  showTestTooltip(text) {
    // Create a fake selection for testing
    const selection = window.getSelection();
    const range = document.createRange();
    const element = document.body;
    
    range.selectNodeContents(element);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    this.selectedText = text;
    this.showTooltip(range, text);
  }
}

// Initialize PolyglotReader when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new PolyglotReader();
  });
} else {
  new PolyglotReader();
}