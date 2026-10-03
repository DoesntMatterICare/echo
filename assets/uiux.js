// =====================================================================
//  UI / UX — message queue, light targets, damage arcs, pause menu & settings
// =====================================================================
// ---------- settings (saved per browser) ----------
const SET = { master: .85, sfx: 1, voice: 1, shake: 1 };
try { Object.assign(SET, JSON.parse(localStorage.getItem('echo_settings') || '{}')); } catch (e) {}
function saveSettings() { try { localStorage.setItem('echo_settings', JSON.stringify(SET)); } catch (e) {} }
function applyVolume() {
  if (!AU.ctx) return;
  AU.master.gain.value = AU.muted ? 0 : SET.master;
  if (AU.sfxVol) AU.sfxVol.gain.value = SET.sfx;
  if (AU.voVol) AU.voVol.gain.value = SET.voice;
}

// ---------- centre-message queue: one callout at a time, never over the level title ----------
const introUp = () => state === 'playing' && time < 4.2;
callout = function (text, sub, col, big) {
  const c = { text, sub: sub || '', col: col ?? 0, big: !!big };
  const q = MS.callQ || (MS.callQ = []);
  if ((MS.call && MS.call.text === text) || q.some(o => o.text === text)) return; // no repeats
  if (big) q.unshift(c); else q.push(c);
  if (q.length > 3) q.splice(q.findIndex(o => !o.big) >= 0 ? q.findIndex(o => !o.big) : q.length - 1, 1);
};
function updCallQ() {
  const q = MS.callQ; if (!q || !q.length || introUp()) return;
  if (MS.call && realT - MS.call.t < (MS.call.big ? 2.3 : 1.5) * (q[0].big && !MS.call.big ? .45 : 1)) return; // a big one cuts a small one short
  MS.call = { ...q.shift(), t: realT };
}
showMsg = function (t, c) { msg.text = t; msg.col = c ?? 3; msg.t = realT + (introUp() ? 4.2 - time : 0); };

// ---------- the lights fight: lamp counter + arrows to every lamp and breaker ----------
function edgeAt(sx, sy, m) {
  const ang = Math.atan2(sy - H / 2, sx - W / 2), rx = W / 2 - m, ry = H / 2 - m;
  const t = Math.min(rx / Math.abs(Math.cos(ang) || 1e-6), ry / Math.abs(Math.sin(ang) || 1e-6));
  return { x: W / 2 + Math.cos(ang) * t, y: H / 2 + Math.sin(ang) * t, ang };
}
function drawLightTargets(S, pad) {
  if (MS.phase !== 'lights' || state !== 'playing') return;
  const A = CARR[2], pulse = .65 + .35 * Math.sin(realT * 5);
  // counter under the objective panel
  const x0 = pad, y0 = pad + 104 * S + 22 * S, n = lamps.length;
  text('LIGHTS', x0 + 4, y0, 11 * S, A, .85, 'left', 700, `${4 * S}px`);
  for (let i = 0; i < n; i++) {
    const l = lamps[i], cx = x0 + 74 * S + i * 21 * S, r = 6.5 * S;
    ctx.beginPath(); ctx.arc(cx, y0, r, 0, TAU);
    if (l.on) { ctx.fillStyle = rgba(A, .9); ctx.fill(); ctx.strokeStyle = rgba(A, .35 * pulse); ctx.lineWidth = 4; ctx.stroke(); }
    else { ctx.strokeStyle = rgba(CARR[3], .3); ctx.lineWidth = 1.4; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - r * .6, y0 - r * .6); ctx.lineTo(cx + r * .6, y0 + r * .6); ctx.stroke(); }
  }
  const live = breakers.filter(brkLive).length;
  if (live) text(`⚡ ${live} BREAKER${live > 1 ? 'S' : ''} — ONE SHOT, WHOLE CIRCUIT`, x0 + 4, y0 + 20 * S, 10 * S, INK.yellow, .8, 'left', 700, `${2 * S}px`);
  // markers: brackets on screen, arrows at the edge when they're off it
  const targets = lamps.filter(l => l.on).map(l => ({ x: l.x, y: l.y, brk: false })).concat(breakers.filter(brkLive).map(b => ({ x: b.x, y: b.y, brk: true })));
  for (const t of targets) {
    const sp = worldToScreen(t.x, t.y), col = t.brk ? INK.yellow : A, m = 46;
    if (sp.x > m && sp.x < W - m && sp.y > m + 60 && sp.y < H - m - 80) {
      const r = (t.brk ? 20 : 16) + 3 * pulse;
      ctx.strokeStyle = rgba(col, .75); ctx.lineWidth = 1.6;
      for (let k = 0; k < 4; k++) { const a0 = k * PI / 2 + PI / 4; ctx.beginPath(); ctx.arc(sp.x, sp.y, r, a0 - .32, a0 + .32); ctx.stroke(); }
      if (t.brk) text('BREAKER', sp.x, sp.y - r - 9, 10, col, .9, 'center', 700, '2px');
      continue;
    }
    const e = edgeAt(sp.x, sp.y, 38);
    ctx.save(); ctx.translate(e.x, e.y);
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, TAU); ctx.fillStyle = 'rgba(10,8,2,.75)'; ctx.fill(); ctx.strokeStyle = rgba(col, .9); ctx.lineWidth = 1.6; ctx.stroke();
    if (t.brk) { ctx.beginPath(); ctx.moveTo(2, -7); ctx.lineTo(-3, 1); ctx.lineTo(2, 1); ctx.lineTo(-2, 8); ctx.strokeStyle = rgba(col, 1); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, -1, 4.5, 0, TAU); ctx.fillStyle = rgba(col, pulse); ctx.fill(); ctx.fillRect(-2, 4, 4, 3); }
    ctx.rotate(e.ang); ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(16, -6); ctx.lineTo(16, 6); ctx.closePath(); ctx.fillStyle = rgba(col, .95); ctx.fill();
    ctx.restore();
  }
}

