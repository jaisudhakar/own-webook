/* WeBook — read aloud with the system's text-to-speech voices.
 *
 * Uses the Web Speech API, which talks to the voices already installed on the
 * computer: SAPI/OneCore voices on Windows, speech-dispatcher (espeak-ng etc.)
 * on Ubuntu. Nothing is downloaded and no internet connection is needed.
 */
(function () {
  'use strict';

  const synth = window.speechSynthesis;
  const supported = !!synth && typeof window.SpeechSynthesisUtterance === 'function';
  const MAX_CHUNK = 220; // some voices stop after ~15s, so long text is spoken in pieces

  // Word-by-word highlight via the CSS Custom Highlight API when available.
  const wordHighlight = window.Highlight && window.CSS && CSS.highlights ? new window.Highlight() : null;
  if (wordHighlight) CSS.highlights.set('webook-word', wordHighlight);

  let voiceURI = '';
  let rate = 1;
  let session = 0;
  let currentEl = null;
  let paused = false;
  let listener = () => {};

  function voices() {
    return supported ? synth.getVoices() : [];
  }

  function pickVoice() {
    const all = voices();
    const lang = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return all.find((v) => v.voiceURI === voiceURI) ||
      all.find((v) => v.default && v.lang.toLowerCase().startsWith(lang)) ||
      all.find((v) => v.lang.toLowerCase().startsWith(lang)) ||
      all.find((v) => v.default) ||
      all[0] || null;
  }

  /**
   * Flattens an element to plain text while remembering which text node each
   * character came from, so spoken word positions can be highlighted.
   */
  function flatten(el) {
    const segments = [];
    let text = '';
    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        segments.push({ node, start: text.length });
        text += node.data;
      } else if (node.nodeName === 'BR') {
        text += '\n';
      } else if (node.nodeType === Node.ELEMENT_NODE && !node.matches('button, .page-tools')) {
        node.childNodes.forEach(walk);
      }
    };
    walk(el);
    return { text, segments };
  }

  function chunk(text) {
    const chunks = [];
    const re = /[^.!?;:\n]+[.!?;:\n]*\s*/g;
    let buf = '';
    let bufStart = 0;
    let m;
    while ((m = re.exec(text))) {
      if (buf && buf.length + m[0].length > MAX_CHUNK) {
        chunks.push({ text: buf, offset: bufStart });
        buf = '';
      }
      if (!buf) bufStart = m.index;
      buf += m[0];
    }
    if (buf) chunks.push({ text: buf, offset: bufStart });
    return chunks.filter((c) => c.text.trim());
  }

  function highlightWord(flat, index, length) {
    if (!wordHighlight) return;
    wordHighlight.clear();
    if (!length) {
      const m = /^[\p{L}\p{N}'’-]+/u.exec(flat.text.slice(index));
      length = m ? m[0].length : 0;
    }
    if (!length) return;
    const end = index + length;
    for (let i = flat.segments.length - 1; i >= 0; i--) {
      const seg = flat.segments[i];
      if (seg.start <= index) {
        const localStart = index - seg.start;
        const localEnd = Math.min(end - seg.start, seg.node.data.length);
        if (localEnd <= localStart) return;
        const r = document.createRange();
        r.setStart(seg.node, localStart);
        r.setEnd(seg.node, localEnd);
        wordHighlight.add(r);
        return;
      }
    }
  }

  function setCurrent(el) {
    if (currentEl) currentEl.classList.remove('speaking');
    currentEl = el;
    if (el) el.classList.add('speaking');
    if (wordHighlight) wordHighlight.clear();
    emit();
  }

  function emit() {
    listener({
      speaking: !!currentEl,
      paused,
      text: currentEl ? currentEl.textContent.trim() : ''
    });
  }

  function speakChunk(c, flat, sid) {
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(c.text);
      const voice = pickVoice();
      if (voice) {
        try { u.voice = voice; u.lang = voice.lang; } catch (e) { /* fall back to the default voice */ }
      }
      u.rate = rate;
      u.onboundary = (e) => {
        if (sid === session && e.name === 'word') highlightWord(flat, c.offset + e.charIndex, e.charLength);
      };
      u.onend = () => resolve(sid === session);
      u.onerror = () => resolve(sid === session);
      synth.speak(u);
    });
  }

  /**
   * Reads the given elements one after another.
   * Resolves true when everything was read, false if it was stopped.
   */
  async function speak(elements) {
    if (!supported) return false;
    const sid = stop(true);
    // Chrome sometimes drops an utterance queued right after cancel().
    await new Promise((r) => setTimeout(r, 60));
    for (const el of elements) {
      if (sid !== session) return false;
      const flat = flatten(el);
      const chunks = chunk(flat.text);
      if (!chunks.length) continue;
      setCurrent(el);
      for (const c of chunks) {
        const ok = await speakChunk(c, flat, sid);
        if (!ok) return false;
      }
    }
    if (sid !== session) return false;
    setCurrent(null);
    return true;
  }

  /** Stops speaking. Returns the new session id. */
  function stop(silent) {
    session++;
    paused = false;
    if (supported) synth.cancel();
    if (currentEl) currentEl.classList.remove('speaking');
    currentEl = null;
    if (wordHighlight) wordHighlight.clear();
    if (!silent) emit();
    return session;
  }

  function togglePause() {
    if (!supported || !currentEl) return;
    if (paused) synth.resume(); else synth.pause();
    paused = !paused;
    emit();
  }

  window.WeBookReader = {
    supported,
    voices,
    speak,
    stop,
    togglePause,
    get speakingElement() { return currentEl; },
    get paused() { return paused; },
    get voiceURI() { return (pickVoice() || {}).voiceURI || ''; },
    setVoice(uri) { voiceURI = uri || ''; },
    setRate(r) { rate = Math.min(2, Math.max(0.5, Number(r) || 1)); },
    onChange(fn) { listener = fn; },
    onVoicesChanged(fn) {
      if (supported && synth.addEventListener) synth.addEventListener('voiceschanged', fn);
    }
  };
})();
