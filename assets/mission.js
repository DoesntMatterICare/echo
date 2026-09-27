// =====================================================================
//  MISSION: ECHO STRIKE · THE CONDUCTOR · THE ESCAPE · CALLOUTS · RADIO
// =====================================================================
const STRIKE_R = 420;
const BOSS = { spawn: [53, 4], doors: [[45, 2], [45, 3]], vault: [45.5, 2.5], box: [46.8, 1.8, 59.2, 11.2] };
const SIRENS = [[27, 20], [57, 19], [28, 37], [51, 36], [8, 20], [30, 3]];
const SPAWNS = [[30, 8], [43, 3], [38, 19], [27, 29], [46, 37], [16, 37], [6, 24], [50, 28], [22, 40]];
let MS = { phase: 'infiltrate', shocks: [], said: {}, rq: [], recent: [] };

function initPhases(cp) {
  MS = {
    phase: cp ? 'vault' : 'infiltrate', chain: 0, chainT: -9, recent: [], call: null, radio: null, rq: [], flashT: -9,
    escT: 0, sirenT: 0, spawnT: 0, nid: 0, boss: null, shocks: [], target: null, deathMsg: null, sirenPulse: -9,
    said: {}, bossDown: false, ledger: false, clearT: -9,
  };
  if (!cp) timers.push({ t: time + 4.6, fn: () => radio('MARCUS', "You're in. The vault key is somewhere on this floor — listen for it. Ping them, then strike before they move.") });
  if (cp && cp.phase === 'boss') timers.push({ t: time + .15, fn: startBoss });
  if (cp && cp.phase === 'escape') {
    MS.bossDown = true; MS.ledger = true; MS.phase = 'ledger';
    for (const d of doors) if (BOSS.doors.some(([x, y]) => d.tx === x && d.ty === y)) { d.locked = false; d.open = true; d.amt = 1; }
    timers.push({ t: time + .1, fn: () => startEscape(true) });
  }
}
function objective() {
  switch (MS.phase) {
    case 'vault': return { t: 'Open the vault', s: 'VAULT', c: CARR[2] };
    case 'boss': return { t: 'Kill The Conductor', s: 'CONDUCTOR', c: CARR[1] };
    case 'ledger': return { t: 'Take the ledger', s: 'LEDGER', c: CARR[2] };
    case 'escape': return { t: 'Reach Marcus — loading dock', s: 'EXTRACTION', c: CARR[1] };
    default: return { t: 'Find the vault keycard', s: 'KEYCARD', c: CARR[3] };
  }
}
function objectiveSrc(kp) {
  switch (MS.phase) {
    case 'vault': return { x: BOSS.vault[0] * T, y: BOSS.vault[1] * T };
    case 'boss': return null;
    case 'ledger': return pickups.find(p => p.type === 'ledger' && !p.taken) || null;
    case 'escape': return exitObj;
    default: return kp && !kp.taken ? kp : null;
  }
}
function radio(who, text) { MS.rq.push({ who, text }); }
function updRadio() {
  if (MS.radio && realT - MS.radio.t < MS.radio.dur) return;
  MS.radio = null;
  if (!MS.rq.length) return;
  const r = MS.rq.shift();
  MS.radio = { ...r, t: realT, dur: 2.4 + r.text.length / 19 };
  if (AU.ctx && !AU.muted) noise({ vol: .1, dur: .22, f0: 2400, type: 'bandpass', q: 3, echo: 0 });
}
function callout(text, sub, col, big) { MS.call = { text, sub: sub || '', col: col ?? 0, t: realT, big: !!big }; }

