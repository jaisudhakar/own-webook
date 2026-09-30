/* WeBook — application wiring: toolbar, editor, settings, contents, keys. */
(function () {
  'use strict';

  const Store = window.WeBookStore;
  const Render = window.WeBookRender;
  const FX = window.WeBookFX;
  const $ = (id) => document.getElementById(id);

  const PAGE_RATIO = 1.38; // page height / width

  let book = Store.load();
  const prefs = Store.loadPrefs();
  let faces = [];

  const bookEl = $('book');
  const flip = new window.FlipBook({
    book: bookEl,
    leaves: $('leaves'),
    onChange: (c) => { updateIndicator(c); onPageChange(c); }
  });

  // ------------------------------------------------------------------ utils
  function toast(message, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind;
    t.textContent = message;
    $('toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  function persist() {
    if (!Store.save(book)) {
      toast('Could not save — storage is full. Try smaller pictures or export your book.', 'error');
      return false;
    }
    return true;
  }

  function openModal(id) {
    const m = $(id);
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    const first = m.querySelector('input, textarea, select');
    if (first) setTimeout(() => first.focus(), 60);
  }

  function closeModal(id) {
    const m = $(id);
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }

  function anyModalOpen() {
    return !!document.querySelector('.modal.open');
  }

  // ----------------------------------------------------------------- sizing
  function fitBook() {
    document.documentElement.style.setProperty('--toolbar-h', document.querySelector('.toolbar').offsetHeight + 'px');
    const stage = $('stage');
    const availW = stage.clientWidth - 48;
    const availH = stage.clientHeight - 56;
    const pw = Math.max(140, Math.floor(Math.min(availW / 2, availH / PAGE_RATIO)));
    const ph = Math.floor(pw * PAGE_RATIO);
    bookEl.style.setProperty('--pw', pw + 'px');
    bookEl.style.setProperty('--ph', ph + 'px');
    bookEl.style.setProperty('--fs', (pw / 26).toFixed(2) + 'px');
  }

  // --------------------------------------------------------------- building
  function rebuild(current) {
    faces = Render.layout(book);
    const els = faces.map((f) => Render.renderFace(f, book, faces));
    flip.build(els, current);
    $('brandTitle').textContent = book.title || 'WeBook';
    document.title = (book.title || 'WeBook') + ' — WeBook';
    renderToc();
    updateIndicator(flip.current);
  }

  function updateIndicator(c) {
    const n = flip.count;
    let text;
    if (c === 0) text = 'Cover';
    else if (c === n) text = 'Back cover';
    else {
      const left = 2 * c - 1;
      const right = 2 * c;
      text = right >= faces.length - 1 ? `Page ${left}` : `Pages ${left}–${right}`;
    }
    $('pageIndicator').textContent = text + (c > 0 && c < n ? ` of ${faces.length - 2}` : '');
    $('btnPrev').disabled = $('btnFirst').disabled = c === 0;
    $('btnNext').disabled = $('btnLast').disabled = c === n;
    document.querySelectorAll('.toc-list .toc-link').forEach((b) => {
      const f = Number(b.dataset.goto);
      b.classList.toggle('active', f === 2 * c - 1 || f === 2 * c);
    });
  }

  function renderToc() {
    const list = $('tocList');
    list.textContent = '';
    const items = [{ face: 0, title: 'Front cover' }, { face: 1, title: 'Contents' }]
      .concat(faces.filter((f) => f.type === 'page').map((f) => ({
        face: f.face, title: f.page.title || 'Untitled page', theme: f.page.theme
      })))
      .concat([{ face: faces.length - 1, title: 'Back cover' }]);
    items.forEach((it, i) => {
      const li = document.createElement('li');
      li.style.setProperty('--i', i);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'toc-link' + (it.theme ? ' swatch-' + it.theme : '');
      b.dataset.goto = it.face;
      const t = document.createElement('span');
      t.className = 'toc-title';
      t.textContent = it.title;
      const num = document.createElement('span');
      num.className = 'toc-num';
      num.textContent = it.face === 0 || it.face === faces.length - 1 ? '' : it.face;
      b.append(t, num);
      li.appendChild(b);
      list.appendChild(li);
    });
  }

  // ------------------------------------------------------------ navigation
  let hintHidden = false;
  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    $('hint').classList.add('gone');
  }

  function go(action) {
    hideHint();
    switch (action) {
      case 'next': return flip.next();
      case 'prev': return flip.prev();
      case 'first': return flip.goTo(0);
      case 'last': return flip.goTo(flip.count);
      default: return Promise.resolve();
    }
  }

  function goToFace(f) {
    hideHint();
    return flip.goToFace(f);
  }

  // ---------------------------------------------------------------- editor
  let editing = null;    // page id when editing, null when creating
  let draftImage = '';

  function readForm() {
    return {
      title: $('fTitle').value.trim(),
      body: $('fBody').value,
      theme: $('fTheme').value,
      font: $('fFont').value,
      align: $('fAlign').value,
      image: draftImage
    };
  }

  function updatePreview() {
    const host = $('previewPage');
    host.textContent = '';
    const page = Store.sanitizePage(readForm());
    if (!page.title && !page.body && !page.image) {
      page.title = 'Your title';
      page.body = 'Start typing and your page appears here…';
    }
    host.appendChild(Render.previewFace(page));
  }

  function openEditor(pageId) {
    const page = pageId ? book.pages.find((p) => p.id === pageId) : null;
    editing = page ? page.id : null;
    $('editorTitle').textContent = page ? 'Edit Page' : 'Create a New Page';
    $('btnSavePage').textContent = page ? 'Save Changes' : 'Add Page';
    $('btnDeletePage').hidden = !page;
    $('fPositionWrap').hidden = !!page;
    $('fTitle').value = page ? page.title : '';
    $('fBody').value = page ? page.body : '';
    $('fTheme').value = page ? page.theme : 'classic';
    $('fFont').value = page ? page.font : 'serif';
    $('fAlign').value = page ? page.align : 'left';
    $('fImage').value = '';
    draftImage = page ? page.image : '';
    $('fPosition').value = flip.current > 0 && flip.current < flip.count ? 'current' : 'end';
    updatePreview();
    openModal('editorModal');
  }

  /** Index (in book.pages) right after the content page currently open. */
  function insertIndexAtReader() {
    const c = flip.current;
    for (const f of [2 * c, 2 * c - 1]) {
      const face = faces[f];
      if (face && face.type === 'page') return face.index + 1;
    }
    return c >= flip.count - 1 ? book.pages.length : 0;
  }

  function celebrate(pageId) {
    const target = bookEl.querySelector(`.page[data-page-id="${CSS.escape(pageId)}"]`);
    if (!target) return;
    target.classList.remove('fresh');
    void target.offsetWidth;
    target.classList.add('fresh');
    const r = target.getBoundingClientRect();
    FX.confetti(r.left + r.width / 2, r.top + r.height * 0.35);
    FX.chime();
    setTimeout(() => target.classList.remove('fresh'), 2200);
  }

  function savePage(e) {
    e.preventDefault();
    const data = readForm();
    if (!data.title && !data.body.trim() && !data.image) {
      toast('Write a title, some text or add a picture first.', 'error');
      $('fTitle').focus();
      return;
    }
    const keep = flip.current;
    let page;
    if (editing) {
      const idx = book.pages.findIndex((p) => p.id === editing);
      page = Store.sanitizePage(Object.assign({}, book.pages[idx], data));
      book.pages[idx] = page;
    } else {
      page = Store.sanitizePage(Object.assign({ id: Store.uid(), createdAt: Date.now() }, data));
      const pos = $('fPosition').value;
      const at = pos === 'start' ? 0 : pos === 'end' ? book.pages.length : insertIndexAtReader();
      book.pages.splice(at, 0, page);
    }
    if (!persist()) return;
    closeModal('editorModal');
    rebuild(keep);
    const face = faces.find((f) => f.type === 'page' && f.page.id === page.id);
    const wasEditing = !!editing;
    goToFace(face.face).then(() => {
      if (wasEditing) toast('Page saved ✓');
      else { celebrate(page.id); toast('New page added ✓'); }
    });
  }

  function deletePage(pageId) {
    const idx = book.pages.findIndex((p) => p.id === pageId);
    if (idx < 0) return;
    const title = book.pages[idx].title || 'this page';
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    const pageEl = bookEl.querySelector(`.page[data-page-id="${CSS.escape(pageId)}"]`);
    const finish = () => {
      book.pages.splice(idx, 1);
      persist();
      closeModal('editorModal');
      rebuild(flip.current);
      FX.pageSound(1.4);
      toast('Page deleted');
    };
    if (pageEl && !FX.reduceMotion) {
      const r = pageEl.getBoundingClientRect();
      FX.poof(r.left + r.width / 2, r.top + r.height / 2);
      pageEl.classList.add('vanish');
      setTimeout(finish, 520);
    } else {
      finish();
    }
  }

  $('editorForm').addEventListener('submit', savePage);
  $('editorForm').addEventListener('input', (e) => { if (e.target.id !== 'fImage') updatePreview(); });
  $('editorForm').addEventListener('change', (e) => { if (e.target.tagName === 'SELECT') updatePreview(); });
  $('fImage').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Store.readImage(file)
      .then((dataUrl) => { draftImage = dataUrl; updatePreview(); })
      .catch((err) => toast(err.message, 'error'));
  });
  $('fImageClear').addEventListener('click', () => {
    draftImage = '';
    $('fImage').value = '';
    updatePreview();
  });
  $('btnDeletePage').addEventListener('click', () => { if (editing) deletePage(editing); });

  // --------------------------------------------------------------- settings
  let draftCover = book.cover;
  function renderSwatches() {
    const host = $('sCover');
    host.textContent = '';
    Store.COVER_COLORS.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch' + (c === draftCover ? ' selected' : '');
      b.style.background = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(c === draftCover));
      b.setAttribute('aria-label', 'Cover colour ' + c);
      b.addEventListener('click', () => { draftCover = c; renderSwatches(); });
      host.appendChild(b);
    });
  }

  function openSettings() {
    $('sTitle').value = book.title;
    $('sSubtitle').value = book.subtitle;
    $('sAuthor').value = book.author;
    draftCover = book.cover;
    renderSwatches();
    fillVoices();
    $('sRate').value = prefs.rate || 1;
    showRate($('sRate').value);
    openModal('settingsModal');
  }

  $('settingsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    book.title = $('sTitle').value.trim() || 'Untitled';
    book.subtitle = $('sSubtitle').value.trim();
    book.author = $('sAuthor').value.trim();
    book.cover = draftCover;
    persist();
    closeModal('settingsModal');
    rebuild(flip.current);
    toast('Book updated ✓');
  });

  $('btnResetBook').addEventListener('click', () => {
    if (!window.confirm('Start a brand-new book? Your current book will be replaced (export it first to keep a copy).')) return;
    book = Store.defaultBook();
    book.pages = [];
    persist();
    closeModal('settingsModal');
    rebuild(0);
    toast('Fresh book ready — add your first page!');
  });

  // ---------------------------------------------------------------- drawer
  function toggleToc(force) {
    const d = $('tocDrawer');
    const open = force === undefined ? !d.classList.contains('open') : force;
    d.classList.toggle('open', open);
    d.setAttribute('aria-hidden', String(!open));
  }

  $('tocList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-goto]');
    if (!b) return;
    goToFace(Number(b.dataset.goto));
    if (window.innerWidth < 900) toggleToc(false);
  });

  // ------------------------------------------------------ in-page buttons
  bookEl.addEventListener('click', (e) => {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.read) readFrom(Number(t.dataset.read));
    else if (t.dataset.goto) goToFace(Number(t.dataset.goto));
    else if (t.dataset.edit) openEditor(t.dataset.edit);
    else if (t.dataset.delete) deletePage(t.dataset.delete);
    else if (t.dataset.action === 'new-page') openEditor(null);
  });

  // ------------------------------------------------------------- read aloud
  const Reader = window.WeBookReader;
  const isLinux = /Linux/i.test(navigator.userAgent) && !/Android/i.test(navigator.userAgent);
  const NO_VOICES = isLinux
    ? 'No voices found. On Ubuntu install them with: sudo apt install speech-dispatcher espeak-ng'
    : 'No text-to-speech voices are installed on this system.';
  let hoverRead = false;
  let hoverEl = null;
  let hoverTimer = 0;
  let readToken = 0;
  let readerFlipping = false;
  let lastSpread = 0;

  function stopReading() {
    readToken++;
    Reader.stop();
  }

  /** Stop reading when the reader turns the page by hand. */
  function onPageChange(c) {
    if (c !== lastSpread && !readerFlipping) stopReading();
    lastSpread = c;
  }

  function checkSupport() {
    if (Reader.supported) return true;
    toast('Read aloud is not supported here. Try Chrome, Edge or Firefox.', 'error');
    return false;
  }

  function warnIfNoVoices() {
    setTimeout(() => { if (!Reader.voices().length) toast(NO_VOICES, 'error'); }, 1200);
  }

  function setHoverRead(on) {
    if (on && !checkSupport()) return;
    hoverRead = on;
    document.body.classList.toggle('reader-on', on);
    $('btnRead').classList.toggle('active', on);
    $('btnRead').setAttribute('aria-pressed', String(on));
    if (!on) {
      clearTimeout(hoverTimer);
      hoverEl = null;
      stopReading();
    }
  }

  function toggleHoverRead() {
    setHoverRead(!hoverRead);
    if (!Reader.supported) return;
    toast(hoverRead ? '🗣 Read aloud is on. Hover over any text to hear it.' : 'Read aloud is off');
    if (hoverRead) warnIfNoVoices();
  }

  // Hovering over a title or paragraph reads it after a short pause.
  bookEl.addEventListener('pointerover', (e) => {
    if (!hoverRead || e.pointerType === 'touch' || flip.busy) return;
    const el = e.target.closest('.face.visible .readable');
    if (!el || el === hoverEl) return;
    hoverEl = el;
    clearTimeout(hoverTimer);
    if (el === Reader.speakingElement) return;
    hoverTimer = setTimeout(() => {
      if (hoverEl !== el || !hoverRead || flip.busy) return;
      readToken++;
      Reader.speak([el]);
    }, 350);
  });

  bookEl.addEventListener('pointerout', (e) => {
    const el = e.target.closest && e.target.closest('.readable');
    if (!el || el !== hoverEl || el.contains(e.relatedTarget)) return;
    hoverEl = null;
    clearTimeout(hoverTimer);
  });

  /** Reads from face f onwards, turning pages like an audiobook. */
  async function readFrom(f) {
    if (!checkSupport()) return;
    const token = ++readToken;
    while (f < faces.length && faces[f].type !== 'back') {
      const spread = f % 2 === 0 ? f / 2 : (f + 1) / 2;
      if (flip.current !== spread) {
        readerFlipping = true;
        await flip.goToFace(f);
        readerFlipping = false;
        if (token !== readToken) return;
      }
      const els = Array.from(flip.faceElement(f).querySelectorAll('.readable'));
      if (els.length && !(await Reader.speak(els))) return;
      if (token !== readToken) return;
      f++;
    }
    toast('Finished reading 📖');
  }

  function readCurrentPage() {
    const c = flip.current;
    readFrom(c === 0 ? 0 : Math.min(2 * c - 1, faces.length - 1));
  }

  Reader.onChange((state) => {
    const bar = $('readerBar');
    bar.classList.toggle('show', state.speaking);
    bar.classList.toggle('paused', state.paused);
    $('readerText').textContent = state.text.length > 70 ? state.text.slice(0, 68) + '…' : state.text;
    $('btnReadPause').textContent = state.paused ? '▶' : '⏸';
  });
  $('btnReadPause').addEventListener('click', () => Reader.togglePause());
  $('btnReadStop').addEventListener('click', stopReading);

  // voice settings
  function fillVoices() {
    const sel = $('sVoice');
    const list = Reader.voices().slice().sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
    sel.textContent = '';
    $('voiceNote').textContent = Reader.supported ? (list.length ? '' : NO_VOICES) : 'Read aloud is not supported here.';
    if (!list.length) {
      sel.add(new Option('System default', ''));
      sel.disabled = true;
      return;
    }
    sel.disabled = false;
    list.forEach((v) => sel.add(new Option(`${v.name} (${v.lang})`, v.voiceURI)));
    sel.value = Reader.voiceURI;
  }

  function showRate(r) {
    $('sRateValue').textContent = Number(r).toFixed(1) + '×';
  }

  $('sVoice').addEventListener('change', (e) => {
    Reader.setVoice(e.target.value);
    prefs.voice = e.target.value;
    Store.savePrefs(prefs);
  });
  $('sRate').addEventListener('input', (e) => {
    Reader.setRate(e.target.value);
    prefs.rate = Number(e.target.value);
    showRate(e.target.value);
    Store.savePrefs(prefs);
  });
  $('btnVoiceTest').addEventListener('click', () => {
    if (!checkSupport()) return;
    const sample = document.createElement('span');
    sample.textContent = `Hello! This is how "${book.title || 'your book'}" will sound when it is read aloud.`;
    readToken++;
    Reader.speak([sample]);
  });
  Reader.onVoicesChanged(() => {
    if ($('settingsModal').classList.contains('open')) fillVoices();
  });

  // --------------------------------------------------------------- toolbar
  function setSound(on) {
    prefs.sound = on;
    FX.setSound(on);
    $('btnSound').textContent = on ? '🔊' : '🔈';
    $('btnSound').classList.toggle('off', !on);
    Store.savePrefs(prefs);
  }

  function setNight(on) {
    prefs.night = on;
    document.body.classList.toggle('night', on);
    $('btnTheme').textContent = on ? '☀' : '🌙';
    Store.savePrefs(prefs);
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  }

  function doExport() {
    Store.exportFile(book);
    toast('Book exported ✓');
  }

  function doImport() {
    $('importInput').click();
  }

  $('importInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    Store.importFile(file)
      .then((imported) => {
        book = imported;
        if (!persist()) return;
        rebuild(0);
        toast(`Imported "${book.title}" ✓`);
      })
      .catch((err) => toast('Import failed: ' + err.message, 'error'));
  });

  const actions = {
    'new-page': () => openEditor(null),
    settings: openSettings,
    export: doExport,
    import: doImport,
    toc: () => toggleToc(),
    theme: () => setNight(!prefs.night),
    sound: () => setSound(!prefs.sound),
    fullscreen: toggleFullscreen,
    read: toggleHoverRead,
    'read-page': readCurrentPage,
    'stop-reading': stopReading,
    next: () => go('next'),
    prev: () => go('prev'),
    first: () => go('first'),
    last: () => go('last')
  };

  const buttons = {
    btnFirst: 'first', btnPrev: 'prev', btnNext: 'next', btnLast: 'last',
    btnNew: 'new-page', btnToc: 'toc', btnSettings: 'settings', btnSound: 'sound', btnRead: 'read',
    btnTheme: 'theme', btnExport: 'export', btnImport: 'import', btnFullscreen: 'fullscreen'
  };
  Object.keys(buttons).forEach((id) => {
    $(id).addEventListener('click', () => actions[buttons[id]]());
  });

  document.querySelectorAll('[data-close]').forEach((b) => {
    b.addEventListener('click', () => {
      const id = b.dataset.close;
      if (id === 'tocDrawer') toggleToc(false); else closeModal(id);
    });
  });
  document.querySelectorAll('.modal').forEach((m) => {
    m.addEventListener('mousedown', (e) => { if (e.target === m) closeModal(m.id); });
  });

  // -------------------------------------------------------------- keyboard
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!anyModalOpen() && Reader.speakingElement) stopReading();
      document.querySelectorAll('.modal.open').forEach((m) => closeModal(m.id));
      toggleToc(false);
      return;
    }
    const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (typing || anyModalOpen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const map = {
      ArrowRight: 'next', PageDown: 'next', ' ': 'next',
      ArrowLeft: 'prev', PageUp: 'prev',
      Home: 'first', End: 'last',
      n: 'new-page', N: 'new-page',
      t: 'toc', T: 'toc',
      m: 'sound', M: 'sound',
      d: 'theme', D: 'theme',
      f: 'fullscreen', F: 'fullscreen',
      r: 'read', R: 'read',
      l: 'read-page', L: 'read-page'
    };
    const action = map[e.key];
    if (action) {
      e.preventDefault();
      actions[action]();
    }
  });

  // ------------------------------------------------------- desktop menus
  if (window.webookDesktop) {
    document.body.classList.add('desktop', 'os-' + window.webookDesktop.platform);
    window.webookDesktop.onMenuAction((action) => {
      if (anyModalOpen() && !['theme', 'sound', 'stop-reading'].includes(action)) return;
      if (actions[action]) actions[action]();
    });
  }

  // ------------------------------------------------------------------ boot
  window.addEventListener('resize', fitBook);
  setNight(!!prefs.night);
  setSound(prefs.sound !== false);
  Reader.setVoice(prefs.voice || '');
  Reader.setRate(prefs.rate || 1);
  $('readerBar').hidden = false;
  fitBook();
  rebuild(0);
  requestAnimationFrame(() => document.body.classList.add('ready'));
})();
