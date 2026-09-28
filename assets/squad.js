// =====================================================================
//  VOICE — pre-rendered neural voice lines (assets/voice/vo.js), run through the game's audio graph
// =====================================================================
const VOX = { buf: {}, pend: {}, ch: {}, shaper: null };
const VSTYLE = {
  ECHO: { echo: .16, lp: 9000, low: 4, gain: 1.25 },
  MARCUS: { radio: true, echo: .1, gain: 1.45 },
  CONDUCTOR: { echo: .55, lp: 7500, low: 6, gain: 1.35, rate: .97 },
  LENA: { echo: .5, lp: 6500, gain: 1.15 },
  ENEMY: { spatial: true, echo: .32, lp: 6000, gain: 1.6 },
};
function voEntry(key) { return window.VO_LINES && window.VO_LINES[key]; }
function voDecode(key) {
  if (VOX.buf[key]) return VOX.buf[key];
  const ent = voEntry(key); if (!ent || !AU.ctx || VOX.pend[key]) return null;
  VOX.pend[key] = 1;
  try {
    const bin = atob(ent.b), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    AU.ctx.decodeAudioData(u.buffer).then(b => { VOX.buf[key] = b; }, () => {});
  } catch (e) {}
  return null;
}
function voPreload() { if (!window.VO_LINES || !AU.ctx || VOX.pre) return; VOX.pre = true; for (const k in window.VO_LINES) voDecode(k); }
function voStop(ch) { const c = VOX.ch[ch]; if (c) { try { c.stop(); } catch (e) {} VOX.ch[ch] = null; } }
function voStopAll() { for (const k in VOX.ch) voStop(k); }
// plays a line; returns its length in seconds (0 when there's no recording — the subtitle still shows)
function speak(who, text, o) {
  o = o || {};
  const key = (o.vox || who) + '|' + text, ent = voEntry(key);
  if (!ent) return 0;
  if (!AU.ctx || AU.muted) return ent.d;
  const b = voDecode(key); if (!b) return ent.d;
  const X = AU.ctx, st = VSTYLE[o.style || who] || VSTYLE.ENEMY, t = X.currentTime + (o.delay || 0);
  const src = X.createBufferSource(); src.buffer = b; src.playbackRate.value = st.rate || 1;
  let node = src;
  const add = n => { node.connect(n); node = n; };
  const bq = (type, f, q, gain) => { const n = X.createBiquadFilter(); n.type = type; n.frequency.value = f; if (q) n.Q.value = q; if (gain) n.gain.value = gain; add(n); };
  if (st.radio) {
    bq('highpass', 380, .7); bq('lowpass', 3300, .7); bq('peaking', 1700, 1.2, 6);
    if (!VOX.shaper) { const c = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; c[i] = Math.tanh(x * 2.2); } VOX.shaper = c; }
    const w = X.createWaveShaper(); w.curve = VOX.shaper; add(w);
  } else {
    if (st.lp) bq('lowpass', st.lp, .6);
    if (st.low) bq('lowshelf', 200, 0, st.low);
  }
  let vol = (o.vol ?? 1) * (st.gain || 1), pan = 0;
  if (st.spatial) { const s = spat(o.x, o.y, o.range || 1500); vol *= .12 + .88 * s.vol; pan = s.pan; }
  if (player && player.deafT > 0) vol *= .3;
  const g = X.createGain(); g.gain.value = vol; add(g);
  node.connect(outNode(pan, 1, st.echo ?? .2));
  src.start(t);
  const ch = o.ch || who;
  voStop(ch); VOX.ch[ch] = src; src.onended = () => { if (VOX.ch[ch] === src) VOX.ch[ch] = null; };
  const dur = b.duration / (st.rate || 1);
  if (st.radio) { noise({ vol: .08, dur: .12, f0: 2600, type: 'bandpass', q: 2, echo: 0, delay: dur + (o.delay || 0) }); }
  return dur;
}
window.echoSpeak = speak; window.echoVoiceStop = voStopAll; window.echoVoicePreload = () => { initAudio(); voPreload(); };

