// =====================================================================
//  LEVEL 02 — THE FOUNDRY: storm cover · drop hammers · PA relays · hounds · THE FOREMAN
// =====================================================================
const LEVEL2 = {
  id: 2, num: '02', name: 'THE FOUNDRY', sub: 'THE RIVER FOUNDRY  ·  2:14 AM  ·  STORM',
  brief: 'Cut the PA relays. Break The Foreman. Take the manifest. Reach the pier.',
  winTitle: 'THE MANIFEST IS YOURS', bossName: 'THE FOREMAN', bossVerb: 'BROKEN',
  lockedMsg: 'SEALED — CUT THE PA RELAYS TO OPEN THE FURNACE HALL', sealed: 'THE DOGS FOUND YOU.',
  storm: true,
  rooms: [
    [2, 32, 16, 10], [18, 36, 6, 2], [24, 30, 16, 12], [8, 24, 2, 8], [2, 12, 14, 12], [30, 22, 2, 8],
    [18, 14, 22, 8], [16, 17, 2, 2], [40, 34, 6, 2], [46, 28, 16, 13], [52, 20, 2, 8], [42, 2, 20, 18],
    [40, 16, 2, 2], [24, 6, 2, 8], [2, 1, 12, 5], [14, 1, 18, 5], [4, 6, 2, 6],
  ],
  crates: [
    [6, 34, 3, 2], [12, 33, 2, 2], [14, 38, 2, 2], [8, 38, 1, 2],
    [26, 32, 2, 2], [31, 33, 3, 1], [36, 31, 2, 2], [27, 37, 1, 3], [33, 38, 3, 1], [37, 36, 1, 3],
    [4, 14, 8, 1], [4, 17, 8, 1], [4, 20, 8, 1],
    [20, 15, 1, 2], [27, 19, 1, 2], [34, 15, 1, 2],
    [50, 37, 2, 2], [57, 30, 2, 1], [54, 33, 1, 2],
    [45, 9, 1, 2], [58, 9, 1, 2], [51, 5, 2, 1], [51, 15, 2, 1],
    [10, 2, 2, 1], [20, 3, 2, 2], [27, 1, 1, 2],
  ],
  doors: [
    [18, 36], [18, 37], [8, 24], [9, 24], [30, 22], [31, 22], [16, 17], [16, 18], [45, 34], [45, 35],
    [24, 13], [25, 13], [4, 11], [5, 11],
    [52, 20, 1], [53, 20, 1], [41, 16, 1], [41, 17, 1],
  ],
  gates: [[52, 20], [53, 20], [41, 16], [41, 17]],
  enemies: [
    { t: 'hunter', x: 14, y: 35, p: [[14, 35], [14, 40]] },
    { t: 'hunter', x: 10, y: 33, f: PI / 2 },
    { t: 'gunner', x: 35, y: 34, f: PI },
    { t: 'hunter', x: 29, y: 40, p: [[29, 40], [38, 40]] },
    { t: 'hound', x: 32, y: 31, p: [[25, 31], [35, 31]] },
    { t: 'hunter', x: 3, y: 16, p: [[3, 16], [13, 16]] },
    { t: 'assassin', x: 13, y: 22, f: PI },
    { t: 'gunner', x: 3, y: 13, f: 0 },
    { t: 'hound', x: 8, y: 19, p: [[3, 19], [13, 19]] },
    { t: 'heavy', x: 28, y: 17, p: [[22, 17], [37, 17]] },
    { t: 'hunter', x: 20, y: 20, p: [[19, 20], [38, 20]] },
    { t: 'gunner', x: 38, y: 15, f: PI },
    { t: 'jammer', x: 33, y: 20, f: -PI / 2 },
    { t: 'gunner', x: 60, y: 29, f: PI },
    { t: 'hunter', x: 47, y: 39, p: [[47, 39], [60, 39]] },
    { t: 'assassin', x: 55, y: 31, f: PI / 2 },
    { t: 'hound', x: 58, y: 37, f: PI },
    { t: 'hunter', x: 24, y: 9, p: [[24, 7], [25, 12]] },
    { t: 'gunner', x: 16, y: 3, f: 0 },
    { t: 'hunter', x: 29, y: 2, p: [[29, 2], [29, 4]] },
  ],
  pickups: [
    ['ammo', 3, 33], ['decoy', 16, 41], ['shotgun', 38, 41], ['med', 25, 41], ['ammo', 39, 30],
    ['smg', 2, 23], ['ammo', 14, 13], ['med', 9, 15], ['decoy', 19, 14], ['ammo', 38, 21],
    ['med', 61, 40], ['decoy', 47, 29], ['ammo', 61, 28], ['med', 25, 1], ['ammo', 2, 5], ['decoy', 43, 19],
  ],
  barrels: [[10, 40], [34, 40], [22, 15], [37, 20], [48, 39], [44, 3], [60, 18], [13, 3]],
  hints: [
    [6.5, 41.4, 'THUNDER COVERS YOUR STEPS  ·  MOVE WHEN THE SKY BREAKS'],
    [12, 32.5, 'HOUNDS FOLLOW YOUR TRAIL, NOT YOUR SOUND'],
    [31.5, 35.5, 'EVERY KILL IS CALLED IN  ·  CUT THE PA RELAYS FIRST'],
    [29, 21.4, 'DROP HAMMERS  ·  THEIR NOISE HIDES YOU  ·  LURE THEM UNDERNEATH'],
    [54, 28.6, 'THE FOREMAN IS PLATED IN FRONT  ·  MAKE HIM CHARGE A WALL'],
    [50.5, 34.4, 'WATER SPLASHES  ·  DASH THROUGH IT'],
  ],
  traps: [
    ['water', 48, 30, 4, 3], ['water', 55, 35, 4, 3], ['water', 3, 35, 2, 3], ['mine', 22, 37],
    ['wire', 30, 25.5, 32, 25.5], ['mine', 14, 19], ['wire', 42.5, 34, 42.5, 36], ['glass', 24, 10, 2, 2],
    ['mine', 22, 3], ['wire', 4, 8.5, 6, 8.5], ['mine', 60, 33],
  ],
  jammers: [[30, 2]],
  relays: [[25, 40], [15, 23], [61, 37]],
  hammers: [[23, 18, 2.6, 0], [30, 16, 2.6, 1.3], [37, 18, 2.6, .6], [46, 5, 3.2, 0], [57, 5, 3.2, 1.6], [46, 14, 3.2, .8], [57, 14, 3.2, 2.4]],
  boss: { spawn: [52, 8], gate: [53, 20.5] },
  sirens: [[10, 36], [32, 36], [8, 18], [28, 17], [52, 34], [52, 10], [18, 3]],
  spawns: [[16, 40], [30, 40], [3, 22], [20, 18], [38, 20], [47, 38], [60, 30], [24, 8], [12, 3]],
  start: [4, 39],
  exit: [2, 1, 3, 4], // Marcus's boat at the north pier
};
// voiced lines that aren't radio() calls — generate_voices.py reads this block
const L2VO = /*vojson*/{
  "PA": ["Vital signs lost. All units, converge.", "Man down. Sweep the area.", "Intruder in the yard. Converge on the last signal."],
  "brief": [
    ["MARCUS", "The ledger had one name above the Conductor's. Brutus Kade. He runs The Quiet's foundry on the river."],
    ["MARCUS", "Whatever they want gone, Kade melts down. If there's a list of who's left, it's in his furnace hall."],
    ["ECHO", "Then I'll listen to it burn."],
    ["MARCUS", "Storm's coming in off the water. When it thunders, they won't hear a thing. Use it."],
    ["MARCUS", "And they've wired the yard to a PA. Every heart that stops gets called in. Cut the relays first."],
    ["ECHO", "Let them count."]
  ]
}/*endvo*/;
LEVEL2.briefing = L2VO.brief;
const LEVELS = [LEVEL1, LEVEL2];
let LVI = 0, hammers = [], relays = [], BRF = null, TB = {}, rainNode = null;
ETYPE.hound = { hp: 1, walk: 110, run: 300, ear: 1.25, stepR: 55, stride: 30, stepVol: .14, r: 10, pts: 250, w: 'none' };
ETYPE.foreman = { hp: 30, walk: 100, run: 130, ear: 1.4, stepR: 190, stride: 52, stepVol: .7, r: 22, pts: 6000, w: 'sledge' };

