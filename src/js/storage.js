/* WeBook — book model and persistence (localStorage + JSON files). */
(function () {
  'use strict';

  const KEY = 'webook.book.v1';
  const PREFS_KEY = 'webook.prefs.v1';

  const COVER_COLORS = [
    '#7a1f2b', // burgundy
    '#1f3a5f', // navy
    '#1f5130', // forest
    '#5b3a1e', // leather
    '#3d2a5c', // plum
    '#1d1d1f', // ebony
    '#8a5a13', // ochre
    '#23606e'  // teal
  ];

  function uid() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function samplePages() {
    const now = Date.now();
    return [
      {
        id: uid(), createdAt: now, theme: 'parchment', font: 'serif', align: 'justify', image: '',
        title: 'Welcome to your WeBook',
        body: 'This is a real flip-page book that lives on your computer — on **Windows**, **Ubuntu**, or any browser.\n\n' +
              'Grab the corner of a page and *drag* it across, click a page, or use the arrow keys to turn it.\n\n' +
              'Everything you write is saved automatically.'
      },
      {
        id: uid(), createdAt: now, theme: 'lined', font: 'hand', align: 'left', image: '',
        title: 'Create new pages',
        body: 'Press **＋ New Page** (or the N key) to open the page editor.\n\n' +
              'Pick a paper style, a font, add a picture, and watch the live preview. ' +
              'The book flips straight to your new page when you save it.'
      },
      {
        id: uid(), createdAt: now, theme: 'grid', font: 'sans', align: 'left', image: '',
        title: 'Little touches',
        body: '• Pages bend and cast shadows as they turn\n' +
              '• Sparkles fly from the spine\n' +
              '• Soft paper sounds (toggle with M)\n' +
              '• Night reading mode (D)\n' +
              '• Contents drawer to jump anywhere (T)'
      },
      {
        id: uid(), createdAt: now, theme: 'midnight', font: 'serif', align: 'center', image: '',
        title: 'Your story starts here',
        body: 'Hover over any page and use ✎ to edit it, or ✕ to remove it.\n\n' +
              'Export your book to a file to back it up or share it with a friend.'
      }
    ];
  }

  function defaultBook() {
    return {
      version: 1,
      title: 'My WeBook',
      subtitle: 'A book of my own',
      author: '',
      cover: COVER_COLORS[0],
      pages: samplePages()
    };
  }

  function sanitizePage(p) {
    const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
    const pick = (v, allowed, dflt) => (allowed.includes(v) ? v : dflt);
    return {
      id: typeof p.id === 'string' && p.id ? p.id : uid(),
      createdAt: Number(p.createdAt) || Date.now(),
      title: str(p.title, 120),
      body: str(p.body, 20000),
      image: typeof p.image === 'string' && p.image.startsWith('data:image/') ? p.image : '',
      theme: pick(p.theme, ['classic', 'parchment', 'lined', 'grid', 'rose', 'mint', 'midnight'], 'classic'),
      font: pick(p.font, ['serif', 'sans', 'hand', 'mono'], 'serif'),
      align: pick(p.align, ['left', 'justify', 'center'], 'left')
    };
  }

  function sanitizeBook(b) {
    if (!b || typeof b !== 'object' || !Array.isArray(b.pages)) {
      throw new Error('This file is not a WeBook book.');
    }
    const str = (v, max, d) => (typeof v === 'string' ? v.slice(0, max) : d);
    return {
      version: 1,
      title: str(b.title, 80, 'Untitled'),
      subtitle: str(b.subtitle, 120, ''),
      author: str(b.author, 80, ''),
      cover: /^#[0-9a-f]{6}$/i.test(b.cover) ? b.cover : COVER_COLORS[0],
      pages: b.pages.map(sanitizePage)
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return sanitizeBook(JSON.parse(raw));
    } catch (e) {
      console.warn('WeBook: could not load saved book', e);
    }
    return defaultBook();
  }

  /** Returns true on success, false when storage is full or unavailable. */
  function save(book) {
    try {
      localStorage.setItem(KEY, JSON.stringify(book));
      return true;
    } catch (e) {
      console.warn('WeBook: could not save book', e);
      return false;
    }
  }

  function loadPrefs() {
    try {
      return Object.assign({ sound: true, night: false }, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'));
    } catch (e) {
      return { sound: true, night: false };
    }
  }

  function savePrefs(prefs) {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
  }

  function exportFile(book) {
    const blob = new Blob([JSON.stringify(book, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safe = (book.title || 'webook').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'webook';
    a.href = url;
    a.download = safe + '.webook.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function importFile(file) {
    return file.text().then((text) => sanitizeBook(JSON.parse(text)));
  }

  /** Shrinks an uploaded picture so books stay small enough for localStorage. */
  function readImage(file, maxSide = 900) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        reject(new Error('Please choose an image file.'));
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('That image could not be read.'));
      };
      img.src = url;
    });
  }

  window.WeBookStore = {
    COVER_COLORS, uid, load, save, loadPrefs, savePrefs,
    defaultBook, sanitizePage, exportFile, importFile, readImage
  };
})();
