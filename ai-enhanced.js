// Enhanced AI utilities for PolyglotReader extension
// Handles all Chrome AI API interactions and processing

window.PG = window.PG || {};
window.PG.aiEnhanced = window.PG.aiEnhanced || {};

// AI API Management and Session Handling (reuse core ai-utils sessions)
window.PG.aiEnhanced.getSessions = function() {
  return window.PG?.ai?.getSessions?.() || {};
};

// Delegate initialization to core ai utils to avoid duplicate sessions
window.PG.aiEnhanced.initializeAIAPIs = async function() {
  try { return await window.PG?.ai?.initializeAIAPIs?.(); } catch (e) { console.log('AI init (enhanced) failed:', e?.message || e); }
};

// Ensure Translator is ready
window.PG.aiEnhanced.ensureTranslatorReady = async function(targetLang, sourceLang = 'auto') {
  try { return await window.PG?.ai?.ensureTranslatorReady?.(targetLang, sourceLang); } catch (e) { console.log('Translator (enhanced) failed:', e?.message || e); return null; }
};

// Ensure Summarizer is ready
window.PG.aiEnhanced.ensureSummarizerReady = async function() {
  try { 
    return await window.PG?.ai?.ensureSummarizerReady?.(); 
  } catch (e) { 
    console.log('Summarizer (enhanced) failed:', e?.message || e); 
    throw e; // Re-throw to preserve error details
  }
};

// Vocabulary Processing Functions
window.PG.aiEnhanced.enrichVocabularyItems = async function(items, options = {}) {
  const { sourceLang, targetLang, strategy = 'adaptive', maxItems = 6, concurrency = 2 } = options;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('⚠️ No vocabulary items to enrich');
    return [];
  }
  
  // Ensure AI APIs are initialized
  try {
    await window.PG?.ai?.initializeAIAPIs?.();
  } catch (e) {
    console.log('⚠️ AI initialization failed:', e?.message || e);
  }
  
  const sessions = window.PG.aiEnhanced.getSessions();
  if (!sessions?.languageModel && !sessions?.writer && !sessions?.rewriter) {
    console.log('⚠️ Cannot enrich vocabulary - no AI APIs available');
    console.log('Available sessions:', Object.keys(sessions || {}).filter(k => sessions[k]));
    return items;
  }
  
  console.log(`🔧 Starting vocabulary enrichment for ${items.length} items (strategy: ${strategy})`);
  const startTime = Date.now();
  
  // Resolve source language once for the entire batch to avoid redundant detection calls
  let resolvedSourceLang = sourceLang;
  if ((!sourceLang || sourceLang === 'auto') && sessions?.languageDetector?.detect && items.length > 0) {
    try {
      // Use the first item with content to detect language
      const sampleItem = items.find(item => item.word || item.example) || items[0];
      const sampleText = sampleItem?.example || sampleItem?.word || '';
      if (sampleText) {
        // Language Detector returns an array of { detectedLanguage, confidence } objects
        // sorted by confidence (highest first)
        const results = await sessions.languageDetector.detect(sampleText);
        if (results && results.length > 0) {
          const topResult = results[0]; // Highest confidence result
          // Only use detection if confidence is reasonably high
          if (topResult.confidence > 0.6) {
            resolvedSourceLang = topResult.detectedLanguage.toLowerCase();
            console.log(`🔍 Resolved source language for batch: ${resolvedSourceLang} (confidence: ${(topResult.confidence * 100).toFixed(1)}%)`);
          } else {
            console.log(`⚠️ Language detection confidence too low (${(topResult.confidence * 100).toFixed(1)}%), using fallback`);
          }
        }
      }
    } catch (e) {
      console.log('⚠️ Batch language detection failed, using provided sourceLang:', e?.message || e);
    }
  }
  
  // Limit items to process
  const itemsToProcess = items.slice(0, maxItems);
  const results = [];
  
  // Process items with concurrency control
  const processBatch = async (batch) => {
    const promises = batch.map(async (item) => {
      try {
        return await window.PG.aiEnhanced.enrichSingleItem(item, { 
          sourceLang, 
          targetLang, 
          strategy,
          resolvedSourceLang // Pass the resolved source language to avoid per-item detection
        });
      } catch (error) {
        console.log('⚠️ Failed to enrich item:', item.word, error?.message || error);
        return item; // Return original on error
      }
    });
    return await Promise.all(promises);
  };
  
  // Process in batches to control concurrency
  for (let i = 0; i < itemsToProcess.length; i += concurrency) {
    const batch = itemsToProcess.slice(i, i + concurrency);
    const batchResults = await processBatch(batch);
    results.push(...batchResults);
  }
  
  const elapsed = Date.now() - startTime;
  console.log(`✅ Vocabulary enrichment completed in ${elapsed}ms for ${results.length} items`);
  
  return results;
};