// ---------- damage arcs: a red slash on the side the hit came from ----------
let dmgArcs = [];
function noteDamage(sx, sy) {
  if (!isFinite(sx) || !isFinite(sy) || !player) return;
  dmgArcs.push({ a: Math.atan2(sy - player.y, sx - player.x) - camRot, t: realT });
  if (dmgArcs.length > 6) dmgArcs.shift();
}
function drawDamageArcs(S) {
  const R = Math.min(W, H) * .34;
  dmgArcs = dmgArcs.filter(d => realT - d.t < 1.2);
  for (const d of dmgArcs) {
    const k = (realT - d.t) / 1.2, a = (1 - k) * (k < .06 ? k / .06 : 1);
    ctx.save(); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R + k * 14, d.a - .42, d.a + .42);
    ctx.strokeStyle = `rgba(255,40,60,${.35 * a})`; ctx.lineWidth = 22 * S; ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R + k * 14, d.a - .3, d.a + .3);
    ctx.strokeStyle = `rgba(255,120,130,${.9 * a})`; ctx.lineWidth = 5 * S; ctx.stroke();
    ctx.restore();
  }
}

// ---------- pause menu ----------
const PM = { i: 0, rects: [], drag: null };
function pauseItems() {
  return [
    { k: 'resume', label: 'RESUME' },
    checkpoint ? { k: 'cp', label: 'RESTART FROM CHECKPOINT' } : null,
    { k: 'restart', label: 'RESTART LEVEL' },
    { k: 'master', label: 'MASTER VOLUME', slider: true },
    { k: 'sfx', label: 'SOUND EFFECTS', slider: true },
    { k: 'voice', label: 'VOICES', slider: true },
    { k: 'shake', label: 'SCREEN SHAKE', slider: true },
    { k: 'title', label: 'QUIT TO TITLE' },
  ].filter(Boolean);
}
function pauseDo(it) {
  if (!it) return;
  SFX.ui && SFX.ui();
  if (it.k === 'resume') state = 'playing';
  else if (it.k === 'cp') startGame(true);
  else if (it.k === 'restart') startGame(false);
  else if (it.k === 'title') toTitle();
}
function pauseNudge(it, d) {
  if (!it || !it.slider) return;
  SET[it.k] = clamp(Math.round((SET[it.k] + d) * 20) / 20, 0, 1);
  if (it.k === 'master' && AU.muted && d > 0) AU.muted = false;
  applyVolume(); saveSettings();
  if (it.k !== 'shake' && SFX.click) SFX.click(player.x, player.y); else if (it.k === 'shake') shake = Math.max(shake, 10 * SET.shake);
}
function pauseKey(c) {
  const items = pauseItems();
  PM.i = clamp(PM.i, 0, items.length - 1);
  if (c === 'Escape' || c === 'KeyP') { state = 'playing'; return; }
  if (c === 'ArrowUp' || c === 'KeyW') PM.i = (PM.i + items.length - 1) % items.length;
  else if (c === 'ArrowDown' || c === 'KeyS') PM.i = (PM.i + 1) % items.length;
  else if (c === 'ArrowLeft' || c === 'KeyA') pauseNudge(items[PM.i], -.05);
  else if (c === 'ArrowRight' || c === 'KeyD') pauseNudge(items[PM.i], .05);
  else if (c === 'Enter' || c === 'Space') pauseDo(items[PM.i]);
  else if (c === 'KeyR') startGame(!!checkpoint);
}
function pauseHit() {
  for (const r of PM.rects) if (mouse.x > r.x && mouse.x < r.x + r.w && mouse.y > r.y && mouse.y < r.y + r.h) return r;
  return null;
}
function pauseClick() {
  const r = pauseHit(); if (!r) return;
  PM.i = r.i;
  if (r.it.slider && r.sx != null) { PM.drag = r; pauseDragTo(r); }
  else pauseDo(r.it);
}
function pauseDragTo(r) {
  const v = clamp((mouse.x - r.sx) / r.sw, 0, 1);
  SET[r.it.k] = Math.round(v * 20) / 20; if (r.it.k === 'master' && v > 0) AU.muted = false;
  applyVolume(); saveSettings();
}
const CONTROLS = [
  ['WASD', 'Move'], ['SHIFT', 'Sprint (loud)'], ['MOUSE', 'Aim'], ['L-CLICK', 'Fire'], ['F / R-CLICK', 'Knife'],
  ['Q', 'Sonar ping'], ['SPACE', 'Dash · Echo Strike on a marked target'], ['E', 'Throw decoy'], ['G', 'Phantom (G again: shatter)'],
  ['C', 'Disguise — 5 seconds'], ['R', 'Reload'], ['1 – 4', 'Weapons'], ['M', 'Mute'], ['ESC', 'Pause'],
];
drawPause = function () {
  overlayDim(.78);
  const s = clamp(Math.min(W / 1300, H / 800), .7, 1.2), items = pauseItems();
  PM.i = clamp(PM.i, 0, items.length - 1);
  const hov = pauseHit(); if (hov && !PM.drag) PM.i = hov.i;
  if (PM.drag) { if (mouse.down) pauseDragTo(PM.drag); else PM.drag = null; }
  const cw = 380 * s, gap = 34 * s, mw = 400 * s, tot = mw + gap + cw, x0 = W / 2 - tot / 2;
  const rowH = 40 * s, ph = items.length * rowH + 110 * s, y0 = Math.max(20, H / 2 - ph / 2);
  // left: menu
  panel(x0, y0, mw, ph, 1);
  text('PAUSED', x0 + 24 * s, y0 + 38 * s, Math.max(26, 34 * s), CARR[3], 1, 'left', 600, `${10 * s}px`);
  text(`${LV.name}  ·  ${objective().t}`, x0 + 24 * s, y0 + 68 * s, Math.max(11, 12 * s), CARR[0], .65, 'left', 600, `${1 * s}px`);
  PM.rects = [];
  items.forEach((it, i) => {
    const y = y0 + 96 * s + i * rowH, sel = i === PM.i, fs = Math.max(13, 15 * s);
    const r = { x: x0 + 12 * s, y: y - rowH / 2 + 2, w: mw - 24 * s, h: rowH - 4, i, it };
    if (sel) { ctx.fillStyle = rgba(CARR[0], .12); ctx.fillRect(r.x, r.y, r.w, r.h); ctx.fillStyle = rgba(CARR[0], .9); ctx.fillRect(r.x, r.y, 3, r.h); }
    text(it.label, x0 + 28 * s, y, fs, sel ? CARR[0] : CARR[3], sel ? 1 : .7, 'left', 700, `${3 * s}px`);
    if (it.slider) {
      const sw = 130 * s, sx = x0 + mw - 36 * s - sw, v = SET[it.k];
      r.sx = sx; r.sw = sw;
      ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fillRect(sx, y - 2, sw, 4);
      ctx.fillStyle = rgba(sel ? CARR[0] : CARR[3], sel ? .95 : .6); ctx.fillRect(sx, y - 2, sw * v, 4);
      ctx.beginPath(); ctx.arc(sx + sw * v, y, 6 * s + 1, 0, TAU); ctx.fill();
      text(it.k === 'master' && AU.muted ? 'MUTED' : `${Math.round(v * 100)}`, sx - 12 * s, y, Math.max(11, 12 * s), CARR[3], .6, 'right', 400, '1px', MONO);
    }
    PM.rects.push(r);
  });
  text('↑↓  SELECT    ←→  ADJUST    ENTER  CHOOSE    ESC  RESUME', x0 + mw / 2, y0 + ph - 18 * s, Math.max(10, 11 * s), CARR[3], .45, 'center', 600, `${2 * s}px`);
  // right: controls card
  const cx = x0 + mw + gap; panel(cx, y0, cw, ph, 1);
  text('CONTROLS', cx + 22 * s, y0 + 38 * s, Math.max(18, 22 * s), CARR[3], .95, 'left', 600, `${8 * s}px`);
  const lh = Math.min(28 * s, (ph - 80 * s) / CONTROLS.length);
  CONTROLS.forEach(([k, d], i) => {
    const y = y0 + 74 * s + i * lh, fs = Math.max(11, 13 * s);
    const lit = MS.phase === 'lights' && ['Q', 'SPACE', 'E', 'G', 'C'].includes(k);
    text(k, cx + 22 * s, y, fs, lit ? CARR[1] : CARR[0], .95, 'left', 700, `${1 * s}px`);
    text(lit ? 'OFFLINE while the lights are on' : d, cx + 128 * s, y, fs, lit ? CARR[1] : CARR[3], lit ? .8 : .7, 'left', 500, '0.5px');
  });
};

{ const dh = drawHints; drawHints = function () { if (LV.id !== 1 || MS.phase === 'infiltrate') dh(); }; }
