// =====================================================================
//  GADGETS & HAZARDS: PHANTOM PROJECTION · TRAPS · ECHO JAMMERS
// =====================================================================
const PHANTOM_CD = 11, PHANTOM_LIFE = 6.5, PHANTOM_R = 185;
const VIO = [178, 92, 255];
CARR[4] = VIO; // particle/ring colour only — reveals stay on colours 0-3 (floor buckets)
const JAM_R = { node: 250, carrier: 200, field: 190 };
let traps = [], jams = [], jamNades = [], phantom = null, jamK = 0, jamSfxT = 0, gprev = null, jamPat = null;

function buildGadgets(cp) {
  const gone = (list, id) => !!(cp && cp[list] && cp[list].includes(id));
  traps = LV.traps.map((t, id) => {
    const o = revealable({ id, k: t[0], gone: gone('traps', id), c: 1 });
    if (o.k === 'wire') {
      o.x1 = t[1] * T; o.y1 = t[2] * T; o.x2 = t[3] * T; o.y2 = t[4] * T; o.x = (o.x1 + o.x2) / 2; o.y = (o.y1 + o.y2) / 2;
    } else if (o.k === 'glass') {
      o.x0 = t[1] * T; o.y0 = t[2] * T; o.w = t[3] * T; o.h = t[4] * T; o.x = o.x0 + o.w / 2; o.y = o.y0 + o.h / 2; o.gone = false;
      let s = id * 977 + 13; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      o.shards = [];
      for (let i = 0, n = Math.round(t[3] * t[4] * 9); i < n; i++) o.shards.push({ x: o.x0 + 4 + rnd() * (o.w - 8), y: o.y0 + 4 + rnd() * (o.h - 8), r: 2.5 + rnd() * 5, a: rnd() * TAU, f: rnd() });
    } else {
      o.x = (t[1] + .5) * T; o.y = (t[2] + .5) * T; o.beepT = rand(0, 2); o.beepAt = -9; o.armT = -1;
    }
    return o;
  });
  jams = LV.jammers.map(([x, y], id) => revealable({ id, k: 'node', x: (x + .5) * T, y: (y + .5) * T, r: JAM_R.node, gone: gone('jams', id), humT: rand(0, 2.5), c: 2 }));
  jamNades = []; phantom = null; jamK = 0; gprev = null;
  player.phantomCD = 0; player.jammed = false;
}

// ---------- jamming ----------
function jamSources() {
  const out = [];
  for (const j of jams) if (!j.gone && (j.k === 'node' || j.end > time)) out.push(j);
  for (const e of enemies) if (e.type === 'jammer' && !e.dead) out.push({ x: e.x, y: e.y, r: JAM_R.carrier, carrier: e });
  return out;
}
function jamAt(x, y) {
  let k = 0;
  for (const s of jamSources()) { const d = Math.hypot(s.x - x, s.y - y); if (d < s.r) k = Math.max(k, clamp((s.r - d) / 55, 0, 1)); }
  return k;
}
function jamFizzle(what) {
  const P = player;
  SFX.jam(.35);
  emitSound(P.x, P.y, { hear: 140, reveal: 0, col: 0, owner: 'player' });
  sparks(P.x, P.y, rand(0, TAU), 8, 4, 260, PI);
  if (realT - msg.t > 1.2) showMsg(`${what} JAMMED  ·  FIND THE TRANSMITTER`, 1);
}
function destroyNode(j, silent) {
  if (j.gone) return;
  j.gone = true;
  stats.score += 400;
  popups.push({ x: j.x, y: j.y - 26, text: 'JAMMER DOWN  +400', t: time, c: 0, size: 16, vy: -22, pop: true });
  callout('SIGNAL RESTORED', 'JAMMER DESTROYED  +400', 0);
  emitSound(j.x, j.y, { hear: silent ? 60 : 260, reveal: 620, col: 0, owner: 'player', str: 1, force: true });
  ring(j.x, j.y, 6, 120, 4, .6, 3); ring(j.x, j.y, 6, 60, 3, .3, 2);
  sparks(j.x, j.y, 0, 26, 4, 520, PI); smoke(j.x, j.y, 5, .8);
  light(j.x, j.y, 260, 0, .5, 1);
  shake = Math.max(shake, 6); hitstop = Math.max(hitstop, .05);
  SFX.nodeDown(j.x, j.y);
}
function throwJam(e) {
  const k = e.know;
  jamNades.push({ x: e.x, y: e.y, x0: e.x, y0: e.y, x1: k.x, y1: k.y, t: 0, dur: .6, rot: 0 });
  e.jamCD = rand(8, 10);
  popups.push({ x: e.x, y: e.y - 30, text: 'JAM OUT', t: time, c: 1, size: 13, vy: -12 });
  emitSound(e.x, e.y, { hear: 0, reveal: 110, col: 1, owner: 'enemy', str: .8, ind: true });
  SFX.swish();
}
// the carrier: a hunter with a transmitter on his back. Throws jam charges at whatever he heard.
function updJammer(e, dt, age) {
  e.jamCD = (e.jamCD ?? rand(1, 3)) - dt;
  if (e.jamCD > 0 || !e.know || age > 1.4 || (e.state !== 'hunt' && e.state !== 'search')) return;
  const d = Math.hypot(e.know.x - e.x, e.know.y - e.y);
  if (d > 90 && d < 440 && los(e.x, e.y, e.know.x, e.know.y)) throwJam(e);
}

