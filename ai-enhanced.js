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
  console.log('[Grammar] Called with:', { text: text.substring(0, 50), targetLang, sourceLang });
  
  // Ensure AI APIs are initialized
  try {
    await window.PG?.ai?.initializeAIAPIs?.();
  } catch (initErr) {
    console.log('AI initialization in grammar mode:', initErr?.message || initErr);
  }

  const sessions = window.PG?.ai?.getSessions?.() || {};
  const langCode = window.PG?.lang?.getLanguageCode?.(targetLang) || 'en';
  
  console.log('[Grammar] Sessions:', { 
    hasLanguageModel: !!sessions.languageModel,
    langCode 
  });
  
  // Use Language Model for grammar analysis
  if (sessions.languageModel) {
    const targetLangName = targetLang || 'English';
    
    // Truncate very long text to speed up analysis (keep first 300 chars)
    const maxLength = 300;
    const analyzedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    const wasTruncated = text.length > maxLength;
    
    // Detect if source uses non-Latin script
    const needsTranslit = ['ja', 'zh', 'ko', 'ar', 'ru', 'hi', 'th', 'he'].includes(sourceLang);
    const translitInstruction = needsTranslit 
      ? `\n\nIMPORTANT: For ALL non-English text in your response, include romanization in parentheses.
Example for Japanese: は (wa), を (wo), である (dearu)
Example for Chinese: 的 (de), 是 (shì), 了 (le)
Apply this to ALL sections including Structure, Grammar, and Learning.`
      : '';
    
    const prompt = `Analyze the grammar briefly: "${analyzedText}"

Provide a short analysis (3-4 sentences per section):

**Structure:** Main sentence type and key elements (include romanization for non-English examples)

**Grammar:** Key tenses and grammatical patterns (include romanization for non-English examples)

**Learning:** Main takeaway and difficulty (include romanization for non-English examples)
${translitInstruction}

Keep it very brief. Respond in ${targetLangName}.`;
    
    console.log('[Grammar] Using Language Model (Gemini Nano) for grammar analysis');
    console.log('[Grammar] Text length:', analyzedText.length, wasTruncated ? '(truncated)' : '(full)');
    console.log('[Grammar] Needs transliteration:', needsTranslit);
    
    try {
      const startTime = Date.now();
      const out = await sessions.languageModel.prompt(prompt, { 
        outputLanguage: langCode,
        temperature: 0.3  // Lower temperature for faster, more focused responses
      });
      const elapsed = Date.now() - startTime;
      const result = String(out || '').trim();
      
      console.log('[Grammar] Completed in', elapsed, 'ms');
      console.log('[Grammar] Result length:', result.length);
      
      // Add note if text was truncated
      const finalResult = wasTruncated 
        ? `${result}\n\n---\n*Note: Analysis based on first ${maxLength} characters of the original text.*`
        : result;
      
      return finalResult;
    } catch (error) {
      console.error('[Grammar] Language Model error:', error);
      throw error;
    }
  }  // Better error message with instructions
  console.error('[Grammar] No Language Model available');
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
  const langCode = window.PG?.lang?.getLanguageCode?.(targetLang) || 'en';
  
  if (sessions.languageModel) {
    const targetLangName = targetLang || 'English';
    
    // Truncate very long text to speed up analysis
    const maxLength = 300;
    const analyzedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    const wasTruncated = text.length > maxLength;
    
    // Detect if source uses non-Latin script
    const needsTranslit = ['ja', 'zh', 'ko', 'ar', 'ru', 'hi', 'th', 'he'].includes(sourceLang);
    const translitInstruction = needsTranslit 
      ? `\n\nIMPORTANT: For ALL non-English text in your response, include romanization in parentheses.
Example for Japanese: 行く (iku), 祀られている (matsurarete iru)
Example for Chinese: 学习 (xuéxí), 去 (qù)
Apply this to ALL sections including Tenses, Patterns, and Usage.`
      : '';
    
    const prompt = `Analyze verbs briefly in: "${analyzedText}"

Short analysis (3-4 sentences per section):

**Verbs:** List main verbs found with romanization if non-English

**Tenses:** What tenses are used (include romanization for any non-English examples)

**Patterns:** Regular or irregular (include romanization for any non-English examples)

**Usage:** Context and formality (include romanization for any non-English examples)
${translitInstruction}

Keep it very brief. Respond in ${targetLangName}.`;
    
    console.log('[Verbs] Using Language Model (Gemini Nano) for verb analysis');
    console.log('[Verbs] Text length:', analyzedText.length, wasTruncated ? '(truncated)' : '(full)');
    console.log('[Verbs] Needs transliteration:', needsTranslit);
    
    try {
      const startTime = Date.now();
      const out = await sessions.languageModel.prompt(prompt, { 
        outputLanguage: langCode,
        temperature: 0.3
      });
      const elapsed = Date.now() - startTime;
      const result = String(out || '').trim();
      
      console.log('[Verbs] Completed in', elapsed, 'ms');
      console.log('[Verbs] Result length:', result.length);
      
      const finalResult = wasTruncated 
        ? `${result}\n\n---\n*Note: Analysis based on first ${maxLength} characters of the original text.*`
        : result;
      
      return finalResult;
    } catch (error) {
      console.error('[Verbs] Language Model error:', error);
      throw error;
    }
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
    
    // Translate and transliterate ALL vocabulary fields if source language is not English
    if (effectiveSourceLang && effectiveSourceLang !== 'en' && effectiveSourceLang !== 'auto') {
      const needsFieldTranslation = window.PG.aiEnhanced.needsTransliteration(effectiveSourceLang);
      
      if (needsFieldTranslation && sessions?.languageModel && sessions?.translator) {
        try {
          // Build list of fields that need translation/transliteration
          const fieldsToProcess = [];
          const fieldMapping = {
            'def': 'Dictionary Definition',
            'family': 'Word Family',
            'synonyms': 'Synonyms',
            'antonyms': 'Antonyms',
            'collocations': 'Collocations',
            'etymology': 'Etymology',
            'cultural': 'Cultural Context'
          };
          
          for (const [field, label] of Object.entries(fieldMapping)) {
            if (updated[field]) {
              fieldsToProcess.push({ field, label, text: updated[field] });
            }
          }
          
          if (fieldsToProcess.length > 0) {
            console.log(`🌐 Translating ${fieldsToProcess.length} vocabulary fields for "${updated.word}"`);
            
            // Get translations using Translator API
            const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang || 'en', effectiveSourceLang);
            if (translator) {
              for (const { field, text } of fieldsToProcess) {
                try {
                  const result = await translator.translate(text);
                  const translation = result?.translatedText || result || '';
                  if (translation) {
                    updated[`${field}Translation`] = translation;
                  }
                } catch (e) {
                  console.log(`⚠️ Translation failed for field "${field}":`, e?.message || e);
                }
              }
            }
            
            // Get transliterations using LanguageModel
            const sourceLangName = {
              'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean',
              'ar': 'Arabic', 'ru': 'Russian', 'hi': 'Hindi'
            }[effectiveSourceLang] || effectiveSourceLang;
            
            for (const { field, text } of fieldsToProcess) {
              try {
                const translitPrompt = `Provide romanization/transliteration for this ${sourceLangName} text. Return ONLY the romanized text with no explanations:

${text}`;
                
                const translitResult = await sessions.languageModel.prompt(translitPrompt, { outputLanguage: 'en' });
                const translit = String(translitResult || '').trim();
                if (translit) {
                  updated[`${field}Translit`] = translit;
                }
              } catch (e) {
                console.log(`⚠️ Transliteration failed for field "${field}":`, e?.message || e);
              }
            }
            
            console.log(`✅ Completed field translations/transliterations for "${updated.word}"`);
          }
        } catch (e) {
          console.log(`⚠️ Field translation/transliteration process failed:`, e?.message || e);
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
  
  // Step 1: Use Summarizer API (outputs in source language despite outputLanguage config)
  console.log('[Summary] Step 1: Generating summary with Summarizer API');
  console.log(`[Summary] Input text sample (${sourceLang}):`, text.substring(0, 100));
  const context = 'Create 3-5 clear bullet points highlighting the key information';
  const summarizerResult = await sessions.summarizer.summarize(text, { context });
  const rawSummarizerOutput = summarizerResult?.summary || summarizerResult || 'Summary not available';
  console.log(`[Summary] Raw Summarizer output:`, rawSummarizerOutput.substring(0, 200));
  
  const summarizerPoints = rawSummarizerOutput
    .split(/\n+/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^[•\-*►▪︎▫︎◦‣⁃∙]+\s*/, '').replace(/^\d+[\.)]\s*/, '').trim())
    .filter(point => point.length > 5)
    .slice(0, 5);
  
  console.log(`[Summary] Summarizer generated ${summarizerPoints.length} summary points (in ${sourceLang})`);
  console.log(`[Summary] First point sample:`, summarizerPoints[0]?.substring(0, 100));
  
  // Safety check: if no points were extracted, throw error early
  if (summarizerPoints.length === 0) {
    console.error('[Summary] ERROR: No summary points extracted from Summarizer output');
    console.error('[Summary] Raw output was:', rawSummarizerOutput);
    throw new Error('Failed to extract summary points from Summarizer output');
  }
  
  // Check if Summarizer actually returned source language or English
  let actualSourcePoints = summarizerPoints;
  const firstPoint = summarizerPoints[0] || '';
  const appearsToBeEnglish = /^[A-Za-z0-9\s.,!?;:()\-'"]+$/.test(firstPoint);
  
  // If Summarizer returned English but we wanted Japanese, use Language Model to generate Japanese summary
  if (sourceLang === 'ja' && appearsToBeEnglish && sessions?.languageModel) {
    console.log('[Summary] Summarizer returned English for Japanese text, using Language Model for Japanese summary');
    try {
      const jaPrompt = `Summarize this Japanese text in Japanese (3-5 bullet points in Japanese only):

${text}

Return ONLY Japanese bullet points, no English.`;
      
      const jaResult = await sessions.languageModel.prompt(jaPrompt, { outputLanguage: 'ja' });
      const jaPoints = String(jaResult || '')
        .split(/\n+/)
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => line.replace(/^[•\-*►▪︎▫︎◦‣⁃∙]+\s*/, '').replace(/^\d+[\.)]\s*/, '').trim())
        .filter(point => point.length > 5)
        .slice(0, 5);
      
      if (jaPoints.length > 0) {
        actualSourcePoints = jaPoints;
        console.log('[Summary] Generated Japanese summary with Language Model:', jaPoints.length, 'points');
      }
    } catch (e) {
      console.log('[Summary] Language Model Japanese summary failed, using Summarizer output:', e?.message || e);
    }
  }
  
  // Step 2: Generate transliteration for summarizer output if in non-Latin script
  let summarizerTranslit = [];
  const needsTranslit = ['ja', 'zh', 'ko', 'ar', 'ru', 'hi'].includes(sourceLang);
  
  if (needsTranslit && sessions?.languageModel && actualSourcePoints.length > 0) {
    try {
      console.log(`[Summary] Generating transliteration for ${sourceLang} summary`);
      
      const sourceLangName = {
        'ja': 'Japanese', 'zh': 'Chinese', 'ko': 'Korean', 
        'ar': 'Arabic', 'ru': 'Russian', 'hi': 'Hindi'
      }[sourceLang] || sourceLang;
      
      const translitType = sourceLang === 'ja' ? 'Hepburn romaji' : 
                           sourceLang === 'zh' ? 'Hanyu pinyin with tone marks' :
                           sourceLang === 'ko' ? 'Revised Romanization' :
                           sourceLang === 'ar' ? 'Arabic romanization' :
                           sourceLang === 'ru' ? 'Cyrillic romanization' :
                           'romanization';
      
      const translitPrompt = `You are an expert at ${sourceLangName} ${translitType}. Provide accurate, natural ${translitType} for each sentence below. 

Rules:
- Use standard ${translitType} conventions
- Maintain proper spacing and word boundaries
- Preserve punctuation
- Keep proper nouns capitalized appropriately
- Return ONLY the romanized text, one line per sentence
- Do NOT add explanations or translations

Sentences to romanize:
${actualSourcePoints.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;
      
      const translitResult = await sessions.languageModel.prompt(translitPrompt, { outputLanguage: 'en' });
      const rawTranslit = String(translitResult || '').trim();
      
      summarizerTranslit = rawTranslit
        .split(/\n+/)
        .map(line => line.trim())
        .map(line => line.replace(/^\d+[\.)]\s*/, '')) // Remove numbering if present
        .filter(Boolean)
        .slice(0, actualSourcePoints.length);
      
      console.log(`[Summary] Generated transliteration for ${summarizerTranslit.length} points`);
      console.log(`[Summary] First translit sample:`, summarizerTranslit[0]?.substring(0, 100));
    } catch (e) {
      console.log(`[Summary] Transliteration failed:`, e?.message || e);
    }
  }
  
  // Step 3: Translate to target language using Translator API (with Language Model fallback)
  let translatedPoints = [...actualSourcePoints];
  
  if (targetLang && sourceLang !== targetLang) {
    try {
      console.log(`[Summary] Step 3: Translating ${actualSourcePoints.length} points from ${sourceLang} to ${targetLang}`);
      
      // Try Language Model first for Japanese->English (more reliable)
      if (sourceLang === 'ja' && targetLang === 'en' && sessions?.languageModel) {
        console.log('[Summary] Using Language Model for Japanese to English translation');
        try {
          translatedPoints = await Promise.all(
            actualSourcePoints.map(async (point, i) => {
              try {
                const translatePrompt = `Translate this Japanese text to English. Provide ONLY the English translation, no explanations:

"${point}"`;
                
                const result = await sessions.languageModel.prompt(translatePrompt, { outputLanguage: 'en' });
                const translated = String(result || '').trim();
                
                if (translated && translated.length > 0 && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(translated)) {
                  // Valid English translation (no Japanese characters)
                  console.log(`[Summary] [${i + 1}/${actualSourcePoints.length}] Translated with Language Model`);
                  return translated;
                } else {
                  throw new Error('Translation still contains Japanese characters or is empty');
                }
              } catch (e) {
                console.log(`[Summary] [${i + 1}/${actualSourcePoints.length}] Language Model failed, keeping original`);
                return point;
              }
            })
          );
          console.log('[Summary] All points translated with Language Model');
          console.log('[Summary] First translated sample:', translatedPoints[0]?.substring(0, 100));
        } catch (e) {
          console.log('[Summary] Language Model translation batch failed:', e?.message || e);
          // Fall through to Translator API
        }
      } else {
        // Use Translator API for other language pairs
        const translator = await window.PG.aiEnhanced.ensureTranslatorReady(targetLang, sourceLang);
        
        if (translator?.translate) {
          translatedPoints = await Promise.all(
            actualSourcePoints.map(async (point, i) => {
              try {
                const translateResult = await translator.translate(point);
                let translated = translateResult?.translatedText || translateResult || point;
                
                // Fix common capitalization issues from Translator API
                translated = String(translated).trim();
                
                // Fix Title Case To Sentence case (common issue with translations)
                if (translated && /^[A-Z][a-z]+(?: [A-Z][a-z]+)+/.test(translated)) {
                  // Appears to be Title Case - convert to sentence case
                  translated = translated
                    .split(' ')
                    .map((word, idx) => {
                      // Keep first word capitalized
                      if (idx === 0) return word;
                      // Keep short acronyms (2-3 chars, all caps)
                      if (word.length <= 3 && word === word.toUpperCase()) return word;
                      // Lowercase most words (unless they start sentences after punctuation)
                      return word.toLowerCase();
                    })
                    .join(' ');
                }
                
                console.log(`[Summary] [${i + 1}/${actualSourcePoints.length}] Translated`);
                return translated;
              } catch (e) {
                console.log(`[Summary] [${i + 1}/${actualSourcePoints.length}] Failed, keeping original`);
                return point;
              }
            })
          );
          console.log('[Summary] All points translated');
          console.log('[Summary] First translated sample:', translatedPoints[0]?.substring(0, 100));
        }
      }
    } catch (e) {
      console.log('[Summary] Translation failed:', e?.message || e);
    }
  }
  
  // Use Summarizer output appropriately for display
  let sourcePoints = actualSourcePoints;
  let sourcePointsTranslit = summarizerTranslit;
  let englishPoints = translatedPoints;
  
  // Format as HTML
  const formatEnglishPoints = (points) => {
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
  
  const formatSourcePoints = (points, translitPoints) => {
    return points
      .map((point, i) => {
        const escaped = point
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        
        let html = `<p class="summary-bullet">• ${escaped}`;
        
        // Add transliteration if available
        if (translitPoints && translitPoints[i]) {
          const translitEscaped = translitPoints[i]
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          html += `<br><span style="color: #6b7280; font-size: 0.9em; font-style: italic;">${translitEscaped}</span>`;
        }
        
        html += `</p>`;
        return html;
      })
      .join('');
  };
  
  const result = {
    original: sourcePoints.length > 0 
      ? formatSourcePoints(sourcePoints, sourcePointsTranslit)  // Source language (Japanese) with transliteration (romaji)
      : formatEnglishPoints(englishPoints),  // Fallback to English if source language generation failed
    translated: formatEnglishPoints(englishPoints)  // English translation
  };
  
  console.log('[Summary] Final result:', {
    hasOriginal: !!result.original,
    originalLength: result.original?.length,
    hasTranslated: !!result.translated,
    translatedLength: result.translated?.length,
    originalPreview: result.original?.substring(0, 100),
    translatedPreview: result.translated?.substring(0, 100)
  });
  
  return result;
};
  
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