// ---------- ECHO STRIKE: sonar marks everyone it touches; Space on a mark = blink-kill ----------
function isMarked(e) { return e.markT != null && time >= e.markT && time <= e.markEnd; }
function markFromSonar() {
  const P = player;
  for (const e of enemies) {
    if (e.dead || e.hidden) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d > 1000 || !los(P.x, P.y, e.x, e.y)) continue;
    e.markT = time + d / WAVE_SPEED; e.markEnd = e.markT + (e.type === 'boss' ? 3.2 : 4.5);
  }
}
function strikeTarget() {
  const P = player, mw = screenToWorld(mouse.x, mouse.y);
  let best = null, bs = 1e9;
  for (const e of enemies) {
    if (e.dead || e.hidden || !isMarked(e) || (e.strikeCD || 0) > time) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > STRIKE_R || d < 8) continue;
    if (!los(P.x, P.y, e.x, e.y)) continue;
    const ang = Math.abs(angDiff(P.a, Math.atan2(e.y - P.y, e.x - P.x))), dc = Math.hypot(e.x - mw.x, e.y - mw.y);
    if (ang > .8 && dc > 90) continue;
    const sc = ang * 220 + dc * .5 + d * .25;
    if (sc < bs) { bs = sc; best = e; }
  }
  return best;
}
function tryStrike() {
  const e = strikeTarget(); if (!e) return false;
  const P = player, a = Math.atan2(e.y - P.y, e.x - P.x), d = Math.hypot(e.x - P.x, e.y - P.y);
  const stop = Math.max(0, d - (e.r + P.r + 4));
  P.strike = { e, t: 0, dur: clamp(d / 2800, .06, .13), x0: P.x, y0: P.y, x1: P.x + Math.cos(a) * stop, y1: P.y + Math.sin(a) * stop, a };
  P.iframe = Math.max(P.iframe, .4); P.a = a; P.dashT = 0;
  SFX.dash();
  if (AU.ctx && !AU.muted) tone({ vol: .16, dur: .3, f0: 2200, f1: 700, type: 'sine', echo: .6 });
  camRot = Math.cos(a) * .018;
  return true;
}
function updStrike(dt) {
  const P = player, s = P.strike; s.t += dt;
  const k = Math.min(1, s.t / s.dur);
  afterimages.push({ x: P.x, y: P.y, a: s.a, t: time, w: P.walk, ma: s.a, ph: P.stepPh });
  P.x = lerp(s.x0, s.x1, easeOut(k)); P.y = lerp(s.y0, s.y1, easeOut(k)); P.a = s.a; P.vx = P.vy = 0;
  for (let i = 0; i < 2; i++) pp({ k: 'spark', x: P.x + rand(-6, 6), y: P.y + rand(-6, 6), vx: -Math.cos(s.a) * rand(200, 600), vy: -Math.sin(s.a) * rand(200, 600), life: .22, max: .22, c: 0, s: 1.6, drag: 6 });
  if (k >= 1) { P.strike = null; strikeHit(s.e, s.a); }
}
function strikeHit(e, a) {
  const P = player;
  if (e.dead) return;
  P.meleeT = .2; P.meleeA = a; P.dashCD = 0; // chaining: every strike hands the dash straight back
  MS.chain = time - MS.chainT < 1.8 ? MS.chain + 1 : 1; MS.chainT = time;
  e.strikeCD = time + .5;
  if (e.type === 'boss') damageEnemy(e, 4, 'strike', false);
  else if (e.type === 'heavy' && e.hp > 3) damageEnemy(e, 3, 'strike', false);
  else { e.hp = 1; damageEnemy(e, 1, 'strike', true); }
  ring(e.x, e.y, 6, 95, 0, .35, 3); ring(e.x, e.y, 4, 50, 3, .2, 2);
  sparks(e.x, e.y, a, 18, 0, 720, .5); sparks(e.x, e.y, a + PI, 6, 3, 300, .8);
  light(e.x, e.y, 220, 0, .25, 1.2);
  hitstop = Math.max(hitstop, .075); slowT = Math.max(slowT, .22); zoomPunch = Math.max(zoomPunch, .06); shake = Math.max(shake, 8);
  MS.flashT = realT;
  emitSound(P.x, P.y, { hear: 130, reveal: 170, col: 0, owner: 'player', str: .8 });
  if (AU.ctx && !AU.muted) { noise({ vol: .3, dur: .12, f0: 6000, f1: 1500, type: 'highpass', echo: .3 }); tone({ vol: .12, dur: .5, f0: 3200, f1: 3000, type: 'sine', echo: .7 }); }
  if (MS.chain >= 2) { callout(`CHAIN x${MS.chain}`, `ECHO STRIKE  +${MS.chain * 150}`, 0, MS.chain >= 3); stats.score += MS.chain * 150; }
}

