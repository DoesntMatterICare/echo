// =====================================================================
//  CUTSCENES — in-engine cinematics: letterbox, scripted camera, voiced lines, skippable
// =====================================================================
let CS = null, csHold = 0;
const introSeen = new Set();
const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
// steps: { snap|cam: [x, y, zoom] | () => [...], dur, say: [who, text], keep, fn, ping: [x, y, r, col], card: [title, sub, dur], move: { o, x, y } }
function cine(skip, steps, onDone) {
  if (skip) { runSkipped(steps, 0); if (onDone) onDone(); return; }
  playCutscene(steps, onDone);
}
function playCutscene(steps, onDone) {
  if (CS && state === 'cutscene') { // already rolling: queue these after
    CS.steps.push(...steps);
    if (onDone) { const prev = CS.onDone; CS.onDone = () => { if (prev) prev(); onDone(); }; }
    return;
  }
  CS = { steps, i: -1, onDone, x: cam.x, y: cam.y, z: 1, bars: 0, sub: null, card: null };
  state = 'cutscene'; csHold = 0; mouse.down = false;
  for (const k in K) K[k] = false;
  csNext();
}
const csPt = c => typeof c === 'function' ? c() : c;
function csNext() {
  const S = CS; if (!S) return;
  S.i++;
  if (S.i >= S.steps.length) return csEnd();
  const st = S.steps[S.i]; st._t = 0;
  if (st.fn) st.fn();
  if (!CS) return;
  if (st.ping) { const [x, y, r, c] = csPt(st.ping); emitSound(x, y, { hear: 0, reveal: r, col: c ?? 0, owner: 'env', str: 1, force: true }); }
  if (st.snap) { const [x, y, z] = csPt(st.snap); S.x = x; S.y = y; if (z != null) S.z = z; }
  st._from = { x: S.x, y: S.y, z: S.z }; st._to = st.cam ? csPt(st.cam) : null;
  if (st.card) S.card = { title: st.card[0], sub: st.card[1], dur: st.card[2] || 3, col: st.card[3], t: realT };
  let d = st.dur || 0;
  if (st.say) {
    const [who, text] = st.say, vd = speak(who, text, { ch: 'cine' });
    S.sub = { who, text, t: realT };
    d = Math.max(d, (vd || (1.4 + text.length / 15)) + .4);
  }
  st._dur = d;
  if (st.move) { st.move._x0 = st.move.o.x; st.move._y0 = st.move.o.y; }
}
function updCutscene(dt) {
  const S = CS; if (!S) return;
  time += dt; stats.cs = (stats.cs || 0) + dt;
  S.bars = Math.min(1, S.bars + dt * 2.5);
  updReveals(); updFX(dt);
  for (const d of doors) if (d.open && d.amt < 1) d.amt = Math.min(1, d.amt + dt * 7);
  for (let i = timers.length - 1; i >= 0; i--) if (timers[i].cine && time >= timers[i].t) { const t = timers[i]; timers.splice(i, 1); t.fn(); }
  if (LV.id === 2) { updHammers(dt); if (LV.storm) updStorm(dt); }
  const st = S.steps[S.i];
  st._t += dt;
  const k = st._dur > 0 ? Math.min(1, st._t / st._dur) : 1;
  if (st._to) {
    const e = easeInOut(Math.min(1, st._t / Math.max(.01, st.camDur || st._dur)));
    S.x = lerp(st._from.x, st._to[0], e); S.y = lerp(st._from.y, st._to[1], e);
    if (st._to[2] != null) S.z = lerp(st._from.z, st._to[2], e);
  }
  if (st.move) {
    const m = st.move, o = m.o, ox = o.x, oy = o.y, e = easeInOut(k);
    o.x = lerp(m._x0, m.x, e); o.y = lerp(m._y0, m.y, e);
    const mv = Math.hypot(o.x - ox, o.y - oy);
    if (o === player) {
      if (mv > .01) { o.moveA = Math.atan2(o.y - oy, o.x - ox); o.a = o.moveA; }
      o.moveAmt = mv > .1 ? 1 : Math.max(0, o.moveAmt - dt * 4); o.stepPh = (o.stepPh || 0) + mv * PI / 46;
      if ((o.csStep = (o.csStep || 0) + mv) > 46) { o.csStep = 0; SFX.step(o.x, o.y, .16, false); trails.push({ x: o.x, y: o.y, t: time, c: 0 }); }
    }
  } else if (player.moveAmt > 0) player.moveAmt = Math.max(0, player.moveAmt - dt * 4);
  cam.x = S.x; cam.y = S.y;
  if (st._t >= st._dur) csNext();
  if (CS && csHold && realT - csHold > .7) skipCutscene();
}
function runSkipped(steps, from) {
  for (let i = from; i < steps.length; i++) {
    const st = steps[i];
    if (st.fn) st.fn();
    if (st.move) { st.move.o.x = st.move.x; st.move.o.y = st.move.y; }
    if (st.say && st.keep) radio(st.say[0], st.say[1]);
  }
}
function skipCutscene() {
  const S = CS; if (!S) return;
  voStop('cine');
  const cur = S.steps[S.i];
  if (cur && cur.move) { cur.move.o.x = cur.move.x; cur.move.o.y = cur.move.y; }
  if (cur && cur.say && cur.keep && cur._t < cur._dur * .7) radio(cur.say[0], cur.say[1]); // cut off mid-line: hear it on the radio
  runSkipped(S.steps, S.i + 1);
  csEnd();
}
function csAdvance() { // click: cut the current line short
  if (!CS) return;
  voStop('cine');
  const st = CS.steps[CS.i]; if (st) st._t = Math.max(st._t, st._dur - .2);
}
function csEnd() {
  const S = CS; CS = null; csHold = 0;
  voStop('cine');
  if (state === 'cutscene') state = 'playing';
  if (S && S.onDone) S.onDone();
}
function drawCutscene() {
  const S = CS; if (!S) return;
  const s = clamp(Math.min(W / 1400, H / 860), .62, 1.2), bh = H * .12 * easeOut(S.bars);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
  ctx.fillStyle = rgba(CARR[0], .22 * S.bars); ctx.fillRect(0, bh, W, 1); ctx.fillRect(0, H - bh - 1, W, 1);
  if (S.card) {
    const k = realT - S.card.t, a = Math.max(0, Math.min(1, k / .4, (S.card.dur - k) / .6));
    if (a > 0) {
      const y = H * .4, lw = easeOut(k / .8) * 230 * s;
      ctx.strokeStyle = rgba(CARR[0], a * .5); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(W / 2 - lw, y + 26 * s); ctx.lineTo(W / 2 + lw, y + 26 * s); ctx.stroke();
      glitchText(S.card.title, W / 2, y, 50 * s, S.card.col || CARR[3], a, 'center', 600, `${14 * s}px`, k < .8 ? 3 : 0);
      text(S.card.sub, W / 2, y + 50 * s, 14 * s, CARR[0], a * .85, 'center', 600, `${8 * s}px`);
    }
  }
  if (MS.call) {
    const k = realT - MS.call.t, dur = MS.call.big ? 2.3 : 1.5;
    if (k <= dur) {
      const a = Math.min(1, k / .12, (dur - k) / .4), pop = 1 + Math.max(0, .4 - k * 2.4), sz = (MS.call.big ? 52 : 34) * s;
      ctx.save(); ctx.translate(W / 2, H * .3); ctx.scale(pop, pop);
      glitchText(MS.call.text, 0, 0, sz, CARR[MS.call.col], a, 'center', 700, `${(MS.call.big ? 12 : 8) * s}px`, k < .3 ? 3 : 0);
      if (MS.call.sub) text(MS.call.sub, 0, sz * .78, 14 * s, CARR[3], a * .85, 'center', 600, `${5 * s}px`);
      ctx.restore();
    }
  }
  if (S.sub && bh > 20) {
    const k = realT - S.sub.t, who = S.sub.who;
    const col = who === 'ECHO' ? CARR[0] : who === 'CONDUCTOR' || who === 'FOREMAN' ? CARR[1] : CARR[2];
    const y = H - bh * .66;
    text(who, W / 2, y - 18 * s, 10 * s, col, .95, 'center', 700, `${6 * s}px`);
    ctx.font = `500 ${18 * s}px ${FONT}`;
    const lines = wrapLines(S.sub.text, Math.min(W * .72, 860 * s));
    let left = Math.floor(k * 45);
    lines.forEach((l, i) => { const t = l.slice(0, Math.max(0, left)); left -= l.length + 1; if (t) text(t, W / 2, y + 6 * s + i * 22 * s, 18 * s, CARR[3], .95, 'center', 500, '0.4px'); });
  }
  const hk = csHold ? Math.min(1, (realT - csHold) / .7) : 0, hy = bh * .5;
  if (bh > 20) {
    text('HOLD SPACE  SKIP   ·   CLICK  NEXT', W - 52 * s, hy, 10 * s, CARR[3], .4 + .4 * hk, 'right', 600, `${4 * s}px`);
    ctx.strokeStyle = rgba(CARR[3], .2); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(W - 34 * s, hy, 8 * s, 0, TAU); ctx.stroke();
    if (hk > 0) { ctx.strokeStyle = rgba(CARR[0], 1); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(W - 34 * s, hy, 8 * s, -PI / 2, -PI / 2 + TAU * hk); ctx.stroke(); }
    text(`LEVEL ${LV.num}  ·  ${LV.name}`, 30 * s, hy, 10 * s, CARR[0], .45, 'left', 600, `${5 * s}px`);
  }
}

