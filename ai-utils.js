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

  PG.ai.initializeAIAPIs = async function initializeAIAPIs(){
    try {
      // LanguageModel (new or legacy)
      if (!aiApis.languageModel) {
        if (window.LanguageModel?.create) {
          try {
            aiApis.languageModel = await window.LanguageModel.create({ systemPrompt: 'Be concise.' });
          } catch(e){ console.log('LanguageModel (new) create failed:', e?.message || e); }
        } else if (window.ai?.languageModel?.create) {
          try {
            const caps = await window.ai.languageModel.capabilities?.();
            if (!caps || ['readily','after-download','downloadable'].includes(caps.available)) {
              aiApis.languageModel = await window.ai.languageModel.create({ systemPrompt: 'Be concise.' });
            }
          } catch(e){ console.log('LanguageModel (legacy) create failed:', e?.message || e); }
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

  // Ensure translator, with robust pair fallbacks
  PG.ai.ensureTranslatorReady = async function ensureTranslatorReady(targetLanguage = 'es', sourceLanguage = 'auto'){
    try {
      if (aiApis.translator) return aiApis.translator;

      if (window.Translator?.create) {
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
          }
        } catch(err){ console.log('Legacy Translator create failed:', err?.message || err); }
      }

      return null;
    } catch(error){ console.log('Translator not ready:', error?.message || error); return null; }
  };

  // Ensure summarizer
  PG.ai.ensureSummarizerReady = async function ensureSummarizerReady(){
    try {
      if (aiApis.summarizer) return aiApis.summarizer;
      const type = 'key-points';
      if (window.Summarizer?.create) {
        try {
          try { const availability = await window.Summarizer.availability?.(); if (availability && availability !== 'available') console.log('Summarizer availability (new API):', availability); } catch(_){}
          aiApis.summarizer = await window.Summarizer.create({ type });
          PG.ai.logAPIStatus();
          return aiApis.summarizer;
        } catch(err){ console.log('New Summarizer create failed:', err?.message || err); }
      }
      if (window.ai?.summarizer?.create) {
        try {
          try { const capabilities = await window.ai.summarizer.capabilities?.(); console.log('Legacy Summarizer capabilities:', capabilities); } catch(_){}
          aiApis.summarizer = await window.ai.summarizer.create({ type, format: 'markdown' });
          PG.ai.logAPIStatus();
          return aiApis.summarizer;
        } catch(err){ console.log('Legacy Summarizer create failed:', err?.message || err); }
      }
      return null;
    } catch(error){ console.log('Summarizer not ready:', error?.message || error); return null; }
  };

  // Ensure writer
  PG.ai.ensureWriterReady = async function ensureWriterReady(){
    try {
      if (aiApis.writer) return aiApis.writer;
      if (window.Writer?.create) {
        try { aiApis.writer = await window.Writer.create(); PG.ai.logAPIStatus(); return aiApis.writer; } catch(err){ console.log('New Writer create failed:', err?.message || err); }
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
        try { aiApis.rewriter = await window.Rewriter.create(); PG.ai.logAPIStatus(); return aiApis.rewriter; } catch(err){ console.log('New Rewriter create failed:', err?.message || err); }
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
        try { aiApis.proofreader = await window.Proofreader.create(); PG.ai.logAPIStatus(); return aiApis.proofreader; } catch(err){ console.log('New Proofreader create failed:', err?.message || err); }
      }
      if (window.ai?.proofreader?.create) {
        try { aiApis.proofreader = await window.ai.proofreader.create(); PG.ai.logAPIStatus(); return aiApis.proofreader; } catch(err){ console.log('Legacy Proofreader create failed:', err?.message || err); }
      }
      return null;
    } catch(error){ console.log('Proofreader not ready:', error?.message || error); return null; }
  };

})();
