// =====================================================================
//  BREAKERS · SKYLIGHT LIGHTNING · THE FAKE MARCUS · THOUGHT CAPTIONS · PANEL FREEZE
// =====================================================================
// breaker boxes: [tile x, tile y, lamps they feed]; shooting one kills its whole circuit
const BREAKERS1 = [[9, 4, [0, 1, 2]], [27, 3, [3, 4, 6]]];
let breakers = [];
const PF = { t: -99, dur: .4, x: 0, y: 0, word: '', col: INK.white, cd: -99 };

function buildTwists(cp) {
  breakers = (LV.id === 1 ? BREAKERS1 : []).map(([x, y, ids], i) => ({ i, x: (x + .5) * T, y: (y + .5) * T + 14, ids, flick: rand(0, 6) }));
  PF.t = -99;
}
const brkLamps = b => b.ids.map(id => lamps[id]).filter(Boolean);
const brkLive = b => brkLamps(b).some(l => l.on);
function breakerOut(b) {
  if (!brkLive(b)) return;
  comicWord(b.x, b.y - 18, 'KZZZRRT!', { col: INK.yellow, size: 30, burst: true, burstCol: INK.red, range: 2600, life: 1.2 });
  play('zap', { x: b.x, y: b.y, range: 1800, vol: 1 }); play('shatter', { x: b.x, y: b.y, range: 1400, vol: .6, delay: .08 });
  sparks(b.x, b.y, -PI / 2, 30, 2, 460, PI); light(b.x, b.y, 260, 2, .35, 1);
  emitSound(b.x, b.y, { hear: 950, reveal: 380, col: 2, owner: 'player', str: 1, force: true }); // everyone hears that
  shake = Math.max(shake, 7);
  const ls = brkLamps(b).filter(l => l.on);
  ls.forEach((l, k) => timers.push({ t: time + .12 + k * .14, fn: () => lampOut(l) }));
  panelFreeze(b.x, b.y, 'KZZZRRT!', INK.yellow);
}
function breakerBulletHit(bl) {
  if (bl.o !== 'p') return false;
  for (const b of breakers) if (brkLive(b) && Math.hypot(b.x - bl.x, b.y - bl.y) < 20) { breakerOut(b); return true; }
  return false;
}
function knifeBreakers(P) {
  const hx = P.x + Math.cos(P.a) * 26, hy = P.y + Math.sin(P.a) * 26;
  for (const b of breakers) if (brkLive(b) && Math.min(Math.hypot(b.x - hx, b.y - hy), Math.hypot(b.x - P.x, b.y - P.y) - 12) < 44) breakerOut(b);
}
function postBreakerGuards() { // two men stand on every live breaker
  for (const b of breakers) {
    if (!brkLive(b)) continue;
    for (let k = 0; k < 2; k++) {
      const s = safeSpot(b.x + (k ? 46 : -46), b.y + 40);
      const e = makeEnemy(k ? 'gunner' : 'hunter', s.x, s.y, 'r' + (MS.nid++));
      e.state = 'patrol'; e.patrol = null; e.home = { x: s.x, y: s.y }; e.homeA = -PI / 2; e.a = PI / 2; e.lightWave = true; e.post = true;
      enemies.push(e);
    }
  }
}

// ---------- the fake Marcus: the line goes dead and someone else answers ----------
function radioCut() {
  MS.radioCut = time + 20;
  play('static', { vol: .55 }); callout('SIGNAL LOST', "MARCUS ISN'T ANSWERING", 1);
  timers.push({ t: time + 5.5, fn: () => { if (MS.phase === 'lights') radio('FAKE', "Elias, it's Marcus. The breaker's down the south stairs. Go south, now."); } });
  timers.push({ t: time + 20.5, fn: () => {
    play('static', { vol: .35 });
    radio('MARCUS', "Elias? Elias! They jammed my line. Whatever you just heard on this channel, that wasn't me.");
    thought('Then who was it?');
  } });
}

