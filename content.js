// Content script for PolyglotReader extension
class PolyglotReader {
  constructor() {
    this.tooltip = null;
    this.settings = {
      defaultLanguage: 'en',
      learningFocus: 'translate',
      autoDetectLanguage: true,
      showPronunciation: true,
      showExamples: true,
      // Always use all available AI APIs in vocabulary mode
      vocabUseAllApis: true,
      // Enable enrichment features (examples, rewrites, proofreading, translation)
      enrichVocab: true,
      // Enrichment bounds (defaults; may be overridden by stored settings)
      vocabEnrichMaxItems: 6,
      vocabEnrichConcurrency: 2,
      // Other UI defaults
      vocabStrategy: 'adaptive',
      summaryLength: 'medium'
    };

    // Runtime/UI state
    this.requestCounter = 0;
    this.activeRequestId = 0;
    this.selectedText = '';
    this.isTooltipVisible = false;
    this.lastSelectionKey = '';
    this.lastSelectionAt = 0;
    this.reprocessTimer = null;
    this.lastSourceLang = 'auto';
    this.lastVocabItems = [];
    this.vocabularyList = [];
    this.learningCache = new Map();
    this.learningCacheOrder = [];
    this.inFlightLearning = new Map();

    // Setup UI and async resources
    try { this.createTooltip(); } catch (_) {}
    try { this.bindEvents(); } catch (_) {}
    // Load saved settings (sync) and apply to tooltip
    try { this.loadSettingsFromSync(); } catch (_) {}
    // Fire-and-forget async init
    try { this.loadVocabList(); } catch (_) {}
  try { window.PG?.ai?.initializeAIAPIs?.(); } catch (_) {}
  }


  // Load user settings from chrome.storage.sync and merge with defaults
  async loadSettingsFromSync() {
    try {
      const stored = await chrome.storage.sync.get(this.settings);
      this.settings = { ...this.settings, ...stored };
      this.updateTooltipSettings?.();
    } catch (e) {
      console.log('Failed to load settings from sync:', e?.message || e);
    }
  }

