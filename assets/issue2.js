// =====================================================================
//  ECHO #2 — SHE'S STILL HUMMING
//  Same rules as the Archive: light means they see you, the roar drowns your echo,
//  one valve kills a whole circuit. New: the Mimic, who steals voices, and a code phrase.
// =====================================================================
const FURN2 = [[7, 36], [32, 35], [13, 18], [26, 20], [8, 3], [54, 34]];
const MAINS2 = [[12, 23, [0, 2, 4]], [38, 41, [1, 3, 5]]];
const LOCK2 = LEVEL2.lockedMsg, LOCK2_FURN = 'SEALED — THE HALL DOORS RUN ON FURNACE PRESSURE · SHUT THE FURNACES';
const MIMIC_CALLS = [ // in Marcus's own voice. Only the missing phrase gives it away.
  { text: "Elias, the west main is down the dock corridor. It's clear. Go now.", at: [8.5, 28] },
  { text: "Change of plan. Get to the east shed, I'm pulling you out.", at: [56, 38] },
];
const gates2 = lock => { for (const d of doors) if (LV.gates.some(([x, y]) => d.tx === x && d.ty === y)) { d.locked = lock; if (lock) { d.open = false; d.amt = 0; } } };

// ---------- the furnaces come on ----------
function furnacesOn() {
  MS.phase = 'lights'; gates2(true); LV.lockedMsg = LOCK2_FURN;
  if (player.disgT > 0) breakDisguise('light'); phantom = null;
  playCutscene([
    { cam: csAt(26, 20, .55), dur: 1.2 },
    { say: ['FOREMAN', 'You cut my PA? Then hear this.'], keep: true, fn: () => lightsUp(false) },
    { cam: csAt(13, 18, .6), say: ['MARCUS', "Engine's running. He's fired every furnace, Elias. The roar's drowning you out. Shut them down. The gas mains feed three each."], keep: true },
    { cam: csP(1), say: ['ECHO', "Then I'll make it dark again."], keep: true },
  ], () => { callout('FURNACES LIT', `THE ROAR DROWNS YOUR ECHO · SHUT THEM  0/${lamps.length}`, 1, true); lightsFight(false); });
  saveCheckpoint();
}
function darkAgain2() {
  MS.phase = 'hall'; LV.lockedMsg = LOCK2;
  panelFreeze(player.x, player.y, 'COLD!', INK.yellow);
  gates2(false);
  callout('DARK AGAIN', 'FURNACES COLD · THE HALL IS OPEN · ECHO BACK ONLINE', 0, true);
  emitSound(player.x, player.y, { hear: 0, reveal: 700, col: 0, owner: 'env', str: .8, force: true });
  timers.push({ t: time + 1.4, fn: () => cutGates() });
  saveCheckpoint();
}