// ---------- kills: callouts, multi-kills, room clears ----------
function onKill(e, cause) {
  const P = player;
  MS.recent.push({ t: time, x: e.x, y: e.y });
  MS.recent = MS.recent.filter(r => time - r.t < 10);
  if (e.type === 'boss') return bossDown(e);
  const burst = MS.recent.filter(r => time - r.t < 1.3).length;
  if (burst >= 2) {
    const names = ['', '', 'DOUBLE ECHO', 'TRIPLE ECHO', 'QUAD ECHO'];
    callout(names[burst] || `SILENCE x${burst}`, `+${burst * 250}  MULTI-KILL`, 2, burst >= 3);
    stats.score += burst * 250; slowT = Math.max(slowT, .3 + burst * .12);
  }
  const near = enemies.some(o => !o.dead && !o.hidden && o !== e && Math.hypot(o.x - P.x, o.y - P.y) < 650);
  const recentNear = MS.recent.filter(r => Math.hypot(r.x - P.x, r.y - P.y) < 750).length;
  if (!near && recentNear >= 2 && MS.phase !== 'escape' && MS.phase !== 'boss' && time - MS.clearT > 5) {
    MS.clearT = time;
    slowT = Math.max(slowT, .9); zoomPunch = Math.max(zoomPunch, .07);
    timers.push({ t: time + .3, fn: () => { callout('ROOM CLEAR', '+500', 2, true); stats.score += 500; } });
  }
  if (!MS.said.first) { MS.said.first = 1; radio('MARCUS', 'One down. Every gunshot tells them where you are — the knife and the strike don\'t.'); }
}