// Grammar Analysis
window.PG.aiEnhanced.generateGrammar = async function(text, targetLang, sourceLang) {
  // Ensure AI APIs are initialized
  try {
    await window.PG?.ai?.initializeAIAPIs?.();
  } catch (initErr) {
    console.log('AI initialization in grammar mode:', initErr?.message || initErr);
  }

  const sessions = window.PG?.ai?.getSessions?.() || {};
  const langCode = window.PG?.lang?.getLanguageCode?.(targetLang);
  
  // Try Proofreader first if available (can return structured suggestions)
  if (sessions.proofreader?.proofread) {
    try {
      const result = await sessions.proofreader.proofread(text);
      const suggestions = result?.suggestions || result;
      if (suggestions) {
        return `🔍 **Grammar Analysis:**\n\n${suggestions}`;
      }
    } catch (e) {
      console.log('Proofreader grammar analysis failed, falling back to Language Model:', e?.message || e);
    }
  }

  // Language Model prompt
  if (sessions.languageModel) {
    const prompt = `Analyze the grammar of "${text}" in detail. Provide:

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
    const out = await sessions.languageModel.prompt(prompt, { outputLanguage: langCode });
    return String(out || '').trim();
  }
  
  // Better error message with instructions
  throw new Error('Grammar analysis requires Language Model. Please ensure Chrome AI APIs are enabled and Gemini Nano is downloaded (see chrome://components/)');
};

// Verbs Analysis
window.PG.aiEnhanced.generateVerbs = async function(text, targetLang, sourceLang) {
  // Ensure AI APIs are initialized
  try {
    await window.PG?.ai?.initializeAIAPIs?.();
  } catch (initErr) {
    console.log('AI initialization in verbs mode:', initErr?.message || initErr);
  }

  const sessions = window.PG?.ai?.getSessions?.() || {};
  const langCode = window.PG?.lang?.getLanguageCode?.(targetLang);
  
  if (sessions.languageModel) {
    const prompt = `Analyze all verbs in "${text}" comprehensively. Provide:

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
    const out = await sessions.languageModel.prompt(prompt, { outputLanguage: langCode });
    return String(out || '').trim();
  }
  
  throw new Error('Verb analysis requires Language Model. Please ensure Chrome AI APIs are enabled and Gemini Nano is downloaded (see chrome://components/)');
};