// =====================================================================
//  SQUAD AI — they work out that you're blind, then hunt you as a team
// =====================================================================
const BARKS = /*json*/{
  "alert": ["There!", "I heard something!", "Over here!", "Contact!"],
  "search": ["Where'd he go?", "Quiet. Listen.", "Spread out.", "I lost him."],
  "down": ["Man down!", "He's picking us off!", "We lost one!"],
  "ping": ["That ping! He's right there!", "He's clicking. Follow the click!"],
  "blind": ["He's blind! He can't see us, he's hunting by sound!"],
  "quiet": ["Go quiet. Don't give him a sound."],
  "surround": ["Surround him. Nobody makes a sound.", "Circle him. Wait for my call."],
  "pincer": ["Split up! Take him from both sides!", "You go left, I go right."],
  "flank": ["Pin him down! I'm going around!", "Keep him busy. Flank him!"],
  "bait": ["I'll make noise. You take him from behind."],
  "baitNoise": ["Over here, blind man!", "Come on! Follow my voice!"],
  "rush": ["Now! Everyone, now!", "Take him!", "Go, go, go!"],
  "ringer": ["Ringer out! Blow his ears!", "Deafen him!"],
  "spoof": ["Clickers out. Let him chase ghosts."]
}/*end*/;
const SQ_CALL = {
  surround: ["THEY'RE CIRCLING YOU", 'BREAK OUT BEFORE THEY CLOSE'],
  pincer: ['PINCER', 'THEY SPLIT TO BOTH SIDES'],
  flank: ['FLANKERS', 'GUNS PIN YOU · BLADES GO AROUND'],
  bait: ["IT'S A TRAP", 'THE LOUD ONE IS BAIT · LISTEN BEHIND YOU'],
};
function eHash(e) { let h = 0; for (const c of String(e.id)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); }
function say(e, cat, force) {
  if (!e || e.dead || e.hidden) return 0;
  if (!force && (time - (e.sayT ?? -9) < 4 || time - (MS.sayT ?? -9) < 1.1)) return 0;
  const L = BARKS[cat]; if (!L) return 0;
  const text = L[(Math.random() * L.length) | 0];
  e.sayT = time; MS.sayT = time;
  e.vox = e.vox || 'E' + (1 + eHash(e) % 3);
  popups.push({ x: e.x, y: e.y - 40, text: text.toUpperCase(), t: time, c: 1, size: 11, vy: -8 });
  // talking gives them away
  emitSound(e.x, e.y, { hear: 0, reveal: 115, col: 1, owner: 'enemy', str: .7, ind: Math.hypot(e.x - player.x, e.y - player.y) > 360 });
  return speak(e.vox, text, { style: 'ENEMY', x: e.x, y: e.y, ch: 'e' + e.id }) || .9;
}
function initSquad(cp) {
  MS.blind = !!(cp && cp.blind); MS.intel = MS.blind ? 1 : 0;
  MS.sq = null; MS.sqCD = 4; MS.toolCD = 6; MS.ringers = []; MS.fakes = []; MS.sayT = -9;
  if (player) { player.deafT = 0; player.deafMax = 1; }
  if (AU.master) AU.master.gain.value = AU.muted ? 0 : .85;
}
function hunters(maxD) {
  const P = player;
  return enemies.filter(e => !e.dead && !e.hidden && e.type !== 'boss' && e.state === 'hunt' && Math.hypot(e.x - P.x, e.y - P.y) < maxD);
}
function learn(amt, who) {
  if (MS.blind) return;
  MS.intel = Math.min(1, MS.intel + amt);
  if (MS.intel >= 1) blindReveal(who);
}
function blindReveal(sp) {
  if (MS.blind) return;
  MS.blind = true; MS.intel = 1;
  sp = sp && !sp.dead ? sp : hunters(1200).sort((a, b) => Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y))[0];
  const d = sp ? say(sp, 'blind', true) : 0;
  const o = hunters(1100).find(x => x !== sp);
  if (o) timers.push({ t: time + Math.max(1.6, d + .3), fn: () => say(o, 'quiet', true) });
  callout("THEY KNOW YOU'RE BLIND", 'THEY GO QUIET · THEY HUNT AS ONE', 1, true);
  slowT = Math.max(slowT, .6); zoomPunch = Math.max(zoomPunch, .04);
  radio('MARCUS', "They've figured it out, Elias. They know you're blind. They'll go quiet and come at you together. Don't let them box you in.");
  MS.toolCD = 5; MS.sqCD = Math.min(MS.sqCD, 2.5);
}
// called by sonar(): every ping teaches them something — and once they know, they dodge it
function squadOnPing() {
  const P = player; let n = 0, first = null, fd = 1e9;
  for (const e of enemies) {
    if (e.dead || e.hidden || e.type === 'boss') continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y); if (d > 720 * ETYPE[e.type].ear) continue;
    if (e.state !== 'hunt' && e.state !== 'search') continue;
    n++; if (d < fd) { fd = d; first = e; }
    if (MS.blind && d < 640 && !e.order && Math.random() < .55) { e.sideT = .45; e.sideA = Math.atan2(e.y - P.y, e.x - P.x) + (Math.random() < .5 ? 1 : -1) * PI / 2; }
  }
  if (n) { learn(Math.min(.45, .16 * n), first); if (!MS.blind && MS.intel > .4 && first) say(first, 'ping'); }
  // the ping exposes their fake footsteps
  for (const f of MS.fakes) { const d = Math.hypot(f.x - P.x, f.y - P.y); if (d < (P.deafT > 0 ? 300 : 1000) && !f.exposed) f.exposed = time + d / WAVE_SPEED; }
}
function squadOnKill(e) {
  const o = hunters(700).find(x => x !== e && Math.hypot(x.x - e.x, x.y - e.y) < 520);
  if (o && Math.random() < .6) timers.push({ t: time + .35, fn: () => say(o, 'down') });
  if (MS.sq) MS.sq.members = MS.sq.members.filter(x => x !== e);
}
function squadOnSearch(e) { if (Math.random() < .35) say(e, 'search'); }