function setLevel(i) { LVI = i; LV = LEVELS[i]; checkpoint = null; CS = null; csHold = 0; }
function buildL2(cp) {
  hammers = (LV.hammers || []).map(([x, y, per, ph], id) => revealable({ id, x: (x + .5) * T, y: (y + .5) * T, per, t: ph % per, warned: false, slamT: -9, c: 2 }));
  relays = (LV.relays || []).map(([x, y], id) => revealable({ id, x: (x + .5) * T, y: (y + .5) * T, gone: !!(cp && (cp.key || (cp.relays && cp.relays.includes(id)))), humT: rand(0, 3), c: 2 }));
}

// ---------- rain & thunder ----------
function startRain() {
  if (!AU.ctx || rainNode) return;
  const X = AU.ctx, src = X.createBufferSource(); src.buffer = AU.noise; src.loop = true;
  const bp = X.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2200; bp.Q.value = .5;
  const lp = X.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
  const g = X.createGain(); g.gain.value = .045;
  src.connect(bp); bp.connect(lp); lp.connect(g); g.connect(AU.master); src.start();
  rainNode = { src, g };
}
function stopRain() { if (rainNode) { try { rainNode.src.stop(); } catch (e) {} rainNode = null; } }
function l2Mask(x, y) {
  let m = 1;
  if (time < (MS.stormMask ?? -9)) m *= .3;
  for (const h of hammers) if (Math.hypot(h.x - x, h.y - y) < 200) { m *= .45; break; }
  return m;
}
function thunder() {
  const P = player;
  MS.lightning = realT; MS.stormMask = time + 3;
  emitSound(P.x, P.y, { hear: 0, reveal: 1500, col: 3, owner: 'env', str: .55, force: true, ring: 0 });
  timers.push({ t: time + .45, fn: () => { if (AU.ctx && !AU.muted) { noise({ vol: .55, dur: 3.2, f0: 320, f1: 40, echo: .9, attack: .08 }); tone({ vol: .35, dur: 2.6, f0: 52, f1: 28, echo: .8, attack: .1 }); } shake = Math.max(shake, 6); } });
  if (!MS.said.thunder) { MS.said.thunder = 1; callout('THUNDER', 'THEY CAN\'T HEAR YOU · MOVE NOW', 0); }
}
function updStorm(dt) {
  MS.thunderT -= dt;
  if (MS.thunderT < 2 && MS.rumbleT < time - 5) { MS.rumbleT = time; if (AU.ctx && !AU.muted) noise({ vol: .12, dur: 2, f0: 180, f1: 60, echo: .6, attack: .5 }); }
  if (MS.thunderT <= 0) { MS.thunderT = rand(13, 20); thunder(); }
}

