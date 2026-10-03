// =====================================================================
//  DEPTH: ENEMY HEARTBEATS · DISGUISE
// =====================================================================
const HB_R = 290, HB_WALL = 170, DISG_T = 5, DISG_CD = 18;
let hbHeard = [], heartFx = [];

// ---------- every enemy has a pulse; you can hear the closest ones ----------
function bpmTarget(e) {
  if (e.type === 'boss') {
    if (e.foreman) return e.state === 'charge' || e.state === 'windcharge' ? 176 : e.state === 'stunned' ? 152 : 112;
    return e.hp <= e.maxhp * .5 ? 118 : 72; // the Conductor stays terrifyingly calm
  }
  let b = 66;
  switch (e.state) {
    case 'search': b = 104; break;
    case 'hunt': b = 132; break;
    case 'windup': case 'aim': case 'burst': case 'lunge': b = 168; break;
    case 'stun': b = 150; break;
  }
  if (e.type === 'hound') b += 30;
  if (e.quiet) b -= 12;
  if (time - e.hurtT < 3) b += 25;
  return b + (e.fear || 0);
}
function heartThump(e, d) {
  const P = player, clear = los(P.x, P.y, e.x, e.y);
  if (!clear && d > HB_WALL) return;
  const v = (1 - d / HB_R) * (clear ? 1 : .45);
  if (AU.ctx && !AU.muted) {
    const s = spat(e.x, e.y, HB_R * 1.4), vol = (.08 + .2 * v) * (P.deafT > 0 ? .25 : 1);
    tone({ pan: s.pan, vol, dur: .11, f0: 74, f1: 48, echo: .05 });
    tone({ pan: s.pan, vol: vol * .7, dur: .1, f0: 66, f1: 44, echo: .05, delay: Math.max(.09, 14 / e.bpm) });
  }
  if (clear) heartFx.push({ x: e.x, y: e.y, t: time, v, hot: e.bpm > 140 });
}
function depthOnKill(e) {
  // fear spreads: anyone close by feels it
  for (const o of enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 450) o.fear = Math.min(60, (o.fear || 0) + 30);
  // a kill in plain sight blows the disguise
  if (player.disgT > 0) {
    const w = enemies.find(o => !o.dead && !o.hidden && o !== e && o.type !== 'boss' && Math.hypot(o.x - e.x, o.y - e.y) < 260 && los(o.x, o.y, e.x, e.y));
    if (w) breakDisguise('witness', w);
  }
}

// ---------- disguise: five seconds as one of them ----------
function disguise() {
  const P = player;
  if (P.disgT > 0) return;
  if ((P.disgCD || 0) > 0) { SFX.empty(); return; }
  P.disgT = DISG_T; P.disgCD = DISG_CD;
  // whoever was tracking you just lost you in the crowd
  for (const e of enemies) {
    if (e.dead || e.type === 'boss' || e.type === 'hound' || !e.know || time - e.know.t > 2) continue;
    e.know = { ...e.know, t: e.know.t - 2.5 };
    if (e.state === 'hunt' && Math.random() < .6) { e.state = 'search'; e.searchT = rand(2, 4); e.wgoal = null; e.path = null; }
  }
  ring(P.x, P.y, 6, 60, 1, .4, 2); sparks(P.x, P.y, 0, 14, 1, 220, PI);
  if (AU.ctx && !AU.muted) { noise({ vol: .22, dur: .3, f0: 900, f1: 3500, type: 'bandpass', q: 1, echo: .1 }); tone({ vol: .1, dur: .4, f0: 420, f1: 260, type: 'triangle', echo: .3 }); }
  emitSound(P.x, P.y, { hear: 0, reveal: 90, col: 1, owner: 'env', str: .6 });
  if (!MS.said.disguise) {
    MS.said.disguise = 1;
    callout('DISGUISED', 'FIVE SECONDS · THEY SEE ONE OF THEIR OWN', 0);
    radio('MARCUS', "Their walk, their radio chatter. You've got five seconds before someone looks twice. Dogs won't buy it.");
  }
}
function breakDisguise(why, who) {
  const P = player;
  if (!(P.disgT > 0)) return;
  P.disgT = 0;
  for (const e of enemies) e.suspT = 0;
  popups.push({ x: P.x, y: P.y - 34, text: 'COVER BLOWN', t: time, c: 1, size: 15, vy: -16, pop: true });
  let spoke = false;
  for (const e of enemies) {
    if (e.dead || e.hidden || e.type === 'boss') continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if ((e === who || d < 240) && los(e.x, e.y, P.x, P.y)) {
      e.know = { x: P.x, y: P.y, t: time };
      if (e.state !== 'stun') { e.state = 'hunt'; e.path = null; }
      if (!spoke) { spoke = true; say(e, 'blown', true); }
    }
  }
  if (AU.ctx && !AU.muted) tone({ vol: .14, dur: .35, f0: 300, f1: 140, type: 'sawtooth', echo: .3 });
}
function updDisguise(dt) {
  const P = player;
  P.disgCD = Math.max(0, (P.disgCD || 0) - dt);
  if (!(P.disgT > 0)) return;
  P.disgT -= dt;
  // the last moments: someone looks twice
  if (P.disgT < 1.6) for (const e of enemies) {
    if (e.dead || e.hidden || e.type === 'boss' || e.type === 'hound' || e.suspT) continue;
    if (Math.hypot(e.x - P.x, e.y - P.y) < 140 && los(e.x, e.y, P.x, P.y)) {
      e.suspT = time;
      popups.push({ x: e.x, y: e.y - 30, text: '?', t: time, c: 2, size: 22, vy: -10, pop: true });
      e.a = Math.atan2(P.y - e.y, P.x - e.x);
      say(e, 'suspect', true);
    }
  }
  if (P.disgT <= 0) {
    const spotted = enemies.find(e => !e.dead && !e.hidden && e.type !== 'boss' && Math.hypot(e.x - P.x, e.y - P.y) < 130 && los(e.x, e.y, P.x, P.y));
    if (spotted) { P.disgT = .001; breakDisguise('expired', spotted); } // still "on" so the break goes through
    else { P.disgT = 0; for (const e of enemies) e.suspT = 0; showMsg('DISGUISE WORN OFF', 3); }
  }
}