// ---------- thought captions: Elias, narrating like the top of a comic panel ----------
function thought(text) { MS.rq.push({ who: 'ECHO', text, thought: true }); }
function drawThought(S) {
  const r = MS.radio; if (!r || !r.thought) return;
  const k = realT - r.t, a = Math.max(0, Math.min(1, k / .2, (r.dur - k) / .4)); if (a <= 0) return;
  const size = 17 * S, maxW = Math.min(W * .5, 520 * S);
  ctx.font = `700 ${size}px "Comic Neue", "Comic Sans MS", sans-serif`;
  const L = wrapTo(r.text, maxW), lh = size * 1.25, w = Math.max(...L.map(l => ctx.measureText(l).width)) + size * 1.4, hh = L.length * lh + size * 1.1;
  const x = W / 2 - w / 2, y = 150 * S - (1 - easeOut(Math.min(1, k / .25))) * 12 * S;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x + w / 2, y + hh / 2); ctx.rotate(-.012); ctx.translate(-w / 2, -hh / 2);
  ctx.fillStyle = '#05070a'; ctx.fillRect(5, 5, w, hh);
  ctx.fillStyle = rgba(INK.yellow, 1); ctx.fillRect(0, 0, w, hh);
  ctx.lineWidth = 2.6; ctx.strokeStyle = '#05070a'; ctx.strokeRect(0, 0, w, hh);
  ctx.fillStyle = '#05070a'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  L.forEach((l, i) => ctx.fillText(l, size * .7, size * .55 + lh * (i + .5)));
  ctx.restore();
}

// ---------- lightning through the skylights on the walk to the vault ----------
function lightning() {
  const P = player;
  MS.ltFlash = realT;
  revealWave(P.x, P.y, 950, 1, 3);
  for (const e of enemies) {
    if (e.dead || e.hidden || e.type === 'boss' || Math.hypot(e.x - P.x, e.y - P.y) > 760 || !los(e.x, e.y, P.x, P.y)) continue;
    e.litS = 1.1; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a; // you see them…
    spotted(e, 'lightning');                                          // …and they see you
  }
  comicWord(P.x + rand(-140, 140), P.y - 130, 'KRA-KOOM!', { col: INK.white, size: 36, range: 3000, delay: .35, life: 1.3 });
  timers.push({ t: time + .35, fn: () => { if (!play('thunder', { vol: .95, rev: .35, jit: .08 }) && AU.ctx && !AU.muted) noise({ vol: .5, dur: 3, f0: 320, f1: 40, echo: .9, attack: .08 }); shake = Math.max(shake, 6); } });
  if (!MS.said.sky) { MS.said.sky = 1; callout('SKYLIGHTS', 'LIGHTNING SHOWS THEM — AND YOU', 2); thought('Skylights. Every flash shows me the room, and shows the room me.'); }
}

// ---------- panel freeze: big moments stop for a beat inside a comic panel ----------
function panelFreeze(x, y, word, col, cd) {
  if (realT - PF.cd < (cd || 0)) return;
  PF.t = realT; PF.cd = realT; PF.x = x; PF.y = y; PF.word = word; PF.col = col || INK.white;
  play('whoosh', { vol: .5 });
}
const panelHeld = () => realT - PF.t < PF.dur;
function drawPanelFreeze() {
  const k = realT - PF.t, out = .18; if (k < 0 || k > PF.dur + out) return;
  const a = k < PF.dur ? 1 : 1 - (k - PF.dur) / out;
  if (!halftone) { halftone = document.createElement('canvas'); halftone.width = halftone.height = 6; const h = halftone.getContext('2d'); h.fillStyle = '#000'; h.beginPath(); h.arc(3, 3, 1.3, 0, TAU); h.fill(); }
  const sp = worldToScreen(PF.x, PF.y), pw = Math.min(W * .52, 600), ph = Math.min(H * .54, 420);
  const cx = clamp(sp.x, pw / 2 + 24, W - pw / 2 - 24), cy = clamp(sp.y, ph / 2 + 24, H - ph / 2 - 24);
  const snap = k < .07 ? 1.14 - k / .07 * .14 : 1;
  ctx.save(); ctx.globalAlpha = a;
  ctx.translate(cx, cy); ctx.rotate(-.022); ctx.scale(snap, snap);
  ctx.beginPath(); ctx.rect(-W * 2, -H * 2, W * 4, H * 4); ctx.rect(-pw / 2, -ph / 2, pw, ph);
  ctx.fillStyle = 'rgba(239,230,210,.9)'; ctx.fill('evenodd');
  ctx.globalAlpha = a * .22; ctx.fillStyle = ctx.createPattern(halftone, 'repeat'); ctx.fill('evenodd'); ctx.globalAlpha = a;
  ctx.lineWidth = 6; ctx.strokeStyle = '#05070a'; ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
  ctx.translate(-pw / 2 + 86, -ph / 2 + 6); ctx.rotate(-.1);
  starburst(PF.word.length * 13 + 52, 50, INK.yellow);
  inkText(PF.word, 40, PF.col === INK.yellow ? INK.red : PF.col);
  ctx.restore();
}