// Enrich a single vocabulary item using specialized AI APIs for better performance
window.PG.aiEnhanced.enrichSingleItem = async function(item, options = {}) {
  const { sourceLang, targetLang, strategy = 'adaptive', resolvedSourceLang } = options;
  const sessions = window.PG.aiEnhanced.getSessions();
  
  if (!sessions?.languageModel && !sessions?.writer && !sessions?.rewriter) {
    console.log('⚠️ No AI APIs available for enrichment');
    return item;
  }
  
  const startTime = Date.now();
  let updated = { ...item };
  
  // Use pre-resolved source language to avoid redundant detection
  const effectiveSourceLang = resolvedSourceLang || sourceLang || 'auto';
  
  try {
    // Only enrich if missing critical fields
    const needsExample = !updated.example || updated.example.length < 4;
    const needsDefinition = !updated.def || updated.def.length < 3;
    const needsTransliteration = !updated.transliteration && window.PG.aiEnhanced.needsTransliteration(effectiveSourceLang);
    
    // Skip expensive language detection if we have a resolved source language
    let exampleLangMismatch = false;
    if (!needsExample && updated.example && !resolvedSourceLang && sessions?.languageDetector?.detect && effectiveSourceLang && effectiveSourceLang !== 'auto') {
      try {
        const results = await sessions.languageDetector.detect(updated.example);
        if (results && results.length > 0 && results[0].confidence > 0.6) {
          const outCode = results[0].detectedLanguage.toLowerCase();
          const srcCode = String(effectiveSourceLang).toLowerCase();
          if (outCode && srcCode && outCode !== srcCode) {
            exampleLangMismatch = true;
          }
        }
      } catch (_) { /* best effort */ }
    }
    
    if (!needsExample && !needsDefinition && !needsTransliteration && !exampleLangMismatch) {
      console.log(`✅ Skipping enrichment for "${updated.word}" - already complete`);
      return updated;
    }
    
    console.log(`🔧 Enriching "${updated.word}" (example: ${needsExample}, def: ${needsDefinition}, translit: ${needsTransliteration})`);
    
    // Use only LanguageModel for speed - single API call for all tasks
    if (sessions?.languageModel && (needsExample || needsDefinition || needsTransliteration)) {
      try {
        const langCode = window.PG.lang?.getLanguageCode(effectiveSourceLang || 'auto');
        
        // Single combined prompt for all missing fields
        let promptParts = [];
        if (needsExample) promptParts.push(`1. Write one short example sentence (max 10 words) using "${updated.word}" in ${effectiveSourceLang || 'the source language'}.`);
        if (needsDefinition) promptParts.push(`2. Provide a brief definition of "${updated.word}" in English (1 sentence).`);
        if (needsTransliteration) promptParts.push(`3. Provide romanization/transliteration of "${updated.word}".`);
        
        const combinedPrompt = `${promptParts.join('\n')}

Respond with ONLY the requested information, one per line, no labels.`;
        
        const result = await sessions.languageModel.prompt(combinedPrompt, { outputLanguage: langCode });
        const lines = String(result || '').trim().split('\n').map(l => l.trim()).filter(Boolean);
        
        let lineIndex = 0;
        if (needsExample && lines[lineIndex]) {
          updated.example = window.PG.aiEnhanced.truncateExample(lines[lineIndex]);
          delete updated.exampleTranslation;
          delete updated.exampleTranslit;
          lineIndex++;
        }
        if (needsDefinition && lines[lineIndex]) {
          updated.def = lines[lineIndex];
          lineIndex++;
        }
        if (needsTransliteration && lines[lineIndex]) {
          updated.transliteration = lines[lineIndex];
        }
      } catch (error) {
        console.log(`⚠️ Enrichment failed for "${updated.word}":`, error?.message || error);
      }
    }

    // Translate example if it exists - use Translator API (faster than LanguageModel for translation)
    if (updated.example && targetLang && (!effectiveSourceLang || effectiveSourceLang === 'auto' || targetLang !== effectiveSourceLang)) {
      if (!updated.exampleTranslation) {
        try {
          const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang, effectiveSourceLang || 'en');
          if (translator) {
            const result = await translator.translate(updated.example);
            const translation = result?.translatedText || result || '';
            if (translation) updated.exampleTranslation = translation;
          }
        } catch (e) { 
          console.log(`⚠️ Example translation failed for "${updated.word}":`, e?.message || e); 
        }
      }
    }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Enriched "${updated.word}" in ${elapsed}ms`);
    
  } catch (error) {
    console.log(`❌ Enrichment failed for "${updated.word}":`, error?.message || error);
  }
  
  return updated;
};

// Summary Generation Functions
window.PG.aiEnhanced.generateSummary = async function(text, targetLang, sourceLang) {
  // Summarizer API only supports: en, es, ja (as of Chrome 138+)
  // For other languages, use LanguageModel directly
  const summarizerSupportedLanguages = ['en', 'es', 'ja'];
  const useLanguageModelFallback = sourceLang && !summarizerSupportedLanguages.includes(sourceLang);
  
  if (useLanguageModelFallback) {
    console.log(`📄 Source language "${sourceLang}" not supported by Summarizer API. Using LanguageModel directly.`);
    const sessions = window.PG.aiEnhanced.getSessions();
    if (sessions?.languageModel) {
      return await window.PG.aiEnhanced.generateSummaryWithLanguageModel(text, targetLang, sourceLang);
    }
  }
  
  // Try Summarizer API for supported languages
  console.log('📄 Attempting to initialize summarizer for summary generation...');
  
  try {
    const summarizer = await window.PG.aiEnhanced.ensureSummarizerReady();
    if (summarizer) {
      console.log('✅ Summarizer ready, generating summary...');
      return await window.PG.aiEnhanced.generateSummaryWithSummarizer(text, targetLang, sourceLang);
    }
  } catch (error) {
    console.log('⚠️ Summarizer initialization failed:', error?.message || error);
    
    // If it's a storage or Chrome version error, throw it immediately (don't try fallbacks)
    const errorMsg = error?.message || '';
    if (errorMsg.includes('storage space') || errorMsg.includes('22GB') || 
        errorMsg.includes('Chrome 138+') || errorMsg.includes('unavailable')) {
      throw error; // Re-throw storage/version errors immediately
    }
    // For other errors, continue to fallback
  }
  
  // Try Language Model as fallback
  const sessions = window.PG.aiEnhanced.getSessions();
  if (sessions?.languageModel) {
    try {
      console.log('🔄 Trying Language Model fallback for summary...');
      return await window.PG.aiEnhanced.generateSummaryWithLanguageModel(text, targetLang, sourceLang);
    } catch (error) {
      console.log('⚠️ Language Model summary also failed:', error?.message || error);
    }
  }
  
  // If we get here, both summarizer and language model failed
  const chromeVersion = navigator.userAgent.match(/Chrome\/(\d+)/)?.[1];
  let errorMsg = 'Summary not available. ';
  
  if (!chromeVersion || parseInt(chromeVersion) < 138) {
    errorMsg += `Update to Chrome 138+ for stable AI APIs. Current: ${chromeVersion || 'unknown'}`;
  } else if (!navigator.userActivation?.isActive) {
    errorMsg += 'Select text to provide user gesture for AI model initialization.';
  } else if (!window.Summarizer && !window.ai?.summarizer && !window.LanguageModel && !window.ai?.languageModel) {
    errorMsg += 'AI APIs not found. Enable chrome://flags/#built-in-ai-api and restart browser.';
  } else {
    errorMsg += 'AI models may be downloading. Try again in a moment or check storage space (22GB+ required).';
  }
  
  throw new Error(errorMsg);
};

window.PG.aiEnhanced.generateSummaryWithLanguageModel = async function(text, targetLang, sourceLang) {
  const sessions = window.PG.aiEnhanced.getSessions();
  const langCode = window.PG.lang?.getLanguageCode(targetLang);
  
  // Language name mapping
  const targetLangName = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi'
  }[targetLang] || targetLang;
  
  const sourceLangName = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
    'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi'
  }[sourceLang] || sourceLang || 'the source language';

  // Generate summary in target language
  const summaryPrompt = `Summarize the following text in ${targetLangName}. Create a clear, concise summary with 3-5 key points. Use bullet points or short paragraphs. Keep it under 200 words.

Text to summarize:
"""${text}"""

Provide the summary entirely in ${targetLangName}.`;

  console.log(`🎯 Generating summary in ${targetLangName} using Language Model`);
  const summaryResult = await sessions.languageModel.prompt(summaryPrompt, { outputLanguage: langCode });
  const targetSummary = String(summaryResult || '').trim();
  
  if (!targetSummary) {
    throw new Error('Summary generation failed - no content returned');
  }

  // Generate original summary in source language if different
  let originalSummary = '';
  if (sourceLang && sourceLang !== 'auto' && sourceLang !== targetLang) {
    try {
      const originalPrompt = `Summarize the following text in ${sourceLangName}. Create a clear, concise summary with 3-5 key points. Use bullet points or short paragraphs. Keep it under 200 words.

Text to summarize:
"""${text}"""

Provide the summary entirely in ${sourceLangName}.`;
      
      const originalLangCode = window.PG.lang?.getLanguageCode(sourceLang);
      const originalResult = await sessions.languageModel.prompt(originalPrompt, { outputLanguage: originalLangCode });
      originalSummary = String(originalResult || '').trim();
    } catch (e) {
      console.log('⚠️ Could not generate original language summary, using target language summary:', e?.message || e);
      originalSummary = targetSummary;
    }
  } else {
    originalSummary = targetSummary;
  }

  return {
    original: window.PG.aiEnhanced.formatSummary(originalSummary),
    translated: window.PG.aiEnhanced.formatSummary(targetSummary)
  };
};

window.PG.aiEnhanced.generateSummaryWithSummarizer = async function(text, targetLang, sourceLang) {
  const sessions = window.PG.aiEnhanced.getSessions();
  
  if (!sessions?.summarizer) {
    throw new Error('Summarizer session not available. Ensure initialization completed.');
  }
  
  console.log('🔍 Step 1: Using Summarizer API to generate summary in source language');
  
  // Step 1: Generate summary in SOURCE language using Summarizer API
  const context = 'Create 3-5 clear bullet points highlighting the key information';
  const result = await sessions.summarizer.summarize(text, { context });
  const rawSummary = result?.summary || result || 'Summary not available';
  
  console.log('📝 Raw summary from Summarizer:', rawSummary.substring(0, 200));
  
  // Step 2: Parse into bullet points
  const summaryPoints = rawSummary
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^[•\-*►▪︎▫︎◦‣⁃∙]+\s*/, '').replace(/^\d+[\.)]\s*/, '').trim())
    .filter(point => point.length > 5)
    .slice(0, 5);
  
  console.log(`📌 Extracted ${summaryPoints.length} summary points`);
  
  // Step 3: Translate each point individually using Translator API
  let translatedPoints = [...summaryPoints];
  
  if (targetLang && sourceLang && sourceLang !== 'auto' && targetLang !== sourceLang) {
    try {
      console.log(`🔄 Step 2: Translating ${summaryPoints.length} points from ${sourceLang} to ${targetLang}`);
      const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang, sourceLang);
      
      if (translator?.translate) {
        // Translate each point separately for accuracy
        translatedPoints = await Promise.all(
          summaryPoints.map(async (point, i) => {
            try {
              const translateResult = await translator.translate(point);
              const translated = translateResult?.translatedText || translateResult || point;
              console.log(`  ✅ [${i + 1}/${summaryPoints.length}] Translated`);
              return translated;
            } catch (e) {
              console.log(`  ⚠️ [${i + 1}/${summaryPoints.length}] Failed, keeping original`);
              return point;
            }
          })
        );
        console.log('✅ All points translated');
      } else {
        console.log('⚠️ Translator not available, keeping original language');
      }
    } catch (e) {
      console.log('⚠️ Translation failed:', e?.message || e);
    }
  }
  
  // Step 4: Format as HTML
  const formatPoints = (points) => {
    return points
      .map(point => {
        const escaped = point
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<p class="summary-bullet">• ${escaped}</p>`;
      })
      .join('');
  };
  
  return {
    original: formatPoints(summaryPoints),
    translated: formatPoints(translatedPoints)
  };
};

