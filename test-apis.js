// Comprehensive Chrome AI API test harness for PolyglotReader
// - Covers new globals (LanguageModel, Translator, Summarizer, LanguageDetector, Writer, Rewriter, Proofreader)
// - Covers legacy window.ai.* variants when present
// - Wires to UI buttons for user-gesture-gated creation where required

console.log('🧪 PolyglotReader AI API Test Harness booting...');

// DOM helpers
function $(sel) { return document.querySelector(sel); }
function setStatus(id, text, color = 'yellow') {
  const el = document.getElementById(id);
  if (!el) return;
  el.querySelector('.status-text').textContent = text;
  const dot = el.querySelector('.status-indicator');
  if (dot) {
    dot.classList.remove('status-green','status-red','status-yellow');
    dot.classList.add(color === 'green' ? 'status-green' : color === 'red' ? 'status-red' : 'status-yellow');
  }
}

function logResult(id, lines) {
  const out = document.getElementById('apiResults');
  if (!out) return;
  const block = document.createElement('div');
  block.style.marginBottom = '10px';
  block.innerHTML = `<strong>${id}</strong><br><code>${lines.map(l => String(l)).join('\n')}</code>`;
  out.prepend(block);
}

// Availability checks (new + legacy)
async function checkAvailability() {
  try {
    console.log('\n🔍 API Availability Check (globals and legacy):');
    
    // Check Chrome version
    const userAgent = navigator.userAgent;
    const chromeVersion = userAgent.match(/Chrome\/(\d+)/)?.[1];
    console.log(`Chrome version: ${chromeVersion || 'Unknown'}`);
    
    if (chromeVersion && parseInt(chromeVersion) < 127) {
      console.warn('⚠️ Chrome 127+ recommended for full AI API support');
    }
    
    const availability = {
      languageModel: !!window.LanguageModel || !!window.ai?.languageModel,
      translator: !!window.Translator || !!window.ai?.translator,
      summarizer: ('Summarizer' in window) || !!window.ai?.summarizer,
      languageDetector: ('LanguageDetector' in window) || !!window.ai?.languageDetector,
      writer: ('Writer' in window) || !!window.ai?.writer,
      rewriter: ('Rewriter' in window) || !!window.ai?.rewriter,
      proofreader: ('Proofreader' in window) || !!window.ai?.proofreader,
    };

    console.table(availability);
    setStatus('status-language-model', availability.languageModel ? 'Available' : 'Not found', availability.languageModel ? 'green' : 'red');
    setStatus('status-translator', availability.translator ? 'Available' : 'Not found', availability.translator ? 'green' : 'red');
    setStatus('status-summarizer', availability.summarizer ? 'Detected' : 'Not found', availability.summarizer ? 'yellow' : 'red');
    setStatus('status-language-detector', availability.languageDetector ? 'Detected' : 'Not found', availability.languageDetector ? 'yellow' : 'red');
    setStatus('status-writer', availability.writer ? 'Detected' : 'Not found', availability.writer ? 'yellow' : 'red');
    setStatus('status-rewriter', availability.rewriter ? 'Detected' : 'Not found', availability.rewriter ? 'yellow' : 'red');
    setStatus('status-proofreader', availability.proofreader ? 'Detected' : 'Not found', availability.proofreader ? 'yellow' : 'red');

    return availability;
  } catch (e) {
    console.error('Availability check failed:', e);
  }
}

// Gesture-gated tests
async function testLanguageModel() {
  setStatus('status-language-model', 'Testing...', 'yellow');
  try {
    let session = null;
    if (window.LanguageModel?.create) {
      session = await window.LanguageModel.create({ 
        systemPrompt: 'Be brief.',
        outputLanguage: 'en'
      });
    } else if (window.ai?.languageModel?.create) {
      const caps = await window.ai.languageModel.capabilities();
      console.log('Legacy LanguageModel capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      session = await window.ai.languageModel.create({ 
        systemPrompt: 'Be brief.',
        outputLanguage: 'en'
      });
    } else {
      throw new Error('LanguageModel API not found');
    }
    const res = await session.prompt('Say hello in 3 words.');
    console.log('LanguageModel response:', res);
    logResult('LanguageModel', [res]);
    setStatus('status-language-model', 'Working', 'green');
  } catch (e) {
    console.warn('LanguageModel test failed:', e);
    let errorMsg = e?.message || e;
    if (errorMsg.includes('not have enough space')) {
      errorMsg = '💾 Insufficient storage space for AI model';
    } else if (errorMsg.includes('origin trial')) {
      errorMsg = '🔧 Enable chrome://flags/#built-in-ai-api';
    }
    logResult('LanguageModel Error', [errorMsg]);
    setStatus('status-language-model', 'Failed', 'red');
  }
}