// ---------- THE CONDUCTOR ----------
function makeEnemy(type, x, y, id) {
  const ty = ETYPE[type];
  return revealable({
    id, type, x, y, r: ty.r, a: Math.atan2(player.y - y, player.x - x), hp: ty.hp, state: 'hunt', home: { x, y }, homeA: 0,
    patrol: null, pi: 0, wait: 0, know: { x: player.x, y: player.y, t: time }, cd: rand(.4, 1.2), path: null, pidx: 0, repathT: 0,
    pgx: 0, pgy: 0, stepAcc: 0, walk: 0, stuckT: 0, dead: false, gx: x, gy: y, ga: 0, gw: 0, gmove: 0, gpose: null, lastBark: -9,
    idleT: 5, searchT: 0, wanderT: 0, wgoal: null, flinch: 0, stunT: 0, pc: 1, c: 1, recoil: 0, swingT: -9, hurtT: -9, moveAmt: 0,
    dieT: -9, cvx: 0, cvy: 0, wT0: 1,
  });
}
function bossSound(kind, e) {
  if (!AU.ctx || AU.muted) return;
  const s = spat(e.x, e.y, 2200);
  if (kind === 'hum') tone({ pan: s.pan, vol: .12 * s.vol + .02, dur: 1, f0: 98, f1: 96, type: 'sawtooth', echo: .5, attack: .15 });
  if (kind === 'inhale') tone({ pan: s.pan, vol: .14, dur: e.wT0, f0: 180, f1: 820, type: 'sawtooth', echo: .4, attack: .2 });
  if (kind === 'scream') { noise({ pan: s.pan, vol: .6, dur: .9, f0: 3000, f1: 200, echo: .8 }); tone({ pan: s.pan, vol: .3, dur: .8, f0: 900, f1: 120, type: 'sawtooth', echo: .7 }); }
  if (kind === 'vanish') tone({ pan: s.pan, vol: .15, dur: .7, f0: 600, f1: 60, type: 'sine', echo: .8 });
  if (kind === 'appear') tone({ pan: s.pan, vol: .15, dur: .4, f0: 80, f1: 700, type: 'sine', echo: .8 });
}
function startBoss() {
  if (MS.phase === 'boss' || MS.bossDown) return;
  MS.phase = 'boss';
  for (const d of doors) if (BOSS.doors.some(([x, y]) => d.tx === x && d.ty === y)) { d.open = false; d.amt = 0; d.locked = true; }
  const e = makeEnemy('boss', (BOSS.spawn[0] + .5) * T, (BOSS.spawn[1] + .5) * T, 'boss');
  e.summons = [.66, .33]; e.dmgAcc = 0; e.maxhp = e.hp; e.orbit = 1; e.cd = 1.6;
  enemies.push(e); MS.boss = e;
  e.litS = 1.2; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a;
  emitSound(e.x, e.y, { hear: 0, reveal: 900, col: 1, owner: 'enemy', str: 1.1, force: true });
  ring(e.x, e.y, 10, 260, 1, .8, 4);
  callout('THE CONDUCTOR', 'HE HEARS EVERYTHING', 1, true);
  slowT = Math.max(slowT, 1); shake = Math.max(shake, 12);
  SFX.door(player.x, player.y); SFX.boom(e.x, e.y);
  radio('CONDUCTOR', 'Calder. I still remember her song. Four notes, wasn\'t it?');
  radio('MARCUS', "Don't let him in your head. He's blind too — make him listen to the wrong thing.");
  saveCheckpoint();
}
function bossFan(e, enraged, off) {
  const n = enraged ? 20 : 14;
  for (let i = 0; i < n; i++) {
    const a = off + i / n * TAU;
    bullets.push({ x: e.x + Math.cos(a) * 28, y: e.y + Math.sin(a) * 28, vx: Math.cos(a) * 290, vy: Math.sin(a) * 290, o: 'e', src: e, life: 2.8, dmg: 1, px: e.x, py: e.y });
  }
  emitSound(e.x, e.y, { hear: 0, reveal: 420, col: 1, owner: 'enemy', str: .9, ind: true });
  SFX.shot(e.x, e.y, 'heavy'); ring(e.x, e.y, 10, 90, 1, .35, 3);
  shake = Math.max(shake, 5);
}
function bossScream(e, enraged) {
  MS.shocks.push({ x: e.x, y: e.y, r: 24, v: enraged ? 560 : 470, max: 780, hit: false });
  emitSound(e.x, e.y, { hear: 0, reveal: 950, col: 1, owner: 'enemy', str: 1, force: true });
  bossSound('scream', e); shake = Math.max(shake, 14); zoomPunch = Math.max(zoomPunch, .05);
}
function bossVanish(e) {
  e.hidden = true; e.hideT = 1.3; e.state = 'hunt'; e.markEnd = 0;
  const P = player, [x0, y0, x1, y1] = BOSS.box;
  let tx = e.x, ty = e.y;
  for (let n = 0; n < 40; n++) {
    const x = rand(x0, x1) * T, y = rand(y0, y1) * T;
    if (!passable(Math.floor(x / T), Math.floor(y / T)) || Math.hypot(x - P.x, y - P.y) < 230) continue;
    tx = x; ty = y; break;
  }
  e.tx = tx; e.ty = ty;
  smoke(e.x, e.y, 10, 1.2); ring(e.x, e.y, 10, 140, 1, .5, 3);
  popups.push({ x: e.x, y: e.y - 44, text: 'SILENCE', t: time, c: 1, size: 18, vy: -16, pop: true });
  bossSound('vanish', e);
}
function summonAdds(e) {
  const [x0, y0, x1, y1] = BOSS.box, corners = [[x0 + .4, y0 + .4], [x1 - .4, y0 + .4], [x0 + .4, y1 - .4], [x1 - .4, y1 - .4]];
  const types = ['hunter', 'hunter', 'assassin'];
  corners.sort((a, b) => Math.hypot(b[0] * T - player.x, b[1] * T - player.y) - Math.hypot(a[0] * T - player.x, a[1] * T - player.y));
  types.forEach((ty, i) => {
    const [cx, cy] = corners[i], add = makeEnemy(ty, cx * T, cy * T, 'b' + (MS.nid++));
    enemies.push(add);
    emitSound(add.x, add.y, { hear: 0, reveal: 200, col: 1, owner: 'enemy', str: 1, force: true, ind: true });
  });
  callout('THEY ANSWER HIS CALL', 'PING · STRIKE · CHAIN INTO HIM', 1);
}
function bossHurt(e, dmg) {
  e.dmgAcc += dmg;
  popups.push({ x: e.x, y: e.y - 44, text: `-${dmg}`, t: time, c: 1, size: 20, vy: -22, pop: true });
  const frac = e.hp / e.maxhp;
  while (e.summons.length && frac <= e.summons[0]) { e.summons.shift(); summonAdds(e); }
  if (!MS.said.enrage && frac <= .5) {
    MS.said.enrage = 1;
    radio('CONDUCTOR', 'You can\'t hide from me, Calder. I can hear your heart.');
    callout("HE'S ENRAGED", 'FASTER · LOUDER', 1);
  }
  if (e.dmgAcc >= 6 && !e.hidden) { e.dmgAcc = 0; bossVanish(e); }
}
function updBoss(e, dt) {
  const P = player, TY = ETYPE.boss;
  e.cd -= dt; e.recoil = Math.max(0, e.recoil - dt * 6); e.moveAmt = Math.max(0, e.moveAmt - dt * 3);
  if (e.flinch > 0) e.flinch -= dt;
  const enr = e.hp <= e.maxhp * .5;
  if (e.hidden) {
    e.hideT -= dt;
    if (e.hideT <= 0) {
      e.hidden = false; e.x = e.tx; e.y = e.ty; e.cd = .35; e.state = 'hunt'; e.path = null;
      emitSound(e.x, e.y, { hear: 0, reveal: 340, col: 1, owner: 'enemy', str: 1, force: true, ind: true });
      e.litS = 1.1; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a;
      popups.push({ x: e.x, y: e.y - 44, text: 'HERE.', t: time, c: 1, size: 22, vy: -16, pop: true });
      bossSound('appear', e);
    }
    return;
  }
  // he hears your heartbeat: always knows roughly where you are
  if (time > (e.trackT || 0)) { e.trackT = time + (enr ? .45 : .8); e.know = { x: P.x + rand(-26, 26), y: P.y + rand(-26, 26), t: time }; }
  if (time > (e.humT || 0)) {
    e.humT = time + 1.25;
    emitSound(e.x, e.y, { hear: 0, reveal: 150, col: 1, owner: 'enemy', str: .85 });
    bossSound('hum', e);
  }
  const face = () => { e.a = turnTo(e.a, Math.atan2(P.y - e.y, P.x - e.x), dt * 8); };
  switch (e.state) {
    case 'windfan':
      e.wT -= dt; face();
      if (e.wT <= 0) { bossFan(e, enr, 0); const n = enr ? 20 : 14; timers.push({ t: time + .28, fn: () => { if (!e.dead && !e.hidden) bossFan(e, enr, PI / n); } }); e.state = 'hunt'; e.cd = enr ? 1.3 : 2; }
      return;
    case 'windscream':
      e.wT -= dt; face();
      if (e.wT <= 0) { bossScream(e, enr); e.state = 'hunt'; e.cd = enr ? 1.2 : 1.8; }
      return;
    case 'volley':
      e.wT -= dt; face();
      if (e.wT <= 0) { fireEnemy(e, 7, .36); e.shots--; e.wT = .32; if (e.shots <= 0) { e.state = 'hunt'; e.cd = enr ? 1 : 1.5; } }
      return;
  }
  if (e.cd <= 0 && !P.dead) {
    const d = Math.hypot(P.x - e.x, P.y - e.y), r = Math.random();
    if (d < 280 && r < .45) {
      e.state = 'windscream'; e.wT = e.wT0 = enr ? .75 : 1.05; bossSound('inhale', e);
      emitSound(e.x, e.y, { hear: 0, reveal: 200, col: 1, owner: 'enemy', str: .9, ind: true });
      popups.push({ x: e.x, y: e.y - 48, text: 'INHALE', t: time, c: 1, size: 15, vy: -10 });
      return;
    }
    if (r < .72) { e.state = 'windfan'; e.wT = e.wT0 = enr ? .55 : .75; SFX.pump(e.x, e.y); emitSound(e.x, e.y, { hear: 0, reveal: 180, col: 1, owner: 'enemy', str: .9 }); return; }
    e.state = 'volley'; e.wT = e.wT0 = .5; e.shots = enr ? 4 : 3; SFX.pump(e.x, e.y); return;
  }
  // circle-strafe around the player, inside the vault
  if (Math.random() < dt * .25) e.orbit *= -1;
  const [x0, y0, x1, y1] = BOSS.box, oa = Math.atan2(e.y - P.y, e.x - P.x) + e.orbit * .7;
  const gx = clamp(P.x + Math.cos(oa) * 240, x0 * T, x1 * T), gy = clamp(P.y + Math.sin(oa) * 240, y0 * T, y1 * T);
  navTo(e, gx, gy, enr ? TY.run : TY.walk, dt);
  face();
}
function updShocks(dt) {
  const P = player;
  for (let i = MS.shocks.length - 1; i >= 0; i--) {
    const s = MS.shocks[i]; s.r += s.v * dt;
    if (!s.hit && !P.dead) {
      const d = Math.hypot(P.x - s.x, P.y - s.y);
      if (Math.abs(d - s.r) < 18 && los(s.x, s.y, P.x, P.y)) {
        s.hit = true;
        if (P.iframe <= 0) { damagePlayer(1, s.x, s.y); const a = Math.atan2(P.y - s.y, P.x - s.x); moveCircle(P, Math.cos(a) * 46, Math.sin(a) * 46, P.r, true); }
        else popups.push({ x: P.x, y: P.y - 30, text: 'DODGED', t: time, c: 0, size: 15, vy: -16, pop: true });
      }
    }
    if (s.r > s.max) MS.shocks.splice(i, 1);
  }
}
function bossDown(e) {
  MS.bossDown = true; MS.phase = 'ledger'; MS.boss = null; MS.shocks = [];
  slowT = Math.max(slowT, 1.8); hitstop = Math.max(hitstop, .15); zoomPunch = Math.max(zoomPunch, .1); shake = Math.max(shake, 22);
  callout('THE CONDUCTOR', 'SILENCED', 2, true);
  emitSound(e.x, e.y, { hear: 0, reveal: 1400, col: 2, owner: 'env', str: 1.2, force: true });
  for (let i = 0; i < 3; i++) ring(e.x, e.y, 10, 160 + i * 90, i ? 1 : 3, .6 + i * .25, 4);
  light(e.x, e.y, 420, 2, 1.2, 1.3); SFX.boom(e.x, e.y);
  for (const d of doors) if (BOSS.doors.some(([x, y]) => d.tx === x && d.ty === y)) { d.locked = false; d.open = true; d.amt = 0; }
  for (const o of enemies) if (!o.dead && String(o.id)[0] === 'b') { o.hp = 1; damageEnemy(o, 9, 'blast', false); }
  pickups.push(revealable({ id: 'ledger', type: 'ledger', x: e.x, y: e.y, taken: false, c: 2 }));
  radio('MARCUS', "It's done. Grab the ledger — every name is in it.");
  humT = 1.2;
}