// Translation Functions
window.PG.aiEnhanced.translateText = async function(text, targetLang, sourceLang = 'auto') {
  // Try Language Model first for short text
  if (text.length <= 200) {
    const sessions = window.PG.aiEnhanced.getSessions();
    if (sessions?.languageModel) {
      try {
        const targetLangName = {
          'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
          'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
          'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi'
        }[targetLang] || targetLang;
        
        const prompt = `Translate the following text to ${targetLangName}. Provide only the translation, no explanations:

"${text}"`;
        
        const langCode = window.PG.lang?.getLanguageCode(targetLang);
        const result = await sessions.languageModel.prompt(prompt, { outputLanguage: langCode });
        const translation = String(result || '').trim();
        
        if (translation && translation.length > 0) {
          console.log(`✅ Translation completed using Language Model (${translation.length} chars)`);
          return translation;
        }
      } catch (error) {
        console.log('⚠️ Language Model translation failed, trying Translator API:', error?.message || error);
      }
    }
  }
  
  // Fallback to Translator API
  try {
    const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang, sourceLang);
    if (translator) {
      const result = await translator.translate(text);
      const translation = result?.translatedText || result || '';
      if (translation) {
        console.log(`✅ Translation completed using Translator API (${translation.length} chars)`);
        return translation;
      }
    }
  } catch (error) {
    console.log('⚠️ Translator API also failed:', error?.message || error);
  }
  
  throw new Error('Translation failed - no available APIs');
};

