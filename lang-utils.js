// Language and text utility helpers for PolyglotReader (global namespace)
(function () {
  const PG = (window.PG = window.PG || {});
  PG.lang = PG.lang || {};

  PG.lang.detectLanguageFallback = function detectLanguageFallback(text) {
    const sample = String(text || '').substring(0, 100);
    // Japanese (Hiragana, Katakana, Kanji)
    if (/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(sample)) return 'ja';
    // Chinese (Han) not overlapping with kana
    if (/[\u4E00-\u9FAF]/.test(sample) && !(/[\u3040-\u309F\u30A0-\u30FF]/.test(sample))) return 'zh';
    // Korean (Hangul)
    if (/[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(sample)) return 'ko';
    // Arabic
    if (/[\u0600-\u06FF\u0750-\u077F]/.test(sample)) return 'ar';
    // Cyrillic (Russian proxy)
    if (/[\u0400-\u04FF]/.test(sample)) return 'ru';
    // Spanish hints
    if (/[ñáéíóúü]/.test(sample.toLowerCase()) || /(\b(el|la|los|las|de|del|que|en|un|una|es|se|no|te|lo|le|da|su|por|son|con|para|al|todo|pero|más|hacer|muy|aquí|sido|está|hasta|donde)\b)/i.test(sample)) return 'es';
    // French
    if (/[àâäéèêëïîôùûüÿç]/.test(sample.toLowerCase()) || /(\b(le|la|les|de|des|du|et|en|un|une|il|elle|est|sont|avec|pour|par|sur|dans|mais|plus|tout|vous|nous|ils|elles|ce|cette|qui|que)\b)/i.test(sample)) return 'fr';
    // German
    if (/[äöüß]/.test(sample.toLowerCase()) || /(\b(der|die|das|den|dem|des|ein|eine|einen|einem|eines|und|in|zu|mit|auf|für|von|an|bei|nach|über|unter|durch|gegen|ohne|um|vor|hinter|neben)\b)/i.test(sample)) return 'de';
    return 'en';
  };

  PG.lang.getLanguageCode = function getLanguageCode(lang) {
    const languageMap = { en: 'en', es: 'es', ja: 'ja', fr: 'en', de: 'en', it: 'en', pt: 'en', ru: 'en', zh: 'en', ko: 'en', ar: 'en', hi: 'en' };
    return languageMap[lang] || 'en';
  };

  PG.lang.escapeHTML = function escapeHTML(s) {
    return String(s ?? '').replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; });
  };

  // Minimal allowlist-based HTML sanitizer for content we generate
  // Keeps only known safe tags and limited attributes.
  PG.lang.sanitizeHTML = function sanitizeHTML(html) {
    try {
      const allowedTags = new Set(['DIV','SPAN','STRONG','EM','UL','LI','BR','H3','H4']);
      const allowedAttrs = new Set(['class','title']);
      const doc = document.implementation.createHTMLDocument('san');
      const container = doc.createElement('div');
      container.innerHTML = String(html || '');
      const walk = (node) => {
        // Remove disallowed element nodes
        if (node.nodeType === 1) {
          const el = node;
          if (!allowedTags.has(el.tagName)) {
            const text = doc.createTextNode(el.textContent || '');
            el.parentNode && el.parentNode.replaceChild(text, el);
            return; // don't descend into replaced subtree
          }
          // Strip disallowed attributes
          for (const attr of Array.from(el.attributes)) {
            if (!allowedAttrs.has(attr.name)) el.removeAttribute(attr.name);
          }
        }
        // Recurse children safely (snapshot first)
        const children = Array.from(node.childNodes);
        for (const child of children) walk(child);
      };
      walk(container);
      return container.innerHTML;
    } catch (_){
      // On failure, return text-escaped fallback
      return PG.lang.escapeHTML(html);
    }
  };
})();