// ---------- THE ESCAPE ----------
function startEscape(fromCp) {
  MS.phase = 'escape'; MS.ledger = true; MS.escT = 90; MS.sirenT = .4; MS.spawnT = 2.5;
  for (const e of enemies) if (!e.dead) { e.know = { x: player.x, y: player.y, t: time }; e.state = 'hunt'; e.path = null; }
  callout('ALARM', 'REACH MARCUS · 90 SECONDS', 1, true);
  radio('MARCUS', "Alarm's up — the whole building knows. I'm at the loading dock where you came in. Ninety seconds!");
  if (!fromCp) saveCheckpoint();
  humT = .3; shake = Math.max(shake, 10);
}
function updEscape(dt) {
  MS.escT -= dt;
  if (MS.escT <= 30 && !MS.said.t30) { MS.said.t30 = 1; radio('MARCUS', 'Thirty seconds, Elias! Move!'); }
  if (MS.escT <= 0) { MS.escT = 0; MS.deathMsg = 'THE BUILDING WAS SEALED.'; player.iframe = 0; die(); return; }
  MS.sirenT -= dt;
  if (MS.sirenT <= 0) {
    MS.sirenT = 1.7; MS.sirenPulse = realT;
    for (const [sx, sy] of SIRENS) emitSound((sx + .5) * T, (sy + .5) * T, { hear: 0, reveal: 560, col: 1, owner: 'env', str: .5 });
    if (AU.ctx && !AU.muted) { tone({ vol: .05, dur: .8, f0: 620, f1: 900, type: 'square', echo: .3 }); tone({ vol: .05, dur: .8, f0: 900, f1: 620, type: 'square', echo: .3, delay: .85 }); }
  }
  MS.spawnT -= dt;
  if (MS.spawnT <= 0) {
    MS.spawnT = 6.5;
    const alive = enemies.filter(e => !e.dead && String(e.id)[0] === 'r').length;
    if (alive < 8) {
      const cands = SPAWNS.map(([x, y]) => ({ x: (x + .5) * T, y: (y + .5) * T })).filter(s => { const d = Math.hypot(s.x - player.x, s.y - player.y); return d > 420 && d < 1300; });
      for (let i = 0; i < 2 && cands.length; i++) {
        const s = cands.splice((Math.random() * cands.length) | 0, 1)[0];
        const r = Math.random(), type = r < .55 ? 'hunter' : r < .85 ? 'gunner' : 'assassin';
        enemies.push(makeEnemy(type, s.x, s.y, 'r' + (MS.nid++)));
        emitSound(s.x, s.y, { hear: 0, reveal: 160, col: 1, owner: 'enemy', str: .9, ind: true });
        SFX.door(s.x, s.y);
      }
    }
  }
}
function updPhases(dt) {
  const P = player;
  updRadio();
  if (MS.phase === 'vault' && !P.dead) { const tx = P.x / T, ty = P.y / T; if (tx > 46.6 && tx < 60 && ty < 12) startBoss(); }
  updShocks(dt);
  if (MS.phase === 'escape' && !P.dead) updEscape(dt);
  MS.target = P.strike || P.dead ? null : strikeTarget();
}

