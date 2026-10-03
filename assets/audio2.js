// =====================================================================
//  AUDIO ENGINE: sampled sound design (assets/sfx/sfx.js) · HRTF 3D · occlusion · reverb · ducking · ambience
// =====================================================================
const SB = { buf: {}, loading: false };
function makeIR(A, dur) {
  // a synthetic room: scattered early reflections, then a damped diffuse tail that darkens as it decays
  const n = Math.floor(A.sampleRate * dur), b = A.createBuffer(2, n, A.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) { const t = i / A.sampleRate, k = Math.min(.93, .2 + t * .9); lp = lp * k + (Math.random() * 2 - 1) * (1 - k); d[i] = lp * Math.exp(-t * 2.7) * 2.4; }
    for (const [ms, g] of [[7, .6], [13, .45], [19, .4], [29, .3], [41, .26], [57, .2], [74, .14]]) { const i = Math.floor(ms / 1000 * A.sampleRate * (c ? 1.06 : 1)); d[i] += g * (Math.random() < .5 ? -1 : 1); }
  }
  return b;
}
function sfxLoad() {
  const bank = window.SFX_BANK; if (!bank || !AU.ctx || SB.loading) return;
  SB.loading = true;
  for (const k in bank) {
    SB.buf[k] = [];
    for (const b64 of bank[k]) {
      try {
        const bin = atob(b64), u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        AU.ctx.decodeAudioData(u.buffer).then(buf => SB.buf[k].push(buf), () => {});
      } catch (e) {}
    }
  }
}
// play a sampled sound; positional sounds get HRTF placement, wall muffling and distance-dependent reverb.
// returns false if the sample isn't available (callers then fall back to the synth)
function play(name, o) {
  o = o || {};
  const list = SB.buf[name];
  if (!AU.ctx || !list || !list.length) return false;
  if (AU.muted) return true;
  const X = AU.ctx, P = player;
  let vol = o.vol ?? 1, rev = o.rev ?? .22, lp = 0, px = 0, pz = -.01;
  const positional = o.x != null && P && isFinite(P.x) && P.x > -9000;
  if (positional) {
    const dx = o.x - P.x, dy = o.y - P.y, d = Math.hypot(dx, dy), R = o.range || 1400;
    if (d > R) return true;
    vol *= Math.pow(1 - d / R, 1.5);
    rev += (d / R) * .35;                                                     // further away = more room, less direct
    if (d > 40 && !los(P.x, P.y, o.x, o.y)) { lp = 650 + 1900 * (1 - d / R); vol *= .6; rev += .12; } // through a wall
    px = dx / 140; pz = dy / 140 || -.01;
  }
  if (vol < .003) return true;
  // voice cap: count sounds still scheduled to be playing; in a big fight, faint ones give way
  const now = X.currentTime; SB.ends = (SB.ends || []).filter(t => t > now); SB.active = SB.ends.length;
  if (SB.active > 40 && vol < .3) return true;
  const src = X.createBufferSource();
  src.buffer = list[(Math.random() * list.length) | 0];
  src.playbackRate.value = (o.rate || 1) * (1 + (Math.random() - .5) * (o.jit ?? .07));
  SB.ends.push(now + (o.delay || 0) + src.buffer.duration / src.playbackRate.value);
  let node = src;
  if (lp) { const f = X.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = .5; node.connect(f); node = f; }
  const g = X.createGain(); g.gain.value = vol; node.connect(g); node = g;
  if (positional && X.createPanner) {
    const p = X.createPanner(); p.panningModel = 'HRTF'; p.distanceModel = 'inverse'; p.refDistance = 1e6; p.rolloffFactor = 0;
    if (p.positionX) { p.positionX.value = px; p.positionY.value = 0; p.positionZ.value = pz; } else p.setPosition(px, 0, pz);
    node.connect(p); node = p;
  }
  node.connect(o.bus || AU.sfx || AU.master);
  if (rev > 0 && AU.echo) { const s = X.createGain(); s.gain.value = Math.min(1, rev); node.connect(s); s.connect(AU.echo); }
  src.start(X.currentTime + (o.delay || 0));
  return true;
}
// dialogue sits on top: everything else ducks under it
function duck(dur) {
  if (!AU.sfx || !AU.ctx) return;
  const n = AU.ctx.currentTime, gg = AU.sfx.gain;
  gg.cancelScheduledValues(n); gg.setTargetAtTime(.5, n, .06); gg.setTargetAtTime(1, n + dur, .35);
}
// ambience: a room tone always, and a tension drone that swells with the hearts around you
function updAmbience(dt) {
  if (!AU.ctx || AU.muted) return;
  if (!AU.amb) {
    const r = SB.buf.loop_room, t = SB.buf.loop_tension;
    if (!r || !r.length || !t || !t.length) return;
    const X = AU.ctx, mk = (buf, dest) => { const s = X.createBufferSource(); s.buffer = buf; s.loop = true; s.connect(dest); s.start(); return s; };
    const g1 = X.createGain(); g1.gain.value = 0; g1.connect(AU.master);
    const lp = X.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 200; lp.Q.value = .7;
    const g2 = X.createGain(); g2.gain.value = 0; lp.connect(g2); g2.connect(AU.master);
    mk(r[0], g1); mk(t[0], lp);
    AU.amb = { g1, g2, lp, t: 0 };
  }
  let ten = 0;
  if (state === 'playing' || state === 'dead' || state === 'cutscene') {
    const top = hbHeard.length ? Math.max(...hbHeard.map(h => h.e.bpm || 60)) : 60;
    ten = clamp((top - 80) / 80, 0, 1);
    if (MS.phase === 'boss') ten = Math.max(ten, .7);
    if (MS.phase === 'escape') ten = Math.max(ten, .85);
    if (player && player.disgT > 0) ten = Math.max(ten, .45);
  } else if (state === 'prologue') ten = 0;
  const A = AU.amb; A.t = lerp(A.t, ten, 1 - Math.exp(-dt * 1.2));
  const n = AU.ctx.currentTime;
  A.g1.gain.setTargetAtTime(state === 'prologue' ? 0 : .32, n, .5);
  A.g2.gain.setTargetAtTime(state === 'prologue' ? 0 : .04 + .5 * A.t, n, .3);
  A.lp.frequency.setTargetAtTime(160 + 2400 * Math.pow(A.t, 1.5), n, .3);
}