// ---------- plans ----------
function slotNear(cx, cy, a, r) {
  for (const k of [1, .75, .5]) for (const da of [0, .35, -.35, .7, -.7]) {
    const x = cx + Math.cos(a + da) * r * k, y = cy + Math.sin(a + da) * r * k;
    if (passable(Math.floor(x / T), Math.floor(y / T)) && los(cx, cy, x, y)) return { x, y };
  }
  return null;
}
function formPlan() {
  const P = player;
  const mem = hunters(800).filter(e => e.know && time - e.know.t < 3.5 && e.state !== 'stun');
  if (mem.length < 2) { MS.sqCD = 1; return; }
  const k = mem.reduce((a, b) => b.know.t > a.know.t ? b : a).know, cx = k.x, cy = k.y;
  const guns = mem.filter(e => e.type === 'gunner' || e.type === 'heavy'), blades = mem.filter(e => !guns.includes(e));
  if (!blades.length) { MS.sqCD = 2; return; }
  let type = 'pincer';
  if (MS.blind) type = guns.length ? 'flank' : blades.length >= 3 && Math.random() < .5 ? 'bait' : 'surround';
  const mx = mem.reduce((s, e) => s + e.x, 0) / mem.length, my = mem.reduce((s, e) => s + e.y, 0) / mem.length;
  const base = Math.atan2(my - cy, mx - cx);
  const S = MS.sq = { type, members: [], cx, cy, t0: time, go: false, kt: k.t, bait: null, baitT: time + .8 };
  let movers = blades.slice();
  if (type === 'bait') {
    movers.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    const b = movers.shift(), sl = slotNear(cx, cy, base, 250);
    if (sl) { b.order = { ...sl, end: time + 7, bait: true }; S.bait = b; }
  }
  const n = movers.length;
  const angOf = e => angDiff(base, Math.atan2(e.y - cy, e.x - cx));
  movers.sort((a, b) => angOf(a) - angOf(b));
  movers.forEach((e, i) => {
    let a, r = 125;
    if (type === 'surround') a = base + (i - (n - 1) / 2) * (TAU / Math.max(n, 2));
    else if (type === 'bait') { a = base + PI + (n > 1 ? (i / (n - 1) - .5) * 1.2 : 0); r = 110; }
    else if (type === 'flank') a = base + (i % 2 ? 1 : -1) * 1.75;
    else { if (i > 1) return; a = base + (i ? 1 : -1) * 1.3; r = 140; }
    const sl = slotNear(cx, cy, a, r); if (!sl) return;
    e.order = { ...sl, end: time + 7, arrived: false }; e.path = null;
    S.members.push(e);
  });
  if (!S.members.length && !S.bait) { MS.sq = null; MS.sqCD = 2; return; }
  const leader = S.bait || S.members[0];
  say(leader, type, true);
  const c = SQ_CALL[type]; callout(c[0], c[1], 1);
  if (!MS.said['plan_' + type] && type !== 'pincer') {
    MS.said['plan_' + type] = 1;
    const lines = {
      surround: "They're spreading out around you, quiet as ghosts. When they close the circle, they all come at once.",
      flank: "The gunmen are keeping you busy so the others can get behind you.",
      bait: "The loud one is bait, Elias. Listen behind you.",
    };
    radio('MARCUS', lines[type]);
  }
}
function followOrder(e, ty, dt) {
  const o = e.order;
  if (!o.arrived) { const r = navTo(e, o.x, o.y, ty.run * (o.bait ? .9 : .78), dt); if (r === true || r === 'fail') o.arrived = true; }
  else { const k = e.know || player; e.a = turnTo(e.a, Math.atan2(k.y - e.y, k.x - e.x), dt * 5); }
}
function endPlan() {
  const S = MS.sq; if (!S) return;
  for (const e of S.members) e.order = null;
  if (S.bait) S.bait.order = null;
  MS.sq = null; MS.sqCD = rand(6, 9);
}
function updPlan() {
  const S = MS.sq; if (!S) return;
  const P = player;
  const team = S.members.concat(S.bait ? [S.bait] : []).filter(e => !e.dead && e.state !== 'stun');
  if (!team.length) return endPlan();
  if (S.go) { if (time - S.goT > 2.6) endPlan(); return; }
  // they re-centre on anything newer they hear (a ping, a shot, a step)
  const fresh = team.map(e => e.know).filter(Boolean).reduce((a, b) => (!a || b.t > a.t) ? b : a, null);
  if (fresh && fresh.t > S.kt + .5 && Math.hypot(fresh.x - S.cx, fresh.y - S.cy) > 90) {
    const dx = fresh.x - S.cx, dy = fresh.y - S.cy; S.kt = fresh.t; S.cx = fresh.x; S.cy = fresh.y;
    for (const e of team) if (e.order) {
      const nx = e.order.x + dx, ny = e.order.y + dy;
      if (passable(Math.floor(nx / T), Math.floor(ny / T))) { e.order.x = nx; e.order.y = ny; e.order.arrived = false; }
    }
  }
  if (S.bait && !S.bait.dead && S.bait.order && time > S.baitT) {
    S.baitT = time + 1.25;
    const b = S.bait;
    emitSound(b.x, b.y, { hear: 0, reveal: 190, col: 1, owner: 'enemy', str: .9, ind: true });
    SFX.door(b.x, b.y); ring(b.x, b.y, 6, 50, 1, .35, 2);
    if (Math.random() < .5) say(b, 'baitNoise', true);
  }
  const ready = S.members.every(e => e.dead || !e.order || e.order.arrived);
  if ((ready && time - S.t0 > 1.2) || time - S.t0 > 5.5) {
    S.go = true; S.goT = time;
    const near = Math.hypot(P.x - S.cx, P.y - S.cy) < 260;
    say(team[(Math.random() * team.length) | 0], 'rush', true);
    for (const e of team) {
      e.order = null; e.rushT = time + 2.4; e.rushTrack = near; e.cd = Math.min(e.cd, .1); e.path = null; e.state = 'hunt';
      e.know = near ? { x: P.x, y: P.y, t: time } : { x: S.cx, y: S.cy, t: time };
      indicators.push({ x: e.x, y: e.y, t: time, c: 1 });
    }
    if (near) { callout('INCOMING', 'DASH · STRIKE · BREAK THE CIRCLE', 1, true); shake = Math.max(shake, 5); }
    else callout('THEY CLOSED ON NOTHING', 'YOU WERE ALREADY GONE  +200', 0), stats.score += 200;
  }
}

