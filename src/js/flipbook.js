/* WeBook — 3D page-flip engine.
 *
 * The book is a stack of paper "leaves" hinged on the spine. A leaf at 0deg
 * lies on the right showing its front face; at -180deg it lies on the left
 * showing its back face. `current` is the number of leaves turned over, so the
 * open spread shows the back of leaf current-1 (left) and the front of leaf
 * current (right).
 */
(function () {
  'use strict';

  const FX = () => window.WeBookFX;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  class FlipBook {
    constructor({ book, leaves, onChange }) {
      this.bookEl = book;
      this.leavesEl = leaves;
      this.onChange = onChange || (() => {});
      this.leaves = [];
      this.current = 0;
      this.anims = new Map();
      this.drag = null;
      this.peekLeaf = null;
      this._bindPointer();
    }

    get count() { return this.leaves.length; }
    get busy() { return this.anims.size > 0 || !!this.drag; }

    /** (Re)builds all leaves from an even list of face elements. */
    build(faceEls, current = this.current) {
      this.anims.forEach((a) => cancelAnimationFrame(a.raf));
      this.anims.clear();
      this.leavesEl.textContent = '';
      this.leaves = [];
      const n = faceEls.length / 2;
      for (let i = 0; i < n; i++) {
        const leaf = document.createElement('div');
        leaf.className = 'leaf';
        if (i === 0 || i === n - 1) leaf.classList.add('hard');
        leaf.dataset.index = i;
        leaf.append(this._face('front', faceEls[2 * i]), this._face('back', faceEls[2 * i + 1]));
        this.leavesEl.appendChild(leaf);
        this.leaves.push({ el: leaf, angle: 0, index: i });
      }
      this.current = clamp(current, 0, n);
      this.leaves.forEach((l) => this._setAngle(l, l.index < this.current ? -180 : 0));
      this._settle();
    }

    _face(side, content) {
      const face = document.createElement('div');
      face.className = 'face ' + side;
      face.appendChild(content);
      const shade = document.createElement('div');
      shade.className = 'shade';
      const gloss = document.createElement('div');
      gloss.className = 'gloss';
      const curl = document.createElement('div');
      curl.className = 'curl';
      face.append(shade, gloss, curl);
      return face;
    }

    // ------------------------------------------------------------ rendering
    _setAngle(leaf, angle) {
      leaf.angle = angle;
      const p = -angle / 180;                 // 0 → 1 over the turn
      const lift = Math.sin(p * Math.PI);     // 0 at rest, 1 when upright
      const el = leaf.el;
      // Slight lift and bend so the page looks like paper, not a card.
      el.style.transform =
        `rotateY(${angle}deg) translateZ(${lift * 6}px) skewY(${(angle > -90 ? 1 : -1) * lift * -1.2}deg)`;
      el.style.setProperty('--lift', lift.toFixed(3));
      el.style.setProperty('--front-shade', (p < 0.5 ? p * 1.1 : 0.55).toFixed(3));
      el.style.setProperty('--back-shade', (p > 0.5 ? (1 - p) * 1.1 : 0.55).toFixed(3));
      el.style.zIndex = this._z(leaf);
      // Only the face turned towards the reader may receive the mouse;
      // browsers otherwise hit-test the hidden face of a turned page.
      el.classList.toggle('on-left', angle < -90);
    }

    _z(leaf) {
      const n = this.count;
      const onLeft = leaf.angle < -90;
      const base = onLeft ? leaf.index + 1 : n - leaf.index;
      return this.anims.has(leaf.index) || (this.drag && this.drag.leaf === leaf) || this.peekLeaf === leaf
        ? base + n + 10
        : base;
    }

    /** Updates everything that depends on the resting state. */
    _settle() {
      const n = this.count;
      const c = this.current;
      this.bookEl.classList.toggle('at-front', c === 0);
      this.bookEl.classList.toggle('at-back', c === n);
      // Page-edge thickness follows the leaves that have actually landed.
      const landedLeft = this.leaves.filter((l) => l.angle <= -90).length;
      const landedRight = this.leaves.filter((l) => l.angle > -90).length;
      this.bookEl.style.setProperty('--left-stack', Math.min(Math.max(landedLeft - 1, 0), 14));
      this.bookEl.style.setProperty('--right-stack', Math.min(Math.max(landedRight - 1, 0), 14));
      this.leaves.forEach((l) => {
        l.el.style.zIndex = this._z(l);
        const front = l.el.children[0];
        const back = l.el.children[1];
        front.classList.toggle('visible', l.index === c);
        back.classList.toggle('visible', l.index === c - 1);
        front.setAttribute('aria-hidden', String(l.index !== c));
        back.setAttribute('aria-hidden', String(l.index !== c - 1));
      });
      this.onChange(this.current);
    }

    // ------------------------------------------------------------ animation
    _animate(leaf, to, duration, ease = easeInOut, quiet = false) {
      const prev = this.anims.get(leaf.index);
      if (prev) cancelAnimationFrame(prev.raf);
      const from = leaf.angle;
      if (from === to) {
        this.anims.delete(leaf.index);
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const start = performance.now();
        const anim = { raf: 0 };
        this.anims.set(leaf.index, anim);
        const step = (now) => {
          const t = clamp((now - start) / duration, 0, 1);
          this._setAngle(leaf, from + (to - from) * ease(t));
          if (t < 1) {
            anim.raf = requestAnimationFrame(step);
          } else {
            this.anims.delete(leaf.index);
            this._setAngle(leaf, to);
            if (!quiet) this._landed(to);
            this._settle();
            resolve();
          }
        };
        anim.raf = requestAnimationFrame(step);
      });
    }

    _spine() {
      const r = this.leavesEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, top: r.top, height: r.height, pageW: r.width / 2 };
    }

    _landed(angle) {
      const s = this._spine();
      FX().spineTrail(s.x, s.top, s.height, angle < -90 ? -1 : 1);
    }

    _turn(leaf, to, duration) {
      FX().pageSound(900 / duration);
      return this._animate(leaf, to, duration);
    }

    next(duration = 900) {
      if (this.drag || this.current >= this.count) return Promise.resolve(false);
      this.peekLeaf = null;
      const leaf = this.leaves[this.current];
      this.current++;
      this._settle();
      return this._turn(leaf, -180, duration).then(() => true);
    }

    prev(duration = 900) {
      if (this.drag || this.current <= 0) return Promise.resolve(false);
      this.peekLeaf = null;
      this.current--;
      const leaf = this.leaves[this.current];
      this._settle();
      return this._turn(leaf, 0, duration).then(() => true);
    }

    /** Riffles through several leaves with a staggered, overlapping flip. */
    goTo(target) {
      target = clamp(target, 0, this.count);
      if (this.drag || target === this.current) return Promise.resolve();
      this.peekLeaf = null;
      const dir = target > this.current ? 1 : -1;
      const steps = Math.abs(target - this.current);
      const duration = steps === 1 ? 900 : clamp(1100 - steps * 60, 520, 900);
      const stagger = steps === 1 ? 0 : clamp(420 / steps, 45, 140);
      const jobs = [];
      for (let k = 0; k < steps; k++) {
        const idx = dir > 0 ? this.current + k : this.current - 1 - k;
        const leaf = this.leaves[idx];
        jobs.push(new Promise((res) => {
          setTimeout(() => {
            if (k % 2 === 0 || steps < 4) FX().pageSound(900 / duration);
            this._animate(leaf, dir > 0 ? -180 : 0, duration).then(res);
          }, k * stagger);
        }));
      }
      this.current = target;
      this._settle();
      return Promise.all(jobs);
    }

    /** Shows the spread containing face index f. */
    goToFace(f) {
      return this.goTo(f % 2 === 0 ? f / 2 : (f + 1) / 2);
    }

    /** The DOM face (front or back of a leaf) that shows face index f. */
    faceElement(f) {
      const leaf = this.leaves[Math.floor(f / 2)];
      return leaf ? leaf.el.children[f % 2] : null;
    }

    jumpToFace(f) {
      const target = f % 2 === 0 ? f / 2 : (f + 1) / 2;
      this.leaves.forEach((l) => this._setAngle(l, l.index < target ? -180 : 0));
      this.current = clamp(target, 0, this.count);
      this._settle();
    }

    // -------------------------------------------------------------- pointer
    _bindPointer() {
      const book = this.bookEl;

      book.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button, a, input, textarea, select, [data-no-flip]')) return;
        const s = this._spine();
        const forward = e.clientX >= s.x;
        const idx = forward ? this.current : this.current - 1;
        const leaf = this.leaves[idx];
        if (!leaf) return;
        this._unpeek(true);
        const clickOnly = this.anims.has(idx);
        this.drag = {
          leaf, forward, clickOnly, id: e.pointerId,
          x0: e.clientX, r0: clamp((e.clientX - s.x) / s.pageW, -1, 1),
          lastX: e.clientX, lastT: performance.now(), vx: 0,
          moved: false, spine: s
        };
        book.setPointerCapture(e.pointerId);
        e.preventDefault();
      });

      book.addEventListener('pointermove', (e) => {
        const d = this.drag;
        if (!d) { this._maybePeek(e); return; }
        if (e.pointerId !== d.id || d.clickOnly) return;
        const now = performance.now();
        d.vx = (e.clientX - d.lastX) / Math.max(1, now - d.lastT);
        d.lastX = e.clientX;
        d.lastT = now;
        if (!d.moved && Math.abs(e.clientX - d.x0) < 6) return;
        if (!d.moved) {
          d.moved = true;
          book.classList.add('dragging');
          FX().pageSound(0.8);
        }
        const r = clamp((e.clientX - d.spine.x) / d.spine.pageW, -1, 1);
        let angle;
        if (d.forward) angle = -180 * clamp((d.r0 - r) / (d.r0 + 1 || 1), 0, 1);
        else angle = -180 + 180 * clamp((r - d.r0) / (1 - d.r0 || 1), 0, 1);
        this._setAngle(d.leaf, angle);
        this._tilt(d.leaf, e);
      });

      const end = (e) => {
        const d = this.drag;
        if (!d || e.pointerId !== d.id) return;
        this.drag = null;
        book.classList.remove('dragging');
        if (!d.moved) {
          // A simple click/tap turns the page.
          if (d.forward) this.next(); else this.prev();
          return;
        }
        const a = d.leaf.angle;
        const fling = Math.abs(d.vx) > 0.5;
        let commit;
        if (d.forward) commit = fling ? d.vx < 0 : a < -80;
        else commit = fling ? d.vx > 0 : a > -100;
        const to = d.forward === commit ? -180 : 0;
        const remaining = Math.abs(to - a) / 180;
        if (commit) {
          this.current += d.forward ? 1 : -1;
          this._settle();
        }
        this._animate(d.leaf, to, 250 + remaining * 550, easeOut);
      };
      book.addEventListener('pointerup', end);
      book.addEventListener('pointercancel', end);

      book.addEventListener('pointerleave', () => { if (!this.drag) this._unpeek(); });
    }

    /** Leans the page towards the pointer's height for a more natural drag. */
    _tilt(leaf, e) {
      const s = this.drag.spine;
      const y = clamp((e.clientY - s.top) / s.height, 0, 1);
      leaf.el.style.transform += ` rotateX(${(0.5 - y) * -6 * Math.sin((-leaf.angle / 180) * Math.PI)}deg)`;
    }

    /** Lifts the page corner a little when the pointer hovers near it. */
    _maybePeek(e) {
      if (this.anims.size || window.WeBookFX.reduceMotion) return;
      if (e.pointerType && e.pointerType !== 'mouse') return;
      const s = this._spine();
      const rightEdge = s.x + s.pageW;
      const leftEdge = s.x - s.pageW;
      const nearBottom = e.clientY > s.top + s.height * 0.72;
      let leaf = null;
      let angle = 0;
      if (nearBottom && e.clientX > rightEdge - s.pageW * 0.18 && this.current < this.count) {
        leaf = this.leaves[this.current];
        angle = -14;
      } else if (nearBottom && e.clientX < leftEdge + s.pageW * 0.18 && this.current > 0) {
        leaf = this.leaves[this.current - 1];
        angle = -166;
      }
      if (leaf === this.peekLeaf) return;
      this._unpeek();
      if (leaf) {
        this.peekLeaf = leaf;
        this._animate(leaf, angle, 260, easeOut, true);
      }
    }

    _unpeek(instant) {
      const leaf = this.peekLeaf;
      if (!leaf) return;
      this.peekLeaf = null;
      const rest = leaf.index < this.current ? -180 : 0;
      if (instant) {
        const a = this.anims.get(leaf.index);
        if (a) cancelAnimationFrame(a.raf);
        this.anims.delete(leaf.index);
        this._setAngle(leaf, rest);
      } else {
        this._animate(leaf, rest, 240, easeOut, true);
      }
    }
  }

  window.FlipBook = FlipBook;
})();