// ---------- drop hammers ----------
function updHammers(dt) {
  const P = player;
  for (const h of hammers) {
    h.t += dt;
    if (!h.warned && h.t >= h.per - .6) {
      h.warned = true;
      if (Math.hypot(P.x - h.x, P.y - h.y) < 900) { const s = spat(h.x, h.y, 900); if (AU.ctx && !AU.muted) [0, .2, .4].forEach(d => noise({ pan: s.pan, vol: .12 * s.vol, dur: .05, f0: 2600, type: 'bandpass', q: 3, echo: .2, delay: d })); }
    }
    if (h.t >= h.per) { h.t -= h.per; h.warned = false; slam(h); }
  }
}
function slam(h) {
  const P = player, d = Math.hypot(P.x - h.x, P.y - h.y);
  h.slamT = time; h.litS = 1; h.litT = time;
  if (d < 1400) {
    emitSound(h.x, h.y, { hear: 0, reveal: 330, col: 2, owner: 'env', str: .8 });
    const s = spat(h.x, h.y, 1600);
    if (AU.ctx && !AU.muted) { tone({ pan: s.pan, vol: .45 * s.vol, dur: .5, f0: 85, f1: 34, echo: .5 }); noise({ pan: s.pan, vol: .4 * s.vol, dur: .3, f0: 1600, f1: 200, echo: .5 }); }
    shake = Math.max(shake, 7 * Math.max(0, 1 - d / 600));
    ring(h.x, h.y, 10, 70, 2, .35, 2); sparks(h.x, h.y, 0, 10, 2, 300, PI); smoke(h.x, h.y, 2, .6);
  }
  if (d < 38 && !P.dead) damagePlayer(3, h.x, h.y);
  for (const e of enemies) {
    if (e.dead || e.hidden || Math.hypot(e.x - h.x, e.y - h.y) > 40 + (e.foreman ? 14 : 0)) continue;
    if (e.foreman) { damageEnemy(e, 8, 'hammer', false); if (!e.dead) { e.state = 'stunned'; e.stunT = 2; } popups.push({ x: e.x, y: e.y - 54, text: 'HAMMERED', t: time, c: 2, size: 20, vy: -18, pop: true }); }
    else if (e.type !== 'boss') { e.hp = 1; damageEnemy(e, 99, 'hammer', false); }
  }
  for (const b of barrels) if (!b.gone && Math.hypot(b.x - h.x, b.y - h.y) < 40) timers.push({ t: time + .05, fn: () => explode(b) });
}
// 0 = on the floor, 1 = fully raised
function hammerLift(h) {
  if (h.t > h.per - .1) return 1 - (h.t - (h.per - .1)) / .1;
  return clamp((h.t - .25) / Math.max(.5, h.per - .95), 0, 1);
}

// ---------- PA relays ----------
function relayDown(r, silent) {
  if (r.gone) return;
  r.gone = true; stats.score += 500;
  const left = relays.filter(o => !o.gone).length, n = relays.length - left;
  callout('RELAY DOWN', `${n}/${relays.length}  ·  ${left ? left + ' LEFT' : 'THE PA IS DEAD'}  +500`, 0, !left);
  emitSound(r.x, r.y, { hear: silent ? 60 : 260, reveal: 420, col: 0, owner: 'player', str: 1, force: true });
  ring(r.x, r.y, 6, 120, 2, .6, 3); sparks(r.x, r.y, 0, 24, 2, 480, PI); smoke(r.x, r.y, 5, .8); light(r.x, r.y, 240, 2, .5, 1);
  shake = Math.max(shake, 6); hitstop = Math.max(hitstop, .05);
  SFX.nodeDown(r.x, r.y);
  if (left === relays.length - 1) radio('MARCUS', 'One relay down. Two to go.');
  if (!left) {
    MS.phase = 'hall';
    for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) d.locked = false;
    cutGates();
    saveCheckpoint();
  }
}
function relayBulletHit(b) {
  for (const r of relays) if (!r.gone && Math.hypot(r.x - b.x, r.y - b.y) < 30) { if (b.o === 'p') relayDown(r, false); return true; }
  return false;
}
function knifeRelays(P) {
  const hx = P.x + Math.cos(P.a) * 26, hy = P.y + Math.sin(P.a) * 26;
  for (const r of relays) if (!r.gone && Math.min(Math.hypot(r.x - hx, r.y - hy), Math.hypot(r.x - P.x, r.y - P.y) - 12) < 50) relayDown(r, true);
}
// their vests are wired to the PA: every heart that stops is broadcast
function paAlert(x, y) {
  if (LV.id !== 2 || MS.phase !== 'relays' || !relays.some(r => !r.gone) || time < (MS.paT ?? -9)) return;
  MS.paT = time + 9;
  for (const e of enemies) if (!e.dead && !e.hidden && Math.hypot(e.x - x, e.y - y) < 1100 && (e.state === 'patrol' || e.state === 'return' || e.state === 'search')) {
    e.know = { x: x + rand(-40, 40), y: y + rand(-40, 40), t: time }; e.state = 'hunt'; e.path = null;
  }
  const line = L2VO.PA[(Math.random() * L2VO.PA.length) | 0];
  speak('PA', line, { ch: 'pa' });
  showMsg('PA  ·  ' + line.toUpperCase(), 1);
  for (const r of relays) if (!r.gone) emitSound(r.x, r.y, { hear: 0, reveal: 240, col: 2, owner: 'env', str: .7 });
  if (!MS.said.pa) { MS.said.pa = 1; radio('MARCUS', "Hear that? Their vests are wired to the PA. Every kill gets called in. Cut the relays."); }
}