// ---------- their tools: ringers (deafen) and clickers (fake footsteps) ----------
function addFake(x, y, kind, life, tgt) {
  MS.fakes.push({ x, y, kind, a: rand(-PI, PI), end: time + life, stepT: rand(.1, .4), walk: 0, litS: 0, litT: -99, gx: x, gy: y, tgt, exposed: 0 });
}
function useTool() {
  const P = player;
  const thrower = hunters(900).find(e => {
    if (!e.know || time - e.know.t > 2 || e.state !== 'hunt') return false;
    const d = Math.hypot(e.know.x - e.x, e.know.y - e.y); return d > 140 && d < 470 && los(e.x, e.y, e.know.x, e.know.y);
  });
  if (!thrower) { MS.toolCD = 1; return; }
  MS.toolCD = rand(8, 12);
  const k = thrower.know;
  if (MS.fakes.length >= 2 || Math.random() < .55) {
    say(thrower, 'ringer', true);
    MS.ringers.push({ x: thrower.x, y: thrower.y, x0: thrower.x, y0: thrower.y, x1: k.x + rand(-30, 30), y1: k.y + rand(-30, 30), t: 0, dur: .6, fuse: .5, rot: 0, landed: false });
  } else {
    say(thrower, 'spoof', true);
    for (let i = 0; i < 2; i++) {
      const sl = slotNear(k.x, k.y, rand(0, TAU), rand(190, 300));
      if (sl) addFake(sl.x, sl.y, Math.random() < .5 ? 'hunter' : 'gunner', 8, { x: k.x, y: k.y });
    }
    if (!MS.said.spoof) { MS.said.spoof = 1; radio('MARCUS', "They're throwing clickers. Fake footsteps. Not everything you hear is real. Ping, and the fakes glitch out."); }
  }
}
function deafen(t) {
  const P = player;
  P.deafT = Math.max(P.deafT, t); P.deafMax = P.deafT;
  hurtFlash = Math.max(hurtFlash, .5); shake = Math.max(shake, 10);
  if (AU.ctx && !AU.muted) {
    tone({ vol: .09, dur: t, f0: 6400, f1: 5900, type: 'sine', echo: 0, attack: .01 });
    AU.master.gain.cancelScheduledValues(AU.ctx.currentTime);
    AU.master.gain.setTargetAtTime(.25, AU.ctx.currentTime, .03);
    AU.master.gain.setTargetAtTime(.85, AU.ctx.currentTime + t * .7, t * .15);
  }
  callout('DEAFENED', 'YOUR ECHOES ARE SHORT · WAIT IT OUT', 1);
  if (!MS.said.deaf) { MS.said.deaf = 1; radio('MARCUS', "A ringer. Your ears are shot for a few seconds. Don't trust anything you hear. Move."); }
}
function fakeHit(x, y, r) {
  for (let i = MS.fakes.length - 1; i >= 0; i--) {
    const f = MS.fakes[i];
    if (Math.hypot(f.x - x, f.y - y) < r) { MS.fakes.splice(i, 1); fakePop(f); return true; }
  }
  return false;
}
function fakePop(f) {
  popups.push({ x: f.x, y: f.y - 30, text: 'FAKE', t: time, c: 0, size: 15, vy: -14, pop: true });
  sparks(f.x, f.y, 0, 14, 4, 260, PI); ring(f.x, f.y, 4, 60, 4, .4, 2);
  if (AU.ctx && !AU.muted) { const s = spat(f.x, f.y, 1000); noise({ pan: s.pan, vol: .2 * s.vol, dur: .2, f0: 5000, f1: 900, type: 'bandpass', q: 2, echo: .3 }); }
}
function bossFakes(e) {
  const P = player, [x0, y0, x1, y1] = BOSS.box;
  let n = 0;
  for (let k = 0; k < 40 && n < 2; k++) {
    const x = rand(x0, x1) * T, y = rand(y0, y1) * T;
    if (!passable(Math.floor(x / T), Math.floor(y / T)) || Math.hypot(x - P.x, y - P.y) < 200 || Math.hypot(x - e.tx, y - e.ty) < 160) continue;
    addFake(x, y, 'boss', e.hideT + 2.6, null); n++;
  }
  if (!MS.said.bossFake) { MS.said.bossFake = 1; radio('CONDUCTOR', 'Which one of me is real, Calder?'); }
}
function updTools(dt) {
  const P = player;
  for (let i = MS.ringers.length - 1; i >= 0; i--) {
    const r = MS.ringers[i];
    if (!r.landed) {
      r.t += dt; r.rot += dt * 16; const k = Math.min(1, r.t / r.dur);
      r.x = lerp(r.x0, r.x1, k); r.y = lerp(r.y0, r.y1, k);
      if (solidAtPt(r.x, r.y)) { r.x1 = r.x - (r.x1 - r.x0) * .04; r.y1 = r.y - (r.y1 - r.y0) * .04; r.x = r.x1; r.y = r.y1; r.t = r.dur; }
      if (r.t >= r.dur) { r.landed = true; SFX.click(r.x, r.y); emitSound(r.x, r.y, { hear: 0, reveal: 70, col: 1, owner: 'enemy', str: .9 }); }
      continue;
    }
    r.fuse -= dt;
    if (r.fuse <= 0) {
      MS.ringers.splice(i, 1);
      emitSound(r.x, r.y, { hear: 0, reveal: 380, col: 1, owner: 'enemy', str: 1, force: true, ind: true });
      ring(r.x, r.y, 6, 200, 3, .5, 4); ring(r.x, r.y, 6, 120, 1, .35, 2); light(r.x, r.y, 260, 3, .35, 1);
      if (AU.ctx && !AU.muted) { const s = spat(r.x, r.y, 1600); tone({ pan: s.pan, vol: .3 * s.vol + .05, dur: .7, f0: 3400, f1: 5200, type: 'square', echo: .6 }); noise({ pan: s.pan, vol: .45 * s.vol, dur: .5, f0: 7000, f1: 2000, type: 'highpass', echo: .5 }); }
      const d = Math.hypot(P.x - r.x, P.y - r.y);
      if (d < 210 && !P.dead && los(r.x, r.y, P.x, P.y)) deafen(d < 120 ? 5 : 3.5);
    }
  }
  for (let i = MS.fakes.length - 1; i >= 0; i--) {
    const f = MS.fakes[i];
    if (f.exposed && time > f.exposed + .9) { MS.fakes.splice(i, 1); fakePop(f); continue; }
    if (time > f.end) { MS.fakes.splice(i, 1); continue; }
    if (f.tgt && !f.exposed) {
      const dx = f.tgt.x - f.x, dy = f.tgt.y - f.y, d = Math.hypot(dx, dy);
      if (d > 30) { const s = 70 * dt, nx = f.x + dx / d * s, ny = f.y + dy / d * s; if (!solidAtPt(nx, ny)) { f.x = nx; f.y = ny; f.walk += s * .13; } f.a = Math.atan2(dy, dx); }
    }
    f.stepT -= dt;
    if (f.stepT <= 0 && !f.exposed) {
      f.stepT = f.kind === 'boss' ? .9 : .5;
      emitSound(f.x, f.y, { hear: 0, reveal: f.kind === 'boss' ? 150 : 95, col: 1, owner: 'enemy', str: .6, trail: f.kind !== 'boss' });
      if (f.kind === 'boss') { if (AU.ctx && !AU.muted) { const s = spat(f.x, f.y, 2200); tone({ pan: s.pan, vol: .1 * s.vol + .02, dur: .9, f0: 98, f1: 96, type: 'sawtooth', echo: .5, attack: .15 }); } }
      else SFX.step(f.x, f.y, .3, false);
      f.litS = .9; f.litT = time; f.gx = f.x; f.gy = f.y; f.ga = f.a; f.gw = f.walk;
    }
  }
}

