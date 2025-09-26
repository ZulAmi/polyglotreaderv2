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
  try { return await window.PG?.ai?.ensureSummarizerReady?.(); } catch (e) { console.log('Summarizer (enhanced) failed:', e?.message || e); return null; }
};

// Vocabulary Processing Functions
window.PG.aiEnhanced.enrichVocabularyItems = async function(items, options = {}) {
  const { sourceLang, targetLang, strategy = 'adaptive', maxItems = 6, concurrency = 2 } = options;
  
  if (!items || !Array.isArray(items) || items.length === 0) {
    console.log('⚠️ No vocabulary items to enrich');
    return [];
  }
  
  const sessions = window.PG.aiEnhanced.getSessions();
  if (!sessions?.languageModel && !sessions?.writer && !sessions?.rewriter) {
    console.log('⚠️ Cannot enrich vocabulary - no AI APIs available');
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
        const det = await sessions.languageDetector.detect(sampleText);
        const detectedLang = String(det?.detectedLanguage || det?.language || det || '').toLowerCase();
        if (detectedLang) {
          resolvedSourceLang = detectedLang;
          console.log(`🔍 Resolved source language for batch: ${resolvedSourceLang}`);
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
    const out = await sessions.languageModel.prompt(prompt, { language: langCode });
    return String(out || '').trim();
  }
  throw new Error('Grammar analysis not available - Language Model or Proofreader required');
};

// Verbs Analysis
window.PG.aiEnhanced.generateVerbs = async function(text, targetLang, sourceLang) {
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
    const out = await sessions.languageModel.prompt(prompt, { language: langCode });
    return String(out || '').trim();
  }
  throw new Error('Verb analysis not available - Language Model required');
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
        const det = await sessions.languageDetector.detect(updated.example);
        const outCode = String(det?.detectedLanguage || det?.language || det || '').toLowerCase();
        const srcCode = String(effectiveSourceLang).toLowerCase();
        if (outCode && srcCode && outCode !== srcCode) {
          exampleLangMismatch = true;
        }
      } catch (_) { /* best effort */ }
    }
    
    if (!needsExample && !needsDefinition && !needsTransliteration && !exampleLangMismatch) {
      console.log(`✅ Skipping enrichment for "${updated.word}" - already complete`);
      return updated;
    }
    
    console.log(`🔧 Enriching "${updated.word}" (example: ${needsExample}, def: ${needsDefinition}, translit: ${needsTransliteration})`);
    
    // Generate example using Writer API first (specialized for creative content), fallback to Language Model
    if (needsExample || exampleLangMismatch) {
      try {
        let example = '';
        const langCode = window.PG.lang?.getLanguageCode(effectiveSourceLang || 'auto');
        
        // Try Writer API first for example generation
        if (sessions?.writer?.write && strategy !== 'fast') {
          try {
            const writerPrompt = `Write one short, simple sentence in ${effectiveSourceLang || 'the source language'} using the word "${updated.word}" naturally in context. Keep it under 12 words.`;
            const writerResult = await sessions.writer.write(writerPrompt, { language: langCode });
            example = String(writerResult || '').trim();
            console.log(`📝 Used Writer API for "${updated.word}" example`);
          } catch (e) {
            console.log(`⚠️ Writer API failed for "${updated.word}", trying Language Model:`, e?.message || e);
          }
        }
        
        // Fallback to Language Model if Writer didn't work
        if (!example && sessions?.languageModel) {
          const examplePrompt = `Write one short, simple sentence in ${effectiveSourceLang || 'the source language'} that naturally uses the word "${updated.word}" in context.
- Keep it under 12 words.
- Respond ONLY in ${effectiveSourceLang || 'the source language'} with the sentence, no translation or explanations.`;
          example = String(await sessions.languageModel.prompt(examplePrompt, { language: langCode }) || '').trim();
        }
        
        if (example && example.length > 3) {
          updated.example = window.PG.aiEnhanced.truncateExample(example);
          // Clear stale derived fields if we replaced/created the example
          delete updated.exampleTranslation;
          delete updated.exampleTranslit;
        }
      } catch (error) {
        console.log(`⚠️ Example generation failed for "${updated.word}":`, error?.message || error);
      }
    }
    
    // Generate definition using Rewriter API first (good for rewriting/defining), fallback to Language Model
    if (needsDefinition) {
      try {
        let definition = '';
        
        // Try Rewriter API first for definition generation
        if (sessions?.rewriter?.rewrite && strategy !== 'fast') {
          try {
            const rewriterPrompt = `Rewrite this as a clear, concise definition: "${updated.word}" means`;
            const rewriterResult = await sessions.rewriter.rewrite(rewriterPrompt, { language: 'en' });
            definition = String(rewriterResult || '').trim();
            if (definition.startsWith('"' + updated.word + '"')) {
              definition = definition.substring(updated.word.length + 2).trim();
            }
            console.log(`✏️ Used Rewriter API for "${updated.word}" definition`);
          } catch (e) {
            console.log(`⚠️ Rewriter API failed for "${updated.word}", trying Language Model:`, e?.message || e);
          }
        }
        
        // Fallback to Language Model if Rewriter didn't work
        if (!definition && sessions?.languageModel) {
          const defPrompt = `Define the word "${updated.word}" briefly and clearly. Provide a concise definition in 1-2 sentences.`;
          definition = String(await sessions.languageModel.prompt(defPrompt, { language: 'en' }) || '').trim();
        }
        
        if (definition && definition.length > 2) {
          updated.def = definition;
        }
      } catch (error) {
        console.log(`⚠️ Definition generation failed for "${updated.word}":`, error?.message || error);
      }
    }
    
    // Generate transliteration using Language Model (most reliable for this task)
    if (needsTransliteration && sessions?.languageModel) {
      try {
        const translitPrompt = `Provide the standard Latin transliteration for the word "${updated.word}". For Japanese, provide romaji. For Chinese, provide pinyin. For Korean, provide romanized Korean. Respond with just the transliteration, no explanations.`;
        const result = await sessions.languageModel.prompt(translitPrompt, { language: 'en' });
        const translit = String(result || '').trim();
        if (translit && translit.length > 0) {
          updated.transliteration = translit;
        }
      } catch (error) {
        console.log(`⚠️ Transliteration failed for "${updated.word}":`, error?.message || error);
      }
    }
    
    // Also generate transliteration for example if it exists and source needs it
    if (updated.example && !updated.exampleTranslit && window.PG.aiEnhanced.needsTransliteration(effectiveSourceLang)) {
      try {
        const exTranslit = await window.PG.aiEnhanced.transliterateText(updated.example, effectiveSourceLang);
        if (exTranslit) updated.exampleTranslit = exTranslit;
      } catch (e) { 
        console.log(`⚠️ Example transliteration failed for "${updated.word}":`, e?.message || e); 
      }
    }

    // If an example exists, enrich it with translation and transliteration when relevant
    try {
      if (updated.example && targetLang && (!effectiveSourceLang || effectiveSourceLang === 'auto' || targetLang !== effectiveSourceLang)) {
        if (!updated.exampleTranslation) {
          try {
            const translated = await window.PG.aiEnhanced.translateText(updated.example, targetLang, effectiveSourceLang || 'auto');
            if (translated && typeof translated === 'string') {
              updated.exampleTranslation = translated;
            }
          } catch (e) { console.log(`⚠️ Example translation failed for "${updated.word}":`, e?.message || e); }
        }
        if (!updated.exampleTranslit && window.PG.aiEnhanced.needsTransliteration(effectiveSourceLang)) {
          try {
            const exTranslit = await window.PG.aiEnhanced.transliterateText(updated.example, effectiveSourceLang);
            if (exTranslit) updated.exampleTranslit = exTranslit;
          } catch (e) { console.log(`⚠️ Example transliteration failed for "${updated.word}":`, e?.message || e); }
        }
      }
    } catch (_) { /* ignore */ }
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ Enriched "${updated.word}" in ${elapsed}ms`);
    
  } catch (error) {
    console.log(`❌ Enrichment failed for "${updated.word}":`, error?.message || error);
  }
  
  return updated;
};

// Summary Generation Functions
window.PG.aiEnhanced.generateSummary = async function(text, targetLang, sourceLang) {
  const sessions = window.PG.aiEnhanced.getSessions();
  
  // Try Language Model first for better language control
  if (sessions?.languageModel) {
    try {
      return await window.PG.aiEnhanced.generateSummaryWithLanguageModel(text, targetLang, sourceLang);
    } catch (error) {
      console.log('⚠️ Language Model summary failed, trying Summarizer fallback:', error?.message || error);
    }
  }
  
  // Fallback to Summarizer API
  if (sessions?.summarizer) {
    try {
      return await window.PG.aiEnhanced.generateSummaryWithSummarizer(text, targetLang, sourceLang);
    } catch (error) {
      console.log('⚠️ Summarizer fallback also failed:', error?.message || error);
    }
  }
  
  throw new Error('Summary not available. Ensure user gesture occurred and your browser supports Language Model or Summarizer APIs.');
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
  const summaryResult = await sessions.languageModel.prompt(summaryPrompt, { language: langCode });
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
      const originalResult = await sessions.languageModel.prompt(originalPrompt, { language: originalLangCode });
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
  
  console.log('🔍 Falling back to Summarizer API (limited language control)');
  const result = await sessions.summarizer.summarize(text);
  const rawSummary = result?.summary || result || 'Summary not available';
  const condensed = window.PG.aiEnhanced.condenseSummary(rawSummary, { maxBullets: 5, maxSentences: 3, charCap: 500 });
  
  // Try to translate to target language if different from source
  let translatedSummary = condensed;
  if (targetLang && sourceLang && sourceLang !== 'auto' && targetLang !== sourceLang) {
    try {
      const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang, sourceLang);
      if (translator) {
        const translated = await translator.translate(condensed);
        translatedSummary = translated?.translatedText || translated || condensed;
      }
    } catch (e) {
      console.log('⚠️ Translation fallback failed, using original summary:', e?.message || e);
    }
  }
  
  return {
    original: window.PG.aiEnhanced.formatSummary(condensed),
    translated: window.PG.aiEnhanced.formatSummary(translatedSummary)
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
        const result = await sessions.languageModel.prompt(prompt, { language: langCode });
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
    const result = await sessions.languageModel.prompt(prompt, { language: 'en' });
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