  // Minimal HTML escape for safe text insertion
  escapeHTML(s) {
    if (window.PG?.lang?.escapeHTML) return window.PG.lang.escapeHTML(s);
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /**
   * Ensure a Translator instance is created (preferably during a user gesture).
   * Stores the instance on this.aiApis.translator for reuse and returns it.
   * Will use the new Translator API if available, otherwise attempts legacy API.
   */

  /**
   * Ensure a Summarizer instance is created (preferably during a user gesture).
   * Supports both the new Summarizer global and the legacy window.ai.summarizer API.
   * The created session respects the current summary length preference.
   */

  // Optional: Ensure Writer session when available

  // Optional: Ensure Rewriter session when available

  // Optional: Ensure Proofreader session when available

  // Enrich vocabulary items by delegating to centralized AI utilities
  async enrichVocabularyItems(items, { sourceLang, targetLang, strategy } = {}) {
    try {
      if (!Array.isArray(items) || items.length === 0) return items;
      if (window.PG?.aiEnhanced?.enrichVocabularyItems) {
        const opts = {
          sourceLang,
          targetLang,
          strategy: strategy || this.settings?.vocabStrategy || 'adaptive',
          maxItems: this.settings?.vocabEnrichMaxItems || items.length,
          concurrency: this.settings?.vocabEnrichConcurrency || 2
        };
        return await window.PG.aiEnhanced.enrichVocabularyItems(items, opts);
      }
      return items;
    } catch (e) {
      console.log('enrichVocabularyItems delegation failed:', e?.message || e);
      return items;
    }
  }

  // Enrich a single vocabulary item by delegating to centralized AI utilities
  async enrichSingleItem(it, { writer, rewriter, proofreader, summarizer, sourceLang, targetLang, strategy }) {
    try {
      if (window.PG?.aiEnhanced?.enrichSingleItem) {
        return await window.PG.aiEnhanced.enrichSingleItem(it, { sourceLang, targetLang, strategy });
      }
    } catch (e) {
      console.log('⚠️ enrichSingleItem delegation failed:', e?.message || e);
    }
    return it;
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
            <option value="summary">Summary</option>
            <option value="vocabulary">Vocabulary</option>
            <option value="grammar">Grammar</option>
            <option value="verbs">Verbs</option>
          </select>
          <select class="polyglot-select" id="polyglot-vocab-detail" style="display:none">
            <option value="fast">Fast</option>
            <option value="full">Detailed</option>
            <option value="adaptive">Adaptive</option>
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
        // Lock: force vocabulary to use all APIs regardless of popup changes
        this.settings.vocabUseAllApis = true;
        this.settings.enrichVocab = true;
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
  const vocabDetailSelect = this.tooltip.querySelector('#polyglot-vocab-detail');
  const summaryLengthSelect = null;

    if (targetLanguageSelect) {
      targetLanguageSelect.addEventListener('change', () => {
        console.log('🌐 Target language changed to:', targetLanguageSelect.value);
        // Only reprocess if user has selected text and made a conscious change
        if (this.selectedText && this.isTooltipVisible) {
          console.log('🔄 Reprocessing text with new target language...');
          this.scheduleReprocessSelectedText();
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
          this.scheduleReprocessSelectedText();
        }
        // Toggle vocab detail selector visibility
        if (vocabDetailSelect) {
          vocabDetailSelect.style.display = (learningFocusSelect.value === 'vocabulary') ? '' : 'none';
        }
        // No summary length selector
      });
      
      // Test dropdown functionality
      learningFocusSelect.addEventListener('click', () => {
        console.log('Learning focus dropdown clicked');
      });
    } else {
      console.error('Learning focus select not found');
    }
    
    // Additional verification
  if (vocabDetailSelect) {
      // Initialize selector with current strategy
      vocabDetailSelect.value = this.settings.vocabStrategy || 'adaptive';
      // Show/hide based on current focus
      const currentFocus = learningFocusSelect?.value || this.settings.learningFocus || 'translate';
      vocabDetailSelect.style.display = (currentFocus === 'vocabulary') ? '' : 'none';
      vocabDetailSelect.addEventListener('change', () => {
        const val = vocabDetailSelect.value;
        console.log('🧠 Vocab detail strategy changed to:', val);
        this.settings.vocabStrategy = val;
        const focusNow = (this.tooltip?.querySelector?.('#polyglot-learning-focus')?.value) || this.settings.learningFocus || 'translate';
        if (this.selectedText && this.isTooltipVisible && focusNow === 'vocabulary') {
          this.scheduleReprocessSelectedText();
        }
      });
    }

    // No summary length selector

    console.log('Tooltip event binding complete. Elements found:', {
      closeBtn: !!closeBtn,
      targetLanguageSelect: !!targetLanguageSelect,
      learningFocusSelect: !!learningFocusSelect,
      vocabDetailSelect: !!vocabDetailSelect,
      summaryLengthSelect: !!summaryLengthSelect
    });
  }

  // Debounce reprocessing to coalesce rapid dropdown changes into one request
  scheduleReprocessSelectedText(delayMs = 250) {
    if (!this.selectedText || !this.isTooltipVisible) return;
    if (this.reprocessTimer) clearTimeout(this.reprocessTimer);
    this.reprocessTimer = setTimeout(() => {
      this.reprocessTimer = null;
      this.processText(this.selectedText);
    }, delayMs);
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

    // Attempt model initialization on any non-empty selection (gesture)
    if (textNow && textNow.length > 0) {
      const targetLanguageSelect = this.tooltip?.querySelector?.('#polyglot-target-language');
      const targetLangForInit = targetLanguageSelect?.value || this.settings.defaultLanguage || 'es';
      // Don't block UI; fire and forget to satisfy gesture requirement
      if (currentFocus === 'translate') {
        window.PG?.ai?.ensureTranslatorReady?.(targetLangForInit);
      } else if (currentFocus === 'summary') {
        window.PG?.ai?.ensureSummarizerReady?.();
        // Also warm up translator to enable summary translation to target language
        window.PG?.ai?.ensureTranslatorReady?.(targetLangForInit);
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
        window.PG?.ai?.ensureTranslatorReady?.(targetLang);
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
    
    // Avoid duplicate processing if same text/focus/target just processed very recently
    const targetLanguageSelect = this.tooltip.querySelector('#polyglot-target-language');
    const learningFocusSelect = this.tooltip.querySelector('#polyglot-learning-focus');
    const key = `${text}|${targetLanguageSelect?.value || ''}|${learningFocusSelect?.value || ''}`;
    const now = Date.now();
    if (this.isTooltipVisible && this.lastSelectionKey === key && (now - this.lastSelectionAt) < 600) {
      console.log('⏳ Skipping duplicate processing for recent identical selection');
      return;
    }
    this.lastSelectionKey = key;
    this.lastSelectionAt = now;

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
    const vocabDetailSelect = this.tooltip.querySelector('#polyglot-vocab-detail');
    const summaryLengthSelect = this.tooltip.querySelector('#polyglot-summary-length');
    
    if (targetLanguageSelect) {
      targetLanguageSelect.value = this.settings.defaultLanguage;
    }
    if (learningFocusSelect) {
      learningFocusSelect.value = this.settings.learningFocus;
    }
    if (vocabDetailSelect) {
      vocabDetailSelect.value = this.settings.vocabStrategy || 'adaptive';
      vocabDetailSelect.style.display = (learningFocusSelect?.value === 'vocabulary') ? '' : 'none';
    }
    if (summaryLengthSelect) {
      summaryLengthSelect.value = this.settings.summaryLength || 'medium';
      summaryLengthSelect.style.display = (learningFocusSelect?.value === 'summary') ? '' : 'none';
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
      if (this.settings.autoDetectLanguage && window.PG?.ai?.getSessions()?.languageDetector) {
        try {
          const sessions = window.PG?.ai?.getSessions();
          if (sessions?.languageDetector) {
            const detection = await sessions.languageDetector.detect(text);
            const detectionResults = Array.isArray(detection) ? detection : [detection];
            if (detectionResults.length > 0) {
              detectedLang = detectionResults[0].detectedLanguage || detectionResults[0] || 'auto';
              console.log(`🔍 Language detected: ${detectedLang}`);
            }
          }
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
      console.log(`🌐 Using source language: ${actualSourceLang}`);
      
      if (learningFocus === 'translate') {
        console.log('🔤 Translation mode: Running translation...');
        // If we don't yet have a translator, try to create one now
        const sessions = window.PG?.ai?.getSessions();
        if (!sessions?.translator) {
          await window.PG?.ai?.ensureTranslatorReady?.(actualTargetLang, detectedLang);
        }
        if (sessions?.translator) {
          try {
            // For new translator API, we might need to create a new instance with specific languages
            let translatorInstance = sessions.translator;

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
        if (this.settings.showPronunciation && window.PG?.ai?.getSessions()?.languageModel) {
          try {
            const langCode = this.getLanguageCode(actualTargetLang);
            const prompt = `Provide phonetic pronunciation for "${translation}" in ${actualTargetLang}. Just return the pronunciation guide.`;
            const sessions = window.PG?.ai?.getSessions();
            if (sessions?.languageModel) {
              pronunciation = await sessions.languageModel.prompt(prompt, {
                language: langCode
              });
            }
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

  // Persist last source language for UI rendering (e.g., Romaji/Pinyin labels)
  this.lastSourceLang = actualSourceLang || detectedLang || 'auto';

  // If a newer request started while we were working, abort before generating/printing results
      if (requestId !== this.activeRequestId) {
        console.log('⏭️ Skipping work for stale request (pre-learning-content).');
        return;
      }

      // Get learning content based on focus
      let learningContent = '';
      if (learningFocus !== 'translate') {
        // Special case: Vocabulary should render immediately and then stream in concurrently
        if (learningFocus === 'vocabulary') {
          // Render skeleton immediately without nested section wrapper/title
          learningContent = `
            <div id="pg-vocab-live">
              <div class="polyglot-loading" style="margin:8px 0;">
                <div class="polyglot-spinner"></div>
                Finding key words…
              </div>
            </div>`;

          // If a newer request started while we were working, abort before rendering
          if (requestId !== this.activeRequestId) {
            console.log('⏭️ Skipping vocab skeleton render for stale request.');
            return;
          }

          // Display skeleton now, then start live pipeline and return early
          this.displayResults(text, translation, pronunciation, actualSourceLang, actualTargetLang, learningContent, learningFocus, requestId);

          // Fire-and-forget live vocabulary pipeline
          this.startVocabularyLive(text, actualSourceLang, actualTargetLang, requestId).catch(err => {
            console.log('⚠️ Live vocabulary pipeline failed, falling back:', err?.message || err);
            // As a fallback, attempt the old single-shot vocabulary generation (won't be concurrent)
            (async () => {
              try {
                const fallback = await this.getLearningContent(text, actualTargetLang, 'vocabulary', actualSourceLang);
                if (requestId !== this.activeRequestId) return;
                const container = this.tooltip.querySelector('#pg-vocab-live');
                if (container) container.innerHTML = String(fallback || '');
              } catch (_) { /* ignore */ }
            })();
          });

          return; // We already rendered and started the pipeline
        }

        // Default path for other learning modes
        console.log(`🎯 Getting learning content for focus: ${learningFocus}`);
        learningContent = await this.getLearningContent(text, actualTargetLang, learningFocus, actualSourceLang);
        // Log safely for both string and object payloads (e.g., summary returns { original, translated })
        if (learningFocus === 'summary' && learningContent && typeof learningContent === 'object') {
          const orig = String(learningContent.original || '');
          const trans = String(learningContent.translated || '');
          console.log(
            `📝 Summary content generated (orig ${orig.length} chars, trans ${trans.length} chars):`,
            orig.substring(0, 100) + '...'
          );
        } else {
          const asStr = String(learningContent || '');
          console.log(`📝 Learning content generated (${asStr.length} chars):`, asStr.substring(0, 100) + '...');
        }
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
   * Start a concurrent, incremental vocabulary pipeline:
   * 1) Quickly get seed words (word + pos) as JSON and render immediately
   * 2) Fetch per-word details concurrently and update each card as it completes
   */
  async startVocabularyLive(text, sourceLang, targetLang, requestId) {
    try {
      if (requestId !== this.activeRequestId) return; // stale guard
      const liveSessions = window.PG?.ai?.getSessions();
      if (!liveSessions?.languageModel) throw new Error('Language Model not available');
      // Proactively warm up all AI APIs to ensure they are used in vocabulary mode
      try {
        // Fire-and-forget; do not block UI
        window.PG?.ai?.ensureWriterReady?.();
        window.PG?.ai?.ensureRewriterReady?.();
        window.PG?.ai?.ensureProofreaderReady?.();
        window.PG?.ai?.ensureSummarizerReady?.();
        // Translator requires a pair; use detected source/target
        window.PG?.ai?.ensureTranslatorReady?.(targetLang, sourceLang);
      } catch (_) { /* ignore */ }

      const container = this.tooltip.querySelector('#pg-vocab-live');
      if (!container) throw new Error('Vocabulary container not found');

      const isLong = text.length > (this.settings.maxVocabularyChars || 400);
      const sample = isLong ? text.slice(0, this.settings.maxVocabularyChars) : text;
      const maxItems = this.settings.vocabMaxItems || 12;
      const langCode = this.getLanguageCode(targetLang);

      // Phase 1: Seed words (fast)
      const seedPrompt = `Return ONLY a JSON array (no prose) of up to ${maxItems} items with keys: word, pos.
Identify the most important distinct words to learn from the text below (skip stopwords). Use the original script for the source language.
Text: """${sample}"""`;

      let seeds = [];
      try {
        const raw = await liveSessions.languageModel.prompt(seedPrompt, { language: langCode });
        const clean = String(raw || '').trim().replace(/^```json\s*|^```|```$/g, '').trim();
        const arr = JSON.parse(clean);
        if (Array.isArray(arr)) {
          seeds = arr
            .filter(it => it && typeof it === 'object' && String(it.word || '').trim())
            .slice(0, maxItems)
            .map((it) => ({
              word: String(it.word || '').trim(),
              pos: String(it.pos || '').trim(),
              def: '', example: '', reading: '', transliteration: '', pronunciation: '',
              difficulty: '', frequency: ''
            }));
        }
      } catch (e) {
        console.log('Seed extraction failed:', e?.message || e);
      }

      if (!seeds.length) throw new Error('No seeds produced');

      // Render initial cards immediately
      this.lastVocabItems = seeds.slice();
      if (requestId !== this.activeRequestId) return;
      container.innerHTML = this.renderVocabItems(seeds);

      // Phase 2: Per-word details concurrently
      const concurrency = Math.max(1, Math.min(this.settings.vocabEnrichConcurrency || 3, 6));
      let active = 0;
      const queue = seeds.map((_, i) => i);

      const runOne = async (idx) => {
        const item = this.lastVocabItems[idx];
        if (!item || requestId !== this.activeRequestId) return;
  const detailPrompt = `For the single word below, return ONLY a JSON object with these keys:
word, pos, definition, reading, transliteration, pronunciation, stress, CEFR, frequency, register, family, synonyms, antonyms, collocations, etymology, cultural, regionalVariation

Constraints:
- Values must be concise, single-line strings (synonyms/collocations may be comma-separated).
- All pronunciation-related fields are for the SOURCE LANGUAGE ONLY.
- Do NOT include labels like "English:" or any other language names.

Word: ${item.word}
Text context: """${sample}"""`;
        try {
          const raw = await liveSessions.languageModel.prompt(detailPrompt, { language: langCode });
          const clean = String(raw || '').trim().replace(/^```json\s*|^```|```$/g, '').trim();
          const obj = JSON.parse(clean);
          const updated = {
            ...item,
            pos: String(obj.pos ?? item.pos ?? '').trim(),
            def: String(obj.def ?? obj.definition ?? item.def ?? '').trim(),
            example: String(obj.example ?? item.example ?? '').trim(),
            reading: String(obj.reading ?? '').trim(),
            transliteration: String(obj.transliteration ?? obj.romaji ?? obj.pinyin ?? '').trim(),
            pronunciation: String(obj.pronunciation ?? obj.pron ?? '').trim(),
            stress: String(obj.stress ?? '').trim(),
            cefr: String(obj.cefr ?? '').trim().toUpperCase(),
            synonyms: Array.isArray(obj.synonyms) ? obj.synonyms.join(', ') : String(obj.synonyms ?? '').trim(),
            antonyms: Array.isArray(obj.antonyms) ? obj.antonyms.join(', ') : String(obj.antonyms ?? '').trim(),
            polysemy: String(obj.polysemy ?? obj.senses ?? '').trim(),
            collocations: Array.isArray(obj.collocations) ? obj.collocations.join(', ') : String(obj.collocations ?? '').trim(),
            register: String(obj.register ?? '').trim(),
            domain: String(obj.domain ?? '').trim(),
            commonErrors: String(obj.commonErrors ?? '').trim(),
            idioms: Array.isArray(obj.idioms) ? obj.idioms.join(', ') : String(obj.idioms ?? '').trim(),
            family: String(obj.family ?? '').trim(),
            etymology: String(obj.etymology ?? '').trim(),
            semanticField: String(obj.semanticField ?? '').trim(),
            falseFriends: Array.isArray(obj.falseFriends) ? obj.falseFriends.join(', ') : String(obj.falseFriends ?? '').trim(),
            visuals: String(obj.visuals ?? '').trim(),
            mnemonics: String(obj.mnemonics ?? '').trim(),
            cultural: String(obj.cultural ?? '').trim(),
            appropriateness: String(obj.appropriateness ?? '').trim(),
            regionalVariation: String(obj.regionalVariation ?? '').trim(),
            sensitivity: String(obj.sensitivity ?? '').trim(),
            frequency: String(obj.frequency ?? '').trim()
          };
          // Sanitize pronunciation fields to keep only source-language info
          const [sanitized] = this.sanitizeVocabPronunciation([updated], sourceLang);
          this.lastVocabItems[idx] = sanitized;
          if (requestId !== this.activeRequestId) return;
          // Update just this card in the UI
          const analysis = container.querySelector('.polyglot-vocabulary-analysis');
          const card = analysis?.querySelector(`.word-card[data-idx="${idx}"]`);
          if (card) {
            const tmp = document.createElement('div');
            tmp.innerHTML = this.renderVocabItems([sanitized]);
            const newCard = tmp.querySelector('.word-card');
            if (newCard) {
              card.innerHTML = newCard.innerHTML;
              // Ensure the index badge remains correct
              const badge = card.querySelector('.word-index');
              if (badge) badge.textContent = String(idx + 1);
            }
          } else {
            // If structure changed, re-render all as a safe fallback
            container.innerHTML = this.renderVocabItems(this.lastVocabItems);
          }
        } catch (e) {
          console.log(`Detail fetch failed for "${item.word}":`, e?.message || e);
        }
      };

      const pump = () => new Promise((resolve) => {
        const next = () => {
          if (requestId !== this.activeRequestId) return resolve();
          if (!queue.length && active === 0) return resolve();
          while (active < concurrency && queue.length) {
            const idx = queue.shift();
            active++;
            runOne(idx).finally(() => {
              active--;
              next();
            });
          }
        };
        next();
      });

      await pump();

      // Only enrich if items are missing critical fields (examples, definitions, etc.)
      const needsEnrichment = this.lastVocabItems.some(item => 
        (!item.example || item.example.length < 4) || 
        (!item.def || item.def.length < 3) ||
        (!item.transliteration && this.needsTransliteration(sourceLang))
      );
      
      if (needsEnrichment) {
        console.log(`🔧 Enriching vocabulary items (${this.lastVocabItems.filter(item => !item.example || item.example.length < 4).length} missing examples)`);
        try {
          const enriched = await this.enrichVocabularyItems(this.lastVocabItems.slice(0), { sourceLang, targetLang, strategy: this.settings?.vocabStrategy || 'adaptive' });
          if (requestId === this.activeRequestId) {
            this.lastVocabItems = enriched;
            container.innerHTML = this.renderVocabItems(enriched);
          }
        } catch (_) { /* ignore */ }
      } else {
        console.log(`✅ Skipping enrichment - all vocabulary items already have adequate examples and definitions`);
      }
    } catch (err) {
      console.log('Live vocabulary pipeline error:', err?.message || err);
      // Leave skeleton; fallback will be attempted by caller if provided
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

  detectLanguageFallback(text) { return window.PG?.lang?.detectLanguageFallback(text); }

  getLanguageCode(lang) { return window.PG?.lang?.getLanguageCode(lang); }

  // Condense a summary to be short and learner-friendly
  condenseSummary(text, options = {}) { return window.PG?.aiEnhanced?.condenseSummary(text, options); }

  async getLearningContent(text, targetLang, focus, sourceLang) {
    try {
      const langCode = this.getLanguageCode(targetLang);
      let prompt = '';
      let usedCompact = false; // track if we use compact JSON prompt for vocabulary
      // Hoisted strategy for vocabulary so it is available across execution paths
      let strategy;
      
      switch (focus) {
        case 'summary':
          console.log(`📄 Summary analysis requested for: "${text}"`);
          {
            const cacheKey = `summary|${targetLang}|${sourceLang}|${text}`;
            if (this.learningCache.has(cacheKey)) {
              console.log('🗃️ Cache hit for summary');
              return this.learningCache.get(cacheKey);
            }
            if (this.inFlightLearning.has(cacheKey)) {
              console.log('🛫 Awaiting in-flight summary');
              try { return await this.inFlightLearning.get(cacheKey); } catch (_) { /* fallthrough */ }
            }
            const exec = (async () => {
              const payload = await window.PG?.aiEnhanced?.generateSummary?.(text, targetLang, sourceLang);
              this.learningCache.set(cacheKey, payload);
              this.learningCacheOrder.push(cacheKey);
              if (this.learningCacheOrder.length > 30) {
                const oldest = this.learningCacheOrder.shift();
                if (oldest) this.learningCache.delete(oldest);
              }
              return payload;
            })();
            this.inFlightLearning.set(cacheKey, exec);
            try { return await exec; } finally { this.inFlightLearning.delete(cacheKey); }
          }
          
        case 'vocabulary':
          console.log(`📚 Vocabulary analysis requested for: "${text}"`);
          const languageModel = window.PG?.ai?.getSessions()?.languageModel;
          console.log(`🤖 Language Model available:`, !!languageModel);
          if (languageModel) {
            strategy = this.settings.vocabStrategy || 'adaptive';
            const isLong = text.length > (this.settings.maxVocabularyChars || 400);
            // Strategy-based prompt selection with pronunciation support
            const useCompact = (strategy === 'fast') || (strategy === 'adaptive' && isLong);
            usedCompact = useCompact;
            // Cache key incorporates mode, language, strategy, source language, and text
            const cacheKey = `${focus}|${targetLang}|${sourceLang}|${strategy}|${text}`;
            if (this.learningCache.has(cacheKey)) {
              console.log('🗃️ Cache hit for learning content');
              const cached = this.learningCache.get(cacheKey);
              if (cached && typeof cached === 'object' && cached.html) {
                this.lastVocabItems = Array.isArray(cached.items) ? cached.items : [];
                return cached.html;
              }
              return cached;
            }
            if (this.inFlightLearning.has(cacheKey)) {
              console.log('🛫 Awaiting in-flight vocabulary analysis');
              try { return await this.inFlightLearning.get(cacheKey); } catch (e) { /* fallthrough */ }
            }
            
            if (useCompact) {
              const sample = isLong ? text.slice(0, this.settings.maxVocabularyChars) : text;
              const maxItems = this.settings.vocabMaxItems || 12;
              // Fast/Adaptive-Long: Compact JSON focusing pronunciation ONLY on the source language
              const src = sourceLang || 'the detected language';
              prompt = `Return ONLY a JSON array (no extra text) of up to ${maxItems} items with these keys:
  word, pos, def, example, reading, transliteration, pronunciation, stress, cefr, synonyms, antonyms, polysemy, collocations, register, domain, commonErrors, idioms, family, etymology, semanticField, falseFriends, visuals, mnemonics, cultural, appropriateness, regionalVariation, sensitivity

  Field descriptions (SOURCE LANGUAGE ONLY):
  - word: the word in its original script (source language)
  - pos: part of speech (noun, verb, adjective, etc.)
  - def: clear, concise English definition
  - example: a short sentence using the word (max 12 words)
  - reading: native reading for the source language (e.g., hiragana for Japanese, pinyin for Chinese). Leave empty if not applicable.
  - transliteration: Latin transliteration for the source language if the script is non-Latin (Romaji for Japanese, Pinyin for Chinese, RR for Korean). Leave empty for Latin-script languages.
  - pronunciation: ONE concise phonetic guide for the source language ONLY.
  - stress: show primary stress placement if applicable (e.g., ˈpho-to-graph)

  Important formatting rules:
  - DO NOT include any other languages or labels like "Chinese:", "Arabic:", "Russian:", "Korean:", or "European languages:".
  - Each value must be plain text without language-prefixed labels. No lists. One line max per field.

  Text (source language = ${src}): """${sample}"""`;
            } else {
              // Detailed: Full analysis with comprehensive learning support (limit text length for speed)
              const src = sourceLang || 'the detected language';
              const sample = isLong ? text.slice(0, this.settings.maxVocabularyChars) : text;
              prompt = `Analyze the vocabulary in: "${sample}"

Please provide a comprehensive structured vocabulary breakdown:

**DETAILED WORD ANALYSIS:**
For each important word, provide:
- Word: [word in original script]
- Definition: [detailed, nuanced definition with context]
- Part of speech: [noun/verb/adjective/etc.]
- Difficulty: [Beginner/Intermediate/Advanced]
- Frequency: [Common/Uncommon/Rare]
- Example: [ONE short sentence using the word - max 12 words]
  - Pronunciation (SOURCE LANGUAGE ONLY = ${src}):
    - reading: native reading if applicable (e.g., hiragana for Japanese, pinyin for Chinese). Leave empty if not applicable.
    - transliteration: Latin transliteration if the source script is non-Latin (e.g., romaji/pinyin/RR). Leave empty for Latin-script languages.
    - pronunciation: a single concise phonetic hint for the source language ONLY. No other languages, no labels.
- Etymology: word origin and historical development
- Word family: related terms, derivatives, compounds
- Register: formal/informal/academic/colloquial usage
- Cultural context: cultural significance if relevant

**COMPREHENSIVE LANGUAGE ANALYSIS:**
- Overall text difficulty: [detailed assessment]
- Academic vs conversational style
- Formal vs informal register
- Genre and text type analysis
- Cultural and contextual background

**ADVANCED VOCABULARY HIGHLIGHTS:**
- Most important words for comprehension
- Words with multiple meanings and contexts
- False friends and common mistakes
- Stylistic and register variations
- Technical or domain-specific terminology

**DETAILED LEARNING STRATEGIES:**
- Mnemonic devices and memory aids
- Word association techniques
- Common collocations and phrases
- Grammatical patterns and usage rules
- Cross-linguistic comparisons

**CONTEXTUAL EXAMPLES:**
Provide 1-2 SHORT example sentences (max 15 words each) showing basic usage.

**CULTURAL AND PRAGMATIC NOTES:**
- Social and cultural usage contexts
- Politeness levels and formality
- Regional variations if applicable

Format with clear headings, bullet points, and detailed explanations. Provide comprehensive learning support. Respond in ${targetLang === 'en' ? 'English' : targetLang}.`;
            }
            console.log(`📝 Vocabulary prompt created, length: ${prompt.length}`);
          } else {
            console.log('❌ Language Model not available for vocabulary analysis');
          }
          break;
          
        case 'grammar':
          return await window.PG?.aiEnhanced?.generateGrammar?.(text, targetLang, sourceLang);
          
        case 'verbs':
          return await window.PG?.aiEnhanced?.generateVerbs?.(text, targetLang, sourceLang);
          
        case 'translate':
          // For translate mode, we don't need additional learning content
          return '';
      }

      const finalSessions = window.PG?.ai?.getSessions();
      if (prompt && finalSessions?.languageModel) {
        console.log(`🚀 Executing ${focus} prompt with Language Model...`);
        try {
          // For vocabulary, dedupe concurrent executions using inFlightLearning
          if (focus === 'vocabulary') {
            const cacheKey = `${focus}|${targetLang}|${sourceLang}|${strategy}|${text}`;
            const execPromise = (async () => {
              const result = await finalSessions.languageModel.prompt(prompt, { language: langCode });
              console.log(`✅ ${focus} analysis completed successfully, length: ${result.length}`);
              if (usedCompact) {
                const parsed = this.parseVocabJSONToItems(result);
                if (parsed && Array.isArray(parsed.items)) {
                  const sanitized = this.sanitizeVocabPronunciation(parsed.items, sourceLang);
                  // Immediate render of sanitized items; defer enrichment to post-render if enabled
                  const html = this.renderVocabItems(sanitized);
                  this.lastVocabItems = sanitized;
                  // Store plan for deferred enrichment (handled in displayResults)
                  if (this.settings && this.settings.enrichVocab) {
                    this.vocabEnrichmentPlan = { items: sanitized, sourceLang, targetLang, strategy, cacheKey, rawText: result };
                  }
                  this.learningCache.set(cacheKey, { html, items: sanitized });
                  this.learningCacheOrder.push(cacheKey);
                  if (this.learningCacheOrder.length > 30) {
                    const oldest = this.learningCacheOrder.shift();
                    if (oldest) this.learningCache.delete(oldest);
                  }
                  return html;
                }
              }
              // Try to extract from detailed text and render rich cards + formatted analysis
              const items = this.parseVocabFromAnalysisText(result);
              const sanitized = this.sanitizeVocabPronunciation(items, sourceLang);
              this.lastVocabItems = sanitized;
              const formatted = this.formatVocabularyAnalysis(result);
              const cards = (sanitized && sanitized.length) ? this.renderVocabItems(sanitized) : '';
              const combined = cards ? `${cards}<hr>${formatted}` : formatted;
              // Store plan for deferred enrichment
              if (this.settings && this.settings.enrichVocab) {
                this.vocabEnrichmentPlan = { items: sanitized, sourceLang, targetLang, strategy, cacheKey, rawText: result };
              }
              this.learningCache.set(cacheKey, { html: combined, items: sanitized });
              this.learningCacheOrder.push(cacheKey);
              if (this.learningCacheOrder.length > 30) {
                const oldest = this.learningCacheOrder.shift();
                if (oldest) this.learningCache.delete(oldest);
              }
              return combined;
            })();
            this.inFlightLearning.set(cacheKey, execPromise);
            try {
              const out = await execPromise;
              return out;
            } finally {
              this.inFlightLearning.delete(cacheKey);
            }
          }

          // Non-vocabulary path (no dedupe needed)
          const result = await finalSessions.languageModel.prompt(prompt, { language: langCode });
          console.log(`✅ ${focus} analysis completed successfully, length: ${result.length}`);
          return result;
        } catch (error) {
            console.error(`❌ Language model prompt failed for ${focus}:`, error);
            // No fallback per policy
            return `${focus} analysis failed: ${error?.message || error}`;
        }
      }
      
      console.log(`⚠️ Cannot generate ${focus} content - missing prompt or Language Model`);
      return focus === 'translate' ? '' : 'Learning content not available - Chrome AI Language Model required';
    } catch (error) {
      console.error(`${focus} analysis failed:`, error);
      return focus === 'translate' ? '' : `${focus} analysis failed`;
    }
  }

  formatVocabularyAnalysis(rawAnalysis) { return window.PG?.vocab?.formatVocabularyAnalysis(rawAnalysis); }

  // Parse compact JSON vocabulary output and render quick HTML
  tryFormatVocabJSON(result) {
    const parsed = window.PG?.vocab?.parseVocabJSONToItems(result, this.settings.vocabMaxItems || 12);
    if (parsed && Array.isArray(parsed.items)) return this.renderVocabItems(parsed.items);
    return null;
  }

  // Extract structured items from compact JSON output
  parseVocabJSONToItems(result) { return window.PG?.vocab?.parseVocabJSONToItems(result, this.settings.vocabMaxItems || 12); }

  // Render word cards HTML from items
  renderVocabItems(items) { return window.PG?.vocab?.renderVocabItems(items, this.lastSourceLang || 'auto'); }

  // Keep only source-language pronunciation; strip cross-language labeled lines
  sanitizeVocabPronunciation(items, sourceLang) { return window.PG?.vocab?.sanitizeVocabPronunciation(items, sourceLang); }

  // Truncate overly long examples to max 2 sentences, 120 characters (delegate)
  truncateExample(example) { return window.PG?.aiEnhanced?.truncateExample(example); }

  // Check if source language typically needs transliteration
  needsTransliteration(sourceLang) {
    if (!sourceLang || sourceLang === 'auto') return false;
    const lang = sourceLang.toLowerCase();
    // Languages that typically use non-Latin scripts
    return ['zh', 'ja', 'ko', 'ar', 'he', 'ru', 'th', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'ur', 'fa', 'ne', 'si'].includes(lang);
  }

  // Best-effort parser for detailed analysis text to extract items
  parseVocabFromAnalysisText(text) {
    try {
      const out = [];
      const txt = String(text || '').replace(/\r\n?/g, '\n');
      // Split by double newlines or by numbered sections like "\n1. "
      const rawBlocks = txt.split(/\n{2,}|(?=^\d+\.\s)/gm).map(b => b.trim()).filter(Boolean);
      for (let b of rawBlocks) {
        // Try numbered style: "1. Word (transliteration)" as the first line
        const lines = b.split(/\n/).map(l => l.trim()).filter(Boolean);
        if (!lines.length) continue;
        let word = '';
        let translitFromTitle = '';
        const titleMatch = lines[0].match(/^\d+\.\s*(.+)$/);
        if (titleMatch) {
          const t = titleMatch[1].trim();
          const m = t.match(/^(.+?)\s*\(([^\)]+)\)/);
          if (m) {
            word = m[1].trim();
            translitFromTitle = m[2].trim();
          } else {
            word = t;
          }
        }
        // Fallback to "- Word: ..." style
        if (!word) {
          word = /-\s*Word:\s*([^\n]+)/i.exec(b)?.[1]?.trim() || '';
        }
        if (!word) continue;

        const get = (label) => new RegExp(`^${label}:\\s*([^\\n]+)`, 'im').exec(b)?.[1]?.trim() || '';
        const def = get('Definition');
        const pos = get('Part of speech');
        const difficulty = get('Difficulty');
        const frequency = get('Frequency');
        const pron = get('Pronunciation');
        const family = get('Word family');
        const register = get('Register');
        const cultural = get('Cultural context');
        const etym = get('Etymology');
        const synonyms = get('Synonyms?');
        const collocs = get('Collocations?');
        const cefr = get('Level') || get('CEFR');
        // Example: try numbered/bullet lines (skip the title line) but prefer shorter ones
        let ex = '';
        for (let i = 1; i < lines.length; i++) {
          const m = lines[i].match(/^(?:\d+\.\s+|•\s+|-\s+)(.+)$/);
          if (m) { 
            const candidate = m[1].trim(); 
            // Prefer shorter examples (max 120 chars) or use first one if none are short
            if (candidate.length <= 120 || !ex) {
              ex = candidate;
              if (candidate.length <= 120) break; // Found a good short one, use it
            }
          }
        }

        out.push({
          word,
          pos,
          def,
          example: ex ? window.PG?.aiEnhanced?.truncateExample(ex) : ex,
          pronunciation: pron,
          transliteration: translitFromTitle,
          difficulty,
          frequency,
          family,
          register,
          cultural,
          etymology: etym,
          cefr,
          synonyms,
          collocations: collocs
        });
      }
      return out.slice(0, this.settings.vocabMaxItems || 12);
    } catch {
      return [];
    }
  }

  // Load and save persistent vocabulary list
  async loadVocabList() {
    try {
      const data = await chrome.storage.local.get({ polyglotVocabList: [] });
      this.vocabularyList = Array.isArray(data.polyglotVocabList) ? data.polyglotVocabList : [];
    } catch (e) {
      this.vocabularyList = [];
    }
  }

  async saveVocabList() {
    try {
      await chrome.storage.local.set({ polyglotVocabList: this.vocabularyList });
    } catch (e) {
      console.error('Failed to persist vocabulary list:', e);
    }
  }

  // Public actions for buttons
  async saveVocabularyToLocal() {
    try {
      if (!Array.isArray(this.lastVocabItems) || this.lastVocabItems.length === 0) {
        console.log('No vocabulary items available to save.');
        this.showToast && this.showToast('No vocabulary items to save', 'warn');
        return;
      }
      // Deduplicate by word+pos
      const keyOf = (it) => `${it.word}:::${it.pos}`.toLowerCase();
      const existing = new Set(this.vocabularyList.map(keyOf));
      let added = 0;
      for (const it of this.lastVocabItems) {
        const key = keyOf(it);
        if (it.word && !existing.has(key)) {
          this.vocabularyList.push({ ...it, savedAt: Date.now() });
          existing.add(key);
          added++;
        }
      }
      await this.saveVocabList();
      console.log(`✅ Saved ${added} new item(s) to local vocabulary list (total: ${this.vocabularyList.length}).`);
      this.showToast && this.showToast(added ? `Saved ${added} word${added>1?'s':''}` : 'No new words to save', added ? 'success' : 'info');
    } catch (e) {
      console.error('Failed to save vocabulary:', e);
      this.showToast && this.showToast('Failed to save words', 'error');
    }
  }

  exportVocabularyAsCSV(items = this.lastVocabItems) {
    if (!Array.isArray(items) || items.length === 0) {
      console.log('No vocabulary items to export as CSV.');
      this.showToast && this.showToast('No items to export', 'warn');
      return;
    }
    const esc = (s) => '"' + String(s ?? '').replace(/"/g, '""') + '"';
    const rows = [['word','pos','definition','example']]
      .concat(items.map(it => [esc(it.word), esc(it.pos), esc(it.def), esc(it.example)]))
      .map(cols => cols.join(','))
      .join('\r\n');
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8' });
    this.triggerDownload(`vocabulary_${Date.now()}.csv`, blob);
    this.showToast && this.showToast(`Exported ${items.length} item${items.length>1?'s':''} to CSV`, 'success');
  }

  exportVocabularyAsTSVForAnki(items = this.lastVocabItems) {
    if (!Array.isArray(items) || items.length === 0) {
      console.log('No vocabulary items to export as TSV.');
      this.showToast && this.showToast('No items to export', 'warn');
      return;
    }
    // Anki-friendly TSV without header; fields: Word\tDefinition (POS)\tExample
    const rows = items.map(it => [it.word, `${it.def}${it.pos ? ` (${it.pos})` : ''}`, it.example].join('\t')).join('\r\n');
    const blob = new Blob([rows], { type: 'text/tab-separated-values;charset=utf-8' });
    this.triggerDownload(`vocabulary_anki_${Date.now()}.tsv`, blob);
    this.showToast && this.showToast(`Exported ${items.length} item${items.length>1?'s':''} to Anki TSV`, 'success');
  }

  triggerDownload(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Lightweight toast notification inside the tooltip
  showToast(message, type = 'info') {
    try {
      if (!this.tooltip) return;
      // Remove any existing toast
      const existing = this.tooltip.querySelector('.polyglot-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'polyglot-toast';
      toast.textContent = message;
      const colors = { info: '#2563eb', success: '#16a34a', warn: '#d97706', error: '#dc2626' };
      Object.assign(toast.style, {
        position: 'relative',
        marginTop: '10px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: colors[type] || colors.info,
        color: '#fff',
        fontSize: '12px',
        boxShadow: '0 6px 12px rgba(0,0,0,0.15)',
        opacity: '0',
        transition: 'opacity 150ms ease',
      });

      const container = this.tooltip.querySelector('.polyglot-learning-content') || this.tooltip.querySelector('.polyglot-tooltip-content') || this.tooltip;
      container.appendChild(toast);
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 180);
      }, 2000);
    } catch (_) { /* ignore */ }
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
  const safeOriginal = this.escapeHTML(originalText);
  const safeTranslation = this.escapeHTML(translation);
    
    // Always show original text
    html += `
      <div class="polyglot-content-row">
        <div class="polyglot-content-column">
          <div class="polyglot-original-text polyglot-fade-in">
            <div class="label">Original Text (${langNames[sourceLang] || sourceLang})</div>
            <div class="text">${safeOriginal}</div>
          </div>
        </div>
    `;
    
  // Show a second column for translate and summary modes
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
              <div class="polyglot-translation-text">${safeTranslation}</div>
              ${pronunciation ? `<div class="polyglot-pronunciation">[${pronunciation}]</div>` : ''}
              <div class="polyglot-language-info">${langNames[targetLang] || targetLang}</div>
            </div>
          </div>
        </div>
      `;
    } else if (learningFocus === 'summary') {
      html += `
        <div class="polyglot-content-column">
          <div class="polyglot-summary-section polyglot-fade-in">
            <div class="polyglot-section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Summary
            </div>
            <div class="polyglot-summary-content">
              <div class="polyglot-summary-original">
                <div class="polyglot-subtitle">Original Summary</div>
                ${learningContent?.original || learningContent || '<em>Generating summary…</em>'}
              </div>
              <div class="polyglot-summary-translation" style="margin-top:12px;">
                <div class="polyglot-subtitle">Translated Summary (${langNames[targetLang] || targetLang})</div>
                ${learningContent?.translated || learningContent || ''}
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (learningFocus !== 'vocabulary') {
      // For other learning modes, show a placeholder or leave empty
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

  // Render additional learning content panel for non-translate, non-summary modes
  if (learningContent && learningFocus !== 'translate' && learningFocus !== 'summary') {
      console.log(`📊 Displaying ${learningFocus} content in UI (${learningContent.length} chars)`);
      html += `
        <div class="polyglot-learning-content polyglot-fade-in">
          <div class="polyglot-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 6V4M6 18V16M18 18V16M4 12V10M20 12V10M12 20V18M12 14V12M12 8V6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
            ${learningFocus.charAt(0).toUpperCase() + learningFocus.slice(1)} Analysis
          </div>
          <div class="polyglot-learning-body polyglot-${learningFocus}-content">
            ${learningContent}
          </div>
        </div>
      `;
      if (learningFocus === 'vocabulary') {
        html += `
          <div class="polyglot-action-buttons">
            <button class="polyglot-button" data-action="save-words" title="Save current vocabulary items locally" aria-label="Save words">Save Words</button>
            <button class="polyglot-button" data-action="export-csv" title="Export current vocabulary items as CSV" aria-label="Export CSV">Export Current CSV</button>
            <button class="polyglot-button" data-action="export-anki" title="Export current vocabulary items as Anki TSV" aria-label="Export Anki TSV">Export Current Anki (TSV)</button>
          </div>
        `;
      }
    } else if (learningFocus !== 'summary') {
      // In summary mode we already render side-by-side; don't log as missing
      console.log(`ℹ️ No learning content to display: content=${!!learningContent}, focus=${learningFocus}`);
    }

  if (this.settings.showExamples && learningFocus === 'vocabulary') {
      html += `
        <div class="polyglot-examples polyglot-fade-in">

        </div>
      `;
    }

    // Show action buttons only in Translate mode
    if (learningFocus === 'translate') {
      html += `
        <div class="polyglot-action-buttons">
          <button class="polyglot-button" data-action="copy-translation">Copy Translation</button>
        </div>
      `;
    }

    content.innerHTML = html;

    // Bind action buttons for vocabulary (event delegation to avoid inline handlers)
    if (learningFocus === 'vocabulary') {
      const actions = content.querySelector('.polyglot-action-buttons');
      if (actions && !actions._pgBound) {
        actions.addEventListener('click', (ev) => {
          const btn = ev.target.closest('button');
          if (!btn) return;
          const act = btn.getAttribute('data-action');
          switch (act) {
            case 'save-words':
              this.saveVocabularyToLocal();
              break;
            case 'export-csv':
              this.exportVocabularyAsCSV();
              break;
            case 'export-anki':
              this.exportVocabularyAsTSVForAnki();
              break;
          }
        });
        actions._pgBound = true;
      }

      // Per-card actions (save/copy) — delegate from stable root
      const vocabRoot = content.querySelector('#pg-vocab-live') || content;
      if (vocabRoot && !vocabRoot._pgCardBound) {
        vocabRoot.addEventListener('click', (ev) => {
          const btn = ev.target.closest('[data-card-action]');
          if (!btn) return;
          const idx = Number(btn.getAttribute('data-idx'));
          const act = btn.getAttribute('data-card-action');
          if (Number.isNaN(idx)) return;
          if (act === 'save-one') this.saveSingleVocabItem(idx);
          if (act === 'copy-one') this.copySingleVocabItem(idx);
        });
        vocabRoot._pgCardBound = true;
      }

      // Kick off deferred enrichment with concurrency and lazy rendering
      if (this.settings && this.settings.enrichVocab && Array.isArray(this.lastVocabItems)) {
        this._startDeferredVocabEnrichment(content, sourceLang, targetLang, requestId);
      }
    }

    // Bind translate mode actions
    if (learningFocus === 'translate') {
      const actions = content.querySelector('.polyglot-action-buttons');
      if (actions && !actions._pgCopyBound) {
        actions.addEventListener('click', async (ev) => {
          const btn = ev.target.closest('[data-action="copy-translation"]');
          if (!btn) return;
          try {
            await navigator.clipboard.writeText(translation || '');
            this.showToast && this.showToast('Copied translation', 'success');
          } catch (e) {
            console.error('Copy translation failed:', e);
            this.showToast && this.showToast('Copy failed', 'error');
          }
        });
        actions._pgCopyBound = true;
      }
    }
  }

  // Save a single vocab item by index
  async saveSingleVocabItem(idx) {
    try {
      const it = this.lastVocabItems?.[idx];
      if (!it || !it.word) return this.showToast && this.showToast('Nothing to save', 'warn');
      const keyOf = (x) => `${x.word}:::${x.pos}`.toLowerCase();
      const existing = new Set(this.vocabularyList.map(keyOf));
      if (!existing.has(keyOf(it))) {
        this.vocabularyList.push({ ...it, savedAt: Date.now() });
        await this.saveVocabList();
        this.showToast && this.showToast(`Saved "${it.word}"`, 'success');
      } else {
        this.showToast && this.showToast('Already saved', 'info');
      }
    } catch (e) {
      console.error('Save one failed:', e);
      this.showToast && this.showToast('Failed to save', 'error');
    }
  }

  // Copy a single card as plain text
  async copySingleVocabItem(idx) {
    try {
      const it = this.lastVocabItems?.[idx];
      if (!it) return;
      const parts = [
        `Word: ${it.word}`,
        it.pos ? `POS: ${it.pos}` : '',
        it.cefr ? `CEFR: ${it.cefr}` : '',
        it.frequency ? `Frequency: ${it.frequency}` : '',
        it.def ? `Definition: ${it.def}` : '',
        it.reading ? `Reading: ${it.reading}` : '',
        it.transliteration ? `Transliteration: ${it.transliteration}` : '',
        it.pronunciation ? `Pronunciation: ${it.pronunciation}` : '',
        it.register ? `Register: ${it.register}` : '',
        it.family ? `Family: ${it.family}` : '',
        it.etymology ? `Etymology: ${it.etymology}` : '',
        it.synonyms ? `Synonyms: ${it.synonyms}` : '',
        it.collocations ? `Collocations: ${it.collocations}` : '',
        it.example ? `Example: ${it.example}` : '',
        it.exampleTranslation ? `Translation: ${it.exampleTranslation}` : ''
      ].filter(Boolean).join('\n');
      await navigator.clipboard.writeText(parts);
      this.showToast && this.showToast('Copied card', 'success');
    } catch (e) {
      console.error('Copy one failed:', e);
      this.showToast && this.showToast('Copy failed', 'error');
    }
  }

  // Run enrichment after initial render with concurrency cap and lazy updates as cards scroll into view
  _startDeferredVocabEnrichment(container, sourceLang, targetLang, requestId) {
    try {
      if (requestId !== this.activeRequestId) return; // stale guard
      const cards = Array.from(container.querySelectorAll('.polyglot-vocabulary-analysis .word-card'));
      if (!cards.length) return;

      // Add loading spinners to cards (hidden until queued)
      for (const card of cards) {
        if (!card.querySelector('.pg-card-loading')) {
          const spinner = document.createElement('div');
          spinner.className = 'pg-card-loading';
          spinner.innerHTML = '<div class="polyglot-spinner" style="width:16px;height:16px;margin-right:6px"></div><span>Enhancing…</span>';
          spinner.style.display = 'none';
          spinner.style.alignItems = 'center';
          spinner.style.gap = '6px';
          spinner.style.marginTop = '6px';
          card.appendChild(spinner);
        }
      }

      const items = this.lastVocabItems.slice();
      const maxN = Math.min(items.length, (this.settings.vocabEnrichMaxItems || 6));
      const concurrency = Math.max(1, Math.min(this.settings.vocabEnrichConcurrency || 2, 4));
      const queue = [];
      for (let i = 0; i < maxN; i++) queue.push(i);

      const inView = new Set();
      const observer = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const idx = Number(e.target.getAttribute('data-idx'));
          if (e.isIntersecting) inView.add(idx); else inView.delete(idx);
        }
      }, { root: container.querySelector('.polyglot-tooltip-content') || container, rootMargin: '50px', threshold: 0.01 });
      cards.forEach(c => observer.observe(c));

      const pickNext = () => {
        // Prefer cards in view; otherwise take from front
        let pos = queue.findIndex(i => inView.has(i));
        if (pos === -1) pos = 0;
        return queue.splice(pos, 1)[0];
      };

      let active = 0;
      const runNext = async () => {
        if (requestId !== this.activeRequestId) { observer.disconnect(); return; }
        if (!queue.length) { if (active === 0) observer.disconnect(); return; }
        while (active < concurrency && queue.length) {
          const idx = pickNext();
          if (idx === undefined) break;
          active++;
          const card = cards[idx];
          const spinner = card?.querySelector?.('.pg-card-loading');
          if (spinner) spinner.style.display = 'flex';
          // Perform single-item enrichment
          (async () => {
            try {
              const [enriched] = await this.enrichVocabularyItems([items[idx]], { sourceLang, targetLang, strategy: this.settings.vocabStrategy || 'adaptive' });
              // Update in-memory and card
              if (enriched) {
                items[idx] = enriched;
                this.lastVocabItems[idx] = enriched;
                if (card && requestId === this.activeRequestId) {
                  const tmp = document.createElement('div');
                  tmp.innerHTML = this.renderVocabItems([enriched]);
                  const newCard = tmp.querySelector('.word-card');
                  if (newCard) {
                    // Replace content but keep original classes (color-*) and data-idx
                    const header = newCard.querySelector('.word-card-header');
                    const newContent = newCard.innerHTML;
                    card.innerHTML = newContent;
                    // Ensure the index badge shows the correct number
                    const badge = card.querySelector('.word-index');
                    if (badge) badge.textContent = String((idx + 1));
                  }
                }
              }
            } catch (_) { /* ignore */ }
            finally {
              if (spinner) spinner.style.display = 'none';
              active--;
              runNext();
            }
          })();
        }
      };
      runNext();
    } catch (e) {
      console.log('Deferred enrichment failed to start:', e?.message || e);
    }
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
  window.__polyglotReader = new PolyglotReader();
}