// ---------- the Mimic ----------
function mimicStart() {
  if (MS.mimic) return;
  const P = player;
  const sp = LV.spawns.map(([x, y]) => ({ x: (x + .5) * T, y: (y + .5) * T })).filter(s => !los(P.x, P.y, s.x, s.y)).sort((a, b) => Math.hypot(b.x - P.x, b.y - P.y) - Math.hypot(a.x - P.x, a.y - P.y))[0];
  if (!sp) return;
  const e = makeEnemy('assassin', sp.x, sp.y, 'mimic');
  e.mimic = true; e.hp = 99; e.hits = 0; e.state = 'patrol'; e.patrol = null; e.home = { x: sp.x, y: sp.y };
  enemies.push(e); MS.mimic = e; MS.mimT = 9;
  timers.push({ t: time + 16, fn: () => mimicCall(0) });
  timers.push({ t: time + 52, fn: () => mimicCall(1) });
}
function mimicCall(i) {
  const m = MS.mimic; if (!m || m.dead || (MS.phase !== 'lights' && MS.phase !== 'hall')) return;
  const c = MIMIC_CALLS[i];
  if (i === 0) radio('MIMIC', "Elias, the west main is down the dock corridor. It's clear. Go now.");
  else radio('MIMIC', "Change of plan. Get to the east shed, I'm pulling you out.");
  MS.rq.unshift(MS.rq.pop()); // a fake only works if it lands now
  MS.ambush = { x: (c.at[0] + .5) * T, y: (c.at[1] + .5) * T, armed: true };
  if (i === 0) timers.push({ t: time + 18, fn: () => { radio('MARCUS', "Engine's running, Elias. It's me. If a call doesn't say it, it isn't me."); MS.rq.unshift(MS.rq.pop()); } });
}
function springAmbush(a) {
  const P = player;
  a.armed = false;
  for (let k = 0; k < 3; k++) {
    const ang = Math.atan2(P.y - a.y, P.x - a.x) + PI + (k - 1) * .9, s = safeSpot(a.x + Math.cos(ang) * 190, a.y + Math.sin(ang) * 190);
    const e = makeEnemy(k === 1 ? 'gunner' : 'hunter', s.x, s.y, 'r' + (MS.nid++));
    e.state = 'hunt'; e.know = { x: P.x, y: P.y, t: time };
    enemies.push(e); SFX.door(s.x, s.y);
  }
  panelFreeze(P.x, P.y, 'AMBUSH!', INK.red);
  callout('AMBUSH', "NO CODE PHRASE · IT WASN'T MARCUS", 1, true);
  thought('No phrase. I should have listened.');
}
function mimicVanish(e, away) {
  const P = player;
  sparks(e.x, e.y, 0, 22, 1, 380, PI); smoke(e.x, e.y, 6, .8); play('static', { x: e.x, y: e.y, range: 1500, vol: .6 });
  comicWord(e.x, e.y - 28, 'GLITCH!', { col: INK.white, size: 22, burst: true, burstCol: [178, 92, 255], range: 2000 });
  if (!away) {
    const sp = LV.spawns.map(([x, y]) => ({ x: (x + .5) * T, y: (y + .5) * T })).filter(s => Math.hypot(s.x - P.x, s.y - P.y) > 600 && !los(P.x, P.y, s.x, s.y));
    const s = sp[(Math.random() * sp.length) | 0] || e.home;
    e.x = e.gx = s.x; e.y = e.gy = s.y; e.home = { x: s.x, y: s.y }; e.state = 'patrol'; e.path = null; e.know = null;
    return;
  }
  e.dead = true; e.escaped = true; // gone, not killed
  const i = enemies.indexOf(e); if (i >= 0) enemies.splice(i, 1);
  callout('IT GOT AWAY', 'THE MIMIC IS STILL OUT THERE', 1, true);
  thought('Run, then. I know your voice now.');
}
{
  const de = damageEnemy;
  damageEnemy = function (e, dmg, cause, silent) {
    if (!e || !e.mimic || e.dead) return de(e, dmg, cause, silent);
    e.hits++; e.hurtT = time; e.litS = 1.2; e.litT = time; e.gx = e.x; e.gy = e.y; e.ga = e.a;
    hitMark = { t: realT, kill: false };
    mimicVanish(e, e.hits >= 3);
  };
}
function updEcho2(dt) {
  const P = player; if (P.dead) return;
  if (!MS.blindSet) { MS.blindSet = 1; MS.blind = true; MS.intel = 1; } // after the Archive, every one of them knows it's Calder
  if (MS.phase === 'lights' && !MS.said.main) for (const b of breakers) if (brkLive(b) && Math.hypot(b.x - P.x, b.y - P.y) < 480 && los(P.x, P.y, b.x, b.y)) {
    MS.said.main = 1; callout('GAS MAIN', "ONE VALVE SHUTS THREE FURNACES · IT'S GUARDED", 2); thought('A gas main. One valve, three furnaces. And two men standing on it.'); break;
  }
  const a = MS.ambush; if (a && a.armed && Math.hypot(P.x - a.x, P.y - a.y) < 230) springAmbush(a);
  const m = MS.mimic; if (!m || m.dead) return;
  const dm = Math.hypot(m.x - P.x, m.y - P.y);
  if (!MS.said.mimic && dm < 460 && los(m.x, m.y, P.x, P.y)) {
    MS.said.mimic = 1; m.litS = 1.2; m.litT = time; m.gx = m.x; m.gy = m.y; m.ga = m.a;
    callout('THE MIMIC', 'IT STEALS SOUNDS · ITS FAKES HAVE NO HEARTBEAT', 1, true);
  }
  // footsteps that aren't there, closing on you
  if ((MS.mimT -= dt) <= 0 && dm < 1500) {
    MS.mimT = rand(9, 13);
    for (let k = 0; k < 2; k++) {
      const ang = rand(0, TAU), d = rand(300, 460), x = P.x + Math.cos(ang) * d, y = P.y + Math.sin(ang) * d;
      if (passable(Math.floor(x / T), Math.floor(y / T))) addFake(x, y, 'hunter', 6, { x: P.x, y: P.y });
    }
  }
  // once: her song, hummed live
  if (!MS.said.hum && (dm < 650 || (MS.fakeAt && realT - MS.fakeAt > 12))) {
    MS.said.hum = 1;
    play('lena', { x: m.x, y: m.y, range: 2000, vol: .9, rev: .6, jit: 0 });
    comicWord(m.x, m.y - 30, '♪ hm · hm · hm · hmm', { col: INK.yellow, size: 18, range: 2400, life: 2.6 });
    m.litS = 1.2; m.litT = time; m.gx = m.x; m.gy = m.y; m.ga = m.a;
    thought("That's not a recording. Someone's humming it live.");
  }
}

