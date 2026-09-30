/* WeBook — turns the book model into page faces (DOM). */
(function () {
  'use strict';

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /** Tiny, safe formatter: **bold**, *italic*, blank line = paragraph. */
  function formatBody(text) {
    const safe = escapeHtml(text || '');
    return safe
      .split(/\n{2,}/)
      .map((para) => para
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
        .replace(/\n/g, '<br>'))
      .filter((p) => p.trim())
      .map((p) => `<p class="readable">${p}</p>`)
      .join('');
  }

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }

  /**
   * Lays the book out as an even list of faces. Each paper leaf shows
   * faces[2i] on its front (right-hand side) and faces[2i+1] on its back.
   */
  function layout(book) {
    const faces = [{ type: 'cover' }, { type: 'toc' }];
    book.pages.forEach((page, i) => faces.push({ type: 'page', page, index: i }));
    if (faces.length % 2 === 0) faces.push({ type: 'end' });
    faces.push({ type: 'back' });
    faces.forEach((f, i) => { f.face = i; });
    return faces;
  }

  function coverFace(book) {
    const author = book.author ? `<p class="cover-author readable">${escapeHtml(book.author)}</p>` : '';
    return el(`
      <div class="page cover" style="--cover:${book.cover}">
        <div class="cover-frame">
          <div class="cover-ornament">❦</div>
          <h1 class="cover-title readable">${escapeHtml(book.title || 'Untitled')}</h1>
          <div class="cover-rule"></div>
          <p class="cover-subtitle readable">${escapeHtml(book.subtitle || '')}</p>
          ${author}
          <div class="cover-ornament bottom">❦</div>
        </div>
        <div class="cover-shine"></div>
        <div class="cover-hint">Open me ›</div>
      </div>`);
  }

  function backFace(book) {
    return el(`
      <div class="page cover back-cover" style="--cover:${book.cover}">
        <div class="back-emblem">📖</div>
        <p class="back-text readable">${escapeHtml(book.title || 'Untitled')}</p>
        <p class="back-small">Made with WeBook · ${book.pages.length} page${book.pages.length === 1 ? '' : 's'}</p>
        <div class="cover-shine"></div>
      </div>`);
  }

  function tocFace(book, faces) {
    const items = faces
      .filter((f) => f.type === 'page')
      .map((f) => `
        <li>
          <button type="button" class="toc-link" data-goto="${f.face}" data-no-flip>
            <span class="toc-title readable">${escapeHtml(f.page.title || 'Untitled page')}</span>
            <span class="toc-dots"></span>
            <span class="toc-num">${f.face}</span>
          </button>
        </li>`)
      .join('');
    const empty = `<p class="toc-empty">No pages yet.<br>Press <strong>＋ New Page</strong> to begin.</p>`;
    return el(`
      <div class="page theme-parchment font-serif toc-page">
        <div class="page-inner">
          <h2 class="page-title center readable">Contents</h2>
          <div class="title-flourish">~ ✦ ~</div>
          ${items ? `<ol class="toc">${items}</ol>` : empty}
          <button type="button" class="toc-add" data-action="new-page" data-no-flip>＋ Add a new page</button>
        </div>
        <div class="page-num">1</div>
      </div>`);
  }

  function pageFace(face) {
    const p = face.page;
    const img = p.image ? `<figure class="page-figure"><img src="${p.image}" alt=""></figure>` : '';
    const title = p.title ? `<h2 class="page-title readable">${escapeHtml(p.title)}</h2>` : '';
    return el(`
      <div class="page theme-${p.theme} font-${p.font} align-${p.align}" data-page-id="${escapeHtml(p.id)}">
        <div class="page-inner">
          ${title}
          ${img}
          <div class="page-body">${formatBody(p.body)}</div>
        </div>
        <div class="page-tools" data-no-flip>
          <button type="button" class="tool" data-read="${face.face}" title="Read this page aloud" aria-label="Read this page aloud">🔊</button>
          <button type="button" class="tool" data-edit="${escapeHtml(p.id)}" title="Edit page" aria-label="Edit page">✎</button>
          <button type="button" class="tool danger" data-delete="${escapeHtml(p.id)}" title="Delete page" aria-label="Delete page">✕</button>
        </div>
        <div class="page-num">${face.face}</div>
      </div>`);
  }

  function endFace(face) {
    return el(`
      <div class="page theme-classic font-serif end-page">
        <div class="page-inner">
          <div class="the-end readable">~ The End ~</div>
          <button type="button" class="toc-add" data-action="new-page" data-no-flip>＋ Keep writing</button>
        </div>
        <div class="page-num">${face.face}</div>
      </div>`);
  }

  /** Preview used by the page editor. */
  function previewFace(page) {
    return pageFace({ page: Object.assign({ id: 'preview' }, page), face: '' });
  }

  function renderFace(face, book, faces) {
    switch (face.type) {
      case 'cover': return coverFace(book);
      case 'toc': return tocFace(book, faces);
      case 'page': return pageFace(face);
      case 'end': return endFace(face);
      case 'back': return backFace(book);
      default: return el('<div class="page"></div>');
    }
  }

  window.WeBookRender = { layout, renderFace, previewFace, escapeHtml, formatBody };
})();