// ---------- traps ----------
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l2 = dx * dx + dy * dy, t = l2 ? clamp(((px - x1) * dx + (py - y1) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
function segCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx); if (Math.abs(d) < 1e-9) return false;
  const u = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d, v = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
}
function glassAt(x, y) {
  for (const t of traps) if (t.k === 'glass' && x > t.x0 && x < t.x0 + t.w && y > t.y0 && y < t.y0 + t.h) return t;
  return null;
}
function glassCrunch(g, x, y, isPlayer, running) {
  g.litS = Math.max(.9, flash(g.litS, g.litT)); g.litT = time;
  if (isPlayer) {
    emitSound(x, y, { hear: running ? 480 : 330, reveal: 250, col: 2, owner: 'player', str: .85, trail: true });
    popups.push({ x: x + rand(-8, 8), y: y - 20, text: 'CRUNCH', t: time, c: 2, size: 12, vy: -12 });
    if (!MS.said.glass) { MS.said.glass = 1; radio('MARCUS', 'Glass on the floor. They can hear every step on it — dash across.'); }
  } else emitSound(x, y, { hear: 0, reveal: 240, col: 1, owner: 'enemy', str: .9, ind: true, trail: true });
  sparks(x, y, rand(0, TAU), 5, 3, 160, PI);
  SFX.crunch(x, y);
}
function tripWire(w) {
  w.gone = true; w.litS = 1.2; w.litT = time;
  emitSound(w.x, w.y, { hear: 1050, reveal: 680, col: 1, owner: 'env', str: 1, force: true, ind: true });
  SFX.bell(w.x, w.y);
  callout('TRIPWIRE', 'THE WHOLE HOUSE HEARD THAT', 1);
  popups.push({ x: w.x, y: w.y - 24, text: 'RIIIING', t: time, c: 1, size: 18, vy: -18, pop: true });
  sparks(w.x1, w.y1, 0, 8, 1, 260, PI); sparks(w.x2, w.y2, 0, 8, 1, 260, PI);
  light(w.x, w.y, 200, 1, .4, 1); shake = Math.max(shake, 7); zoomPunch = Math.max(zoomPunch, .03);
  if (!MS.said.wire) { MS.said.wire = 1; radio('MARCUS', 'Tripwire. Every one of them just heard where you are. Ping ahead — a knife cuts those.'); }
}
function armMine(m, delay) {
  if (m.gone || m.armT >= 0) return;
  m.armT = delay; m.litS = 1.2; m.litT = time;
  SFX.arm(m.x, m.y);
  emitSound(m.x, m.y, { hear: 0, reveal: 110, col: 2, owner: 'env', str: 1, force: true });
  popups.push({ x: m.x, y: m.y - 24, text: 'CLICK', t: time, c: 2, size: 16, vy: -14, pop: true });
}
function mineBlast(m) {
  if (m.gone) return;
  m.gone = true; m.armT = -1;
  emitSound(m.x, m.y, { hear: 820, reveal: 820, col: 2, owner: 'env', str: 1.15, force: true, ind: true });
  SFX.boom(m.x, m.y);
  const dp = Math.hypot(player.x - m.x, player.y - m.y);
  shake = Math.max(shake, 20 * Math.max(.25, 1 - dp / 900)); zoomPunch = Math.max(zoomPunch, .05 * Math.max(.3, 1 - dp / 900));
  pp({ k: 'fire', x: m.x, y: m.y, vx: 0, vy: 0, life: .4, max: .4, c: 2, r1: 95 });
  ring(m.x, m.y, 8, 150, 3, .3, 4); ring(m.x, m.y, 8, 110, 2, .5, 2);
  light(m.x, m.y, 380, 2, .5, 1.1); smoke(m.x, m.y, 9, 1.1);
  for (let i = 0; i < 40; i++) { const a = rand(0, TAU), s = rand(120, 700); pp({ k: 'spark', x: m.x, y: m.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.25, .7), max: .7, c: i % 3 ? 2 : 3, s: rand(1.2, 2.4), drag: 3 }); }
  decals.push({ x: m.x, y: m.y, r: 34, k: 'scorch', rot: rand(0, TAU) });
  for (const e of enemies) if (!e.dead && !e.hidden && Math.hypot(e.x - m.x, e.y - m.y) < 115 && los(m.x, m.y, e.x, e.y)) {
    if (e.type === 'boss') damageEnemy(e, 6, 'blast', false); else { e.hp = 1; damageEnemy(e, 99, 'blast', false); }
  }
  if (dp < 100 && !player.dead && los(m.x, m.y, player.x, player.y)) { player.iframe = 0; damagePlayer(2, m.x, m.y); }
  for (const b of barrels) if (!b.gone && Math.hypot(b.x - m.x, b.y - m.y) < 130) timers.push({ t: time + .14, fn: () => explode(b) });
  for (const o of traps) if (o.k === 'mine' && !o.gone && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 130) armMine(o, .15);
}
function disarmBonus(x, y, label, pts) {
  stats.score += pts;
  popups.push({ x, y: y - 24, text: `${label}  +${pts}`, t: time, c: 0, size: 15, vy: -20, pop: true });
  ring(x, y, 4, 50, 0, .35, 2); sparks(x, y, 0, 10, 0, 240, PI);
  SFX.disarm();
}
// knife: cuts wires, disarms mines, smashes jammers. Returns true if it hit something.
function knifeGadgets(P) {
  const hx = P.x + Math.cos(P.a) * 26, hy = P.y + Math.sin(P.a) * 26;
  let hit = false;
  for (const t of traps) {
    if (t.gone || t.k === 'glass') continue;
    // generous reach: the hand OR the body close enough counts — you can't always see what you're cutting
    if (t.k === 'wire' && Math.min(segDist(hx, hy, t.x1, t.y1, t.x2, t.y2), segDist(P.x, P.y, t.x1, t.y1, t.x2, t.y2) - 10) < 40) { t.gone = true; disarmBonus(hx, hy, 'WIRE CUT', 200); hit = true; }
    if (t.k === 'mine' && t.armT < 0 && Math.min(Math.hypot(t.x - hx, t.y - hy), Math.hypot(t.x - P.x, t.y - P.y) - 12) < 48) {
      t.gone = true; disarmBonus(t.x, t.y, 'DISARMED', 250); hit = true;
      if (!MS.said.disarm) { MS.said.disarm = 1; callout('MINE DISARMED', 'SHOOT THEM NEAR ENEMIES INSTEAD', 0); }
    }
  }
  for (const j of jams) if (!j.gone && j.k === 'node' && Math.min(Math.hypot(j.x - hx, j.y - hy), Math.hypot(j.x - P.x, j.y - P.y) - 12) < 50) { destroyNode(j, true); hit = true; }
  return hit;
}
// bullets: detonate mines, wreck jammers
function gadgetBulletHit(b) {
  for (const t of traps) if (t.k === 'mine' && !t.gone && Math.hypot(t.x - b.x, t.y - b.y) < 18) { armMine(t, .06); return true; }
  for (const j of jams) if (!j.gone && j.k === 'node' && Math.hypot(j.x - b.x, j.y - b.y) < 34) { if (b.o === 'p') destroyNode(j, false); return true; }
  return false;
}