// ---------- the Mimic, drawn: a cloaked figure, a blank white mask, a speaker for a mouth ----------
{
  const ep = enemyPose;
  enemyPose = function (e, live) { const o = ep(e, live); if (e.mimic) o.kind = 'mimic'; return o; };
  const dt = drawTorso;
  drawTorso = function (k) {
    if (k !== 'mimic') return dt(k);
    dt('assassin');
    for (let i = 0; i < 3; i++) {
      const u = ((realT * 1.2 + i / 3) % 1);
      ctx.strokeStyle = `rgba(235,240,255,${(1 - u) * .7})`; ctx.lineWidth = .9;
      ctx.beginPath(); ctx.arc(3, 0, 2 + u * 7, -.9, .9); ctx.stroke();
    }
  };
  const dh = drawHeadTop;
  drawHeadTop = function (k, o) {
    if (k !== 'mimic') return dh(k, o);
    ctx.beginPath(); ctx.moveTo(-5, -4.6); ctx.lineTo(-12, 0); ctx.lineTo(-5, 4.6); ctx.closePath(); body(null, 1.1);
    ctx.beginPath(); ctx.ellipse(1, 0, 7.4, 7, 0, 0, TAU); body(null, 1.5);
    ctx.beginPath(); ctx.ellipse(4, 0, 3.8, 5.4, 0, 0, TAU); ctx.fillStyle = 'rgba(232,238,245,.95)'; ctx.fill(); // no eyes
    ctx.strokeStyle = 'rgba(10,14,20,.9)'; ctx.lineWidth = .7; ctx.beginPath();
    for (let i = -2; i <= 2; i++) { ctx.moveTo(5.6, i * 1.5); ctx.lineTo(7, i * 1.5); }
    ctx.stroke();
  };
}

// ---------- furnaces, drawn: squat boxes with a burning mouth ----------
{
  const dl = drawLamps;
  drawLamps = function () {
    if (LV.id !== 2) return dl();
    for (const l of lamps) {
      if (l.x < vx0 - l.r || l.x > vx1 + l.r || l.y < vy0 - l.r || l.y > vy1 + l.r) continue;
      const fl = .82 + .18 * Math.sin(realT * 17 + l.swing) * Math.sin(realT * 5.3 + l.swing * 2);
      if (l.on) {
        if (!l.poly) l.poly = visPoly(l.x, l.y, l.r);
        ctx.save(); ctx.beginPath(); const p = l.poly; ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); ctx.clip();
        const g = ctx.createRadialGradient(l.x, l.y, 6, l.x, l.y, l.r);
        g.addColorStop(0, `rgba(255,160,70,${.45 * fl})`); g.addColorStop(.45, `rgba(255,110,40,${.16 * fl})`); g.addColorStop(1, 'rgba(255,90,30,0)');
        ctx.fillStyle = g; ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
        ctx.restore();
      }
      const h = .07, tx = ex(l.x, h), ty = ey(l.y, h), c = l.on ? `rgba(255,170,90,${.95 * fl})` : 'rgba(150,160,180,.35)';
      ctx.strokeStyle = c; ctx.lineWidth = 1.5;
      ctx.strokeRect(l.x - 17, l.y - 17, 34, 34);
      ctx.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { ctx.moveTo(l.x + sx * 17, l.y + sy * 17); ctx.lineTo(tx + sx * 14, ty + sy * 14); } ctx.stroke();
      ctx.strokeRect(tx - 14, ty - 14, 28, 28);
      if (l.on) {
        ctx.fillStyle = `rgba(255,${190 + 40 * fl | 0},110,${fl})`; ctx.fillRect(tx - 9, ty - 4, 18, 8);
        ctx.strokeStyle = `rgba(255,230,170,${fl})`; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = -1; i <= 1; i++) { const f = Math.sin(realT * 13 + i * 2 + l.swing) * 3; ctx.moveTo(tx + i * 5, ty - 4); ctx.lineTo(tx + i * 5 + f * .4, ty - 9 - Math.abs(f)); }
        ctx.stroke();
      } else { ctx.strokeStyle = 'rgba(150,160,180,.35)'; ctx.strokeRect(tx - 9, ty - 4, 18, 8); }
    }
  };
}
{
  const da = darkAgain;
  darkAgain = function () { if (LV.id === 2) return darkAgain2(); return da(); };
  const bl = buildL2;
  buildL2 = function (cp) { bl(cp); if (LV.id === 2) LV.lockedMsg = cp && cp.phase === 'lights' ? LOCK2_FURN : LOCK2; };
}