// ---------- per-frame ----------
function updDepth(dt) {
  const P = player, near = [];
  for (const e of enemies) {
    if (e.dead || e.hidden) continue;
    if (e.bpm == null) { e.bpm = 62 + rand(0, 12); e.beat = rand(0, 1); }
    e.fear = Math.max(0, (e.fear || 0) - dt * 3);
    const tg = bpmTarget(e); e.bpm += clamp(tg - e.bpm, -8 * dt, 28 * dt);
    e.beat += dt * e.bpm / 60;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (d < HB_R && !P.dead) near.push({ e, d });
  }
  near.sort((a, b) => a.d - b.d);
  hbHeard = near.slice(0, 3);
  for (const { e, d } of hbHeard) if (e.beat >= 1) { e.beat -= 1; heartThump(e, d); }
  for (const e of enemies) if (e.beat >= 1) e.beat %= 1;
  if (heartFx.length) heartFx = heartFx.filter(h => time - h.t <= .7 && h.t <= time + .01); // drops stale ones from a previous level too
  updDisguise(dt);
}

// ---------- drawing ----------
function drawHearts() {
  for (const h of heartFx) {
    const k = (time - h.t) / .7, a = (1 - k) * (.25 + .5 * h.v);
    ctx.strokeStyle = rgba(CARR[1], a); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(h.x, h.y, 7 + easeOut(k) * (h.hot ? 30 : 22), 0, TAU); ctx.stroke();
    if (k < .35) { ctx.fillStyle = rgba(CARR[1], a * .6); ctx.beginPath(); ctx.arc(h.x, h.y, 2.5, 0, TAU); ctx.fill(); }
  }
  // pulse readout over marked enemies — a calm heart means they don't know you're there
  ctx.font = `700 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const e of enemies) {
    if (e.dead || e.hidden || !isMarked(e) || e.bpm == null) continue;
    const b = Math.round(e.bpm), c = b < 90 ? CARR[0] : b < 135 ? CARR[2] : CARR[1];
    ctx.fillStyle = rgba(c, .85); ctx.fillText(`♥ ${b}`, e.x, e.y + e.r + 22);
  }
}
function drawDisguiseFX() {
  const P = player; if (!(P.disgT > 0) || P.dead) return;
  // a faint ghost of who you really are, flickering under the uniform
  const fl = .12 + .1 * Math.max(0, Math.sin(realT * 9));
  drawCharacter(P.x, P.y, { kind: 'player', weapon: P.weapon, a: P.a, ma: P.moveA, ph: P.stepPh || 0, mv: P.moveAmt, run: P.running, alpha: fl, additive: true });
  const k = P.disgT / DISG_T;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(P.disgT < 1.6 ? CARR[1] : CARR[2], .7); ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(P.x, P.y, 26, -PI / 2, -PI / 2 + TAU * k); ctx.stroke();
  ctx.restore();
}
function drawDepthHUD(S, pad) {
  if (state !== 'playing') return;
  const P = player;
  // nearest heart, next to the noise meter
  const by = H - pad - 30 * S, ny = by - 2 * S - 50 * S;
  if (hbHeard.length && !P.dead) {
    const e = hbHeard[0].e, b = Math.round(e.bpm), c = b < 90 ? CARR[0] : b < 135 ? CARR[2] : CARR[1];
    const word = b < 90 ? 'CALM' : b < 135 ? 'ALERT' : 'COMBAT';
    const pulse = 1 + .25 * Math.max(0, 1 - ((e.beat || 0) * 4));
    text('♥', W / 2 + 126 * S, ny + 3 * S, 12 * S * pulse, c, .95, 'center', 700);
    text(`${b}  ${word}`, W / 2 + 138 * S, ny + 3 * S, 10 * S, c, .85, 'left', 700, `${2 * S}px`, MONO);
  }
  if (P.disgT > 0) {
    const k = P.disgT / DISG_T, warn = P.disgT < 1.6, y = pad + (MS.boss || MS.phase === 'escape' ? 178 : 114) * S; // clear of the radio panel
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .72);
    g.addColorStop(0, 'rgba(255,48,72,0)'); g.addColorStop(1, `rgba(255,48,72,${warn ? .14 + .08 * Math.sin(realT * 14) : .08})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    text(warn ? 'SOMEONE IS LOOKING' : 'DISGUISED', W / 2, y, 14 * S, warn ? CARR[1] : CARR[2], .9, 'center', 700, `${6 * S}px`);
    ctx.fillStyle = rgba(CARR[3], .12); ctx.fillRect(W / 2 - 80 * S, y + 12 * S, 160 * S, 3 * S);
    ctx.fillStyle = rgba(warn ? CARR[1] : CARR[2], .9); ctx.fillRect(W / 2 - 80 * S, y + 12 * S, 160 * S * k, 3 * S);
  }
}