// ---------- PHANTOM: a projected echo of you that walks, breathes, and draws them in ----------
function castPhantom() {
  const P = player;
  if (phantom) return shatterPhantom(true);
  if (P.phantomCD > 0) { SFX.empty(); return; }
  if (P.jammed) return jamFizzle('PHANTOM');
  const mw = screenToWorld(mouse.x, mouse.y), a = Math.atan2(mw.y - P.y, mw.x - P.x);
  let path = [];
  if (passable(Math.floor(mw.x / T), Math.floor(mw.y / T)) && Math.hypot(mw.x - P.x, mw.y - P.y) < 900) path = findPath(P.x, P.y, mw.x, mw.y).slice(0, 18);
  if (!path.length) {
    const d = Math.max(30, Math.min(560, rayDist(P.x, P.y, Math.cos(a), Math.sin(a), 560) - 20));
    path = [[P.x + Math.cos(a) * d, P.y + Math.sin(a) * d]];
  }
  phantom = { x: P.x, y: P.y, a, ma: a, ph: 0, mv: 0, path, pi: 0, t: PHANTOM_LIFE, t0: time, stepAcc: 0, beatT: .2, lookT: 0 };
  P.phantomCD = PHANTOM_CD;
  SFX.phantom();
  ring(P.x, P.y, 8, 70, 0, .45, 2);
  for (let i = 0; i < 14; i++) { const aa = rand(0, TAU); pp({ k: 'spark', x: P.x, y: P.y, vx: Math.cos(aa) * 180, vy: Math.sin(aa) * 180, life: .3, max: .3, c: 0, s: 1.2, drag: 4 }); }
  if (!MS.said.phantom) { MS.said.phantom = 1; callout('PHANTOM', 'THEY CHASE IT · G AGAIN TO SHATTER IT', 0); }
}
function updPhantom(dt) {
  const f = phantom; if (!f) return;
  f.t -= dt;
  if (f.t <= 0) return shatterPhantom(false);
  if (f.pi < f.path.length) {
    const [tx, ty] = f.path[f.pi], dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy), step = 205 * dt;
    if (d < step + 1) { f.x = tx; f.y = ty; f.pi++; }
    else { f.x += dx / d * step; f.y += dy / d * step; }
    const ma = Math.atan2(dy, dx); f.ma = turnTo(f.ma, ma, dt * 12); f.a = turnTo(f.a, ma, dt * 8);
    f.mv = Math.min(1, f.mv + dt * 5); f.ph += step * PI / 54; f.stepAcc += step;
    if (f.stepAcc > 54) {
      f.stepAcc = 0;
      emitSound(f.x, f.y, { hear: 330, reveal: 190, col: 0, owner: 'decoy', str: .6, trail: true, force: true });
      SFX.step(f.x, f.y, .32, false);
    }
  } else {
    f.mv = Math.max(0, f.mv - dt * 4);
    f.lookT -= dt; if (f.lookT <= 0) { f.lookT = rand(.6, 1.4); f.look = f.a + rand(-1.4, 1.4); }
    f.a = turnTo(f.a, f.look ?? f.a, dt * 4);
    f.beatT -= dt;
    if (f.beatT <= 0) {
      f.beatT = .85;
      emitSound(f.x, f.y, { hear: 380, reveal: 150, col: 0, owner: 'decoy', str: .55, force: true });
      const s = spat(f.x, f.y, 1300); if (AU.ctx && !AU.muted) tone({ pan: s.pan, vol: .22 * s.vol + .02, dur: .15, f0: 70, f1: 46, echo: .5 });
    }
  }
  for (const e of enemies) if (!e.dead && !e.hidden && e.state !== 'stun' && Math.hypot(e.x - f.x, e.y - f.y) < e.r + 20) return shatterPhantom(true);
}
function shatterPhantom(burst) {
  const f = phantom; if (!f) return;
  phantom = null;
  if (!burst) { ring(f.x, f.y, 6, 50, 0, .4, 1.5); smoke(f.x, f.y, 3, .5); return; }
  let n = 0;
  for (const e of enemies) {
    if (e.dead || e.hidden) continue;
    const d = Math.hypot(e.x - f.x, e.y - f.y);
    if (d > PHANTOM_R || !los(f.x, f.y, e.x, e.y)) continue;
    n++;
    e.markT = time + d / WAVE_SPEED; e.markEnd = e.markT + (e.type === 'boss' ? 3.2 : 4.5);
    if (e.type === 'boss') { e.cd = Math.max(e.cd, 1.4); e.state = 'hunt'; e.flinch = .8; popups.push({ x: e.x, y: e.y - 48, text: 'DAZED', t: time, c: 0, size: 18, vy: -14, pop: true }); continue; }
    e.state = 'stun'; e.stunT = 2.4; e.pstun = true; e.path = null;
    e.litS = 1; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a; e.gpose = { stun: true };
    popups.push({ x: e.x, y: e.y - 26, text: 'FROZEN', t: time, c: 0, size: 13, vy: -12 });
  }
  emitSound(f.x, f.y, { hear: 0, reveal: 520, col: 0, owner: 'env', str: 1.05, force: true });
  ring(f.x, f.y, 10, PHANTOM_R, 0, .45, 4); ring(f.x, f.y, 6, PHANTOM_R * .6, 3, .3, 2);
  for (let i = 0; i < 34; i++) { const a = rand(0, TAU), s = rand(160, 620); pp({ k: 'spark', x: f.x, y: f.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(.2, .5), max: .5, c: i % 4 ? 0 : 3, s: 1.5, drag: 5 }); }
  light(f.x, f.y, 300, 0, .45, 1.2);
  shake = Math.max(shake, 7); zoomPunch = Math.max(zoomPunch, .035);
  SFX.shatter(f.x, f.y);
  if (n) {
    stats.score += n * 150;
    callout(n >= 2 ? `PHANTOM x${n}` : 'PHANTOM', `FROZEN · MARKED · STRIKE THEM  +${n * 150}`, 0, n >= 2);
    slowT = Math.max(slowT, .25 + n * .08);
  }
}