// Transliteration helper (Latinization of source-language text)
window.PG.aiEnhanced.transliterateText = async function(text, sourceLang = 'auto') {
  try {
    const sessions = window.PG.aiEnhanced.getSessions();
    if (!sessions?.languageModel) return '';

    // Source language human-readable name
    const sourceLangName = {
      'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
      'it': 'Italian', 'pt': 'Portuguese', 'ru': 'Russian', 'zh': 'Chinese',
      'ja': 'Japanese', 'ko': 'Korean', 'ar': 'Arabic', 'hi': 'Hindi'
    }[sourceLang] || sourceLang || 'the source language';

    const prompt = `Provide the standard Latin transliteration of the following ${sourceLangName} text. Return only the transliteration, with no labels or explanations.

"""${text}"""`;
    // Use English LM interface for instructions
    const result = await sessions.languageModel.prompt(prompt, { outputLanguage: 'en' });
    const translit = String(result || '').trim();
    return translit;
  } catch (e) {
    console.log('Transliteration failed:', e?.message || e);
    return '';
  }
};

// Utility Functions
window.PG.aiEnhanced.formatSummary = function(summaryText) {
  return summaryText
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      
      // Escape HTML
      const escaped = trimmed
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
      
      // Handle bullet points
      if (escaped.startsWith('•') || escaped.startsWith('-') || escaped.startsWith('*')) {
        return `<p class="summary-bullet">${escaped}</p>`;
      }
      // Handle numbered points
      if (/^\d+\./.test(escaped)) {
        return `<p class="summary-numbered">${escaped}</p>`;
      }
      // Regular paragraph
      return `<p>${escaped}</p>`;
    })
    .filter(Boolean)
    .join('');
};