async function testTranslator() {
  setStatus('status-translator', 'Testing...', 'yellow');
  try {
    let translator = null;
    if (window.Translator?.create) {
      translator = await window.Translator.create({ sourceLanguage: 'en', targetLanguage: 'es' });
    } else if (window.ai?.translator?.create) {
      const caps = await window.ai.translator.capabilities();
      console.log('Legacy Translator capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      translator = await window.ai.translator.create({ sourceLanguage: 'en', targetLanguage: 'es' });
    } else {
      throw new Error('Translator API not found');
    }

    const out = await translator.translate('Hello world');
    const text = out?.translatedText ?? out;
    console.log('Translator result:', out);
    logResult('Translator en→es', [text]);
    setStatus('status-translator', 'Working', 'green');
  } catch (e) {
    console.warn('Translator test failed:', e);
    logResult('Translator Error', [e?.message || e]);
    setStatus('status-translator', 'Failed', 'red');
  }
}

async function testSummarizer() {
  setStatus('status-summarizer', 'Testing...', 'yellow');
  try {
    let summarize;
    if ('Summarizer' in window) {
      const avail = await window.Summarizer.availability?.();
      console.log('Summarizer availability:', avail);
      if (avail && avail !== 'available') console.log('Summarizer availability state:', avail);
      const session = await window.Summarizer.create?.({ type: 'key-points', length: 'short' });
      summarize = (text) => session.summarize(text);
    } else if (window.ai?.summarizer?.create) {
      const caps = await window.ai.summarizer.capabilities();
      console.log('Legacy Summarizer capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      const session = await window.ai.summarizer.create({ type: 'key-points', format: 'markdown', length: 'short' });
      summarize = (text) => session.summarize(text);
    } else {
      throw new Error('Summarizer API not found');
    }
    const text = 'PolyglotReader is a browser extension that helps you learn languages by translating and analyzing selected text on any webpage.';
    const result = await summarize(text);
    console.log('Summarizer result:', result);
    logResult('Summarizer', [result]);
    setStatus('status-summarizer', 'Working', 'green');
  } catch (e) {
    console.warn('Summarizer test failed:', e);
    logResult('Summarizer Error', [e?.message || e]);
    setStatus('status-summarizer', 'Failed', 'red');
  }
}

async function testLanguageDetector() {
  setStatus('status-language-detector', 'Testing...', 'yellow');
  try {
    let detect;
    if ('LanguageDetector' in window) {
      const avail = await window.LanguageDetector.availability?.();
      console.log('LanguageDetector availability:', avail);
      const detector = await window.LanguageDetector.create?.();
      if (!detector) throw new Error('LanguageDetector.create() returned null/undefined');
      detect = async (t) => {
        const results = await detector.detect(t);
        // Prefer top result's language when array returned
        if (Array.isArray(results) && results.length) return results[0]?.detectedLanguage;
        return results?.detectedLanguage ?? results;
      };
    } else if (window.ai?.languageDetector?.create) {
      const caps = await window.ai.languageDetector.capabilities();
      console.log('Legacy LanguageDetector capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      const session = await window.ai.languageDetector.create();
      detect = (t) => session.detect(t).then(r => r?.detectedLanguage ?? r);
    } else {
      throw new Error('LanguageDetector not found');
    }
    const sample = 'Hola, ¿cómo estás?';
    const lang = await detect(sample);
    console.log('LanguageDetector result for sample:', sample, '→', lang);
    logResult('LanguageDetector', [String(lang)]);
    setStatus('status-language-detector', 'Working', 'green');
  } catch (e) {
    console.warn('LanguageDetector test failed:', e);
    logResult('LanguageDetector Error', [e?.message || e]);
    setStatus('status-language-detector', 'Failed', 'red');
  }
}

async function testWriter() {
  setStatus('status-writer', 'Testing...', 'yellow');
  try {
    let rewrite;
    if ('Writer' in window) {
      // tone: 'formal' | 'neutral' | 'casual'; format: 'markdown' | 'plain-text'
      const session = await window.Writer.create?.({ tone: 'casual', format: 'plain-text', length: 'short' });
      rewrite = (t) => session.write(t);
    } else if (window.ai?.writer?.create) {
      const caps = await window.ai.writer.capabilities();
      console.log('Legacy Writer capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      const session = await window.ai.writer.create({ tone: 'formal', format: 'plain-text', length: 'short' });
      rewrite = (t) => session.write(t);
    } else {
      throw new Error('Writer API not found');
    }
    const result = await rewrite('Write a friendly one-sentence greeting to a language learner.');
    console.log('Writer result:', result);
    logResult('Writer', [result]);
    setStatus('status-writer', 'Working', 'green');
  } catch (e) {
    console.warn('Writer test failed:', e);
    logResult('Writer Error', [e?.message || e]);
    setStatus('status-writer', 'Failed', 'red');
  }
}

async function testRewriter() {
  setStatus('status-rewriter', 'Testing...', 'yellow');
  try {
    let doRewrite;
    if ('Rewriter' in window) {
      // Valid enums: tone: 'more-formal' | 'as-is' | 'more-casual'
      // format: 'as-is' | 'markdown' | 'plain-text'; length: 'shorter' | 'as-is' | 'longer'
      const session = await window.Rewriter.create?.({ tone: 'more-casual', format: 'plain-text', length: 'shorter' });
      doRewrite = (t) => session.rewrite(t);
    } else if (window.ai?.rewriter?.create) {
      const caps = await window.ai.rewriter.capabilities();
      console.log('Legacy Rewriter capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      const session = await window.ai.rewriter.create({ tone: 'as-is', format: 'plain-text', length: 'shorter' });
      doRewrite = (t) => session.rewrite(t);
    } else {
      throw new Error('Rewriter API not found');
    }
    const result = await doRewrite('This sentence could be rewritten to be easier to understand.');
    console.log('Rewriter result:', result);
    logResult('Rewriter', [result]);
    setStatus('status-rewriter', 'Working', 'green');
  } catch (e) {
    console.warn('Rewriter test failed:', e);
    logResult('Rewriter Error', [e?.message || e]);
    setStatus('status-rewriter', 'Failed', 'red');
  }
}

async function testProofreader() {
  setStatus('status-proofreader', 'Testing...', 'yellow');
  try {
    let proof;
    if ('Proofreader' in window) {
      const session = await window.Proofreader.create?.();
      proof = (t) => session.proofread(t);
    } else if (window.ai?.proofreader?.create) {
      const caps = await window.ai.proofreader.capabilities();
      console.log('Legacy Proofreader capabilities:', caps);
      if (caps.available !== 'readily') throw new Error('Not readily available: ' + caps.available);
      const session = await window.ai.proofreader.create();
      proof = (t) => session.proofread(t);
    } else {
      throw new Error('Proofreader API not found');
    }
    const result = await proof('He go to school yesterday. It was fun but he forget his book.');
    console.log('Proofreader result:', result);
    logResult('Proofreader', [typeof result === 'string' ? result : JSON.stringify(result, null, 2)]);
    setStatus('status-proofreader', 'Working', 'green');
  } catch (e) {
    console.warn('Proofreader test failed:', e);
    logResult('Proofreader Error', [e?.message || e]);
    setStatus('status-proofreader', 'Failed', 'red');
  }
}

// Prompt API: fall back to LanguageModel prompt as representative
async function testPromptAPI() {
  const hasPrompt = 'Prompt' in window;
  if (hasPrompt) {
    console.log('Prompt API detected in window:', window.Prompt);
  }
  await testLanguageModel();
}

function initUI() {
  // Bind buttons if present
  $('#btn-check').addEventListener('click', checkAvailability);
  $('#btn-langmodel').addEventListener('click', testLanguageModel);
  $('#btn-translator').addEventListener('click', testTranslator);
  $('#btn-summarizer').addEventListener('click', testSummarizer);
  $('#btn-langdetector').addEventListener('click', testLanguageDetector);
  $('#btn-writer').addEventListener('click', testWriter);
  $('#btn-rewriter').addEventListener('click', testRewriter);
  $('#btn-proofreader').addEventListener('click', testProofreader);
  $('#btn-prompt').addEventListener('click', testPromptAPI);

  // Run a quick passive availability scan on load
  checkAvailability();

  // Optional: small auto-select to trigger the extension tooltip
  setTimeout(() => {
    const testText = 'Hello world, this is a test for translation.';
    console.log(`\n🎯 Auto-selecting test text: "${testText}"`);
    const testElement = document.createElement('div');
    testElement.textContent = testText;
    testElement.style.cssText = `position: fixed; top: 10px; right: 10px; background: #ffffcc; padding: 8px 12px; border: 1px solid #ffcc00; border-radius: 6px; font-size: 14px; z-index: 1000;`;
    document.body.appendChild(testElement);
    const range = document.createRange();
    range.selectNodeContents(testElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    console.log('✅ Test text selected! Look for PolyglotReader tooltip.');
    setTimeout(() => { testElement.remove(); selection.removeAllRanges(); }, 7000);
  }, 1500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}