// AI session management utilities (global PG namespace)
(function(){
  const PG = (window.PG = window.PG || {});
  PG.ai = PG.ai || {};

  // Holds singleton sessions so content scripts can reuse
  const aiApis = {
    languageModel: null,
    translator: null,
    summarizer: null,
    writer: null,
    rewriter: null,
    proofreader: null,
    languageDetector: null
  };

  PG.ai.getSessions = function(){ return aiApis; };

  PG.ai.logAPIStatus = function logAPIStatus(){
    try {
      const ready = Object.fromEntries(Object.entries(aiApis).map(([k, v]) => [k, !!v]));
      console.log('AI API sessions:', ready);
    } catch(_){}
  };

  // Check storage availability for AI models (Chrome 138+ requires 22GB for Gemini Nano)
  // Check overall AI readiness and provide user-friendly status
  PG.ai.getAIStatus = async function getAIStatus() {
    const status = {
      ready: false,
      issues: [],
      recommendations: []
    };
    
    // Check Chrome version
    const userAgent = navigator.userAgent;
    const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1];
    if (!chromeVersion || parseInt(chromeVersion) < 138) {
      status.issues.push(`Chrome version too old: ${chromeVersion || 'unknown'}`);
      status.recommendations.push('Update to Chrome 138+ for stable AI APIs');
    }
    
    // Check storage space
    const storage = await PG.ai.checkStorageSpace();
    if (!storage.sufficient) {
      status.issues.push(`Insufficient storage: ${storage.message}`);
      status.recommendations.push('Free up disk space (22GB+ needed for AI models)');
    }
    
    // Check API availability
    const hasNewAPIs = window.Summarizer && window.Translator && window.LanguageDetector;
    const hasLegacyAPIs = window.ai?.summarizer && window.ai?.translator && window.ai?.languageModel;
    
    if (!hasNewAPIs && !hasLegacyAPIs) {
      status.issues.push('AI APIs not found');
      status.recommendations.push('Enable chrome://flags/#built-in-ai-api and restart Chrome');
    }
    
    status.ready = status.issues.length === 0;
    return status;
  };

  PG.ai.checkStorageSpace = async function checkStorageSpace(){
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usedMB = Math.round((estimate.usage || 0) / 1024 / 1024);
        const quotaMB = Math.round((estimate.quota || 0) / 1024 / 1024);
        const availableMB = quotaMB - usedMB;
        const requiredGB = 22; // Chrome 138+ requirement for Gemini Nano
        const requiredMB = requiredGB * 1024;
        
        console.log(`💾 Chrome Profile Storage: ${usedMB}MB used / ${quotaMB}MB total (${availableMB}MB available)`);
        console.log(`📏 Required: ${requiredMB}MB (${requiredGB}GB) for Gemini Nano model`);
        
        // Additional diagnostics
        console.log(`🔍 Storage Diagnostics:`);
        console.log(`  - Chrome storage quota: ${(quotaMB / 1024).toFixed(1)}GB`);
        console.log(`  - Available in quota: ${(availableMB / 1024).toFixed(1)}GB`);
        console.log(`  - Meets requirement: ${availableMB >= requiredMB ? '✅ Yes' : '❌ No'}`);
        
        if (quotaMB < requiredMB) {
          console.warn(`⚠️ Chrome profile drive quota (${(quotaMB / 1024).toFixed(1)}GB) is less than requirement (${requiredGB}GB)`);
          return { 
            available: availableMB, 
            required: requiredMB,
            sufficient: false,
            message: `Chrome profile drive too small: ${(quotaMB / 1024).toFixed(1)}GB total, need ${requiredGB}GB+ drive`
          };
        }
        
        if (availableMB < requiredMB) {
          console.warn(`⚠️ Insufficient storage: ${availableMB}MB available, ${requiredMB}MB required for Gemini Nano`);
          return { 
            available: availableMB, 
            required: requiredMB,
            sufficient: false,
            message: `Need ${Math.round((requiredMB - availableMB) / 1024)}GB more free space for AI models`
          };
        }
        
        console.log('✅ Sufficient storage space for AI models');
        return { 
          available: availableMB, 
          required: requiredMB,
          sufficient: true,
          message: 'Storage requirements met'
        };
      }
    } catch(e) {
      console.log('Storage check failed:', e);
    }
    return { available: 'unknown', required: 22 * 1024, sufficient: true, message: 'Unable to check storage' };
  };

  PG.ai.initializeAIAPIs = async function initializeAIAPIs(){
    try {
      // Check Chrome version for stable AI API support
      const userAgent = navigator.userAgent;
      const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1];
      if (chromeVersion && parseInt(chromeVersion) < 138) {
        console.warn(`⚠️ Chrome 138+ recommended for stable AI APIs. Current version: ${chromeVersion}`);
        if (parseInt(chromeVersion) < 127) {
          console.error('❌ Chrome version too old. Some AI APIs may not work at all.');
        }
      } else {
        console.log(`✅ Chrome ${chromeVersion} supports stable AI APIs`);
      }

      // Check storage space for AI models
      const storage = await PG.ai.checkStorageSpace();
      if (!storage.sufficient) {
        console.warn('⚠️ Insufficient storage space for AI models. Some features may not work.');
      }
      
      // LanguageModel (new or legacy)
      if (!aiApis.languageModel) {
        if (window.LanguageModel?.create) {
          try {
            aiApis.languageModel = await window.LanguageModel.create({ 
              systemPrompt: 'Be concise.',
              outputLanguage: 'en'  // Specify output language for optimal quality
            });
          } catch(e){ 
            console.log('LanguageModel (new) create failed:', e?.message || e);
            if (e?.message?.includes('origin trial') || e?.message?.includes('not enabled')) {
              console.warn('💡 Enable chrome://flags/#built-in-ai-api and restart Chrome');
            }
            if (e?.message?.includes('not have enough space')) {
              console.warn('💾 Insufficient space for AI model. Free up disk space and restart Chrome');
            }
          }
        } else if (window.ai?.languageModel?.create) {
          try {
            const caps = await window.ai.languageModel.capabilities?.();
            if (!caps || ['readily','after-download','downloadable'].includes(caps.available)) {
              aiApis.languageModel = await window.ai.languageModel.create({ 
                systemPrompt: 'Be concise.',
                outputLanguage: 'en'  // Specify output language for optimal quality
              });
            }
          } catch(e){ 
            console.log('LanguageModel (legacy) create failed:', e?.message || e);
            if (e?.message?.includes('not have enough space')) {
              console.warn('💾 Insufficient space for AI model. Free up disk space and restart Chrome');
            }
          }
        }
      }

      // LanguageDetector (new or legacy)
      if (!aiApis.languageDetector) {
        if (window.LanguageDetector?.create) {
          try { aiApis.languageDetector = await window.LanguageDetector.create(); } catch(_){}
        } else if (window.ai?.languageDetector?.create) {
          try {
            const caps = await window.ai.languageDetector.capabilities?.();
            if (!caps || ['readily','after-download','downloadable'].includes(caps.available)) {
              aiApis.languageDetector = await window.ai.languageDetector.create();
            }
          } catch(_){}
        }
      }

      PG.ai.logAPIStatus();
    } catch(e){ console.log('initializeAIAPIs error:', e?.message || e); }
  };

  // Ensure translator, with robust pair fallbacks and user gesture handling
  PG.ai.ensureTranslatorReady = async function ensureTranslatorReady(targetLanguage = 'es', sourceLanguage = 'auto'){
    try {
      if (aiApis.translator) return aiApis.translator;

      // Check if we need to handle availability states
      let needsUserGesture = false;

      if (window.Translator?.create) {
        // Check availability first for new stable API (Chrome 138+)
        try {
          const availability = await window.Translator.availability?.();
          console.log('Translator availability (Chrome 138+):', availability);
          
          if (availability === 'unavailable') {
            throw new Error('Translator API unavailable. Chrome 138+ required.');
          }
          
          if (['downloading', 'downloadable'].includes(availability) && !navigator.userActivation?.isActive) {
            throw new Error('User gesture required for Translator model download. Select text to trigger download.');
          }
        } catch(availErr) {
          if (availErr.message?.includes('user gesture')) {
            throw availErr; // Re-throw user gesture errors
          }
          // Continue if availability check fails for other reasons
        }

        let sourceLang = (sourceLanguage && sourceLanguage !== 'auto') ? sourceLanguage : 'en';
        let targetLang = targetLanguage || 'es';
        if (sourceLang === targetLang) {
          if (targetLang === 'en') targetLang = 'es'; else sourceLang = 'en';
        }
        const params = { sourceLanguage: sourceLang, targetLanguage: targetLang };
        try {
          aiApis.translator = await window.Translator.create(params);
          PG.ai.logAPIStatus();
          return aiApis.translator;
        } catch (languagePairError) {
          if (languagePairError.message?.includes('user gesture')) {
            throw languagePairError; // Re-throw user gesture errors immediately
          }
          const fallbackPairs = [
            { sourceLanguage: 'en', targetLanguage: 'es' },
            { sourceLanguage: 'en', targetLanguage: 'fr' },
            { sourceLanguage: 'es', targetLanguage: 'en' },
            { sourceLanguage: 'fr', targetLanguage: 'en' }
          ];
          for (const fp of fallbackPairs) {
            try { aiApis.translator = await window.Translator.create(fp); PG.ai.logAPIStatus(); return aiApis.translator; } catch(_){}
          }
          throw languagePairError;
        }
      }

      if (window.ai?.translator?.create) {
        try {
          const capabilities = await window.ai.translator.capabilities?.();
          console.log('Translator capabilities:', capabilities);
          
          if (capabilities?.available === 'readily') {
            const params = { sourceLanguage: (sourceLanguage && sourceLanguage !== 'auto') ? sourceLanguage : 'en', targetLanguage: targetLanguage || 'es' };
            try {
              aiApis.translator = await window.ai.translator.create(params);
              PG.ai.logAPIStatus();
              return aiApis.translator;
            } catch (languagePairError) {
              const fallbackPairs = [
                { sourceLanguage: 'en', targetLanguage: 'es' },
                { sourceLanguage: 'en', targetLanguage: 'fr' },
                { sourceLanguage: 'es', targetLanguage: 'en' }
              ];
              for (const fp of fallbackPairs) {
                try { aiApis.translator = await window.ai.translator.create(fp); PG.ai.logAPIStatus(); return aiApis.translator; } catch(_){}
              }
            }
          } else if (['downloading', 'downloadable'].includes(capabilities?.available)) {
            throw new Error('Requires a user gesture when availability is "downloading" or "downloadable".');
          }
        } catch(err){ 
          console.log('Legacy Translator create failed:', err?.message || err);
          if (err?.message?.includes('user gesture')) {
            throw err; // Re-throw user gesture errors
          }
        }
      }

      return null;
    } catch(error){ console.log('Translator not ready:', error?.message || error); return null; }
  };

  // Ensure summarizer (Chrome 138+ stable API)
  PG.ai.ensureSummarizerReady = async function ensureSummarizerReady(){
    try {
      if (aiApis.summarizer) return aiApis.summarizer;
      
      // Check storage space first (required for Gemini Nano)
      const storage = await PG.ai.checkStorageSpace();
      if (!storage.sufficient) {
        throw new Error(`Insufficient storage space: ${storage.message}. Need 22GB+ free space for AI models.`);
      }
      
      // Use new stable Summarizer API (Chrome 138+)
      if (window.Summarizer?.create) {
        try {
          // Check availability first
          const availability = await window.Summarizer.availability();
          console.log('Summarizer availability (Chrome 138+):', availability);
          
          if (availability === 'unavailable') {
            throw new Error('Summarizer API unavailable. Chrome 138+ required with 22GB+ free space.');
          }
          
          if (availability === 'downloadable' && !navigator.userActivation?.isActive) {
            throw new Error('User gesture required for model download. Select text to trigger download.');
          }
          
          const options = {
            type: 'key-points',
            format: 'markdown',
            length: 'medium',
            // Summarizer only supports: en, es, ja (as of Chrome 138+)
            // Other languages will fall back to LanguageModel
            expectedInputLanguages: ['en', 'es', 'ja'],
            outputLanguage: 'en',
            monitor(m) {
              m.addEventListener('downloadprogress', (e) => {
                console.log(`Summarizer model download: ${Math.round(e.loaded * 100)}%`);
              });
            }
          };
          
          aiApis.summarizer = await window.Summarizer.create(options);
          console.log('✅ Summarizer ready (Chrome 138+ stable API)');
          PG.ai.logAPIStatus();
          return aiApis.summarizer;
        } catch(err){ 
          console.log('Summarizer (Chrome 138+) create failed:', err?.message || err);
          if (err?.message?.includes('not have enough space')) {
            console.warn('💾 Need 22GB+ free space for Gemini Nano model');
          }
          throw err;
        }
      }
      
      // Fallback to legacy API if available
      if (window.ai?.summarizer?.create) {
        try {
          const capabilities = await window.ai.summarizer.capabilities?.();
          console.log('Legacy Summarizer capabilities:', capabilities);
          if (capabilities?.available === 'readily') {
            aiApis.summarizer = await window.ai.summarizer.create({ 
              type: 'key-points', 
              format: 'markdown' 
            });
            console.log('✅ Summarizer ready (legacy API)');
            PG.ai.logAPIStatus();
            return aiApis.summarizer;
          }
        } catch(err){ console.log('Legacy Summarizer create failed:', err?.message || err); }
      }
      
      throw new Error('Summarizer API not available. Update to Chrome 138+ stable.');
    } catch(error){ 
      console.log('Summarizer not ready:', error?.message || error); 
      throw error; // Re-throw instead of returning null to preserve error details
    }
  };

  // Ensure writer
  PG.ai.ensureWriterReady = async function ensureWriterReady(){
    try {
      if (aiApis.writer) return aiApis.writer;
      if (window.Writer?.create) {
        try { 
          // Writer API with language parameters (origin trial)
          // NOTE: Writer API only supports en, es, ja as of Chrome 138+
          // Other languages will be handled by LanguageModel
          aiApis.writer = await window.Writer.create({
            tone: 'neutral',
            format: 'plain-text',
            length: 'short',
            expectedInputLanguages: ['en', 'es', 'ja'],
            expectedContextLanguages: ['en'],
            outputLanguage: 'en'
          }); 
          PG.ai.logAPIStatus(); 
          return aiApis.writer; 
        } catch(err){ console.log('New Writer create failed:', err?.message || err); }
      }
      if (window.ai?.writer?.create) {
        try { aiApis.writer = await window.ai.writer.create(); PG.ai.logAPIStatus(); return aiApis.writer; } catch(err){ console.log('Legacy Writer create failed:', err?.message || err); }
      }
      return null;
    } catch(error){ console.log('Writer not ready:', error?.message || error); return null; }
  };

  // Ensure rewriter
  PG.ai.ensureRewriterReady = async function ensureRewriterReady(){
    try {
      if (aiApis.rewriter) return aiApis.rewriter;
      if (window.Rewriter?.create) {
        try { 
          // Rewriter API with language parameters (origin trial)
          // NOTE: Rewriter API only supports en, es, ja as of Chrome 138+
          // Other languages will be handled by LanguageModel
          aiApis.rewriter = await window.Rewriter.create({
            tone: 'as-is',
            format: 'plain-text',
            length: 'as-is',
            expectedInputLanguages: ['en', 'es', 'ja'],
            expectedContextLanguages: ['en'],
            outputLanguage: 'en'
          }); 
          PG.ai.logAPIStatus(); 
          return aiApis.rewriter; 
        } catch(err){ console.log('New Rewriter create failed:', err?.message || err); }
      }
      if (window.ai?.rewriter?.create) {
        try { aiApis.rewriter = await window.ai.rewriter.create(); PG.ai.logAPIStatus(); return aiApis.rewriter; } catch(err){ console.log('Legacy Rewriter create failed:', err?.message || err); }
      }
      return null;
    } catch(error){ console.log('Rewriter not ready:', error?.message || error); return null; }
  };

  // Ensure proofreader
  PG.ai.ensureProofreaderReady = async function ensureProofreaderReady(){
    try {
      if (aiApis.proofreader) return aiApis.proofreader;
      if (window.Proofreader?.create) {
        try { 
          // Proofreader API with language parameters (origin trial)
          // NOTE: Proofreader API only supports English (en) as of Chrome 144+
          // Other languages will be handled by LanguageModel
          aiApis.proofreader = await window.Proofreader.create({
            expectedInputLanguages: ['en']
          }); 
          PG.ai.logAPIStatus(); 
          return aiApis.proofreader; 
        } catch(err){ console.log('New Proofreader create failed:', err?.message || err); }
      }
      if (window.ai?.proofreader?.create) {
        try { aiApis.proofreader = await window.ai.proofreader.create(); PG.ai.logAPIStatus(); return aiApis.proofreader; } catch(err){ console.log('Legacy Proofreader create failed:', err?.message || err); }
      }
      return null;
    } catch(error){ console.log('Proofreader not ready:', error?.message || error); return null; }
  };

})();