// ---------- mission drawing ----------
function drawMarks() {
  if (player.dead) return;
  for (const e of enemies) {
    if (e.dead || e.hidden || !isMarked(e)) continue;
    const left = clamp((e.markEnd - time) / (e.markEnd - e.markT), 0, 1), tgt = MS.target === e;
    const o = enemyPose(e, true); o.alpha = tgt ? .75 : .5; drawCharacter(e.x, e.y, o);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const r = e.r + 16 + (tgt ? Math.sin(realT * 12) * 2 : 0), rot = realT * (tgt ? 3 : 1.2);
    ctx.strokeStyle = rgba(CARR[0], tgt ? 1 : .7); ctx.lineWidth = tgt ? 2.6 : 1.6;
    for (let i = 0; i < 4; i++) { const a = rot + i * PI / 2; ctx.beginPath(); ctx.arc(e.x, e.y, r, a - .38, a + .38); ctx.stroke(); }
    ctx.strokeStyle = rgba(CARR[0], .4); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(e.x, e.y, r + 7, -PI / 2, -PI / 2 + TAU * left); ctx.stroke();
    if (tgt) {
      ctx.setLineDash([7, 9]); ctx.lineDashOffset = -realT * 70;
      ctx.strokeStyle = rgba(CARR[0], .55); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(player.x, player.y); ctx.lineTo(e.x, e.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = rgba(CARR[0], 1); ctx.fillText('SPACE · STRIKE', e.x, e.y - r - 14);
    }
    ctx.restore();
  }
}
function drawBossFX() {
  for (const s of MS.shocks) {
    const k = s.r / s.max;
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, TAU);
    ctx.strokeStyle = rgba(CARR[1], (1 - k) * .22); ctx.lineWidth = 18; ctx.stroke();
    ctx.strokeStyle = rgba(CARR[1], (1 - k) * .95); ctx.lineWidth = 3.5; ctx.stroke();
    ctx.strokeStyle = `rgba(255,225,230,${(1 - k) * .6})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(1, s.r - 9), 0, TAU); ctx.stroke();
  }
  const e = MS.boss; if (!e || e.dead || e.hidden) return;
  const k = e.wT0 ? 1 - e.wT / e.wT0 : 0;
  if (e.state === 'windscream') for (let i = 0; i < 3; i++) {
    const r = (1 - ((k * 2 + i / 3) % 1)) * 130 + 22;
    ctx.strokeStyle = rgba(CARR[1], .25 + .6 * k); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, TAU); ctx.stroke();
  }
  if (e.state === 'windfan') {
    const n = e.hp <= e.maxhp * .5 ? 20 : 14;
    for (let i = 0; i < n; i++) { const a = i / n * TAU, rr = 32 + k * 16; ctx.fillStyle = rgba(CARR[1], .3 + .65 * k); ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * rr, e.y + Math.sin(a) * rr, 2.6, 0, TAU); ctx.fill(); }
  }
}
function wrapLines(s, maxW) {
  const words = s.split(' '), lines = [''];
  for (const w of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (ctx.measureText(t).width > maxW && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
  return lines;
}
function drawMissionHUD(S, pad) {
  const fk = (realT - MS.flashT) / .18;
  if (fk >= 0 && fk < 1) { ctx.fillStyle = rgba(CARR[0], .16 * (1 - fk)); ctx.fillRect(0, 0, W, H); }
  if (MS.phase === 'escape') {
    const k = Math.max(0, 1 - (realT - MS.sirenPulse) / .9);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .72);
    g.addColorStop(0, 'rgba(255,30,50,0)'); g.addColorStop(1, `rgba(255,30,50,${.26 * k + .05})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const t = Math.max(0, MS.escT), m = Math.floor(t / 60), s = Math.floor(t % 60), cs = Math.floor((t % 1) * 10), urgent = t < 30;
    const cy = pad + 132 * S;
    text('ESCAPE', W / 2, cy - 20 * S, 11 * S, CARR[1], .9, 'center', 700, `${6 * S}px`);
    text(`${m}:${String(s).padStart(2, '0')}.${cs}`, W / 2, cy + 10 * S, (urgent ? 42 : 34) * S * (1 + (urgent ? .06 * Math.max(0, Math.sin(realT * 10)) : 0)), urgent ? CARR[1] : CARR[3], 1, 'center', 400, `${2 * S}px`, MONO);
  }
  const e = MS.boss;
  if (e && !e.dead) {
    const w = Math.min(560 * S, W * .5), x = W / 2 - w / 2, y = pad + 124 * S, h = 10 * S;
    e.barDisp = e.barDisp == null ? e.hp : e.barDisp > e.hp ? Math.max(e.hp, e.barDisp - .06) : e.hp;
    text('THE CONDUCTOR', W / 2, y - 15 * S, 13 * S, CARR[1], .95, 'center', 700, `${8 * S}px`);
    ctx.fillStyle = 'rgba(30,4,10,.75)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgba(CARR[3], .55); ctx.fillRect(x, y, w * e.barDisp / e.maxhp, h);
    ctx.fillStyle = rgba(CARR[1], .95); ctx.fillRect(x, y, w * e.hp / e.maxhp, h);
    ctx.fillStyle = '#000'; for (const f of [.33, .5, .66]) ctx.fillRect(x + w * f, y, 2, h);
    brackets(x - 5, y - 5, w + 10, h + 10, 9, CARR[1], .75, 1.4);
    if (e.hidden) text('— SILENT —', W / 2, y + 28 * S, 11 * S, CARR[1], .6 + .4 * Math.sin(realT * 8), 'center', 700, `${5 * S}px`);
  }
  if (MS.call) {
    const k = realT - MS.call.t, dur = MS.call.big ? 2.3 : 1.5;
    if (k > dur) MS.call = null;
    else {
      const a = Math.min(1, k / .12, (dur - k) / .4), pop = 1 + Math.max(0, .4 - k * 2.4), sz = (MS.call.big ? 52 : 34) * S;
      ctx.save(); ctx.translate(W / 2, H * .33); ctx.scale(pop, pop);
      glitchText(MS.call.text, 0, 0, sz, CARR[MS.call.col], a, 'center', 700, `${(MS.call.big ? 12 : 8) * S}px`, k < .3 ? 3 : 0);
      if (MS.call.sub) text(MS.call.sub, 0, sz * .78, 14 * S, CARR[3], a * .85, 'center', 600, `${5 * S}px`);
      ctx.restore();
    }
  }
  if (MS.radio) {
    const r = MS.radio, k = realT - r.t, a = Math.max(0, Math.min(1, k / .2, (r.dur - k) / .4));
    if (a > 0) {
      const w = 470 * S, x = pad, hh = 78 * S, y = H - pad - 62 * S - 18 * S - hh;
      panel(x, y, w, hh, a);
      const col = r.who === 'CONDUCTOR' ? CARR[1] : CARR[2];
      text(r.who, x + 16 * S, y + 16 * S, 10 * S, col, a, 'left', 700, `${5 * S}px`);
      for (let i = 0; i < 14; i++) { const v = (Math.sin(realT * 18 + i * 1.3) * .5 + .5) * (k * 45 < r.text.length ? 1 : .15); ctx.fillStyle = rgba(col, .7 * a); ctx.fillRect(x + w - 20 * S - i * 5 * S, y + 16 * S - v * 6 * S, 3 * S, v * 12 * S + 1); }
      ctx.font = `500 ${14 * S}px ${FONT}`;
      const lines = wrapLines(r.text, w - 32 * S);
      let left = Math.floor(k * 45);
      lines.forEach((ln, i) => { const s = ln.slice(0, Math.max(0, left)); left -= ln.length + 1; if (s) text(s, x + 16 * S, y + 38 * S + i * 18 * S, 14 * S, CARR[3], a * .95, 'left', 500, '0.3px'); });
    }
  }
}