// ---------- the scenes ----------
const csAt = (x, y, z) => [(x + .5) * T, (y + .5) * T, z];
const csP = z => () => [player.x, player.y, z ?? 1];
function sweepPings(pts, col, gap) { pts.forEach(([x, y, r], i) => timers.push({ t: time + i * gap, cine: true, fn: () => emitSound((x + .5) * T, (y + .5) * T, { hear: 0, reveal: r, col, owner: 'env', str: .8, force: true }) })); }
function drone() { if (AU.ctx && !AU.muted) { tone({ vol: .07, dur: 4, f0: 55, f1: 52, type: 'sawtooth', echo: .7, attack: 1 }); tone({ vol: .05, dur: 4, f0: 82.5, f1: 80, type: 'triangle', echo: .7, attack: 1.2 }); } }
function engine() { if (AU.ctx && !AU.muted) { tone({ vol: .12, dur: 3, f0: 48, f1: 44, type: 'sawtooth', echo: .3, attack: .4 }); noise({ vol: .08, dur: 3, f0: 260, type: 'lowpass', echo: .3, attack: .4 }); } }

function cutIntro() {
  if (LV.id === 2) return playCutscene([
    { snap: csAt(52, 10, .5), card: ['THE FOUNDRY', 'THE RIVER  ·  2:14 AM  ·  STORM', 3.4], dur: 2.8, ping: csAt(52, 10, 900).slice(0, 2).concat([900, 3]),
      fn: () => { MS.lightning = realT; drone(); timers.push({ t: time + .4, cine: true, fn: () => { if (AU.ctx && !AU.muted) noise({ vol: .5, dur: 3, f0: 300, f1: 40, echo: .9, attack: .08 }); } }); } },
    { cam: csAt(28, 17, .62), dur: 3, fn: () => sweepPings([[22, 17, 420], [30, 17, 420], [37, 17, 420]], 2, .7) },
    { cam: csAt(10, 36, .72), say: ['MARCUS', "Storm's right on top of you. Every time it thunders, they can't hear you. Move then."], keep: true },
    { cam: csP(1), say: ['ECHO', 'Rain on steel. Just like the alley.'], keep: true, fn: () => { SFX.sonar(); emitSound(player.x, player.y, { hear: 0, reveal: 520, col: 0, owner: 'env', str: .9, force: true }); } },
  ]);
  playCutscene([
    { snap: csAt(52, 6, .55), card: ['THE ARCHIVE', "THE QUIET'S ARCHIVE  ·  SUBLEVEL 3", 3.4], dur: 2.8, ping: [53.5 * T, 6.5 * T, 650, 1], fn: drone },
    { cam: csAt(30, 18, .6), dur: 3, fn: () => sweepPings([[44, 4, 380], [30, 8, 420], [26, 18, 520], [48, 18, 480]], 0, .6) },
    { cam: csAt(10, 34, .72), say: ['MARCUS', "You're in. The vault key is somewhere on this floor — listen for it. Ping them, then strike before they move."], keep: true },
    { cam: csP(1), say: ['ECHO', 'I hear them. Every one of them.'], keep: true, fn: () => { SFX.sonar(); emitSound(player.x, player.y, { hear: 0, reveal: 520, col: 0, owner: 'env', str: .9, force: true }); } },
  ]);
}
function cutKey() {
  const vx = BOSS.vault[0] * T, vy = BOSS.vault[1] * T;
  playCutscene([
    { cam: [vx, vy, .85], dur: 2, fn: () => timers.push({ t: time + 1.2, cine: true, fn: () => { SFX.door(vx, vy); emitSound(vx, vy, { hear: 0, reveal: 280, col: 2, owner: 'env', str: 1, force: true }); } }) },
    { say: ['MARCUS', "That's the vault key. The Conductor's in there with the ledger — he's the one who gave the order, Elias."], keep: true },
    { cam: csP(1), say: ['ECHO', "Then that's where I'm going."], keep: true },
  ]);
}
function cutBoss(e, skip) {
  cine(skip, [
    { cam: [45.5 * T, 3 * T, 1.15], dur: 1.1, ping: [45.5 * T, 3 * T, 160, 1], fn: () => SFX.door(45.5 * T, 3 * T) },
    { cam: [e.x, e.y, 1.15], dur: 1.6, fn: () => { emitSound(e.x, e.y, { hear: 0, reveal: 420, col: 1, owner: 'enemy', str: 1.1, force: true }); bossSound('hum', e); callout('THE CONDUCTOR', 'HE HEARS EVERYTHING', 1, true); } },
    { cam: [e.x, e.y, 1.32], say: ['CONDUCTOR', 'Calder. I still remember her song. Four notes, wasn\'t it?'], keep: true, fn: () => { e.litS = 1.2; e.litT = time; } },
    { cam: csP(1), say: ['ECHO', 'You should have finished it.'], keep: true },
  ], () => radio('MARCUS', "Don't let him in your head. He's blind too — make him listen to the wrong thing."));
}
function cutBossDown(e) {
  const x = e.x, y = e.y;
  playCutscene([
    { cam: [x, y, 1.4], dur: 1.8 },
    { say: ['ECHO', 'That was for Lena.'], keep: true },
    { cam: csP(1), say: ['MARCUS', "It's done. Grab the ledger — every name is in it."], keep: true },
  ]);
}
function cutEscape(fromCp) {
  cine(fromCp, [
    { cam: csAt(30, 20, .5), dur: 2.4, fn: () => { MS.sirenPulse = realT; for (const [sx, sy] of (LV.sirens || SIRENS)) emitSound((sx + .5) * T, (sy + .5) * T, { hear: 0, reveal: 560, col: 1, owner: 'env', str: .6, force: true }); if (AU.ctx && !AU.muted) { tone({ vol: .06, dur: .8, f0: 620, f1: 900, type: 'square', echo: .3 }); tone({ vol: .06, dur: .8, f0: 900, f1: 620, type: 'square', echo: .3, delay: .85 }); } } },
    { say: ['MARCUS', "Alarm's up — the whole building knows. I'm at the loading dock where you came in. Ninety seconds!"], keep: true },
    { cam: csP(1), say: ['ECHO', 'Keep the engine running.'], keep: true },
  ], () => callout('ALARM', 'REACH MARCUS · 90 SECONDS', 1, true));
}
function cutGates() {
  playCutscene([
    { cam: csAt(53, 19, .85), dur: 1.9, fn: () => { for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) { d.open = true; d.amt = 0; } SFX.door(53 * T, 20 * T); emitSound(53 * T, 20 * T, { hear: 0, reveal: 420, col: 2, owner: 'env', str: 1, force: true }); } },
    { cam: csAt(52, 10, .7), say: ['MARCUS', "PA's dead. The furnace hall is open. Kade's inside."], keep: true },
    { cam: csP(1), say: ['ECHO', "Then he's waiting for me."], keep: true },
  ]);
}
function cutForeman(e, skip) {
  cine(skip, [
    { cam: csAt(53, 19.5, 1.1), dur: 1, ping: csAt(53, 20).slice(0, 2).concat([180, 1]), fn: () => SFX.door(53 * T, 20 * T) },
    { cam: [e.x, e.y, 1.15], dur: 1.7, fn: () => timers.push({ t: time + .7, cine: true, fn: () => {
      emitSound(e.x, e.y, { hear: 0, reveal: 520, col: 1, owner: 'enemy', str: 1.1, force: true }); SFX.boom(e.x, e.y); shake = Math.max(shake, 14);
      ring(e.x, e.y, 10, 200, 1, .5, 4); sparks(e.x, e.y, 0, 30, 2, 500, PI); e.swingT = time; e.litS = 1.2; e.litT = time;
      callout('THE FOREMAN', 'PLATED IN FRONT · MAKE HIM CHARGE A WALL', 1, true);
    } }) },
    { cam: [e.x, e.y, 1.3], say: ['FOREMAN', "So you're the ghost who killed the Conductor. I don't need ears to break you, Calder."], keep: true },
    { cam: csP(1), dur: 1.2 },
  ], () => radio('MARCUS', "He's plated in front. Make him charge into something solid, then hit him from behind."));
}
function cutForemanDown(e) {
  const x = e.x, y = e.y;
  playCutscene([
    { cam: [x, y, 1.4], dur: 1.8 },
    { say: ['ECHO', 'Nothing left to hear.'], keep: true },
    { cam: csP(1), say: ['MARCUS', "That's Kade. Grab the manifest and get to the north pier. I'm bringing the boat around."], keep: true },
  ]);
}
function cutEscape2(fromCp) {
  const dogs = () => enemies.filter(e => !e.dead && e.type === 'hound' && String(e.id)[0] === 'r');
  cine(fromCp, [
    { cam: () => { const d = dogs()[0]; return d ? [d.x, d.y, .8] : csAt(30, 20, .55); }, dur: 2.2,
      fn: () => dogs().forEach((h, i) => timers.push({ t: time + .3 + i * .35, cine: true, fn: () => { SFX.dog(h.x, h.y); emitSound(h.x, h.y, { hear: 0, reveal: 170, col: 1, owner: 'enemy', str: 1, force: true }); h.litS = 1.1; h.litT = time; h.gx = h.x; h.gy = h.y; } })) },
    { say: ['MARCUS', "They're letting the dogs loose. North pier, Elias. Seventy-five seconds!"], keep: true },
    { cam: csP(1), say: ['ECHO', 'I hear them coming.'], keep: true },
  ], () => callout('THE DOGS ARE OUT', 'REACH THE NORTH PIER · 75 SECONDS', 1, true));
}
// reaching Marcus: walk into the light, a last word, then the results
function extract() {
  if (MS.phase !== 'escape') return;
  MS.phase = 'extract';
  const P = player, o = exitObj;
  const lines = LV.id === 2
    ? [{ say: ['MARCUS', "Get in. That's two of them."] }, { say: ['ECHO', "There are more names in the manifest."] }, { say: ['MARCUS', 'There always are.'] }]
    : [{ say: ['MARCUS', "Get in. You're bleeding."] }, { say: ['ECHO', 'Not mine.'] }];
  playCutscene([
    { cam: [o.x, o.y, 1.3], dur: 1.6, move: { o: P, x: o.x, y: o.y }, fn: () => { o.litS = 1.2; o.litT = time; light(o.x, o.y, 320, 2, 2.5, 1); engine(); } },
    ...lines,
    { cam: [o.x, o.y, 1.6], dur: 1, fn: () => { ring(o.x, o.y, 10, 160, 2, .8, 3); emitSound(o.x, o.y, { hear: 0, reveal: 700, col: 2, owner: 'env', str: 1, force: true }); } },
  ], () => win());
}
