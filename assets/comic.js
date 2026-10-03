// =====================================================================
//  ECHO #1: LIGHTS ON — comic sound lettering · speech bubbles · flashlights · the lights-on twist
// =====================================================================
const ONLY_L1 = true; // hackathon build: Level 1 only (Level 2 stays in the code, hidden)
const LAMPS1 = [[6, 2], [13, 3], [5, 8], [22, 2], [32, 3], [42, 2], [30, 9]];
const FLASH_IDS = [2, 7, 8, 10, 12];
const INK = { cyan: [90, 230, 255], red: [255, 74, 84], yellow: [255, 208, 46], blue: [130, 150, 255], white: [244, 247, 255], orange: [255, 140, 40], violet: [195, 125, 255], paper: [239, 230, 210] };
const COMIC_POP = new Set(['CRUNCH', 'CLICK', 'RIIIING', 'SNIFF', 'SNORT', 'HNNG', 'CHK-CHK', 'SLAMMED!', 'JAM OUT', 'FAKE', 'HAMMERED', '?', '· · ·']);
let comicFx = [], lamps = [], halftone = null, powerT = -99;

// ---------- lettering: every sound is drawn where it happened ----------
function comicWord(x, y, text, o) {
  o = o || {};
  const P = player;
  if (!P || !isFinite(x) || P.x < -9000) return;
  if (Math.hypot(x - P.x, y - P.y) > (o.range || 1150)) return;
  if (comicFx.length > 70) comicFx.shift();
  comicFx.push({ x, y, text, t: time + (o.delay || 0), life: o.life || .95, size: o.size || 18, col: o.col || INK.white,
    burst: !!o.burst, burstCol: o.burstCol || INK.yellow, rot: o.rot ?? rand(-.22, .22), dx: rand(-5, 5), vy: o.vy ?? -16 });
}
function starburst(rx, ry, col) {
  ctx.beginPath();
  const n = 14;
  for (let i = 0; i <= n * 2; i++) {
    const a = i / (n * 2) * TAU, r = i % 2 ? .62 + Math.sin(i * 7.3) * .08 : 1;
    const px = Math.cos(a) * rx * r, py = Math.sin(a) * ry * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = rgba(col, 1); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = '#05070a'; ctx.stroke();
}
function inkText(text, size, col) {
  ctx.font = `${size}px Bangers, Impact, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.fillStyle = '#05070a'; ctx.fillText(text, size * .07, size * .09);
  ctx.lineWidth = Math.max(2.4, size * .2); ctx.strokeStyle = '#05070a'; ctx.strokeText(text, 0, 0);
  ctx.fillStyle = rgba(col, 1); ctx.fillText(text, 0, 0);
}
function speechBubble(cx, by, lines, size, tx, ty) {
  ctx.font = `600 ${size}px ${FONT}`;
  const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + size * 1.6, h = lines.length * size * 1.18 + size * .9;
  const x = cx - w / 2, y = by - h, r = Math.min(14, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  const tb = clamp(tx, x + r + 6, x + w - r - 16);
  ctx.lineTo(tb + 14, y + h); ctx.lineTo(tx, ty); ctx.lineTo(tb + 3, y + h);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  ctx.fillStyle = '#fbfaf5'; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = '#05070a'; ctx.stroke();
  ctx.fillStyle = '#0b0d12'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, cx, y + size * .45 + (i + .5) * size * 1.18));
}
function wrapTo(s, maxW) { // uses current ctx.font
  const out = ['']; for (const w of s.split(' ')) { const t = out[out.length - 1] ? out[out.length - 1] + ' ' + w : w; if (ctx.measureText(t).width > maxW && out[out.length - 1]) out.push(w); else out[out.length - 1] = t; } return out;
}
function drawComic() {
  // sound words
  for (let i = comicFx.length - 1; i >= 0; i--) {
    const w = comicFx[i], age = time - w.t;
    if (age < 0) continue;
    const k = age / w.life; if (k >= 1) { comicFx.splice(i, 1); continue; }
    const a = k < .65 ? 1 : 1 - (k - .65) / .35, pop = age < .1 ? 1.4 - age * 4 : 1;
    ctx.save(); ctx.translate(w.x + w.dx, w.y + w.vy * easeOut(k)); ctx.rotate(w.rot); ctx.scale(pop, pop); ctx.globalAlpha = a;
    if (w.burst) starburst(w.size * (.55 + w.text.length * .2), w.size * .95, w.burstCol);
    inkText(w.text, w.size, w.col);
    ctx.restore();
  }
  // old-style sound popups, now lettered
  for (const p of popups) {
    if (!COMIC_POP.has(p.text)) continue;
    const k = (time - p.t) / 1.4; if (k < 0 || k > 1) continue;
    const a = k < .7 ? 1 : 1 - (k - .7) / .3, pop = 1 + Math.max(0, .45 - k * 4);
    ctx.save(); ctx.translate(p.x, p.y + p.vy * easeOut(k) * 1.4); ctx.rotate(-.1); ctx.scale(pop, pop); ctx.globalAlpha = a;
    inkText(p.text, Math.max(16, p.size * 1.3), p.c === 1 ? INK.red : p.c === 2 ? INK.yellow : INK.white);
    ctx.restore();
  }
  // guards talk in bubbles
  for (const p of popups) {
    if (!p.bubble) continue;
    const k = (time - p.t) / 1.4; if (k < 0 || k > 1) continue;
    const a = Math.min(1, k * 8, (1 - k) / .2);
    ctx.save(); ctx.globalAlpha = a; ctx.font = `600 12px ${FONT}`;
    speechBubble(p.x, p.y - 10, wrapTo(p.text, 150), 12, p.x - 4, p.y + 14);
    ctx.restore();
  }
}

// ---------- lamps: light is the danger ----------
function buildComic(cp) {
  comicFx = []; powerT = -99;
  lamps = (LV.id === 1 ? LAMPS1 : []).map(([x, y], id) => ({ id, x: (x + .5) * T, y: (y + .5) * T, r: 250, on: false, gone: !!(cp && cp.lampsOut && cp.lampsOut.includes(id)), revT: rand(0, .3), poly: null, swing: rand(0, 6) }));
  if (cp && (cp.phase === 'vault' || cp.phase === 'boss' || cp.phase === 'escape')) for (const l of lamps) l.gone = true; // the lights are long dead by then
  for (const e of enemies) e.flash = LV.id === 1 && FLASH_IDS.includes(e.id);
}
function litAt(x, y) { for (const l of lamps) if (l.on && Math.hypot(l.x - x, l.y - y) < l.r && los(l.x, l.y, x, y)) return l; return null; }
function nearestLamp() { const P = player; let b = null, bd = 1e9; for (const l of lamps) if (l.on) { const d = Math.hypot(l.x - P.x, l.y - P.y); if (d < bd) { bd = d; b = l; } } return b; }
function relockVault() { for (const d of doors) if (BOSS.doors.some(([x, y]) => d.tx === x && d.ty === y)) { d.open = false; d.amt = 0; d.locked = true; } }
function lightsUp(quiet) {
  for (const l of lamps) if (!l.gone) { l.on = true; if (!quiet) comicWord(l.x, l.y - 10, 'KA-CHUNK!', { col: INK.yellow, size: 22, range: 3000, delay: rand(0, .35) }); }
  if (!quiet) { powerT = realT; play('door_slam', { vol: .9, rev: .5 }); play('hum_elec', { vol: .7, rev: .4, delay: .2 }); shake = Math.max(shake, 8); }
}
function powerOn() {
  MS.phase = 'lights'; relockVault();
  playCutscene([
    { cam: csAt(24, 3, .5), dur: 1.3 },
    { say: ['CONDUCTOR', 'Power is back on. No more hiding.'], keep: true, fn: () => lightsUp(false) },
    { cam: csAt(22, 4, .62), say: ['MARCUS', "He's lit the whole floor, Elias. They can see you now. Shoot out the lights."], keep: true },
    { cam: csP(1), say: ['ECHO', "Then I'll make it dark again."], keep: true },
  ], () => callout('LIGHTS ON', `THEY CAN SEE YOU · SHOOT OUT THE LAMPS  0/${lamps.length}`, 2, true));
  saveCheckpoint();
}
function lampOut(l) {
  if (!l.on) return;
  l.on = false; l.gone = true;
  comicWord(l.x, l.y - 6, 'PSSHT!', { col: INK.yellow, size: 26, burst: true, burstCol: INK.white, range: 2000 });
  comicWord(l.x + 14, l.y + 18, 'TINK!', { col: INK.white, size: 20, delay: .14, range: 2000 });
  play('shatter', { x: l.x, y: l.y, range: 1600, vol: .8 }); play('zap', { x: l.x, y: l.y, range: 1400, vol: .5, delay: .05 });
  emitSound(l.x, l.y, { hear: 260, reveal: 260, col: 2, owner: 'player', str: .9, force: true });
  sparks(l.x, l.y, PI / 2, 18, 2, 380, PI); light(l.x, l.y, 220, 2, .25, 1);
  stats.score += 250;
  const left = lamps.filter(o => o.on).length, n = lamps.length - left;
  if (left) callout(`${n}/${lamps.length}`, `${left} LIGHT${left > 1 ? 'S' : ''} LEFT`, 2);
  else darkAgain();
}
function darkAgain() {
  MS.phase = 'vault';
  for (const d of doors) if (BOSS.doors.some(([x, y]) => d.tx === x && d.ty === y)) d.locked = false;
  callout('DARK AGAIN', 'THE RULES ARE YOURS AGAIN', 0, true);
  emitSound(player.x, player.y, { hear: 0, reveal: 700, col: 0, owner: 'env', str: .8, force: true });
  timers.push({ t: time + 1.4, fn: () => playCutscene([{ cam: csP(1.1), say: ['ECHO', 'There. Dark again.'], keep: true }]) });
  saveCheckpoint();
}
function lampBulletHit(b) {
  if (b.o !== 'p') return false;
  for (const l of lamps) if (l.on && Math.hypot(l.x - b.x, l.y - b.y) < 20) { lampOut(l); return true; }
  return false;
}
function knifeLamps(P) {
  const hx = P.x + Math.cos(P.a) * 26, hy = P.y + Math.sin(P.a) * 26;
  for (const l of lamps) if (l.on && Math.min(Math.hypot(l.x - hx, l.y - hy), Math.hypot(l.x - P.x, l.y - P.y) - 12) < 46) lampOut(l);
}
function spotted(e, why) {
  const P = player;
  e.know = { x: P.x, y: P.y, t: time };
  if (e.state === 'patrol' || e.state === 'return' || e.state === 'search') {
    e.state = 'hunt'; e.path = null;
    if (time - (e.spotT || -9) > 4) { e.spotT = time; say(e, 'light', true) || popups.push({ x: e.x, y: e.y - 30, text: '!', t: time, c: 1, size: 24, vy: -14, alert: true }); }
  }
}
function updComic(dt) {
  const P = player;
  P.lit = !P.dead && lamps.length ? litAt(P.x, P.y) : null;
  for (const l of lamps) if (l.on) { l.revT -= dt; if (l.revT <= 0) { l.revT = .3; revealWave(l.x, l.y, l.r, .8, 2); } }
  // in the light, they can see you
  if (P.lit && !P.dead && !(P.disgT > 0) && time > (MS.seeT || 0)) {
    MS.seeT = time + .2;
    for (const e of enemies) if (!e.dead && !e.hidden && e.type !== 'boss' && e.state !== 'stun' && Math.hypot(e.x - P.x, e.y - P.y) < 620 && los(e.x, e.y, P.x, P.y)) spotted(e, 'lamp');
  }
  // flashlights sweep; step into a cone and you're seen
  for (const e of enemies) {
    if (!e.flash || e.dead) continue;
    const calm = e.state === 'patrol' || e.state === 'return';
    e.fa = e.a + (calm ? Math.sin(time * 1.1 + e.id) * .45 : 0);
    if (P.dead || P.disgT > 0 || e.state === 'stun') continue;
    const d = Math.hypot(P.x - e.x, P.y - e.y);
    if (d < 290 && d > 10 && Math.abs(angDiff(e.fa, Math.atan2(P.y - e.y, P.x - e.x))) < .42 && los(e.x, e.y, P.x, P.y)) spotted(e, 'flash');
  }
}

// ---------- drawing ----------
function drawLamps() {
  for (const l of lamps) {
    if (l.x < vx0 - l.r || l.x > vx1 + l.r || l.y < vy0 - l.r || l.y > vy1 + l.r) continue;
    if (l.on) {
      if (!l.poly) l.poly = visPoly(l.x, l.y, l.r);
      const fl = .85 + .15 * Math.sin(realT * 23 + l.swing) * (Math.random() < .03 ? 3 : 1);
      ctx.save(); ctx.beginPath(); const p = l.poly; ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); ctx.clip();
      const g = ctx.createRadialGradient(l.x, l.y, 4, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(255,226,140,${.42 * fl})`); g.addColorStop(.45, `rgba(255,200,90,${.14 * fl})`); g.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      ctx.restore();
    }
    // the fixture itself, hanging from above
    const sx = Math.sin(realT * 1.3 + l.swing) * 2, tx = ex(l.x, .12) + sx, ty = ey(l.y, .12);
    ctx.strokeStyle = l.on ? 'rgba(255,230,160,.9)' : 'rgba(150,160,180,.35)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(tx, ty, 7, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(tx - 7, ty); ctx.lineTo(tx + 7, ty); ctx.moveTo(tx, ty - 7); ctx.lineTo(tx, ty + 7); ctx.stroke();
    if (l.on) { ctx.fillStyle = 'rgba(255,245,210,1)'; ctx.beginPath(); ctx.arc(tx, ty, 3.4, 0, TAU); ctx.fill(); }
  }
}
function drawFlashlights() {
  for (const e of enemies) {
    if (!e.flash || e.dead || e.fa == null) continue;
    if (e.x < vx0 - 300 || e.x > vx1 + 300 || e.y < vy0 - 300 || e.y > vy1 + 300) continue;
    const R = 290, poly = visPoly(e.x, e.y, R), a0 = e.fa - .42, a1 = e.fa + .42;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(poly[0], poly[1]); for (let i = 2; i < poly.length; i += 2) ctx.lineTo(poly[i], poly[i + 1]); ctx.closePath(); ctx.clip();
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.arc(e.x, e.y, R, a0, a1); ctx.closePath();
    const g = ctx.createRadialGradient(e.x, e.y, 6, e.x, e.y, R);
    g.addColorStop(0, 'rgba(255,225,120,.42)'); g.addColorStop(.6, 'rgba(255,210,90,.12)'); g.addColorStop(1, 'rgba(255,200,80,0)');
    ctx.fillStyle = g; ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,240,190,.95)'; ctx.beginPath(); ctx.arc(e.x + Math.cos(e.fa) * 14, e.y + Math.sin(e.fa) * 14, 2.6, 0, TAU); ctx.fill();
  }
}
function drawComicHUD(S, pad) {
  if (state !== 'playing') return;
  const P = player, k = realT - powerT;
  if (k >= 0 && k < 1.4) { ctx.fillStyle = `rgba(255,240,200,${.55 * (1 - k / 1.4)})`; ctx.fillRect(0, 0, W, H); }
  if (lamps.some(l => l.on)) {
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    g.addColorStop(0, 'rgba(255,210,120,0)'); g.addColorStop(1, 'rgba(255,200,100,.12)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (P.lit && !P.dead) {
    const y = pad + 118 * S;
    ctx.save(); ctx.translate(W / 2, y); ctx.rotate(-.03);
    inkText("YOU'RE IN THE LIGHT", 22 * S, INK.yellow);
    ctx.restore();
    text('THEY CAN SEE YOU  ·  SONAR WASHES OUT', W / 2, y + 22 * S, 10 * S, CARR[3], .75, 'center', 700, `${3 * S}px`);
  }
}
// cutscenes become comic panels: paper gutters, ink frame, halftone, speech bubbles and caption boxes
drawCutscene = function () {
  const S = CS; if (!S) return;
  const s = clamp(Math.min(W / 1400, H / 860), .62, 1.2), g = Math.max(10, 22 * s) * easeOut(S.bars);
  if (!halftone) { halftone = document.createElement('canvas'); halftone.width = halftone.height = 6; const h = halftone.getContext('2d'); h.fillStyle = '#000'; h.beginPath(); h.arc(3, 3, 1.3, 0, TAU); h.fill(); }
  ctx.save(); ctx.globalAlpha = .16 * S.bars; ctx.fillStyle = ctx.createPattern(halftone, 'repeat'); ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.fillStyle = rgba(INK.paper, 1); ctx.fillRect(0, 0, W, g); ctx.fillRect(0, H - g, W, g); ctx.fillRect(0, 0, g, H); ctx.fillRect(W - g, 0, g, H);
  ctx.strokeStyle = '#05070a'; ctx.lineWidth = 4 * s; ctx.strokeRect(g, g, W - 2 * g, H - 2 * g);
  const box = (x, y, w, h, fill) => { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); ctx.lineWidth = 2.4; ctx.strokeStyle = '#05070a'; ctx.strokeRect(x, y, w, h); };
  // narration card → a caption box, like the top of a comic page
  if (S.card) {
    const k = realT - S.card.t, a = Math.max(0, Math.min(1, k / .3, (S.card.dur - k) / .5));
    if (a > 0) {
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = `${44 * s}px Bangers, Impact, sans-serif`; const tw = ctx.measureText(S.card.title).width;
      ctx.font = `700 ${13 * s}px ${FONT}`; const sw = ctx.measureText(S.card.sub).width;
      const w = Math.max(tw, sw) + 44 * s, h = 92 * s, x = W / 2 - w / 2, y = H * .2;
      box(x + 6 * s, y + 6 * s, w, h, '#05070a'); box(x, y, w, h, rgba(INK.yellow, 1));
      ctx.translate(W / 2, y + 38 * s); inkText(S.card.title, 44 * s, S.card.col ? S.card.col : INK.white);
      ctx.fillStyle = '#05070a'; ctx.font = `700 ${13 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText(S.card.sub.toUpperCase(), 0, 36 * s);
      ctx.restore();
    }
  }
  if (MS.call) {
    const k = realT - MS.call.t, dur = MS.call.big ? 2.3 : 1.5;
    if (k <= dur) {
      const a = Math.min(1, k / .12, (dur - k) / .4), pop = 1 + Math.max(0, .4 - k * 2.4);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * .34); ctx.rotate(-.04); ctx.scale(pop, pop);
      inkText(MS.call.text, (MS.call.big ? 50 : 34) * s, MS.call.col === 1 ? INK.red : MS.call.col === 2 ? INK.yellow : INK.cyan);
      if (MS.call.sub) { ctx.font = `700 ${13 * s}px ${FONT}`; ctx.fillStyle = rgba(INK.white, 1); ctx.textAlign = 'center'; ctx.fillText(MS.call.sub, 0, 38 * s); }
      ctx.restore();
    }
  }
  // dialogue: a bubble over whoever's speaking, or a caption box for voices on the radio/PA
  if (S.sub) {
    const k = realT - S.sub.t, who = S.sub.who;
    const anchor = who === 'ECHO' ? player : (who === 'CONDUCTOR' || who === 'FOREMAN') && MS.boss && !MS.boss.dead ? MS.boss : null;
    const shown = S.sub.text.slice(0, Math.max(1, Math.floor(k * 45)));
    const size = 16 * s;
    ctx.font = `600 ${size}px ${FONT}`;
    const lines = wrapTo(S.sub.text, Math.min(W * .42, 420 * s));
    let left = shown.length; const typed = lines.map(l => { const t = l.slice(0, Math.max(0, left)); left -= l.length + 1; return t || ' '; });
    if (anchor) {
      const sp = worldToScreen(anchor.x, anchor.y);
      const cx = clamp(sp.x, g + 230 * s, W - g - 230 * s), by = clamp(sp.y - 46 * s, g + 120 * s, H - g - 40 * s);
      ctx.save(); speechBubble(cx, by, typed, size, clamp(sp.x, g + 20, W - g - 20), clamp(sp.y - 18 * s, by + 8, H - g - 10)); ctx.restore();
      // keep the bubble width stable while typing
    } else {
      const label = who === 'CONDUCTOR' ? 'CONDUCTOR · PA' : who + ' · RADIO';
      const w = Math.min(W * .5, 480 * s), h = lines.length * size * 1.25 + 40 * s, x = g + 22 * s, y = H - g - h - 22 * s;
      box(x + 5 * s, y + 5 * s, w, h, '#05070a'); box(x, y, w, h, '#fbfaf5');
      box(x, y - 22 * s, Math.min(w, 190 * s), 22 * s, rgba(INK.yellow, 1));
      ctx.fillStyle = '#05070a'; ctx.font = `${15 * s}px Bangers, Impact, sans-serif`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + 9 * s, y - 10 * s);
      ctx.font = `600 ${size}px ${FONT}`;
      typed.forEach((l, i) => ctx.fillText(l, x + 14 * s, y + 22 * s + i * size * 1.25));
    }
  }
  const hk = csHold ? Math.min(1, (realT - csHold) / .7) : 0;
  ctx.fillStyle = '#05070a'; ctx.font = `700 ${10 * s}px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = .55 + .4 * hk; ctx.fillText('HOLD SPACE  SKIP   ·   CLICK  NEXT', W - g - 10 * s, g / 2 + 1); ctx.globalAlpha = 1;
  ctx.textAlign = 'left'; ctx.fillText(`ECHO #${LV.num.replace(/^0/, '')} · ${LV.name}`, g + 10 * s, g / 2 + 1);
};

// ---------- every sound now has a word ----------
const SND2 = { ...SFX };
const cw = (x, y, text, col, size, o) => comicWord(x, y, text, Object.assign({ col, size }, o || {}));
Object.assign(SFX, {
  shot(x, y, kind) {
    SND2.shot(x, y, kind);
    const m = { pistol: ['BLAM!', INK.yellow, 30, INK.white], shotgun: ['KA-BLAM!', INK.orange, 36, INK.yellow], smg: ['BRAT!', INK.yellow, 19], enemy: ['BANG!', INK.red, 26, INK.white], heavy: ['BOOM!', INK.red, 34, INK.yellow] }[kind] || ['BANG!', INK.red, 24];
    cw(x, y - 20, m[0], m[1], m[2], { burst: !!m[3], burstCol: m[3], range: 1600, life: .8 });
  },
  step(x, y, v, heavy) {
    SND2.step(x, y, v, heavy);
    const own = player && Math.hypot(x - player.x, y - player.y) < 2;
    if (heavy) cw(x, y + 8, 'THUD', INK.red, 22, { range: 900, vy: -6 });
    else if (own) cw(x + rand(-8, 8), y + 14, v >= .29 ? 'TAP' : 'tap', INK.cyan, v >= .29 ? 16 : 12, { range: 400, vy: -6, life: .7 });
    else cw(x, y + 12, 'tap', INK.red, 12, { range: 520, vy: -6, life: .7 });
  },
  paw(x, y) { SND2.paw(x, y); cw(x, y + 8, 'pat', INK.red, 11, { range: 420, vy: -4, life: .6 }); },
  sonar() { SND2.sonar(); if (player) cw(player.x, player.y - 34, 'PING!', INK.cyan, 34, { burst: true, burstCol: [16, 40, 60], life: 1.1 }); },
  door(x, y) { SND2.door(x, y); cw(x, y - 10, 'CREAK…', INK.blue, 18, { range: 900 }); },
  boom(x, y) { SND2.boom(x, y); cw(x, y - 10, 'KA-BOOM!', INK.orange, 46, { burst: true, burstCol: INK.yellow, range: 2200, life: 1.2 }); },
  kill(x, y) { SND2.kill(x, y); cw(x, y - 16, 'SHNK!', INK.white, 24, { range: 900 }); },
  impact(x, y) { SND2.impact(x, y); if (Math.random() < .5) cw(x, y, Math.random() < .5 ? 'ZING' : 'PTANG', INK.white, 13, { range: 650, life: .55 }); },
  decoy(x, y) { SND2.decoy(x, y); cw(x, y - 8, 'CLANK!', INK.yellow, 22, { range: 1400 }); },
  hurt() { SND2.hurt(); if (player) cw(player.x, player.y - 30, 'OOF!', INK.red, 24); },
  dog(x, y) { SND2.dog(x, y); cw(x, y - 18, 'WOOF!', INK.red, 20, { range: 1200 }); },
  dash() { SND2.dash(); if (player) cw(player.x, player.y + 10, 'WHOOSH', INK.cyan, 14, { life: .5, vy: 0 }); },
  strike() { SND2.strike(); if (player) cw(player.x, player.y - 24, 'FWIP!', INK.cyan, 18, { life: .5 }); },
  reload() { SND2.reload(); if (player) cw(player.x + 18, player.y - 18, 'CLAK', INK.white, 13, { life: .6 }); },
  swish() { SND2.swish(); if (player) cw(player.x + Math.cos(player.a) * 30, player.y + Math.sin(player.a) * 30, 'FWISH', INK.white, 13, { life: .45, vy: 0 }); },
  shatter(x, y) { SND2.shatter(x, y); cw(x, y - 8, 'KSSH!', INK.cyan, 24, { range: 1500 }); },
  nodeDown(x, y) { SND2.nodeDown(x, y); cw(x, y - 8, 'ZZAP!', INK.violet, 26, { range: 1300 }); },
  beep(x, y) { SND2.beep(x, y); cw(x, y - 12, 'beep', INK.red, 10, { range: 450, life: .5 }); },
  phantom() { SND2.phantom(); if (player) cw(player.x, player.y - 30, 'VMMM', INK.cyan, 16); },
});
// a heart you can hear gets a word too
const _heartThump = heartThump;
heartThump = function (e, d) {
  _heartThump(e, d);
  if (d < HB_R * .7 && los(player.x, player.y, e.x, e.y)) cw(e.x + 16, e.y - 14, 'ba-dum', INK.red, 11, { range: HB_R, life: .55, vy: -4, rot: .1 });
};