// ---------- hounds: they follow your trail, not your sound ----------
function sniff(e) {
  if (e.state === 'stun' || time < (e.sniffT || 0)) return;
  e.sniffT = time + .3;
  let best = null;
  for (let i = trails.length - 1; i >= 0; i--) {
    const t = trails[i]; if (time - t.t > 3.5) break;
    if (t.c !== 0) continue;
    if (Math.hypot(t.x - e.x, t.y - e.y) < 300 && (!best || t.t > best.t) && los(e.x, e.y, t.x, t.y)) best = t;
  }
  if (!best || (e.know && best.t <= e.know.t)) return;
  e.know = { x: best.x, y: best.y, t: best.t };
  if (e.state !== 'hunt' && e.state !== 'windup' && e.state !== 'lunge') {
    e.state = 'hunt'; e.path = null;
    popups.push({ x: e.x, y: e.y - 24, text: 'SNIFF', t: time, c: 1, size: 12, vy: -10 });
    SFX.dog(e.x, e.y);
    if (!MS.said.hound) { MS.said.hound = 1; radio('MARCUS', 'Dogs. They follow your trail, not your sound. Keep moving, or put them down quietly.'); }
  }
}
function drawHound(x, y, o) {
  if (!(o.alpha > .01)) return;
  RC = (o.hurt || 0) > .4 ? RIM.hurt : RIM.enemy;
  ctx.save(); ctx.globalAlpha = Math.min(1, o.alpha);
  if (o.additive) ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.translate(x, y); ctx.rotate(o.a || 0);
  const mv = clamp(o.mv || 0, 0, 1.3), ph = o.ph || 0;
  if (o.dead) {
    tube([[8, 4], [12, 10], [16, 14]], 2.8); tube([[-9, 4], [-11, 10], [-14, 15]], 2.8);
    ctx.beginPath(); ctx.ellipse(-1, 0, 15, 6, .1, 0, TAU); body(null, 1.4);
    ctx.beginPath(); ctx.ellipse(16, -2, 6, 4.6, .3, 0, TAU); body(null, 1.3);
    ctx.restore(); return;
  }
  for (const [lx, side, off] of [[9, -1, 0], [9, 1, PI], [-10, -1, PI], [-10, 1, 0]]) {
    const sw = Math.sin(ph * 1.7 + off) * 8 * Math.min(1, mv);
    tube([[lx, side * 4.5], [lx + sw * .5, side * 7.5], [lx + sw, side * 8.6]], 3);
  }
  const wag = Math.sin(realT * (mv > .3 ? 16 : 6)) * 4;
  tube([[-14, 0], [-20, wag * .5], [-26, wag]], 2.2);
  ctx.beginPath(); ctx.ellipse(-1, 0, 15, 6.4, 0, 0, TAU); body(null, 1.5);
  ctx.strokeStyle = rgba(RC.glow, .5); ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(8, 0); ctx.stroke();
  const lunge = o.lunge ? 4 : 0;
  ctx.beginPath(); ctx.ellipse(16 + lunge, 0, 6.4, 5, 0, 0, TAU); body(null, 1.4);
  ctx.beginPath(); ctx.ellipse(22.5 + lunge, 0, 4.2, 3, 0, 0, TAU); body(null, 1.2);
  ctx.beginPath(); ctx.moveTo(13 + lunge, -4); ctx.lineTo(10 + lunge, -8.5); ctx.lineTo(16 + lunge, -5.5); ctx.moveTo(13 + lunge, 4); ctx.lineTo(10 + lunge, 8.5); ctx.lineTo(16 + lunge, 5.5); body(null, 1);
  ctx.fillStyle = 'rgba(255,200,210,1)'; ctx.beginPath(); ctx.arc(19 + lunge, -2.2, .9, 0, TAU); ctx.arc(19 + lunge, 2.2, .9, 0, TAU); ctx.fill();
  ctx.restore();
}