window.PG.aiEnhanced.condenseSummary = function(text, options = {}) {
  const { maxBullets = 5, maxSentences = 3, charCap = 500 } = options;
  
  if (!text || text.length <= charCap) return text;
  
  // Split into sentences and take the most important ones
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const condensed = sentences.slice(0, maxSentences).join('. ');
  
  if (condensed.length <= charCap) {
    return condensed + (condensed.endsWith('.') ? '' : '.');
  }
  
  // If still too long, truncate
  return condensed.substring(0, charCap - 3) + '...';
};

window.PG.aiEnhanced.truncateExample = function(example) {
  if (!example || example.length <= 120) return example;
  
  // Split by sentence boundaries and take first 1-2 sentences
  const sentences = example.split(/[.!?。！？]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const short = sentences.slice(0, 2).join('. ');
    if (short.length <= 120) {
      return short + (short.match(/[.!?。！？]$/) ? '' : '.');
    } else {
      // Even 2 sentences are too long, take just the first one
      return sentences[0] + (sentences[0].match(/[.!?。！？]$/) ? '' : '.');
    }
  }
  return example;
};

window.PG.aiEnhanced.needsTransliteration = function(sourceLang) {
  if (!sourceLang || sourceLang === 'auto') return false;
  const lang = sourceLang.toLowerCase();
  // Languages that typically use non-Latin scripts
  return ['zh', 'ja', 'ko', 'ar', 'he', 'ru', 'th', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'or', 'pa', 'ur', 'fa', 'ne', 'si'].includes(lang);
};

console.log('📚 Enhanced AI utilities loaded');