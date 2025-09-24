// Vocabulary parsing/formatting utilities (global PG namespace)
(function () {
  const PG = (window.PG = window.PG || {});
  PG.vocab = PG.vocab || {};

  PG.vocab.condenseSummary = function condenseSummary(text, options) {
    options = options || {};
    const maxBullets = options.maxBullets ?? 5;
    const maxSentences = options.maxSentences ?? 3;
    const charCap = options.charCap ?? 500;
    let t = String(text || '').trim();
    if (!t) return t;
    t = t.replace(/\r\n?|\u2028|\u2029/g, '\n');
    const lines = t.split('\n').map(s => s.trim()).filter(Boolean);
    const bulletRegex = /^(?:[-*•・]|\d+[\.)])\s*/;
    const bullets = lines
      .filter(l => bulletRegex.test(l) || l.length <= 120)
      .map(l => l.replace(bulletRegex, '').trim())
      .filter(Boolean);
    const dedup = new Set();
    const uniqueBullets = [];
    for (const b of bullets) { const k = b.toLowerCase(); if (!dedup.has(k)) { dedup.add(k); uniqueBullets.push(b); } }
    let condensed = '';
    if (uniqueBullets.length) {
      condensed = uniqueBullets.slice(0, maxBullets).join('\n');
    } else {
      const sentences = (t.match(/[^.!?。！？\n]+[.!?。！？]?/g) || []).map(s => s.trim()).filter(Boolean);
      condensed = sentences.slice(0, maxSentences).join(' ');
    }
    if (condensed.length > charCap) {
      const cut = condensed.slice(0, charCap);
      const lastBreak = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf(' '), cut.lastIndexOf('、'));
      condensed = (lastBreak > 50 ? cut.slice(0, lastBreak) : cut).trim() + '…';
    }
    return condensed;
  };

  PG.vocab.parseVocabJSONToItems = function parseVocabJSONToItems(result, limit) {
    try {
      const clean = String(result || '').trim().replace(/^```json\s*|^```|```$/g, '').trim();
      const data = JSON.parse(clean);
      if (!Array.isArray(data)) return null;
      
      // Helper to truncate long examples
      const truncateExample = (example) => {
        if (!example || example.length <= 120) return example;
        const sentences = example.split(/[.!?。！？]+/).map(s => s.trim()).filter(Boolean);
        if (sentences.length > 0) {
          const short = sentences.slice(0, 2).join('. ');
          if (short.length <= 120) {
            return short + (short.match(/[.!?。！？]$/) ? '' : '.');
          } else {
            return sentences[0] + (sentences[0].match(/[.!?。！？]$/) ? '' : '.');
          }
        }
        return example;
      };
      
      const lim = limit || 12;
      const items = data.slice(0, lim).map(it => {
        const reading = String(it.reading ?? '').trim();
        const transliteration = String(it.transliteration ?? it.romaji ?? it.pinyin ?? '').trim();
        const pronunciation = String(it.pronunciation ?? it.pron ?? '').trim();
        return {
          word: String(it.word ?? '').trim(),
          pos: String(it.pos ?? '').trim(),
          def: String(it.def ?? it.definition ?? '').trim(),
          example: truncateExample(String(it.example ?? '').trim()),
          reading,
          transliteration,
          pronunciation,
          stress: String(it.stress ?? '').trim(),
          difficulty: String(it.difficulty ?? '').trim(),
          frequency: String(it.frequency ?? '').trim(),
          translation: String(it.translation ?? '').trim(),
          cefr: String(it.cefr ?? '').trim(),
          family: String(it.family ?? '').trim(),
          synonyms: Array.isArray(it.synonyms) ? it.synonyms.join(', ') : String(it.synonyms ?? '').trim(),
          antonyms: Array.isArray(it.antonyms) ? it.antonyms.join(', ') : String(it.antonyms ?? '').trim(),
          collocations: Array.isArray(it.collocations) ? it.collocations.join(', ') : String(it.collocations ?? '').trim(),
          polysemy: String(it.polysemy ?? it.senses ?? '').trim(),
          register: String(it.register ?? '').trim(),
          domain: String(it.domain ?? '').trim(),
          commonErrors: String(it.commonErrors ?? '').trim(),
          idioms: Array.isArray(it.idioms) ? it.idioms.join(', ') : String(it.idioms ?? '').trim(),
          etymology: String(it.etymology ?? '').trim(),
          semanticField: String(it.semanticField ?? '').trim(),
          falseFriends: Array.isArray(it.falseFriends) ? it.falseFriends.join(', ') : String(it.falseFriends ?? '').trim(),
          visuals: String(it.visuals ?? '').trim(),
          mnemonics: String(it.mnemonics ?? '').trim(),
          cultural: String(it.cultural ?? '').trim(),
          appropriateness: String(it.appropriateness ?? '').trim(),
          regionalVariation: String(it.regionalVariation ?? '').trim(),
          sensitivity: String(it.sensitivity ?? '').trim()
        };
      });
      return { items };
    } catch (_) { return null; }
  };

  PG.vocab.sanitizeVocabPronunciation = function sanitizeVocabPronunciation(items, sourceLang) {
    try {
      const labels = {
        en: ['english','en'], es: ['spanish','es','español'], fr: ['french','fr','français'],
        de: ['german','de','deutsch'], it: ['italian','it','italiano'], pt: ['portuguese','pt','português'],
        ru: ['russian','ru','русский'], zh: ['chinese','zh','中文','汉语','漢語'], ja: ['japanese','ja','日本語'],
        ko: ['korean','ko','한국어','조선어'], ar: ['arabic','ar','العربية'], hi: ['hindi','hi','हिन्दी']
      };
      const target = (labels[sourceLang] || []).map(s => s.toLowerCase());
      const pickLine = (val) => {
        if (!val) return '';
        const lines = String(val).split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return '';
        const unlabeled = lines.filter(l => !/:/.test(l) && !/^[-*•]/.test(l));
        if (unlabeled.length) return unlabeled[0];
        for (const l of lines) {
          const m = l.match(/^(?:[-*•]\s*)?([A-Za-z\p{L}\s]+):\s*(.+)$/u);
          if (m) {
            const label = m[1].trim().toLowerCase();
            if (label.includes('european') || label.includes('other')) continue;
            if (target.some(t => label.includes(t))) return m[2].trim();
          }
        }
        const first = lines[0];
        const m2 = first.match(/^(?:[-*•]\s*)?(?:[A-Za-z\p{L}\s]+:\s*)?(.+)$/u);
        return (m2 ? m2[1] : first).trim();
      };
      return items.map(it => ({
        ...it,
        reading: pickLine(it.reading),
        transliteration: pickLine(it.transliteration),
        pronunciation: pickLine(it.pronunciation)
      }));
    } catch (_) { return items; }
  };

  PG.vocab.formatVocabularyAnalysis = function formatVocabularyAnalysis(rawAnalysis) {
    let formatted = String(rawAnalysis || '');
    formatted = formatted.replace(/^###\s+(.+)$/gm, '<h4>$1</h4>');
    formatted = formatted.replace(/^##\s+(.+)$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^\*\*([^:]+):\*\*/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^\-\s+(.*)$/gm, '<li>$1</li>');
    formatted = formatted.replace(/(?:<li>.*<\/li>\n?)+/g, (block) => `<ul>${block}</ul>`);
    formatted = formatted.replace(/- Word: ([^,\n]+)/g, '<div class="word-card"><div class="word-title">$1</div>');
    formatted = formatted.replace(/- Definition: ([^\n]+)/g, '<div>Definition: $1</div>');
    formatted = formatted.replace(/- Part of speech: ([^\n]+)/g, '<div>Part of speech: <em>$1</em></div>');
    formatted = formatted.replace(/- Difficulty: (Beginner|Intermediate|Advanced)/g, '<span class="difficulty-badge difficulty-$1">$1</span></div>');
    formatted = formatted.replace(/^(\d+\.\s.*)/gm, '<div class="example-sentence">$1</div>');
    formatted = formatted.replace(/(Memory aid|Tip|Remember):\s*([^\n]+)/gi, '<div class="learning-tip">$1: $2</div>');
    formatted = formatted.replace(/\n{3,}/g, '\n\n');
    formatted = formatted.replace(/\n{2,}/g, '<br>');
    // Sanitize final HTML before returning
    if (PG.lang?.sanitizeHTML) return PG.lang.sanitizeHTML(formatted);
    return formatted;
  };

  PG.vocab.renderVocabItems = function renderVocabItems(items, sourceLang) {
    try {
      const esc = (s) => (PG.lang?.escapeHTML ? PG.lang.escapeHTML(s) : String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
      const toTags = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
        return String(val).split(/[;,·•]\s*|\s{2,}|\n/).map(v => v.trim()).filter(Boolean);
      };
      
      // Helper function to check if text contains non-Latin characters
      const needsTransliteration = (text, lang = sourceLang) => {
        if (!text) return false;
        const nonLatinLangs = ['ja', 'zh', 'ko', 'ar', 'hi', 'th', 'ru', 'bg', 'sr', 'mk', 'uk', 'be', 'el', 'he'];
        if (nonLatinLangs.includes(lang)) return true;
        // Check for non-Latin characters (outside basic Latin and extended Latin ranges)
        return /[^\u0000-\u024F\u1E00-\u1EFF]/.test(text);
      };

      // Helper to format text with transliteration if available and needed
      const formatWithTranslit = (text, translit, context = '') => {
        if (!text) return '';
        const escaped = esc(text);
        if (translit && needsTransliteration(text, sourceLang)) {
          return `${escaped} <em>(${esc(translit)})</em>`;
        }
        return escaped;
      };
      
      const src = sourceLang || 'auto';
      const translitLabel = src === 'ja' ? 'Romaji' : (src === 'zh' ? 'Pinyin' : 'Transliteration');
      const body = (items || []).map((it, idx) => {
        const diff = String(it.difficulty || '').toLowerCase();
        const cefr = String(it.cefr || '').toUpperCase();
        const synonyms = toTags(it.synonyms);
        const antonyms = toTags(it.antonyms);
        const collocs = toTags(it.collocations);
        const hasPron = Boolean(it.reading || it.transliteration || it.pronunciation);
        const detailsRows = [
          it.def ? `<div class="word-row"><span class="row-label"><strong>Dictionary Definition</strong></span> ${esc(it.def)}</div>` : '',
          cefr ? `<div class="word-row"><span class="row-label"><strong>CEFR</strong></span> ${esc(cefr)}</div>` : '',
          it.frequency ? `<div class="word-row"><span class="row-label"><strong>Frequency</strong></span> ${esc(it.frequency)}</div>` : '',
          it.register ? `<div class="word-row"><span class="row-label"><strong>Register</strong></span> ${esc(it.register)}</div>` : '',
          it.family ? `<div class="word-row"><span class="row-label"><strong>Family</strong></span> ${formatWithTranslit(it.family, it.familyTranslit)}</div>` : '',
          (synonyms.length || antonyms.length) ? `
            <div class="word-row">
              <span class="row-label"><strong>Synonyms/Antonyms</strong></span>
              <div class="word-tags">
                ${synonyms.slice(0, 8).map(s => `<span class="pg-tag">${needsTransliteration(s, sourceLang) && it.synonymsTranslit ? formatWithTranslit(s, '') : esc(s)}</span>`).join('')}
                ${antonyms.slice(0, 8).map(a => `<span class="pg-tag" title="antonym">${needsTransliteration(a, sourceLang) && it.antonymsTranslit ? formatWithTranslit(a, '') : esc(a)}</span>`).join('')}
              </div>
              ${it.synonymsTranslit ? `<div class="word-row"><span class="row-label">${translitLabel}</span> ${esc(it.synonymsTranslit)}</div>` : ''}
              ${it.antonymsTranslit ? `<div class="word-row"><span class="row-label">${translitLabel}</span> ${esc(it.antonymsTranslit)}</div>` : ''}
            </div>` : '',
          collocs.length ? `
            <div class="word-row">
              <span class="row-label"><strong>Collocations</strong></span>
              <div class="word-tags">
                ${collocs.slice(0, 8).map(c => `<span class="pg-tag">${needsTransliteration(c, sourceLang) && it.collocationsTranslit ? formatWithTranslit(c, '') : esc(c)}</span>`).join('')}
              </div>
              ${it.collocationsTranslit ? `<div class="word-row"><span class="row-label">${translitLabel}</span> ${esc(it.collocationsTranslit)}</div>` : ''}
            </div>` : '',
          it.etymology ? `<div class="word-row"><span class="row-label"><strong>Etymology</strong></span> ${esc(it.etymology)}</div>` : '',
          it.cultural ? `<div class="word-row"><span class="row-label"><strong>Cultural</strong></span> ${esc(it.cultural)}</div>` : ''
        ].filter(Boolean).join('');
        const exampleRows = [
          it.example ? `<div class="word-row"><span class="row-label">Example</span> ${formatWithTranslit(it.example, it.exampleTranslit)}</div>` : '',
          it.exampleTranslation ? `<div class="word-row"><span class="row-label">Translation</span> ${esc(String(it.exampleTranslation || ''))}</div>` : '',
          it.exampleSimple ? `<div class="word-row"><span class="row-label">Simplified</span> ${esc(String(it.exampleSimple || ''))}</div>` : ''
        ].filter(Boolean).join('');
        return `
          <div class="word-card" data-idx="${idx}">
            <div class="word-card-header">
              <div class="word-index" aria-hidden="true">${idx + 1}</div>
              <div class="word-title">${formatWithTranslit(it.word, it.transliteration)}</div>
              <div class="word-header-chips">
                ${it.pos ? `<span class="chip chip-pos" title="Part of speech">${esc(it.pos)}</span>` : ''}
                ${cefr ? `<span class="chip chip-cefr" title="CEFR level">${esc(cefr)}</span>` : ''}
                ${it.frequency ? `<span class="chip chip-frequency" title="Frequency">${esc(it.frequency)}</span>` : ''}
                ${diff ? `<span class="difficulty-badge difficulty-${esc(diff)}">${esc(it.difficulty)}</span>` : ''}
              </div>
            </div>
            <div class="word-section">
              <div class="section-title">Form</div>
              <div class="word-row"><span class="row-label">Spelling</span> ${formatWithTranslit(it.word, it.transliteration)}</div>
              ${hasPron ? `
              <div class="word-row"><span class="row-label">Pronunciation</span>
                <div class="pron-breakdown">
                  ${it.reading ? `<span class="pron-part" title="Reading">${esc(it.reading)}</span>` : ''}
                  ${it.transliteration ? `<span class="pron-part" title="${translitLabel}">${esc(it.transliteration)}</span>` : ''}
                  ${it.pronunciation ? `<span class="pron-part" title="Phonetic">${esc(it.pronunciation)}</span>` : ''}
                </div>
              </div>` : ''}
              ${it.stress ? `<div class="word-row"><span class="row-label">Stress</span> ${esc(it.stress)}</div>` : ''}
              ${it.pos ? `<div class="word-row"><span class="row-label">Part of speech</span> ${esc(it.pos)}</div>` : ''}
            </div>
            ${detailsRows ? `<div class="word-section"><div class="section-title">Details</div>${detailsRows}</div>` : ''}
            ${exampleRows ? `<div class="word-section"><div class="section-title">Sentence Example</div>${exampleRows}</div>` : ''}
            <div class="word-footer">
              <button class="pg-btn" data-card-action="save-one" data-idx="${idx}" title="Save this word">Save</button>
              <button class="pg-btn" data-card-action="copy-one" data-idx="${idx}" title="Copy card as text">Copy</button>
            </div>
          </div>
        `;
      }).join('');
      return `<div class="polyglot-vocabulary-analysis">${body}</div>`;
    } catch (_) {
      return '<div class="polyglot-vocabulary-analysis"></div>';
    }
  };
})();