// ---------- THE FOREMAN: plated in front, charges at whatever he hears ----------
function startForeman(fromCp) {
  if (MS.phase === 'boss' || MS.bossDown) return;
  MS.phase = 'boss';
  for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) { d.open = false; d.amt = 0; d.locked = true; }
  const [sx, sy] = LV.boss.spawn, e = makeEnemy('boss', (sx + .5) * T, (sy + .5) * T, 'boss');
  e.foreman = true; e.hp = e.maxhp = 30; e.r = 22; e.state = 'stalk'; e.cd = 2.2; e.summons = [.6, .3];
  enemies.push(e); MS.boss = e;
  e.litS = 1.2; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a;
  emitSound(e.x, e.y, { hear: 0, reveal: 900, col: 1, owner: 'enemy', str: 1.1, force: true });
  ring(e.x, e.y, 10, 260, 1, .8, 4);
  callout('THE FOREMAN', 'PLATED IN FRONT · MAKE HIM CHARGE A WALL', 1, true);
  slowT = Math.max(slowT, 1); shake = Math.max(shake, 12);
  SFX.door(player.x, player.y); SFX.boom(e.x, e.y);
  cutForeman(e, fromCp);
  saveCheckpoint();
}
function foremanArmor(e, dmg, cause) {
  if (cause === 'blast' || cause === 'hammer') return dmg;
  if (e.state === 'stunned') return Math.ceil(dmg * 1.5);
  const a = Math.atan2(player.y - e.y, player.x - e.x);
  if (Math.abs(angDiff(e.a, a)) < 1.25) {
    if (time > (e.clangT || 0)) {
      e.clangT = time + .25;
      popups.push({ x: e.x, y: e.y - 48, text: 'ARMOR', t: time, c: 3, size: 16, vy: -14, pop: true });
      sparks(e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20, a, 10, 3, 420, .7);
      const s = spat(e.x, e.y, 1200); if (AU.ctx && !AU.muted) tone({ pan: s.pan, vol: .25 * s.vol, dur: .35, f0: 1900, f1: 1700, type: 'triangle', echo: .4 });
    }
    return 0;
  }
  return dmg;
}
function foremanHurt(e, dmg) {
  popups.push({ x: e.x, y: e.y - 48, text: `-${dmg}`, t: time, c: 1, size: 20, vy: -22, pop: true });
  const frac = e.hp / e.maxhp;
  while (e.summons.length && frac <= e.summons[0]) { e.summons.shift(); summonHounds(e); }
  if (!MS.said.fenrage && frac <= .35) {
    MS.said.fenrage = 1;
    radio('FOREMAN', "Enough! I'll tear you apart with my bare hands!");
    callout("HE'S ENRAGED", 'FASTER CHARGES · TWO IN A ROW', 1);
  }
}
function summonHounds(e) {
  const P = player, [x0, y0, x1, y1] = [42.5, 2.5, 61.5, 19.5];
  const corners = [[x0, y0], [x1, y0], [x0, y1 - 1], [x1, y1]].sort((a, b) => Math.hypot(b[0] * T - P.x, b[1] * T - P.y) - Math.hypot(a[0] * T - P.x, a[1] * T - P.y));
  for (let i = 0; i < 2; i++) {
    const [cx, cy] = corners[i], h = makeEnemy('hound', cx * T, cy * T, 'b' + (MS.nid++));
    enemies.push(h); emitSound(h.x, h.y, { hear: 0, reveal: 200, col: 1, owner: 'enemy', str: 1, force: true, ind: true });
    SFX.dog(h.x, h.y);
  }
  if (!MS.said.fdogs) { MS.said.fdogs = 1; radio('FOREMAN', 'Dogs! Get up here!'); }
  callout('HOUNDS', 'THEY FOLLOW YOUR TRAIL', 1);
}
function windCharge(e, t) {
  const k = e.know || player;
  e.state = 'windcharge'; e.wT = e.wT0 = t; e.chA = Math.atan2(k.y - e.y, k.x - e.x);
  popups.push({ x: e.x, y: e.y - 52, text: 'SNORT', t: time, c: 1, size: 16, vy: -12, pop: true });
  emitSound(e.x, e.y, { hear: 0, reveal: 210, col: 1, owner: 'enemy', str: .9, ind: true });
  const s = spat(e.x, e.y, 1600); if (AU.ctx && !AU.muted) { noise({ pan: s.pan, vol: .35 * s.vol + .05, dur: t, f0: 300, f1: 1400, type: 'bandpass', q: 1, echo: .3, attack: .1 }); tone({ pan: s.pan, vol: .2 * s.vol, dur: t, f0: 70, f1: 110, type: 'sawtooth', echo: .3 }); }
}
function slamStun(e) {
  e.state = 'stunned'; e.stunT = 2.8;
  e.litS = 1.2; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a; e.gpose = { stun: true };
  popups.push({ x: e.x, y: e.y - 56, text: 'SLAMMED!', t: time, c: 2, size: 24, vy: -18, pop: true });
  shake = Math.max(shake, 16); hitstop = Math.max(hitstop, .08); zoomPunch = Math.max(zoomPunch, .05);
  emitSound(e.x, e.y, { hear: 0, reveal: 520, col: 2, owner: 'env', str: 1, force: true, ind: true });
  SFX.boom(e.x, e.y); ring(e.x, e.y, 10, 120, 3, .45, 4); sparks(e.x + Math.cos(e.a) * 24, e.y + Math.sin(e.a) * 24, e.a + PI, 24, 2, 520, 1.2); smoke(e.x, e.y, 6, 1);
  e.hp -= 2; e.hurtT = time; if (e.hp <= 0) { e.hp = 1; } else foremanHurt(e, 2);
  if (!MS.said.slam) { MS.said.slam = 1; callout("HE'S STUNNED", 'GET BEHIND HIM · NOW', 0); radio('ECHO', 'Now.'); }
}
function foremanCharge(e, dt, enr) {
  const P = player, sp = enr ? 700 : 580, dx = Math.cos(e.chA), dy = Math.sin(e.chA), step = sp * dt;
  e.chT += dt; e.a = e.chA; e.moveAmt = 1; e.walk += step * .1;
  if (Math.random() < .6) afterimages.push({ x: e.x, y: e.y, a: e.a, t: time, w: e.walk, enemy: 'foreman' });
  const ox = e.x, oy = e.y;
  moveCircle(e, dx * step, dy * step, e.r, false);
  const moved = Math.hypot(e.x - ox, e.y - oy);
  if ((e.stepN = (e.stepN || 0) + moved) > 60) { e.stepN = 0; emitSound(e.x, e.y, { hear: 0, reveal: 170, col: 1, owner: 'enemy', str: .85, trail: true }); SFX.step(e.x, e.y, .8, true); }
  shake = Math.max(shake, 2);
  for (const o of enemies) if (o !== e && !o.dead && !o.hidden && Math.hypot(o.x - e.x, o.y - e.y) < e.r + o.r + 4) { o.hp = 1; damageEnemy(o, 99, 'blast', false); }
  for (const b of barrels) if (!b.gone && Math.hypot(b.x - e.x, b.y - e.y) < e.r + b.r + 2) { explode(b); return slamStun(e); }
  if (!P.dead && Math.hypot(P.x - e.x, P.y - e.y) < e.r + P.r + 4) {
    if (P.iframe <= 0) { damagePlayer(2, e.x - dx * 30, e.y - dy * 30); moveCircle(P, dx * 80, dy * 80, P.r, true); }
    e.state = 'recover'; e.wT = .7; e.double = enr && Math.random() < .5; return;
  }
  if (moved < step * .45) return slamStun(e);
  if (e.chT > 1.3) { e.state = 'recover'; e.wT = .8; e.double = enr && Math.random() < .5; }
}
function foremanSmash(e) {
  const P = player;
  e.state = 'stalk'; e.cd = 1.3; e.swingT = time;
  MS.shocks.push({ x: e.x, y: e.y, r: 20, v: 420, max: 230, hit: false });
  emitSound(e.x, e.y, { hear: 0, reveal: 320, col: 1, owner: 'enemy', str: 1, ind: true });
  SFX.boom(e.x, e.y); shake = Math.max(shake, 10); ring(e.x, e.y, 10, 90, 1, .3, 3);
  if (Math.hypot(P.x - e.x, P.y - e.y) < 80 && P.iframe <= 0) damagePlayer(2, e.x, e.y);
}
function updForeman(e, dt) {
  const P = player, enr = e.hp <= e.maxhp * .35;
  e.cd -= dt; e.recoil = Math.max(0, e.recoil - dt * 6); e.moveAmt = Math.max(0, e.moveAmt - dt * 3);
  if (e.flinch > 0) e.flinch -= dt;
  // he feels you through the floor: a rough fix every so often, sharper when he hears you
  if (time > (e.trackT || 0)) { e.trackT = time + (enr ? 1 : 1.6); if (!e.know || time - e.know.t > 1.2) e.know = { x: P.x + rand(-70, 70), y: P.y + rand(-70, 70), t: time - .8 }; }
  const k = e.know || P;
  switch (e.state) {
    case 'windsmash': e.wT -= dt; e.a = turnTo(e.a, Math.atan2(P.y - e.y, P.x - e.x), dt * 6); if (e.wT <= 0) foremanSmash(e); return;
    case 'windcharge':
      e.wT -= dt; e.a = turnTo(e.a, e.chA, dt * 6);
      if (Math.random() < .4) pp({ k: 'spark', x: e.x - Math.cos(e.a) * 18, y: e.y - Math.sin(e.a) * 18, vx: -Math.cos(e.a) * rand(80, 220), vy: -Math.sin(e.a) * rand(80, 220), life: .25, max: .25, c: 1, s: 1.2, drag: 5 });
      if (e.wT <= 0) { e.state = 'charge'; e.chT = 0; e.stepN = 0; }
      return;
    case 'charge': return foremanCharge(e, dt, enr);
    case 'stunned': e.stunT -= dt; if (e.stunT <= 0) { e.state = 'stalk'; e.cd = .5; } return;
    case 'recover':
      e.wT -= dt;
      if (e.wT <= 0) { if (e.double) { e.double = false; e.know = { x: P.x, y: P.y, t: time }; windCharge(e, .4); } else { e.state = 'stalk'; e.cd = enr ? .5 : .9; } }
      return;
  }
  e.state = 'stalk';
  const dP = Math.hypot(P.x - e.x, P.y - e.y);
  if (e.cd <= 0 && !P.dead) {
    if (dP < 85) { e.state = 'windsmash'; e.wT = e.wT0 = enr ? .45 : .6; popups.push({ x: e.x, y: e.y - 52, text: 'HNNG', t: time, c: 1, size: 15, vy: -10 }); SFX.pump(e.x, e.y); return; }
    const dk = Math.hypot(k.x - e.x, k.y - e.y);
    if (time - k.t < 1.6 && dk > 130 && los(e.x, e.y, k.x, k.y)) { windCharge(e, enr ? .5 : .8); return; }
  }
  if (time > (e.humT || 0)) {
    e.humT = time + 1.6;
    emitSound(e.x, e.y, { hear: 0, reveal: 140, col: 1, owner: 'enemy', str: .85 });
    const s = spat(e.x, e.y, 1800); if (AU.ctx && !AU.muted) tone({ pan: s.pan, vol: .12 * s.vol + .02, dur: .8, f0: 62, f1: 55, type: 'sawtooth', echo: .4, attack: .2 });
  }
  if (Math.hypot(k.x - e.x, k.y - e.y) > 60) navTo(e, k.x, k.y, enr ? 130 : 100, dt);
  else e.a = turnTo(e.a, Math.atan2(P.y - e.y, P.x - e.x), dt * 3);
}
function foremanDown(e) {
  MS.bossDown = true; MS.phase = 'ledger'; MS.boss = null; MS.shocks = [];
  slowT = Math.max(slowT, 1.8); hitstop = Math.max(hitstop, .15); zoomPunch = Math.max(zoomPunch, .1); shake = Math.max(shake, 22);
  callout(LV.bossName, LV.bossVerb, 2, true);
  emitSound(e.x, e.y, { hear: 0, reveal: 1400, col: 2, owner: 'env', str: 1.2, force: true });
  for (let i = 0; i < 3; i++) ring(e.x, e.y, 10, 160 + i * 90, i ? 1 : 3, .6 + i * .25, 4);
  light(e.x, e.y, 420, 2, 1.2, 1.3); SFX.boom(e.x, e.y);
  for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) { d.locked = false; d.open = true; d.amt = 0; }
  for (const o of enemies) if (!o.dead && String(o.id)[0] === 'b') { o.hp = 1; damageEnemy(o, 9, 'blast', false); }
  pickups.push(revealable({ id: 'ledger', type: 'ledger', ...safeSpot(e.x, e.y), taken: false, c: 2 }));
  cutForemanDown(e);
  humT = 1.2;
}
function startEscape2(fromCp) {
  const P = player;
  MS.phase = 'escape'; MS.ledger = true; MS.escT = 75; MS.sirenT = .4; MS.spawnT = 3;
  for (const e of enemies) if (!e.dead) { e.know = { x: P.x, y: P.y, t: time }; e.state = 'hunt'; e.path = null; }
  const cands = LV.spawns.map(([x, y]) => ({ x: (x + .5) * T, y: (y + .5) * T })).filter(s => Math.hypot(s.x - P.x, s.y - P.y) > 500);
  for (let i = 0; i < 3 && cands.length; i++) { const s = cands.splice((Math.random() * cands.length) | 0, 1)[0]; enemies.push(makeEnemy('hound', s.x, s.y, 'r' + (MS.nid++))); SFX.dog(s.x, s.y); }
  cutEscape2(fromCp);
  if (!fromCp) saveCheckpoint();
  humT = .3; shake = Math.max(shake, 10);
}
function initPhases2(cp) {
  MS.phase = cp ? cp.phase : 'relays';
  MS.thunderT = rand(7, 11); MS.stormMask = -9; MS.lightning = -9; MS.rumbleT = -9;
  if (cp && cp.phase === 'boss') { MS.phase = 'hall'; startForeman(true); }
  if (cp && cp.phase === 'escape') {
    MS.bossDown = true; MS.ledger = true; MS.phase = 'ledger';
    for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) { d.locked = false; d.open = true; d.amt = 1; }
    timers.push({ t: time + .1, fn: () => startEscape2(true) });
  }
}
function objective2() {
  switch (MS.phase) {
    case 'hall': return { t: 'Enter the furnace hall', s: 'FURNACE HALL', c: CARR[2] };
    case 'boss': return { t: 'Break The Foreman', s: 'FOREMAN', c: CARR[1] };
    case 'ledger': return { t: 'Take the manifest', s: 'MANIFEST', c: CARR[2] };
    case 'escape': return { t: 'Reach Marcus — north pier', s: 'PIER', c: CARR[1] };
    default: return { t: `Cut the PA relays  ${relays.filter(r => r.gone).length}/${relays.length}`, s: 'RELAY', c: CARR[2] };
  }
}
function objectiveSrc2() {
  const P = player;
  switch (MS.phase) {
    case 'hall': return { x: LV.boss.gate[0] * T, y: LV.boss.gate[1] * T };
    case 'boss': return null;
    case 'ledger': return pickups.find(p => p.type === 'ledger' && !p.taken) || null;
    case 'escape': return exitObj;
    default: { let b = null, bd = 1e9; for (const r of relays) if (!r.gone) { const d = Math.hypot(r.x - P.x, r.y - P.y); if (d < bd) { bd = d; b = r; } } return b; }
  }
}
function updL2(dt) {
  const P = player;
  if (LV.storm) updStorm(dt);
  updHammers(dt);
  for (const r of relays) if (!r.gone) {
    r.humT -= dt;
    if (r.humT <= 0) { r.humT = 3; if (Math.hypot(r.x - P.x, r.y - P.y) < 1000) { emitSound(r.x, r.y, { hear: 0, reveal: 90, col: 2, owner: 'env', str: .8 }); const s = spat(r.x, r.y, 1000); if (AU.ctx && !AU.muted) tone({ pan: s.pan, vol: .07 * s.vol, dur: .4, f0: 1180, f1: 1220, type: 'square', echo: .3 }); } }
  }
  if (MS.phase === 'hall' && !P.dead && P.x / T > 42.3 && P.y / T < 19.6) startForeman();
}