// ---------- per-frame ----------
function updGadgets(dt) {
  const P = player;
  P.phantomCD = Math.max(0, (P.phantomCD || 0) - dt);
  updPhantom(dt);
  // tripwires: did the player's body cross one this frame?
  if (gprev && !P.dead && !P.strike) for (const w of traps) {
    if (w.k !== 'wire' || w.gone) continue;
    if (segCross(gprev.x, gprev.y, P.x, P.y, w.x1, w.y1, w.x2, w.y2) || segDist(P.x, P.y, w.x1, w.y1, w.x2, w.y2) < 5) tripWire(w);
  }
  gprev = { x: P.x, y: P.y };
  // mines: beep faster the closer you are, click, then blow
  for (const m of traps) {
    if (m.k !== 'mine' || m.gone) continue;
    const dp = Math.hypot(P.x - m.x, P.y - m.y);
    if (m.armT >= 0) {
      m.armT -= dt;
      if (Math.floor(m.armT * 20) !== Math.floor((m.armT + dt) * 20)) { m.litS = 1.2; m.litT = time; }
      if (m.armT <= 0) mineBlast(m);
      continue;
    }
    m.beepT -= dt;
    if (m.beepT <= 0) {
      m.beepT = lerp(.28, 2.2, clamp((dp - 50) / 420, 0, 1)); m.beepAt = time;
      if (dp < 700) { SFX.beep(m.x, m.y); emitSound(m.x, m.y, { hear: 0, reveal: 48, col: 1, owner: 'env', str: .9 }); }
      if (dp < 260 && !MS.said.mine) { MS.said.mine = 1; radio('MARCUS', 'That beeping is a mine. Ping to find it — cut it with the knife, or shoot it when they\'re standing on it.'); }
    }
    if (!P.dead && dp < 32) { armMine(m, .5); continue; }
    for (const e of enemies) if (!e.dead && !e.hidden && e.type !== 'boss' && (e.state === 'hunt' || e.state === 'search') && Math.hypot(e.x - m.x, e.y - m.y) < 28) { armMine(m, .35); break; }
  }
  // jammer nodes hum so you can hunt them down
  for (const j of jams) {
    if (j.gone || j.k !== 'node') continue;
    j.humT -= dt;
    if (j.humT <= 0) { j.humT = 2.4; const d = Math.hypot(P.x - j.x, P.y - j.y); if (d < 900) { emitSound(j.x, j.y, { hear: 0, reveal: 95, col: 2, owner: 'env', str: .8 }); SFX.nodeHum(j.x, j.y); } }
  }
  for (let i = jams.length - 1; i >= 0; i--) if (jams[i].k === 'field' && jams[i].end < time) jams.splice(i, 1);
  // jam charges in flight
  for (let i = jamNades.length - 1; i >= 0; i--) {
    const n = jamNades[i]; n.t += dt; n.rot += dt * 14;
    const k = Math.min(1, n.t / n.dur); n.x = lerp(n.x0, n.x1, k); n.y = lerp(n.y0, n.y1, k);
    if (k >= 1) {
      jamNades.splice(i, 1);
      jams.push({ k: 'field', x: n.x, y: n.y, r: JAM_R.field, end: time + 6.5, t0: time });
      emitSound(n.x, n.y, { hear: 0, reveal: 220, col: 1, owner: 'enemy', str: .9, ind: true });
      ring(n.x, n.y, 6, JAM_R.field, 4, .6, 3); sparks(n.x, n.y, 0, 14, 4, 320, PI);
      SFX.jam(.5);
    }
  }
  // are we jammed?
  jamK = P.dead ? 0 : jamAt(P.x, P.y);
  const was = P.jammed; P.jammed = jamK > .5;
  if (P.jammed && !was) {
    SFX.jam(.5);
    for (const e of enemies) if (e.markEnd > time) e.markEnd = time; // marks die in the static
    if (!MS.said.jam) { MS.said.jam = 1; radio('MARCUS', "They're jamming you — no sonar, no strike in there. Find the transmitter and break it."); }
  }
  if (jamK > 0 && AU.ctx && !AU.muted) { jamSfxT -= dt; if (jamSfxT <= 0) { jamSfxT = .32; noise({ vol: .035 * jamK, dur: .36, f0: rand(1800, 5200), type: 'bandpass', q: 1.2, echo: 0 }); } }
}

