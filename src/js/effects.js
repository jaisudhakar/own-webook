/* WeBook — extra animation: ambient dust, sparkles, confetti and paper sounds. */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- particles
  const canvas = document.getElementById('fx');
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const particles = [];
  const dust = [];
  let running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function seedDust() {
    dust.length = 0;
    if (reduceMotion) return;
    const count = Math.round(Math.min(60, (W * H) / 28000));
    for (let i = 0; i < count; i++) {
      dust.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.6 + Math.random() * 1.8,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.05 - Math.random() * 0.15,
        phase: Math.random() * Math.PI * 2,
        a: 0.15 + Math.random() * 0.35
      });
    }
  }

  function drawStar(x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rad = i % 2 === 0 ? r : r * 0.38;
      const ang = rot + (i * Math.PI) / 4;
      ctx.lineTo(x + Math.cos(ang) * rad, y + Math.sin(ang) * rad);
    }
    ctx.closePath();
    ctx.fill();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(50, now - last) / 16.67;
    last = now;
    ctx.clearRect(0, 0, W, H);

    const night = document.body.classList.contains('night');
    for (const d of dust) {
      d.phase += 0.01 * dt;
      d.x += (d.vx + Math.sin(d.phase) * 0.08) * dt;
      d.y += d.vy * dt;
      if (d.y < -5) { d.y = H + 5; d.x = Math.random() * W; }
      if (d.x < -5) d.x = W + 5;
      if (d.x > W + 5) d.x = -5;
      const tw = 0.6 + Math.sin(d.phase * 3) * 0.4;
      ctx.fillStyle = night
        ? `rgba(180, 200, 255, ${d.a * tw})`
        : `rgba(255, 228, 170, ${d.a * tw})`;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      const alpha = Math.min(1, p.life / p.fade);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      if (p.kind === 'star') {
        drawStar(p.x, p.y, p.size, p.rot);
      } else if (p.kind === 'confetti') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, Math.cos(p.rot * 2.3));
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (running) requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  const SPARKLE_COLORS = ['#ffd86b', '#fff3c4', '#ffb347', '#ffffff'];
  const CONFETTI_COLORS = ['#ff5e7e', '#ffd166', '#06d6a0', '#4cc9f0', '#b388ff', '#ff9f1c'];

  /** Golden sparkles bursting out of a point (used when a page lands). */
  function sparkle(x, y, count = 18, direction = 0) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.2;
      particles.push({
        kind: Math.random() < 0.6 ? 'star' : 'dot',
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 40,
        vx: Math.cos(ang) * speed + direction * 1.5,
        vy: Math.sin(ang) * speed - 1,
        g: 0.03, drag: 0.97,
        size: 1.5 + Math.random() * 3.5,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
        color: SPARKLE_COLORS[(Math.random() * SPARKLE_COLORS.length) | 0],
        life: 40 + Math.random() * 40, fade: 25
      });
    }
  }

  /** A shower of sparkles running down the book's spine. */
  function spineTrail(x, top, height, direction) {
    if (reduceMotion) return;
    for (let i = 0; i < 26; i++) {
      sparkle(x, top + Math.random() * height, 1, direction);
    }
  }

  /** Confetti celebration (used when a new page is created). */
  function confetti(x, y, count = 110) {
    if (reduceMotion) return;
    for (let i = 0; i < count; i++) {
      const ang = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
      const speed = 4 + Math.random() * 7;
      particles.push({
        kind: 'confetti',
        x, y,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        g: 0.16, drag: 0.985,
        size: 6 + Math.random() * 6,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.35,
        color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        life: 90 + Math.random() * 60, fade: 30
      });
    }
  }

  /** Small puff of paper dust (used when a page is deleted). */
  function poof(x, y) {
    if (reduceMotion) return;
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2.5;
      particles.push({
        kind: 'dot', x, y,
        vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed - 0.6,
        g: -0.01, drag: 0.96,
        size: 2 + Math.random() * 5, rot: 0, vr: 0,
        color: 'rgba(230, 220, 200, 0.8)',
        life: 50 + Math.random() * 30, fade: 40
      });
    }
  }

  // --------------------------------------------------------------------- sound
  let audioCtx = null;
  let soundOn = true;
  let noiseBuffer = null;

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      const len = audioCtx.sampleRate * 1;
      noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      // Brown-ish noise sounds more like paper than white noise.
      let lastOut = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        lastOut = (lastOut + 0.06 * white) / 1.06;
        data[i] = lastOut * 3.2 + white * 0.25;
      }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }

  /** Synthesised paper "fwip" — no audio files needed. */
  function pageSound(speed = 1) {
    if (!soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    const dur = 0.42 / speed;

    const src = ac.createBufferSource();
    src.buffer = noiseBuffer;
    src.playbackRate.value = 0.9 + Math.random() * 0.3;

    const band = ac.createBiquadFilter();
    band.type = 'bandpass';
    band.Q.value = 0.9;
    band.frequency.setValueAtTime(900, t);
    band.frequency.exponentialRampToValueAtTime(3800, t + dur * 0.55);
    band.frequency.exponentialRampToValueAtTime(1400, t + dur);

    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + dur * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.12, t + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    src.connect(band).connect(gain).connect(ac.destination);
    src.start(t, Math.random() * 0.4);
    src.stop(t + dur + 0.05);

    // soft "thump" as the page lands
    const osc = ac.createOscillator();
    const og = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t + dur * 0.85);
    osc.frequency.exponentialRampToValueAtTime(60, t + dur + 0.08);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.setValueAtTime(0.0001, t + dur * 0.85);
    og.gain.exponentialRampToValueAtTime(0.08, t + dur * 0.9);
    og.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    osc.connect(og).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.15);
  }

  /** Little bell chime for a newly created page. */
  function chime() {
    if (!soundOn) return;
    const ac = ensureAudio();
    if (!ac) return;
    const t = ac.currentTime;
    [880, 1318.5, 1760].forEach((f, i) => {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + i * 0.08);
      g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.08 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.08 + 0.7);
      o.connect(g).connect(ac.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.75);
    });
  }

  window.addEventListener('resize', () => { resize(); seedDust(); });
  resize();
  seedDust();
  start();

  window.WeBookFX = {
    reduceMotion,
    sparkle, spineTrail, confetti, poof,
    pageSound, chime,
    setSound(on) { soundOn = !!on; },
    get soundOn() { return soundOn; }
  };
})();