// ---------- drawing ----------
function drawHammers() {
  for (const h of hammers) {
    if (h.x < vx0 - 80 || h.x > vx1 + 80 || h.y < vy0 - 80 || h.y > vy1 + 80) continue;
    const warn = h.t >= h.per - .6, lf = hammerLift(h), recent = Math.max(0, 1 - (time - h.slamT) / .6);
    const a = Math.min(1, Math.max(alphaOf(h) * 1.2, glintAlpha(h, 0), .14, warn ? .7 + .3 * Math.sin(realT * 30) : 0, recent));
    const c = warn ? CARR[1] : CARR[2], hgt = .015 + .13 * lf, sz = 19 * (1 + .3 * lf);
    // footprint on the floor
    ctx.strokeStyle = rgba(c, a * .5); ctx.lineWidth = 1; ctx.setLineDash([4, 5]); ctx.strokeRect(h.x - 19, h.y - 19, 38, 38); ctx.setLineDash([]);
    ctx.fillStyle = rgba(c, a * (.05 + .1 * (1 - lf))); ctx.fillRect(h.x - 19, h.y - 19, 38, 38);
    // the raised head, with parallax struts
    const tx = ex(h.x, hgt), ty = ey(h.y, hgt);
    ctx.strokeStyle = rgba(c, a * .45); ctx.lineWidth = 1; ctx.beginPath();
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(h.x + sx * 19, h.y + sy * 19); ctx.lineTo(tx + sx * sz, ty + sy * sz); }
    ctx.stroke();
    ctx.fillStyle = rgba(c, a * .12); ctx.fillRect(tx - sz, ty - sz, sz * 2, sz * 2);
    ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 1.8; ctx.strokeRect(tx - sz, ty - sz, sz * 2, sz * 2);
    ctx.beginPath(); ctx.moveTo(tx - sz * .6, ty); ctx.lineTo(tx + sz * .6, ty); ctx.moveTo(tx, ty - sz * .6); ctx.lineTo(tx, ty + sz * .6); ctx.stroke();
    if (warn) { ctx.strokeStyle = rgba(CARR[1], .6 + .4 * Math.sin(realT * 30)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, 40, 0, TAU); ctx.stroke(); }
  }
}
function drawRelays() {
  for (const r of relays) {
    if (r.gone || r.x < vx0 - 80 || r.x > vx1 + 80 || r.y < vy0 - 80 || r.y > vy1 + 80) continue;
    const blink = Math.floor(realT * 2 + r.id) % 2 === 0;
    const a = Math.min(1, Math.max(alphaOf(r) * 1.2, glintAlpha(r, 0)));
    const tx = ex(r.x, .1), ty = ey(r.y, .1), c = CARR[2];
    if (a > .03) {
      ctx.strokeStyle = rgba(c, a); ctx.lineWidth = 1.6; ctx.fillStyle = rgba(c, a * .12);
      ctx.beginPath(); ctx.rect(r.x - 11, r.y - 11, 22, 22); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(r.x - 8, r.y - 8); ctx.lineTo(tx, ty); ctx.moveTo(r.x + 8, r.y - 8); ctx.lineTo(tx, ty); ctx.moveTo(r.x - 8, r.y + 8); ctx.lineTo(tx, ty); ctx.moveTo(r.x + 8, r.y + 8); ctx.lineTo(tx, ty); ctx.stroke();
      for (let i = 0; i < 3; i++) { const rr = ((realT * 1.1 + i / 3) % 1) * 34 + 6; ctx.strokeStyle = rgba(c, a * (1 - rr / 40)); ctx.beginPath(); ctx.arc(tx, ty, rr, -2.4, -.7); ctx.moveTo(tx + Math.cos(.7) * rr, ty + Math.sin(.7) * rr); ctx.arc(tx, ty, rr, .7, 2.4); ctx.stroke(); }
    }
    // the beacon light reads from further away
    if (blink && Math.hypot(r.x - player.x, r.y - player.y) < 1000) { ctx.fillStyle = rgba(CARR[1], Math.max(.35, a)); ctx.beginPath(); ctx.arc(tx, ty, 3.2, 0, TAU); ctx.fill(); }
  }
}
function drawL2HUD(S, pad) {
  if (LV.id !== 2 || state !== 'playing') return;
  const P = player;
  if (LV.storm) {
    ctx.save(); ctx.strokeStyle = 'rgba(200,225,255,.07)'; ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 70; i++) { const x = (i * 97 + realT * 900 + (i % 7) * 131) % (W + 200) - 100, y = (i * 61 + realT * 1600 * (1 + (i % 3) * .2)) % (H + 60) - 30; ctx.moveTo(x, y); ctx.lineTo(x - 7, y + 22); }
    ctx.stroke(); ctx.restore();
    const lk = realT - MS.lightning;
    if (lk >= 0 && lk < .6) { const f = lk < .08 ? .4 : lk < .14 ? .05 : lk < .22 ? .28 : .28 * (1 - (lk - .22) / .38); ctx.fillStyle = `rgba(220,235,255,${f})`; ctx.fillRect(0, 0, W, H); }
  }
  const m = l2Mask(P.x, P.y);
  if (m < 1 && !P.dead) {
    const yy = H - pad - 30 * S - 2 * S - 50 * S - 18 * S, storm = time < MS.stormMask;
    text(storm ? 'THUNDER COVER  ·  MOVE' : 'MACHINE NOISE  ·  MUFFLED', W / 2, yy, 11 * S, CARR[0], .65 + .35 * Math.sin(realT * 6), 'center', 700, `${4 * S}px`);
    if (storm) { const k = clamp((MS.stormMask - time) / 3, 0, 1); ctx.fillStyle = rgba(CARR[0], .8); ctx.fillRect(W / 2 - 70 * S * k, yy + 9 * S, 140 * S * k, 2); }
  }
}