// ---------- drawing ----------
function drawTraps() {
  for (const t of traps) {
    if (t.gone || t.x < vx0 - 120 || t.x > vx1 + 120 || t.y < vy0 - 120 || t.y > vy1 + 120) continue;
    if (t.k === 'glass') {
      const a = Math.min(1, Math.max(alphaOf(t) * 1.1, glintAlpha(t, 0) * .6)); if (a < .03) continue;
      for (const s of t.shards) {
        const tw = .6 + .4 * Math.sin(realT * 3 + s.f * 20);
        ctx.strokeStyle = rgba(CARR[3], a * (.35 + .5 * s.f) * tw); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(s.x + Math.cos(s.a) * s.r, s.y + Math.sin(s.a) * s.r);
        ctx.lineTo(s.x + Math.cos(s.a + 2.3) * s.r * .6, s.y + Math.sin(s.a + 2.3) * s.r * .6);
        ctx.lineTo(s.x + Math.cos(s.a + 3.9) * s.r * .8, s.y + Math.sin(s.a + 3.9) * s.r * .8); ctx.closePath(); ctx.stroke();
      }
      ctx.strokeStyle = rgba(CARR[2], a * .25); ctx.setLineDash([3, 7]); ctx.strokeRect(t.x0 + 2, t.y0 + 2, t.w - 4, t.h - 4); ctx.setLineDash([]);
      continue;
    }
    if (t.k === 'wire') {
      const near = Math.max(0, 1 - segDist(player.x, player.y, t.x1, t.y1, t.x2, t.y2) / 80) * .75;
      const a = Math.min(1, Math.max(alphaOf(t) * 1.2, near)); if (a < .03) continue;
      const h = .02, [ax, ay] = [ex(t.x1, h), ey(t.y1, h)], [bx, by] = [ex(t.x2, h), ey(t.y2, h)];
      ctx.strokeStyle = rgba(CARR[1], a * .9); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.strokeStyle = rgba(CARR[1], a * .25); ctx.lineWidth = 4; ctx.stroke();
      for (const [px, py, qx, qy] of [[t.x1, t.y1, ax, ay], [t.x2, t.y2, bx, by]]) { ctx.strokeStyle = rgba(CARR[1], a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(qx, qy, 3.5, 0, TAU); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); }
      // bell
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      ctx.fillStyle = rgba(CARR[2], a * .3); ctx.strokeStyle = rgba(CARR[2], a); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(mx - 4, my + 3); ctx.quadraticCurveTo(mx - 4, my - 6, mx, my - 6); ctx.quadraticCurveTo(mx + 4, my - 6, mx + 4, my + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
      continue;
    }
    // mine
    const beep = Math.max(0, 1 - (time - t.beepAt) / .25), armed = t.armT >= 0;
    const a = Math.min(1, Math.max(alphaOf(t), glintAlpha(t, 0), beep * .55, armed ? 1 : 0)); if (a < .03) continue;
    ctx.strokeStyle = rgba(CARR[1], a); ctx.lineWidth = 1.5; ctx.fillStyle = rgba(CARR[1], a * .12);
    ctx.beginPath(); ctx.arc(t.x, t.y, 9, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const aa = i * PI / 2 + PI / 4; ctx.moveTo(t.x + Math.cos(aa) * 9, t.y + Math.sin(aa) * 9); ctx.lineTo(t.x + Math.cos(aa) * 14, t.y + Math.sin(aa) * 14); } ctx.stroke();
    const on = armed ? Math.floor(realT * 24) % 2 === 0 : beep > .3;
    ctx.fillStyle = on ? 'rgba(255,235,235,1)' : rgba(CARR[1], a * .6); ctx.beginPath(); ctx.arc(t.x, t.y, on ? 3.2 : 2.2, 0, TAU); ctx.fill();
    if (armed) { ctx.strokeStyle = rgba(CARR[2], .9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(t.x, t.y, 100, 0, TAU); ctx.stroke(); ctx.strokeStyle = rgba(CARR[1], .5); ctx.beginPath(); ctx.arc(t.x, t.y, 14 + (1 - t.armT / .5) * 80, 0, TAU); ctx.stroke(); }
  }
}
function jamRing(x, y, r, a, rot) {
  ctx.save(); ctx.translate(x, y);
  const g = ctx.createRadialGradient(0, 0, r * .55, 0, 0, r);
  g.addColorStop(0, rgba(VIO, 0)); g.addColorStop(1, rgba(VIO, .09 * a));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
  ctx.rotate(rot); ctx.setLineDash([10, 8]);
  ctx.strokeStyle = rgba(VIO, .55 * a * (.75 + .25 * Math.random())); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  ctx.setLineDash([2, 14]); ctx.lineWidth = 3; ctx.strokeStyle = rgba(VIO, .3 * a); ctx.beginPath(); ctx.arc(0, 0, r - 7, 0, TAU); ctx.stroke();
  ctx.setLineDash([]); ctx.restore();
}
function drawJams() {
  const P = player;
  for (const j of jams) {
    if (j.gone) continue;
    const d = Math.hypot(P.x - j.x, P.y - j.y);
    if (j.x < vx0 - j.r || j.x > vx1 + j.r || j.y < vy0 - j.r || j.y > vy1 + j.r) continue;
    const fa = j.k === 'field' ? Math.min(1, (j.end - time) / .6, (time - j.t0) / .2) : 1;
    const prox = clamp(1 - (d - j.r) / 380, 0, 1) * fa;
    if (prox > .02) jamRing(j.x, j.y, j.r, prox, realT * (j.k === 'field' ? .9 : .35));
    if (j.k === 'field') { ctx.fillStyle = rgba(VIO, .8 * fa); ctx.beginPath(); ctx.arc(j.x, j.y, 3 + Math.random() * 2, 0, TAU); ctx.fill(); continue; }
    const a = Math.min(1, Math.max(alphaOf(j) * 1.2, glintAlpha(j, 0), P.jammed ? .4 + .2 * Math.sin(realT * 6) : 0)); if (a < .03) continue;
    const tx = ex(j.x, .05), ty = ey(j.y, .05);
    ctx.strokeStyle = rgba(VIO, a); ctx.lineWidth = 1.6; ctx.fillStyle = rgba(VIO, a * .12);
    ctx.beginPath(); ctx.rect(j.x - 10, j.y - 10, 20, 20); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(j.x, j.y); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty, 3, 0, TAU); ctx.stroke();
    for (let i = 0; i < 3; i++) { const r = ((realT * 1.3 + i / 3) % 1) * 30 + 6; ctx.strokeStyle = rgba(VIO, a * (1 - r / 36)); ctx.beginPath(); ctx.arc(tx, ty, r, -2.3, -.8); ctx.moveTo(tx + Math.cos(.8) * r, ty + Math.sin(.8) * r); ctx.arc(tx, ty, r, .8, 2.3); ctx.stroke(); }
  }
  for (const e of enemies) {
    if (e.type !== 'jammer' || e.dead) continue;
    const fa = flash(e.litS, e.litT); if (fa > .05) jamRing(e.gx, e.gy, JAM_R.carrier, fa * .8, realT * .6);
  }
  for (const n of jamNades) {
    const k = n.t / n.dur, h = Math.sin(k * PI) * 26;
    ctx.fillStyle = rgba(VIO, .25); ctx.beginPath(); ctx.ellipse(n.x, n.y, 4, 2.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(n.x, n.y - h); ctx.rotate(n.rot); ctx.strokeStyle = rgba(VIO, 1); ctx.lineWidth = 1.6; ctx.strokeRect(-4, -4, 8, 8); ctx.restore();
  }
}
function drawPhantom() {
  const f = phantom; if (!f) return;
  const life = Math.min(1, f.t / .7, (time - f.t0) / .25);
  const fl = .7 + .2 * Math.sin(realT * 23) + .1 * Math.sin(realT * 7.3);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(CARR[0], .3 * life); ctx.lineWidth = 1.2; ctx.setLineDash([4, 7]); ctx.lineDashOffset = -realT * 30;
  ctx.beginPath(); ctx.arc(f.x, f.y, 24, 0, TAU); ctx.stroke();
  ctx.strokeStyle = rgba(CARR[0], .1 * life); ctx.beginPath(); ctx.arc(f.x, f.y, PHANTOM_R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
  const tl = f.t / PHANTOM_LIFE; ctx.strokeStyle = rgba(CARR[0], .6 * life); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(f.x, f.y, 30, -PI / 2, -PI / 2 + TAU * tl); ctx.stroke();
  ctx.restore();
  const o = { kind: 'player', weapon: player.weapon, a: f.a, ma: f.ma, ph: f.ph, mv: f.mv, run: true, alpha: life * fl * .75, additive: true };
  drawCharacter(f.x + (Math.random() < .12 ? rand(-5, 5) : 0), f.y, o);
  if (Math.random() < .35) drawCharacter(f.x + rand(-7, 7), f.y + rand(-3, 3), { ...o, alpha: life * .22 });
}
function drawGadgetHUD(S, pad) {
  if (jamK > .02 && state === 'playing') {
    ctx.save();
    const n = Math.floor(6 + 26 * jamK);
    for (let i = 0; i < n; i++) { ctx.fillStyle = rgba(Math.random() < .5 ? VIO : CARR[3], rand(.02, .09) * jamK); ctx.fillRect(0, Math.random() * H, W, rand(1, 3.5) * S); }
    if (grain) {
      if (!jamPat) jamPat = ctx.createPattern(grain, 'repeat');
      ctx.globalAlpha = .06 * jamK; ctx.globalCompositeOperation = 'lighter';
      ctx.translate(-Math.random() * 256, -Math.random() * 256); ctx.fillStyle = jamPat; ctx.fillRect(0, 0, W + 256, H + 256);
    }
    ctx.restore();
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, rgba(VIO, 0)); g.addColorStop(1, rgba(VIO, .22 * jamK)); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (player.jammed) {
      const y = H - pad - 150 * S, jit = Math.random() < .2 ? rand(-6, 6) * S : 0;
      glitchText('SIGNAL JAMMED', W / 2 + jit, y, 18 * S, VIO, .75 + .25 * Math.sin(realT * 14), 'center', 700, `${7 * S}px`, 2);
      text('NO SONAR  ·  NO STRIKE  ·  NO PHANTOM', W / 2, y + 20 * S, 10 * S, CARR[3], .6, 'center', 600, `${3 * S}px`);
    }
  }
}