// ---------- per-frame ----------
function updSquad(dt) {
  const P = player; if (P.dead) return;
  MS.sqCD -= dt; MS.toolCD -= dt;
  if (P.deafT > 0) P.deafT = Math.max(0, P.deafT - dt);
  let c = 0;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - P.x, e.y - P.y);
    if (e.state === 'hunt' && !e.hidden && e.type !== 'boss' && d < 650) c++;
    e.quiet = !!(e.order && !e.order.bait) || (MS.blind && e.state === 'hunt' && d < 460 && !(e.rushT > time));
  }
  if (c) learn(dt * .012 * Math.min(3, c));
  updPlan();
  if (!MS.sq && MS.sqCD <= 0 && MS.phase !== 'boss') formPlan();
  if (MS.blind && MS.toolCD <= 0) useTool();
  updTools(dt);
}

// ---------- drawing ----------
function drawFakes() {
  for (const f of MS.fakes) {
    const fa = flash(f.litS, f.litT);
    if (f.exposed && time > f.exposed) {
      const k = (time - f.exposed) / .9;
      for (let i = 0; i < 3; i++) drawCharacter(f.gx + rand(-8, 8), f.gy + rand(-4, 4), { kind: f.kind, rim: 'enemy', weapon: ETYPE[f.kind].w, a: f.ga ?? f.a, ph: 0, mv: 0, alpha: (1 - k) * .45, additive: true, hurt: 1 });
      ctx.save(); ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillStyle = rgba(VIO, 1 - k); ctx.fillText('FALSE ECHO', f.gx, f.gy - 34); ctx.restore();
      continue;
    }
    if (fa > .02) drawCharacter(f.gx, f.gy, { kind: f.kind, rim: 'enemy', weapon: ETYPE[f.kind].w, a: f.ga ?? f.a, ph: (f.gw || 0) * .575, mv: f.tgt ? 1 : 0, run: false, alpha: fa });
  }
}
function drawSquadFX() {
  for (const r of MS.ringers) {
    const h = r.landed ? 0 : Math.sin(Math.min(1, r.t / r.dur) * PI) * 26;
    ctx.fillStyle = rgba(CARR[1], .25); ctx.beginPath(); ctx.ellipse(r.x, r.y, 4, 2.5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(r.x, r.y - h); ctx.rotate(r.rot);
    ctx.strokeStyle = rgba(CARR[3], 1); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, TAU); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); ctx.restore();
    if (r.landed) { const k = 1 - r.fuse / .5; ctx.strokeStyle = rgba(CARR[1], .4 + .5 * k); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(r.x, r.y, 210 * k, 0, TAU); ctx.stroke(); }
  }
}
function drawSquadHUD(S, pad) {
  const P = player;
  // suspicion: how close they are to working out what you are
  if (state === 'playing' || state === 'paused') {
    const x = pad, y = pad + 116 * S, w = 250 * S;
    if (MS.blind) {
      const a = .75 + .25 * Math.sin(realT * 4);
      text("THEY KNOW YOU'RE BLIND", x + 4 * S, y, 11 * S, CARR[1], a, 'left', 700, `${3 * S}px`);
      if (MS.sq && !MS.sq.go) text(`SQUAD · ${MS.sq.type.toUpperCase()}`, x + 4 * S, y + 16 * S, 10 * S, CARR[1], .6 + .4 * Math.sin(realT * 9), 'left', 700, `${3 * S}px`);
    } else if (MS.intel > .02) {
      text('SUSPICION', x + 4 * S, y, 9 * S, CARR[3], .55, 'left', 600, `${3 * S}px`);
      const bx = x + 78 * S, bw = w - 82 * S;
      ctx.fillStyle = rgba(CARR[3], .08); ctx.fillRect(bx, y - 2 * S, bw, 4 * S);
      ctx.fillStyle = rgba(MS.intel > .7 ? CARR[1] : CARR[2], .9); ctx.fillRect(bx, y - 2 * S, bw * MS.intel, 4 * S);
    }
  }
  if (P.deafT > 0 && state === 'playing') {
    const k = clamp(P.deafT / (P.deafMax || 1), 0, 1);
    const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .15, W / 2, H / 2, Math.max(W, H) * .7);
    g.addColorStop(0, 'rgba(230,240,255,0)'); g.addColorStop(1, `rgba(230,240,255,${.28 * k})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const y = H * .7;
    glitchText('DEAFENED', W / 2 + (Math.random() - .5) * 6 * k, y, 20 * S, CARR[3], .5 + .4 * k, 'center', 700, `${8 * S}px`, 2 * k);
    ctx.fillStyle = rgba(CARR[3], .15); ctx.fillRect(W / 2 - 80 * S, y + 16 * S, 160 * S, 2);
    ctx.fillStyle = rgba(CARR[3], .8); ctx.fillRect(W / 2 - 80 * S, y + 16 * S, 160 * S * k, 2);
  }
}