// ---------- the game's sounds, now sampled (the old synth stays as a fallback) ----------
const SYN = { ...SFX };
Object.assign(SFX, {
  shot(x, y, kind) {
    const big = kind === 'shotgun' || kind === 'heavy';
    if (!play('shot_' + kind, { x, y, range: 2600, vol: { pistol: .85, shotgun: 1, smg: .7, enemy: .8, heavy: 1 }[kind], rev: big ? .45 : .35, jit: .1 })) return SYN.shot(x, y, kind);
    if (kind === 'pistol' || kind === 'smg' || kind === 'shotgun') play('shell', { x, y, vol: .16, delay: .3 + Math.random() * .25, rev: .08, jit: .2 });
  },
  step(x, y, v, heavy) {
    const own = player && Math.hypot(x - player.x, y - player.y) < 2;
    const name = heavy ? 'step_heavy' : own ? (v >= .29 ? 'step_run' : 'step') : 'step_boot';
    play(name, { x, y, range: heavy ? 1400 : 760, vol: Math.min(1.25, v * (own ? 2.6 : 2.3)), rev: .1, jit: .12 }) || SYN.step(x, y, v, heavy);
  },
  paw(x, y) { play('step_paw', { x, y, range: 520, vol: .5, rev: .05, jit: .15 }); },
  sonar() { play('sonar', { vol: .95, rev: .5, jit: .02 }) || SYN.sonar(); },
  swish() { play('swish', { vol: .5, rev: .06, jit: .12 }) || SYN.swish(); },
  kill(x, y) { play('kill', { x, y, range: 1000, vol: .95 }) || SYN.kill(x, y); },
  hum(x, y) { play('lena', { x, y, range: 3400, vol: .6, rev: .55, jit: 0 }) || SYN.hum(x, y); },
  boom(x, y) { play('explosion', { x, y, range: 4000, vol: 1, rev: .5, jit: .06 }) || SYN.boom(x, y); },
  door(x, y) { play('door', { x, y, range: 1000, vol: .7 }) || SYN.door(x, y); },
  pickup() { play('pickup', { vol: .45, rev: .3, jit: 0 }) || SYN.pickup(); },
  key() { play('key', { vol: .55, rev: .4, jit: 0 }) || SYN.key(); },
  hurt() { play('hurt', { vol: .9, rev: .15 }) || SYN.hurt(); },
  reload() { play('reload', { vol: .65, rev: .06, jit: .03 }) || SYN.reload(); },
  empty() { play('click', { vol: .45, rev: .04 }) || SYN.empty(); },
  pump(x, y) { play('pump', { x, y, range: 1100, vol: .8 }) || SYN.pump(x, y); },
  click(x, y) { play('click', { x, y, range: 800, vol: .55 }) || SYN.click(x, y); },
  impact(x, y) { play('impact', { x, y, range: 900, vol: .55, jit: .15 }) || SYN.impact(x, y); },
  decoy(x, y) { play('clang', { x, y, range: 1600, vol: .8, rev: .4 }) || SYN.decoy(x, y); },
  heart(v) { play('heart', { vol: Math.min(1.3, v * 3.2), rev: 0, jit: .02 }) || SYN.heart(v); },
  dash() { play('dash', { vol: .55, rev: .05 }) || SYN.dash(); },
  death() { play('death', { vol: 1, rev: .5, jit: 0 }) || SYN.death(); },
  win() { play('win', { vol: .55, rev: .5, jit: 0 }) || SYN.win(); },
  crunch(x, y) {
    const wet = LV.id === 2 && traps.some(t => t.k === 'water' && x > t.x0 && x < t.x0 + t.w && y > t.y0 && y < t.y0 + t.h);
    play(wet ? 'splash' : 'glass', { x, y, range: 900, vol: .75 }) || SYN.crunch(x, y);
  },
  beep(x, y) { play('beep', { x, y, range: 700, vol: .4, jit: 0 }) || SYN.beep(x, y); },
  arm(x, y) { play('arm', { x, y, range: 900, vol: .7 }) || SYN.arm(x, y); },
  bell(x, y) { play('bell', { x, y, range: 2800, vol: .85, rev: .5 }) || SYN.bell(x, y); },
  jam(v) { play('static', { vol: Math.min(1, v * 1.4), rev: .05 }) || SYN.jam(v); },
  nodeHum(x, y) { play('hum_elec', { x, y, range: 900, vol: .4 }) || SYN.nodeHum(x, y); },
  nodeDown(x, y) { play('zap', { x, y, range: 1300, vol: .9 }) || SYN.nodeDown(x, y); },
  disarm() { play('disarm', { vol: .5 }) || SYN.disarm(); },
  phantom() { play('phantom', { vol: .6, rev: .5 }) || SYN.phantom(); },
  shatter(x, y) { play('shatter', { x, y, range: 1700, vol: .85, rev: .45 }) || SYN.shatter(x, y); },
  dog(x, y) { play('dog', { x, y, range: 1600, vol: .75 }) || SYN.dog(x, y); },
  ui() { play('ui', { vol: .3, rev: .1, jit: 0 }) || SYN.ui(); },
  strike() { if (!play('strike', { vol: .85, rev: .35 }) && AU.ctx && !AU.muted) { noise({ vol: .3, dur: .12, f0: 6000, f1: 1500, type: 'highpass', echo: .3 }); tone({ vol: .12, dur: .5, f0: 3200, f1: 3000, type: 'sine', echo: .7 }); } },
});