// ---------- level flow: briefing, title, transitions ----------
function beginBriefing(i) {
  initAudio(); voPreload(); voStopAll(); stopRain();
  setLevel(i); buildLevel(null); player.x = -9999; player.y = -9999;
  state = 'briefing'; BRF = { lines: LV.briefing || [], i: -1, t0: realT, next: realT + 1.2, endT: 0, lineT: realT };
  if (LV.storm) startRain();
}
function updBriefing(dt) {
  updAttract(dt);
  if (realT < BRF.next) return;
  if (BRF.i + 1 >= BRF.lines.length) { if (!BRF.endT) BRF.endT = realT + 1.2; if (realT >= BRF.endT) finishBriefing(); return; }
  BRF.i++;
  const [who, t] = BRF.lines[BRF.i];
  const d = speak(who, t, { ch: 'brief' }) || (1.6 + t.length / 16);
  BRF.lineT = realT; BRF.next = realT + d + .5;
}
function briefNext() { voStopAll(); BRF.next = realT; }
function finishBriefing() { if (state !== 'briefing') return; voStopAll(); startGame(false); }
function drawBriefing() {
  const s = clamp(Math.min(W / 1400, H / 860), .62, 1.2);
  const g = ctx.createLinearGradient(0, 0, W * .8, 0);
  g.addColorStop(0, 'rgba(0,0,0,.95)'); g.addColorStop(.6, 'rgba(0,0,0,.75)'); g.addColorStop(1, 'rgba(0,0,0,.1)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const x0 = Math.max(40, W * .07), top = H * .14, k = realT - BRF.t0;
  text('LEVEL ' + LV.num, x0, top, 14 * s, CARR[0], .9, 'left', 700, `${8 * s}px`);
  glitchText(LV.name, x0, top + 44 * s, 56 * s, CARR[3], Math.min(1, k / .6), 'left', 600, `${14 * s}px`, k < 1 ? 3 : 0);
  text(LV.sub || '', x0, top + 88 * s, 13 * s, CARR[2], .8, 'left', 600, `${5 * s}px`);
  ctx.fillStyle = rgba(CARR[0], .5); ctx.fillRect(x0, top + 108 * s, 40 * s, 1.5);
  let y = top + 140 * s;
  const maxW = Math.min(W * .55, 660 * s), shown = BRF.lines.slice(0, BRF.i + 1).slice(-6);
  shown.forEach(([who, t], j) => {
    const cur = j === shown.length - 1, a = cur ? 1 : .4;
    const col = who === 'ECHO' ? CARR[0] : who === 'FOREMAN' || who === 'CONDUCTOR' ? CARR[1] : CARR[2];
    text(who, x0, y, 11 * s, col, a, 'left', 700, `${5 * s}px`);
    ctx.font = `500 ${18 * s}px ${FONT}`;
    const lines = wrapLines(t, maxW);
    let left = cur ? Math.floor((realT - BRF.lineT) * 40) : 1e9;
    lines.forEach((l, i) => { const sub = l.slice(0, Math.max(0, left)); left -= l.length + 1; if (sub) text(sub, x0, y + 24 * s + i * 24 * s, 18 * s, CARR[3], a, 'left', 500, '0.4px'); });
    y += 36 * s + lines.length * 24 * s;
  });
  text(LV.brief, x0, H - 74 * s, 14 * s, CARR[3], .55, 'left', 600, '1px');
  text('CLICK  NEXT LINE   ·   ENTER  SKIP', x0, H - 44 * s, 11 * s, CARR[3], .45, 'left', 600, `${4 * s}px`);
}
function toTitle() {
  voStopAll(); stopRain(); setLevel(0); buildLevel(null);
  player.x = -9999; player.y = -9999; state = 'title';
}