// ---------- per frame ----------
function updTwists(dt) {
  const P = player; if (P.dead || LV.id !== 1) return;
  if (!MS.said.th0 && time > 5 && MS.phase === 'infiltrate') { MS.said.th0 = 1; thought('Twenty guns on one floor. Not one of them knows how loud they are.'); }
  if (MS.phase === 'lights' && !MS.said.brk) for (const b of breakers) if (brkLive(b) && Math.hypot(b.x - P.x, b.y - P.y) < 480 && los(P.x, P.y, b.x, b.y)) {
    MS.said.brk = 1; callout('BREAKER BOX', 'ONE SHOT KILLS ITS WHOLE CIRCUIT · IT\'S GUARDED', 2); thought('A breaker. One bullet, three lights. And two men standing on it.'); break;
  }
  if (MS.phase === 'vault' && (MS.ltT = (MS.ltT ?? 5) - dt) <= 0) { MS.ltT = rand(7, 12); lightning(); }
}
// breakers: a neon fuse box on the wall, its circuit lit up while the power's on
function drawBreakers() {
  for (const b of breakers) {
    if (b.x < vx0 - 60 || b.x > vx1 + 60 || b.y < vy0 - 60 || b.y > vy1 + 60) continue;
    const live = brkLive(b), fl = live ? .75 + .25 * Math.sin(realT * 17 + b.flick) : .25, col = live ? CARR[2] : CARR[1];
    if (live) { // the circuit
      ctx.setLineDash([4, 7]); ctx.lineDashOffset = -realT * 30; ctx.lineWidth = 1.2;
      for (const l of brkLamps(b)) if (l.on) { ctx.beginPath(); ctx.moveTo(b.x, b.y - 12); ctx.lineTo(l.x, l.y); ctx.strokeStyle = rgba(CARR[2], .22); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = rgba(col, .9 * fl); ctx.lineWidth = 1.8; ctx.strokeRect(b.x - 11, b.y - 14, 22, 28);
    ctx.fillStyle = rgba(col, .12 * fl); ctx.fillRect(b.x - 11, b.y - 14, 22, 28);
    ctx.beginPath(); ctx.moveTo(b.x + 3, b.y - 10); ctx.lineTo(b.x - 4, b.y + 1); ctx.lineTo(b.x + 2, b.y + 1); ctx.lineTo(b.x - 3, b.y + 11); // bolt
    ctx.strokeStyle = rgba(live ? INK.yellow : CARR[1], fl); ctx.lineWidth = 1.6; ctx.stroke();
    if (live && Math.random() < .04) sparks(b.x, b.y - 14, -PI / 2, 2, 2, 160, .8);
  }
}
function drawLightningFlash() {
  const k = realT - (MS.ltFlash ?? -99); if (k < 0 || k > .6) return;
  const f = (k < .07 ? 1 : k < .12 ? .25 : k < .2 ? .85 : 1 - (k - .2) / .4) * .5; // double flicker
  ctx.fillStyle = `rgba(200,225,255,${Math.max(0, f)})`; ctx.fillRect(0, 0, W, H);
}
