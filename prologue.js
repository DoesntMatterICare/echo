// =====================================================================
//  ECHO — PROLOGUE: "THE LAST THING I SAW"
//  A React-driven cinematic that plays before Level 01.
//  Visuals: a small 3D wireframe engine (perspective camera, extruded sets,
//  bloom, grain, glitch) drawn on canvas in the game's echo-line style.
//  Text, chapter cards and controls: React.
//  Audio: reuses the game's synthesized audio engine (tone / noise / SFX).
// =====================================================================
(function () {
  'use strict';
  if (!window.React || !window.ReactDOM) return; // offline without the CDN: the game just skips the prologue
  const { useState, useEffect, useRef } = React;
  const h = React.createElement;

  // ---------- palette & math ----------
  const COL = { cyan: [80, 225, 255], red: [255, 48, 72], amber: [255, 176, 64], white: [226, 242, 255], steel: [120, 165, 210] };
  const TAU = Math.PI * 2, PI = Math.PI;
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const lite = c => c.map(v => v + (255 - v) * .55);
  const mixC = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIO = t => { t = clamp(t, 0, 1); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  const rnd = (i, k = 1) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const vl = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };

  // ---------- audio (game engine) ----------
  const MOTIF = [440, 523.25, 659.25, 587.33]; // Lena's four notes
  const A = {
    ok() { return typeof AU !== 'undefined' && AU.ctx && !AU.muted; },
    note(f, vol = .16, delay = 0, dur = 2.4) {
      if (!this.ok()) return;
      tone({ vol, dur, f0: f, type: 'triangle', attack: .006, echo: .55, delay });
      tone({ vol: vol * .45, dur: dur * .7, f0: f * 2, type: 'sine', attack: .004, echo: .4, delay });
    },
    motif(vol = .16, gap = .55, delay = 0, n = 4, mul_ = 1) { MOTIF.slice(0, n).forEach((f, i) => this.note(f * mul_, vol, delay + i * gap)); },
    hum(vol = .07, gap = .7, delay = 0, n = 4) {
      if (!this.ok()) return;
      MOTIF.slice(0, n).forEach((f, i) => tone({ vol, dur: gap * 1.05, f0: f * .5, type: 'sine', attack: .12, echo: .7, delay: delay + i * gap }));
    },
    heart(v = .3) { if (this.ok()) SFX.heart(v); },
    kick() { if (!this.ok()) return; noise({ vol: .8, dur: .35, f0: 900, f1: 80, echo: .6 }); tone({ vol: .6, dur: .3, f0: 90, f1: 40, echo: .3 }); SFX.door(0, 0); },
    step(v = .25) { if (this.ok()) noise({ vol: v, dur: .06, f0: 1100, type: 'bandpass', q: 2, echo: .2 }); },
    clink() { if (!this.ok()) return; [3200, 2600, 3000].forEach((f, i) => tone({ vol: .08, dur: .12, f0: f, type: 'triangle', delay: i * .13, echo: .2 })); },
    bang() { if (!this.ok()) return; noise({ vol: 1, dur: 1.2, f0: 5000, f1: 300, echo: .9 }); tone({ vol: .7, dur: .6, f0: 120, f1: 30 }); },
    ring(dur = 7) { if (this.ok()) tone({ vol: .06, dur, f0: 4100, f1: 3900, type: 'sine', attack: .02, echo: 0 }); },
    muffled(v = .5) { if (this.ok()) { noise({ vol: v, dur: .4, f0: 380, f1: 90, echo: .5 }); tone({ vol: v * .6, dur: .25, f0: 70, f1: 35 }); } },
    tap() { if (!this.ok()) return; noise({ vol: .5, dur: .03, f0: 3800, type: 'highpass', echo: .9 }); tone({ vol: .12, dur: 1.4, f0: 1500, f1: 1460, echo: .95, attack: .003 }); },
    slash() { if (this.ok()) { SFX.swish(); SFX.kill(0, 0); } },
    radio() { if (this.ok()) noise({ vol: .12, dur: .25, f0: 2400, type: 'bandpass', q: 3, echo: 0 }); },
    thunder(v = .7) { if (this.ok()) { noise({ vol: v, dur: 3, f0: 260, f1: 40, echo: .9, attack: .08 }); tone({ vol: v * .6, dur: 2.6, f0: 48, f1: 28, echo: .8, attack: .1 }); } },
    boom() { if (this.ok()) { noise({ vol: .5, dur: 2.4, f0: 300, f1: 40, echo: .9 }); tone({ vol: .5, dur: 2.4, f0: 55, f1: 30, echo: .8 }); } },
    rain(vol = .07) {
      if (!this.ok()) return () => {};
      const X = AU.ctx, src = X.createBufferSource(); src.buffer = AU.noise; src.loop = true;
      const f = X.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = .5;
      const g = X.createGain(); g.gain.setValueAtTime(.0001, X.currentTime); g.gain.exponentialRampToValueAtTime(vol, X.currentTime + 1.5);
      src.connect(f); f.connect(g); g.connect(AU.master); src.start();
      return () => { const t = X.currentTime; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(Math.max(g.gain.value, .0002), t); g.gain.exponentialRampToValueAtTime(.0001, t + 1.2); src.stop(t + 1.3); };
    },
  };

  // =====================================================================
  //  3D WIREFRAME ENGINE
  // =====================================================================
  function camera(pos, tgt, fov, W, H, roll = 0) {
    const f = norm(sub(tgt, pos));
    let r = norm(cross(f, [0, 0, 1])), u = cross(r, f);
    if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2 = add(mul(r, c), mul(u, s)), u2 = sub(mul(u, c), mul(r, s)); r = r2; u = u2; }
    return { pos, f, r, u, foc: (H / 2) / Math.tan(fov / 2), W, H };
  }
  function P(c, p) {
    const d = sub(p, c.pos), z = dot(d, c.f);
    if (z < 10) return null;
    return [c.W / 2 + c.foc * dot(d, c.r) / z, c.H / 2 - c.foc * dot(d, c.u) / z, z];
  }
  const fogOf = z => clamp(1.35 - z / 4200, .12, 1);
  function L3(g, c, a, b, col, al, w = 1.3) {
    if (al < .01) return;
    const p = P(c, a), q = P(c, b); if (!p || !q) return;
    const z = Math.min(p[2], q[2]);
    g.strokeStyle = rgba(col, Math.min(1, al * fogOf(z)));
    g.lineWidth = clamp(w * c.foc / z * .85, .5, 4);
    g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
  }
  function F3(g, c, pts, col, al) {
    if (al < .005) return;
    const ps = pts.map(p => P(c, p)); if (ps.some(p => !p)) return;
    g.beginPath(); ps.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.fillStyle = rgba(col, al * fogOf(ps[0][2])); g.fill();
  }
  function ring3(g, c, x, y, z, r, col, al, w = 1.6, a0 = 0, a1 = TAU) {
    if (al < .01 || r <= 0) return;
    g.beginPath(); let pen = false;
    const n = Math.max(12, Math.round(72 * (a1 - a0) / TAU));
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, p = P(c, [x + Math.cos(a) * r, y + Math.sin(a) * r, z]);
      if (!p) { pen = false; continue; }
      pen ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); pen = true;
    }
    g.strokeStyle = rgba(col, Math.min(1, al)); g.lineWidth = w; g.stroke();
  }
  function dot3(g, c, p, col, al, size) {
    const q = P(c, p); if (!q || al < .01) return;
    const r = clamp(size * c.foc / q[2], .35, 7);
    g.fillStyle = rgba(col, Math.min(1, al * fogOf(q[2]))); g.beginPath(); g.arc(q[0], q[1], r, 0, TAU); g.fill();
  }
  // map a local 2D frame lying on a horizontal plane (height z, rotated a) onto the screen
  function onPlane(g, c, x, y, z, a, dpr) {
    const o = P(c, [x, y, z]), e1 = P(c, [x + Math.cos(a), y + Math.sin(a), z]), e2 = P(c, [x - Math.sin(a), y + Math.cos(a), z]);
    if (!o || !e1 || !e2) return false;
    g.setTransform(dpr * (e1[0] - o[0]), dpr * (e1[1] - o[1]), dpr * (e2[0] - o[0]), dpr * (e2[1] - o[1]), dpr * o[0], dpr * o[1]);
    return true;
  }
  function pool(g, c, api, x, y, col, al, R) {
    if (al < .01) return;
    if (onPlane(g, c, x, y, 1, 0, api.dpr)) {
      const gr = g.createRadialGradient(0, 0, 0, 0, 0, R); gr.addColorStop(0, rgba(col, al)); gr.addColorStop(1, rgba(col, 0));
      g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
    }
    g.setTransform(api.dpr, 0, 0, api.dpr, 0, 0);
  }

  // set pieces
  const wall = (x1, y1, x2, y2, hh = 110) => ({ k: 'wall', a: [x1, y1], b: [x2, y2], h: hh, m: [(x1 + x2) / 2, (y1 + y2) / 2] });
  const box = (x, y, w, d, hh, z0 = 0) => ({ k: 'box', x, y, w, d, h: hh, z0, m: [x + w / 2, y + d / 2] });
  const line = (p, q, w = 1.1) => ({ k: 'line', p, q, w, m: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2] });
  function drawSet(g, c, set, col, alphaAt) {
    for (const it of set) {
      const a = Math.min(1, alphaAt(it.m)); if (a < .012) continue;
      if (it.k === 'wall') {
        const [x1, y1] = it.a, [x2, y2] = it.b, hh = it.h;
        F3(g, c, [[x1, y1, 0], [x2, y2, 0], [x2, y2, hh], [x1, y1, hh]], col, a * .06);
        L3(g, c, [x1, y1, 0], [x2, y2, 0], col, a * .45);
        L3(g, c, [x1, y1, hh], [x2, y2, hh], col, a, 1.7);
        L3(g, c, [x1, y1, 0], [x1, y1, hh], col, a * .65); L3(g, c, [x2, y2, 0], [x2, y2, hh], col, a * .65);
      } else if (it.k === 'box') {
        const { x, y, w, d, z0 } = it, z1 = z0 + it.h, q = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
        F3(g, c, q.map(p => [p[0], p[1], z1]), col, a * .05);
        for (let i = 0; i < 4; i++) {
          const p0 = q[i], p1 = q[(i + 1) % 4];
          L3(g, c, [p0[0], p0[1], z0], [p1[0], p1[1], z0], col, a * .45);
          L3(g, c, [p0[0], p0[1], z1], [p1[0], p1[1], z1], col, a, 1.4);
          L3(g, c, [p0[0], p0[1], z0], [p0[0], p0[1], z1], col, a * .65);
        }
      } else L3(g, c, it.p, it.q, col, a, it.w);
    }
  }
  function grid(g, c, x0, y0, x1, y1, step, col, alphaAt) {
    for (let x = x0; x <= x1; x += step) for (let y = y0; y <= y1; y += step) {
      const a = alphaAt([x, y]) * .45; if (a < .02) continue;
      L3(g, c, [x - 6, y, 0], [x + 6, y, 0], col, a, .8); L3(g, c, [x, y - 6, 0], [x, y + 6, 0], col, a, .8);
    }
  }
  // brightness an echo leaves on a point: flares as the wavefront passes, then fades
  function echoA(x, y, evs, t) {
    let a = 0;
    for (const e of evs) {
      if (t < e.t) continue;
      const d = Math.hypot(x - e.x, y - e.y); if (d > e.R) continue;
      const age = t - (e.t + d / e.v); if (age < 0) continue;
      a = Math.max(a, (e.s || 1) * Math.exp(-age * (e.k || 1.2)) * (1 - d / e.R * .55));
    }
    return a;
  }
  function echoRings(g, c, evs, t, col) {
    for (const e of evs) {
      const r = (t - e.t) * e.v; if (r <= 0 || r > e.R) continue;
      const k = 1 - r / e.R, cc = e.c || col;
      ring3(g, c, e.x, e.y, 2, r, cc, k * .8 * (e.s || 1), 2);
      ring3(g, c, e.x, e.y, 2, Math.max(1, r - 18), cc, k * .3 * (e.s || 1), 1);
    }
  }

  // ---------- characters: rigged 3D bodies, rim-lit like the key art ----------
  // A small skeleton (hips, spine, shoulders, elbows, knees, feet) posed procedurally,
  // then drawn as solid black capsules with glowing rim edges, depth-sorted per frame.
  const B = { hip: 42, chest: 63, neck: 70, hr: 6.4, sh: 9.5, hw: 4.8, ua: 14.5, fa: 13.5, th: 20.5, sn: 20.5 };
  const rotZ = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
  function ik(S, Hn, l1, l2, pole) {
    let d = sub(Hn, S), L = Math.hypot(d[0], d[1], d[2]) || .001;
    const max = l1 + l2 - .05;
    if (L > max) { Hn = add(S, mul(d, max / L)); d = sub(Hn, S); L = max; }
    const dir = mul(d, 1 / L), a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), hh = Math.sqrt(Math.max(0, l1 * l1 - a * a));
    const pv = norm(sub(pole, mul(dir, dot(pole, dir))));
    return [add(add(S, mul(dir, a)), mul(pv, hh)), Hn];
  }
  // local frame: +x forward, +y left, +z up; feet on z = 0
  function rig(o) {
    const t = o.t || 0, st = o.stride || 0, ph = o.walk || 0, sit = o.sit || 0, hd = o.headDown || 0;
    const bob = Math.abs(Math.sin(ph)) * 1.8 * st;
    const lean = (o.lean || 0) + st * .25;
    const pelvis = [-2 * sit + lean * 1.5, 0, lerp(B.hip, 25, sit) - bob * .6 + 1.2 * st];
    const twist = Math.sin(ph) * .16 * st + (o.twist || 0);
    const chest = add(pelvis, [lean * 6 + sit * 3.5, 0, B.chest - B.hip + Math.sin(t * 2.1) * .45]);
    const neck = add(chest, [1 + hd * 2, 0, 7 - hd]);
    const head = add(neck, [1.6 + hd * 3.5, 0, 6.4 - hd * 2.2]);
    const J = { pelvis, chest, neck, head, twist };
    for (const s of [1, -1]) {
      const k = s > 0 ? 'L' : 'R', off = s > 0 ? 0 : PI;
      const hip = add(pelvis, rotZ([0, s * B.hw, -2.5], -twist * .5));
      const sw = Math.sin(ph + off) * .5 * st;
      const bend = Math.max(0, Math.cos(ph + off)) * st * 1.0 + .06;
      let knee = add(hip, [Math.sin(sw) * B.th, s * .8, -Math.cos(sw) * B.th]);
      let foot = add(knee, [Math.sin(sw - bend) * B.sn, s * .4, -Math.cos(sw - bend) * B.sn]);
      if (sit > .001) {
        const kS = add(hip, [B.th - 1, s * 2, 1]), fS = [kS[0] + 3, kS[1] + s * .5, 1];
        knee = vl(knee, kS, sit); foot = vl(foot, fS, sit);
      }
      J['hip' + k] = hip; J['kn' + k] = knee; J['ft' + k] = foot; J['toe' + k] = add(foot, [5.5, 0, -.3]);
    }
    for (const s of [1, -1]) {
      const k = s > 0 ? 'L' : 'R', off = s > 0 ? 0 : PI;
      const sh = add(chest, rotZ([-.5, s * B.sh, 2.5], twist));
      const sw = -Math.sin(ph + off) * .5 * st;
      let hand = add(sh, [Math.sin(sw) * 23 + 2, s * 2.5, -Math.cos(sw) * 23]);
      if (o.aim) hand = vl(hand, add(chest, [25, s * .9 + (o.aimY || 0), 1 + (o.aimZ || 0)]), o.aim);
      if (o.piano) { const pk = o.piano[k]; hand = add(pelvis, [26.5, s * 6.5 + pk.x, 19 - pk.p * 3]); }
      if (s < 0 && o.slash != null && o.slash >= 0) { const q = ease(o.slash); hand = vl(add(chest, [2, -19, 2]), add(chest, [24, 13, -3]), q); }
      if (s > 0 && o.slash != null && o.slash >= 0) hand = add(chest, [10, 10, -6]);
      const [el, ha] = ik(sh, hand, B.ua, B.fa, [-.35, s, -1]);
      J['sh' + k] = sh; J['el' + k] = el; J['ha' + k] = ha;
    }
    return J;
  }
  // fall: rotation about the feet around the local y axis (negative = falls backwards)
  function place(J, base, yaw, fall) {
    const out = {}, cf = Math.cos(fall || 0), sf = Math.sin(fall || 0);
    for (const k in J) {
      if (k === 'twist') continue;
      let p = J[k];
      if (fall) p = [p[0] * cf + p[2] * sf, p[1], -p[0] * sf + p[2] * cf];
      out[k] = add(rotZ(p, yaw), base);
    }
    return out;
  }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  // o: pose params (see rig) + t, fall ; st: { hair:'spiky'|'long', helmet, blind, coat, wind, gun:'light'|'dark', knife }
  function actor(g, c, api, base, yaw, col, al, o = {}, st = {}) {
    if (al < .01) return;
    const fall = o.fall || 0, lift_ = 5.5 * Math.abs(Math.sin(fall));
    const J = place(rig(o), [base[0], base[1], (base[2] || 0) + lift_], yaw, fall);
    const fwd = rotZ([Math.cos(fall), 0, -Math.sin(fall)], yaw), up = rotZ([Math.sin(fall), 0, Math.cos(fall)], yaw);
    const side = cross(up, fwd); // points to the body's left
    const core = lite(col), prims = [];
    const cap = (a, b, r, fill) => prims.push({ k: 'c', a, b, r, fill });
    // torso as a stack of capsules: shoulders, chest, waist, hips
    cap(J.shL, J.shR, 4.6); cap(add(J.chest, mul(up, -4)), add(J.pelvis, mul(up, 3)), 7.2);
    cap(J.hipL, J.hipR, 4.8); cap(J.chest, J.neck, 3.4);
    cap(J.shL, J.elL, 3.3); cap(J.elL, J.haL, 2.8); cap(J.shR, J.elR, 3.3); cap(J.elR, J.haR, 2.8);
    cap(J.hipL, J.knL, 4.4); cap(J.knL, J.ftL, 3.6); cap(J.hipR, J.knR, 4.4); cap(J.knR, J.ftR, 3.6);
    cap(J.ftL, J.toeL, 2.8); cap(J.ftR, J.toeR, 2.8);
    prims.push({ k: 'b', p: J.haL, r: 2.6 }, { k: 'b', p: J.haR, r: 2.6 });
    prims.push({ k: 'head', p: J.head, r: B.hr * (st.helmet ? 1.12 : 1) });
    if (st.hair === 'long') cap(add(J.head, mul(fwd, -3.5)), add(add(J.neck, mul(fwd, -5)), mul(up, -9)), 5.6);
    if (st.coat) {
      const back = mul(fwd, -1), wv = st.wind || 0, fl = Math.sin(wv * 2.3) * 2 + Math.sin(wv * 3.7) * 1.2;
      const kz = mid(J.knL, J.knR);
      prims.push({ k: 'poly', pts: [add(J.shL, mul(back, 3)), add(J.shR, mul(back, 3)), add(add(add(J.knR, mul(back, 6 + fl)), mul(side, -3)), mul(up, 3)), add(add(add(J.knL, mul(back, 6 + fl * .7)), mul(side, 3)), mul(up, 3))], z: mid(J.chest, kz) });
    }
    if (st.gun) {
      const hm = mid(J.haL, J.haR), dir = norm(sub(hm, J.chest)), len = st.gun === 'rifle' ? 26 : 14;
      cap(hm, add(hm, mul(dir, len)), st.gun === 'rifle' ? 2.1 : 1.9, st.gun === 'dark' || st.gun === 'rifle' ? '#07090c' : '#d8e5ee');
    }
    if (st.knife) { const dir = norm(sub(J.haR, J.elR)); cap(J.haR, add(J.haR, mul(dir, 12)), .9, '#eaf6ff'); }
    // depth sort (far first) and draw
    for (const p of prims) {
      const q = P(c, p.k === 'c' ? mid(p.a, p.b) : p.k === 'poly' ? p.z : p.p);
      p.d = q ? q[2] : -1;
    }
    prims.sort((a, b) => b.d - a.d);
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, al);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (const p of prims) {
      if (p.d < 0) continue;
      if (p.k === 'c') {
        const a = P(c, p.a), b = P(c, p.b); if (!a || !b) continue;
        const rp = Math.max(.8, p.r * c.foc / ((a[2] + b[2]) / 2));
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + .01, b[1]);
        g.strokeStyle = rgba(core, 1); g.lineWidth = 2 * rp + 1.5; g.stroke();
        g.strokeStyle = p.fill || '#06090d'; g.lineWidth = 2 * rp; g.stroke();
      } else if (p.k === 'b') {
        const q = P(c, p.p); if (!q) continue; const rp = p.r * c.foc / q[2];
        g.beginPath(); g.arc(q[0], q[1], rp, 0, TAU); g.fillStyle = '#06090d'; g.fill(); g.strokeStyle = rgba(core, 1); g.lineWidth = 1.1; g.stroke();
      } else if (p.k === 'poly') {
        const ps = p.pts.map(x => P(c, x)); if (ps.some(x => !x)) continue;
        g.beginPath(); ps.forEach((x, i) => i ? g.lineTo(x[0], x[1]) : g.moveTo(x[0], x[1])); g.closePath();
        g.fillStyle = '#06090d'; g.fill(); g.strokeStyle = rgba(core, 1); g.lineWidth = 1.1; g.stroke();
      } else if (p.k === 'head') {
        const q = P(c, p.p); if (!q) continue;
        const rp = p.r * c.foc / q[2];
        // screen-space "back" direction of the head, for swept hair
        const qb = P(c, add(p.p, mul(fwd, -p.r))) || q, qu = P(c, add(p.p, mul(up, p.r))) || q;
        let bx = qb[0] - q[0], by = qb[1] - q[1], ux = qu[0] - q[0], uy = qu[1] - q[1];
        const bl = Math.hypot(bx, by) || 1, ul = Math.hypot(ux, uy) || 1; bx /= bl; by /= bl; ux /= ul; uy /= ul;
        g.beginPath();
        if (st.hair === 'spiky') {
          for (let i = 0; i <= 28; i++) {
            const a = i / 28 * TAU, dx = Math.cos(a), dy = Math.sin(a);
            const w = Math.max(0, dx * bx + dy * by) * .7 + Math.max(0, dx * ux + dy * uy) * .5;
            const r = rp * (i % 2 === 0 ? 1.08 + w * .45 : .96 + w * .08);
            i ? g.lineTo(q[0] + dx * r, q[1] + dy * r) : g.moveTo(q[0] + dx * r, q[1] + dy * r);
          }
          g.closePath();
        } else g.arc(q[0], q[1], rp, 0, TAU);
        g.fillStyle = '#06090d'; g.fill(); g.strokeStyle = rgba(core, 1); g.lineWidth = 1.4; g.stroke();
        const eyeL = P(c, add(add(p.p, mul(fwd, p.r * .86)), mul(side, p.r * .55))), eyeR = P(c, add(add(p.p, mul(fwd, p.r * .86)), mul(side, -p.r * .55)));
        const front = P(c, add(p.p, mul(fwd, p.r)));
        const facing = front && front[2] < q[2]; // the face is toward the camera
        if (eyeL && eyeR && (facing || st.blind || st.helmet)) {
          g.beginPath(); g.moveTo(eyeL[0], eyeL[1]); g.lineTo(eyeR[0], eyeR[1]);
          if (st.blind) { g.strokeStyle = rgba(core, .95); g.lineWidth = Math.max(1.5, rp * .38); g.stroke(); }
          else if (st.helmet) { g.strokeStyle = 'rgba(255,170,180,1)'; g.lineWidth = Math.max(1.4, rp * .3); g.stroke(); }
        }
      }
    }
    g.restore();
    g.globalCompositeOperation = 'lighter';
  }

  // ---------- particles ----------
  function stepParts(list, dt, grav = 0) {
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i]; p.life -= dt; if (p.life <= 0) { list.splice(i, 1); continue; }
      const dr = Math.exp(-(p.drag || 0) * dt);
      p.v[0] *= dr; p.v[1] *= dr; p.v[2] = p.v[2] * dr - grav * dt;
      p.p = add(p.p, mul(p.v, dt)); if (p.p[2] < 0) { p.p[2] = 0; p.v[2] *= -.3; }
    }
  }
  function drawParts(g, c, list) {
    for (const p of list) {
      const k = p.life / p.max;
      if (p.streak) { L3(g, c, p.p, sub(p.p, mul(p.v, .03)), p.c, k, 1.2); }
      else dot3(g, c, p.p, p.c, k * (p.a || 1), p.size || 1.4);
    }
  }
  function burst(list, at, n, col, spd, up, life, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, s = spd * (.3 + Math.random() * .7);
      list.push({ p: [...at], v: [Math.cos(a) * s + (o.dx || 0), Math.sin(a) * s + (o.dy || 0), up * Math.random()], life: life * (.5 + Math.random() * .5), max: life, c: col, drag: o.drag ?? 2, streak: o.streak, size: o.size });
    }
  }
  // 3D rain falling inside a box; ripples on the floor light nearby geometry
  function makeRain(n, x0, x1, y0, y1) { return Array.from({ length: n }, (_, i) => ({ x: x0 + rnd(i, 1) * (x1 - x0), y: y0 + rnd(i, 2) * (y1 - y0), sp: 700 + rnd(i, 3) * 500, ph: rnd(i, 4) * 10, top: 420 })); }
  function drawRain(g, c, drops, t, col, dim) {
    const rips = [];
    for (const d of drops) {
      const cyc = d.top / d.sp, u = ((t + d.ph) % cyc) / cyc, z = d.top * (1 - u);
      L3(g, c, [d.x, d.y, z], [d.x + 2, d.y + 1, z + 34], col, .22 * dim, .8);
      const age = u * cyc; // time since the previous impact
      if (age < .45) { ring3(g, c, d.x, d.y, 1, 4 + age * 60, col, (1 - age / .45) * .35 * dim, 1); rips.push([d.x, d.y, age]); }
    }
    return rips;
  }
  const ripA = (rips, m, R = 120) => { let a = 0; for (const r of rips) { const dd = Math.hypot(m[0] - r[0], m[1] - r[1]); if (dd < R) a = Math.max(a, (1 - dd / R) * (1 - r[2] / .45)); } return a; };

  // ---------- sets ----------
  const APT = [
    wall(240, 150, 400, 150), wall(560, 150, 1040, 150), wall(240, 150, 240, 610), wall(240, 610, 1040, 610),
    wall(1040, 150, 1040, 330), wall(1040, 420, 1040, 610), wall(640, 150, 640, 290), wall(700, 610, 700, 505),
    line([400, 150, 40], [560, 150, 40]), line([400, 150, 100], [560, 150, 100]), line([480, 150, 40], [480, 150, 100]), line([400, 150, 40], [400, 150, 100]), line([560, 150, 40], [560, 150, 100]),
    box(300, 192, 150, 72, 42), line([300, 250, 42], [450, 250, 42]), box(330, 290, 90, 22, 18),
    box(770, 490, 200, 50, 24), box(770, 470, 200, 20, 52), box(770, 490, 16, 50, 36), box(954, 490, 16, 50, 36),
    box(700, 250, 80, 56, 30), box(880, 170, 130, 40, 38),
    line([990, 575, 0], [990, 575, 120]), box(972, 557, 36, 36, 20, 120),
    line([560, 380, 1], [860, 380, 1], .8), line([860, 380, 1], [860, 460, 1], .8), line([860, 460, 1], [560, 460, 1], .8), line([560, 460, 1], [560, 380, 1], .8),
  ];
  const KEYS = []; for (let x = 306; x <= 444; x += 7) KEYS.push(line([x, 256, 42], [x, 264, 42], .8));
  const HOSP = [
    wall(420, 170, 860, 170), wall(420, 170, 420, 570), wall(420, 570, 700, 570), wall(780, 570, 860, 570), wall(860, 170, 860, 570),
    line([520, 170, 45], [760, 170, 45]), line([520, 170, 100], [760, 170, 100]), line([640, 170, 45], [640, 170, 100]),
    box(560, 280, 180, 90, 34), box(574, 292, 40, 66, 10, 34), line([630, 280, 38], [630, 370, 38]),
    line([770, 300, 0], [770, 300, 150]), box(760, 292, 20, 16, 26, 150),
    box(470, 430, 50, 50, 26), box(470, 430, 8, 50, 60),
    line([800, 215, 0], [800, 215, 60]), box(780, 200, 44, 30, 34, 60),
  ];
  const ALLEY = [
    wall(470, -300, 470, 250, 300), wall(470, 330, 470, 1000, 300), wall(300, 250, 470, 250, 300), wall(300, 330, 470, 330, 300),
    wall(810, -300, 810, 470, 300), wall(810, 540, 810, 1000, 300), wall(810, 470, 920, 470, 300), wall(810, 540, 920, 540, 300),
    box(700, 90, 80, 48, 52), line([700, 114, 52], [780, 114, 52]),
    box(472, 380, 44, 150, 4, 110), box(472, 380, 44, 150, 4, 210), line([516, 380, 110], [516, 380, 214]), line([516, 530, 110], [516, 530, 214]),
    line([800, 600, 0], [800, 600, 300], 1.4), line([794, 610, 0], [794, 610, 300], 1.4),
    box(505, 610, 46, 46, 46), box(522, 662, 40, 40, 38), box(730, 700, 60, 40, 30),
  ];
  const ROOF = [
    wall(300, 200, 980, 200, 26), wall(980, 200, 980, 640, 26), wall(980, 640, 300, 640, 26), wall(300, 640, 300, 200, 26),
    box(360, 420, 70, 50, 40), box(450, 430, 60, 50, 40), box(700, 470, 120, 90, 110), line([740, 470, 0], [740, 470, 80]), line([780, 470, 0], [780, 470, 80]),
    line([420, 290, 0], [420, 290, 260], 1.2), line([400, 290, 200], [440, 290, 200]), line([405, 290, 230], [435, 290, 230]),
    box(840, 500, 70, 70, 100, 30), line([845, 505, 0], [845, 505, 30]), line([905, 565, 0], [905, 565, 30]),
  ];
  const CITY = [];
  for (let i = 0; CITY.length < 70 && i < 400; i++) {
    const x = -1900 + rnd(i, 11) * 4900, y = -3400 + rnd(i, 12) * 3100, w = 120 + rnd(i, 13) * 220, d = 120 + rnd(i, 14) * 220, hh = 420 + rnd(i, 15) * 620;
    if (y + d > -180) continue;
    const b = box(x, y, w, d, hh, -900); b.win = Array.from({ length: 7 }, (_, k) => [x + rnd(i * 9 + k, 16) * w, y + d, -900 + rnd(i * 9 + k, 17) * hh, rnd(i * 9 + k, 18)]);
    CITY.push(b);
  }
  const ARCHIVE = { x: 1180, y: -1500 }; // the building that hums her song

  // =====================================================================
  //  SCENES
  // =====================================================================
  const NOTE_T = [2, 6.5, 11].flatMap(s => [0, .55, 1.1, 1.65].map(d => s + d));
  const S5 = { pings: [6, 9, 12], foes: [[760, 318], [528, 482], [708, 575]] };
  const LENA = [375, 295], ELIAS = [760, 372];
  const S5P = (() => { const pts = [[640, 400]]; S5.foes.forEach(([x, y], i) => { const [px, py] = pts[i], a = Math.atan2(y - py, x - px); pts.push([x - Math.cos(a) * 30, y - Math.sin(a) * 30]); }); return pts; })();
  function eliasS5(t) {
    for (let i = 0; i < S5.pings.length; i++) {
      const p = S5.pings[i], a0 = p + .35, a1 = p + .7;
      if (t < a0) return { pos: S5P[i], moving: 0, ph: 0 };
      if (t < a1) { const k = easeIO((t - a0) / (a1 - a0)); return { pos: [lerp(S5P[i][0], S5P[i + 1][0], k), lerp(S5P[i][1], S5P[i + 1][1], k)], moving: 1, ph: k * TAU * 1.5 }; }
    }
    return { pos: S5P[S5P.length - 1], moving: 0, ph: 0 };
  }
  // which hand presses which key: returns { L:{p,x}, R:{p,x} }
  function pianoHands(t, times) {
    const out = {};
    ['L', 'R'].forEach((hd, j) => {
      let pr = 0, x = 0;
      times.forEach((n, i) => { if ((i % 2 === 0) === (hd === 'R')) { const d = t - n; if (d >= 0 && d < 1.4) { const e = Math.exp(-d * 8); if (e > pr) { pr = e; x = [-4, -1, 2, 5][i % 4] * (hd === 'R' ? 1 : -1) * .7; } } } });
      out[hd] = { p: pr, x: x + Math.sin(t * 1.4 + j * 2) * 1.2 };
    });
    return out;
  }

  const SCENES = [
    {
      id: 'open', dur: 9,
      lines: [{ at: .8, text: 'Everything makes a sound.' }, { at: 4.6, text: 'Most people never listen.' }],
      cues: [1, 2.2, 3.4, 4.6, 5.8, 7].map(at => ({ at, fn: () => A.heart(.3) })),
      enter(m) { m.dust = Array.from({ length: 70 }, (_, i) => [rnd(i, 1), rnd(i, 2), .3 + rnd(i, 3) * .7]); },
      draw(g, t, api) {
        const { W, H, m } = api, beats = [1, 2.2, 3.4, 4.6, 5.8, 7], cy = H * .46;
        for (const d of m.dust) { const x = ((d[0] + t * .01 * d[2]) % 1) * W, y = ((d[1] - t * .006 * d[2] + 1) % 1) * H; g.fillStyle = rgba(COL.cyan, .08 * d[2]); g.fillRect(x, y, 1.6, 1.6); }
        let pulse = 0; for (const b of beats) { const dt = t - b; if (dt > 0 && dt < .6) pulse = Math.max(pulse, 1 - dt / .6); }
        const gr = g.createRadialGradient(W / 2, cy, 0, W / 2, cy, W * .45); gr.addColorStop(0, rgba(COL.cyan, .05 + .07 * pulse)); gr.addColorStop(1, rgba(COL.cyan, 0));
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.beginPath();
        const x0 = W * .15, x1 = W * .85;
        for (let x = x0; x <= x1; x += 3) {
          let y = cy;
          for (const b of beats) { const dx = (x - W / 2) / W * 1280, dtt = t - b; if (dtt > 0 && dtt < 1.2) y -= Math.exp(-dx * dx / 1400) * Math.sin(dx * .085) * H * .1 * (1 - dtt / 1.2); }
          x === x0 ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        const a = .55 + .3 * pulse;
        g.strokeStyle = rgba(COL.cyan, a); g.lineWidth = 1.6; g.stroke();
        const sweep = x0 + ((t * .35) % 1) * (x1 - x0);
        g.fillStyle = rgba(COL.white, .9); g.beginPath(); g.arc(sweep, cy, 2.4, 0, TAU); g.fill();
      },
    },
    {
      id: 'lena', dur: 17, chapter: 'TWO YEARS AGO',
      lines: [
        { at: 2.4, text: 'Two years ago, I could still see.' },
        { at: 6.2, text: 'Lena played the same four notes every night.' },
        { at: 10.6, who: 'LENA', text: '“So you’ll always find your way home.”' },
        { at: 14.4, text: 'I always did.' },
      ],
      cues: [2, 6.5, 11].map(at => ({ at, fn: () => A.motif() })),
      enter(m) { m.dust = Array.from({ length: 110 }, (_, i) => ({ p: [260 + rnd(i, 1) * 760, 170 + rnd(i, 2) * 420, 10 + rnd(i, 3) * 110], ph: rnd(i, 4) * TAU })); m.notes = []; m.ni = 0; },
      draw(g, t, api) {
        const { W, H, m } = api, k = easeIO(t / 17);
        const c = camera(vl([700, 760, 640], [455, 470, 250], k), vl([600, 360, 20], [395, 285, 38], k), .95, W, H, Math.sin(t * .35) * .012);
        const flick = .9 + .1 * Math.sin(t * 11) * Math.sin(t * 4.3);
        const evs = NOTE_T.map(n => ({ x: 375, y: 228, t: n, v: 520, R: 560, s: .8, k: 1.6 }));
        const aAt = mm => (.42 + echoA(mm[0], mm[1], evs, t) * .6) * flick;
        pool(g, c, api, 990, 575, COL.amber, .2 * flick, 230);
        pool(g, c, api, 375, 250, COL.amber, .1 + .08 * Math.sin(t * 2), 190);
        grid(g, c, 264, 174, 1020, 590, 48, COL.amber, aAt);
        drawSet(g, c, APT, COL.amber, aAt); drawSet(g, c, KEYS, COL.amber, () => .55 * flick);
        L3(g, c, [1040, 330, 0], [1040, 420, 0], COL.white, .4); L3(g, c, [1040, 330, 105], [1040, 420, 105], COL.white, .7, 1.8);
        echoRings(g, c, evs, t, COL.amber);
        while (m.ni < NOTE_T.length && t >= NOTE_T[m.ni]) { m.notes.push({ p: [330 + Math.random() * 90, 230, 50], t0: t, g: Math.random() < .5 ? '♪' : '♫' }); m.ni++; }
        g.textAlign = 'center';
        for (const n of m.notes) {
          const age = t - n.t0; if (age > 3) continue;
          const q = P(c, [n.p[0] + Math.sin(age * 2) * 12, n.p[1] - age * 10, n.p[2] + age * 38]); if (!q) continue;
          g.font = `${clamp(22 * c.foc / q[2], 8, 40)}px serif`; g.fillStyle = rgba(COL.amber, (1 - age / 3) * .8); g.fillText(n.g, q[0], q[1]);
        }
        for (const d of m.dust) dot3(g, c, [d.p[0] + Math.sin(t * .3 + d.ph) * 14, d.p[1] + Math.cos(t * .23 + d.ph) * 10, d.p[2] + Math.sin(t * .5 + d.ph) * 6], COL.amber, .35 + .25 * Math.sin(t * 2 + d.ph), 1.1);
        actor(g, c, api, [LENA[0], LENA[1], 0], -PI / 2 + Math.sin(t * .8) * .04, COL.amber, flick, { t, sit: 1, piano: pianoHands(t, NOTE_T), lean: .25 + Math.sin(t * 1.7) * .06, headDown: .3 }, { hair: 'long' });
        actor(g, c, api, [ELIAS[0], ELIAS[1], 0], Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), COL.white, flick, { t: t + 1, headDown: .12 }, { hair: 'spiky', coat: true, wind: t * .6 });
        const lk = g.createLinearGradient(0, 0, W, H); lk.addColorStop(0, rgba(COL.amber, .09)); lk.addColorStop(.5, rgba(COL.amber, 0)); lk.addColorStop(1, rgba(COL.red, .05));
        g.fillStyle = lk; g.fillRect(0, 0, W, H);
      },
    },
    {
      id: 'night', dur: 13, chapter: 'THE NIGHT THEY CAME', noFadeOut: true,
      lines: [
        { at: 2, text: 'I used to kill for a syndicate called The Quiet.' },
        { at: 4.6, text: 'I left it for her.' },
        { at: 7.4, text: 'Nobody leaves The Quiet.' },
      ],
      cues: [
        { at: .3, fn: () => A.motif(.14, .6) }, { at: 3.4, fn: () => A.motif(.12, .6, 0, 2) },
        { at: 6, fn: () => A.kick() },
        ...[6.5, 6.9, 7.3, 7.7, 8.1, 8.5].map(at => ({ at, fn: () => A.step(.3) })),
        { at: 10, fn: () => A.clink() }, { at: 11.4, fn: () => { A.bang(); A.ring(8); } },
      ],
      enter(m) { m.sp = []; m.kicked = false; },
      draw(g, t, api) {
        const { W, H, m } = api;
        if (!m.kicked && t >= 6) { m.kicked = true; burst(m.sp, [1040, 375, 55], 50, COL.white, 520, 260, 1.1, { dx: -260, streak: true }); }
        stepParts(m.sp, api.dt, 600);
        const cold = ease((t - 6) / 2), col = mixC(COL.amber, COL.steel, cold);
        let pos, tgt;
        if (t < 6) { const k = easeIO(t / 6); pos = vl([470, 560, 400], [590, 560, 330], k); tgt = vl([520, 320, 30], [660, 350, 40], k); }
        else if (t < 10) { const k = easeIO((t - 6) / 2.2); pos = vl([590, 560, 330], [780, 540, 250], k); tgt = vl([660, 350, 40], [950, 375, 50], k); }
        else { const k = easeIO((t - 10) / 1.4); pos = vl([780, 540, 250], [690, 470, 210], k); tgt = vl([950, 375, 50], [610, 345, 0], k); }
        const sh = Math.max(0, 1 - (t - 6) / .8) * (t > 6 ? 18 : 0);
        pos = add(pos, [(Math.random() - .5) * sh, (Math.random() - .5) * sh, (Math.random() - .5) * sh]);
        const c = camera(pos, tgt, .95, W, H, t > 6 ? Math.sin(t * 20) * .02 * Math.max(0, 1 - (t - 6)) : 0);
        const door = [{ x: 1040, y: 375, t: 6, v: 700, R: 1000, s: 1, c: COL.red, k: .9 }];
        const aAt = mm => lerp(.42, .26, cold) + echoA(mm[0], mm[1], door, t) * .75;
        pool(g, c, api, 990, 575, COL.amber, .2 * (1 - cold), 230);
        grid(g, c, 264, 174, 1020, 590, 48, col, aAt);
        drawSet(g, c, APT, col, aAt); drawSet(g, c, KEYS, col, () => .4);
        const da = t < 6 ? PI / 2 : lerp(PI / 2, PI * .96, ease((t - 6) / .22));
        drawSet(g, c, [wall(1040, 330, 1040 + Math.cos(da) * 90, 330 + Math.sin(da) * 90, 105)], t < 6 ? COL.white : COL.red, () => .9);
        echoRings(g, c, door, t, COL.red);
        drawParts(g, c, m.sp);
        // The Quiet walk in, laser sights first
        const foes = [[930, 300], [930, 450], [860, 375]].map(([x, y], i) => {
          const t0 = 6.3 + i * .25; if (t < t0) return null;
          const u = clamp((t - t0) / 1.9, 0, 1), k = easeIO(u), D = Math.hypot(x - 1080, y - 375);
          const px = lerp(1080, x, k), py = lerp(375, y, k), a = Math.atan2(ELIAS[1] - py, ELIAS[0] - px);
          return { px, py, a, ph: k * D * PI / 21, stride: u < 1 ? Math.min(1, u * 6) : Math.max(0, 1 - (t - t0 - 1.9) * 4) };
        }).filter(Boolean);
        for (const f of foes) {
          const s0 = [f.px + Math.cos(f.a) * 40, f.py + Math.sin(f.a) * 40, 64], s1 = [f.px + Math.cos(f.a) * 520, f.py + Math.sin(f.a) * 520, 64];
          L3(g, c, s0, s1, COL.red, .35, .8); dot3(g, c, [ELIAS[0] + Math.sin(t * 9 + f.px) * 6, ELIAS[1] + Math.cos(t * 7) * 6, 72], COL.red, .9, 2.2);
        }
        const up_ = ease((t - 6.25) / .7), toDoor = Math.atan2(375 - LENA[1], 1040 - LENA[0]);
        const lenaPose = t < 5.6 ? { t, sit: 1, piano: pianoHands(t, [.3, .9, 1.5, 2.1, 3.4, 4.0]), lean: .25, headDown: .3 } : { t, sit: 1 - up_, lean: .2 * (1 - up_), headDown: .3 * (1 - up_), twist: -.2 * up_ };
        actor(g, c, api, [LENA[0] + 6 * up_, LENA[1] + 14 * up_, 0], lerp(-PI / 2, toDoor, ease((t - 6.2) / .6)), COL.amber, .95, lenaPose, { hair: 'long' });
        const e0 = Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), aimK = ease((t - 6.3) / .35);
        actor(g, c, api, [ELIAS[0] - 8 * aimK, ELIAS[1], 0], t < 6.1 ? e0 : lerp(e0 + TAU, .02, ease((t - 6.1) / .4)), COL.white, .95, { t: t + 1, aim: aimK, lean: .15 * aimK, headDown: .12 * (1 - aimK) }, { hair: 'spiky', coat: true, wind: t * .6, gun: aimK > .2 ? 'light' : null });
        for (const f of foes) actor(g, c, api, [f.px, f.py, 0], f.a, COL.red, 1, { t: t + f.px, walk: f.ph, stride: f.stride, aim: .9 }, { helmet: true, gun: 'dark' });
        if (t > 10) {
          const k = ease((t - 10) / 1.2), cx = lerp(1030, 600, k), cy = lerp(378, 340, k), z = 6 + Math.abs(Math.sin(k * 9)) * 30 * (1 - k);
          dot3(g, c, [cx, cy, z], COL.white, 1, 4.5);
          ring3(g, c, cx, cy, 1, 14 + Math.sin(t * 30) * 3, COL.white, .6, 1.2);
          api.fx.glitch = Math.max(api.fx.glitch, (t - 10) / 1.4 * .3);
        }
        if (t > 11.4) { api.fx.white = ease((t - 11.4) / .1); api.fx.glitch = 1 - ease((t - 11.4) / 1.4); }
      },
    },
    {
      id: 'light', dur: 12, noFadeIn: true,
      lines: [
        { at: 2.4, text: 'The last thing I saw was light.' },
        { at: 5.8, text: 'The last thing I heard was her humming.' },
        { at: 10.2, text: 'Then it stopped.' },
      ],
      cues: [
        ...[3.1, 3.4, 4.3, 5.2].map(at => ({ at, fn: () => A.muffled(.45) })),
        { at: 6.6, fn: () => A.hum(.08, .75, 0, 3) },
        { at: 8.9, fn: () => A.muffled(.7) },
      ],
      enter(m) { m.ash = Array.from({ length: 90 }, (_, i) => [rnd(i, 1), rnd(i, 2), .4 + rnd(i, 3) * .6, rnd(i, 4) * TAU]); },
      draw(g, t, api) {
        const { W, H, m } = api;
        api.fx.white = 1 - ease(t / 3.4);
        api.fx.glitch = t < 2 ? .6 * (1 - t / 2) : 0;
        for (const a of m.ash) {
          const x = (a[0] + Math.sin(t * .4 + a[3]) * .01) * W, y = ((a[1] + t * .025 * a[2]) % 1) * H;
          g.fillStyle = rgba(COL.white, .12 * a[2] * clamp((t - 1) / 2, 0, 1) * (t > 9 ? Math.max(0, 1 - (t - 9) / 2) : 1)); g.fillRect(x, y, 1.8, 1.8);
        }
        // tinnitus
        const ti = Math.max(0, 1 - t / 7);
        if (ti > 0) { g.strokeStyle = rgba(COL.white, .35 * ti); g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H * .46 + Math.sin(x * .9 + t * 60) * 2 * ti; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
        for (const s of [3.1, 3.4, 4.3, 5.2, 8.9]) {
          const d = t - s; if (d > 0 && d < .5) {
            const gr = g.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, W * .6); gr.addColorStop(0, rgba(COL.red, .28 * (1 - d / .5))); gr.addColorStop(1, rgba(COL.red, 0));
            g.fillStyle = gr; g.fillRect(0, 0, W, H); api.fx.glitch = Math.max(api.fx.glitch, .5 * (1 - d / .5));
          }
        }
        if (t > 6.6 && t < 8.9) { // her humming, the only thing left in the dark
          const k = Math.min(1, (t - 6.6) / .5), R = Math.min(W, H);
          for (let i = 0; i < 4; i++) { const u = ((t * .5 + i * .25) % 1); g.strokeStyle = rgba(COL.amber, k * .45 * (1 - u)); g.lineWidth = 1.5; g.beginPath(); g.arc(W / 2, H * .46, R * (.04 + u * .3), 0, TAU); g.stroke(); }
          const gr = g.createRadialGradient(W / 2, H * .46, 0, W / 2, H * .46, R * .3); gr.addColorStop(0, rgba(COL.amber, .12 * k)); gr.addColorStop(1, rgba(COL.amber, 0)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        }
      },
    },
    {
      id: 'after', dur: 16, chapter: 'AFTER',
      lines: [
        { at: 2.4, text: 'They left me alive.' },
        { at: 4.8, text: 'Blind. A lesson for anyone else who tried to leave.' },
        { at: 8.2, text: 'They should have finished it.' },
        { at: 11, text: 'Because the dark isn’t empty.' },
        { at: 13.6, text: 'Every sound throws a shape.' },
      ],
      cues: [
        ...[.8, 2.1, 3.4, 4.7, 6, 7.3, 8.6].map(at => ({ at, fn: () => A.heart(.25) })),
        { at: 10.3, fn: () => A.tap() }, { at: 12.4, fn: () => A.tap() }, { at: 14.3, fn: () => A.tap() },
      ],
      draw(g, t, api) {
        const { W, H } = api, k = easeIO(t / 16);
        const c = camera(vl([650, 700, 620], [690, 470, 250], k), vl([650, 330, 0], [650, 322, 36], k), .95, W, H, .02);
        const evs = [10.3, 12.4, 14.3].map(tt => ({ x: 650, y: 325, t: tt, v: 480, R: 700, s: 1, k: 1 }));
        const aAt = mm => echoA(mm[0], mm[1], evs, t);
        grid(g, c, 444, 194, 836, 546, 48, COL.cyan, aAt);
        drawSet(g, c, HOSP, COL.cyan, aAt);
        echoRings(g, c, evs, t, COL.cyan);
        // bedside monitor keeps drawing his heartbeat even when nothing else can be seen
        const mq = P(c, [802, 215, 80]);
        if (mq) {
          g.strokeStyle = rgba(COL.cyan, .5); g.lineWidth = 1.2; g.beginPath();
          const s = c.foc / mq[2] * 18;
          for (let i = 0; i <= 40; i++) { const u = i / 40, x = mq[0] - s + u * 2 * s, ph = (u * 2 + t * .8) % 1; const y = mq[1] - (ph > .45 && ph < .55 ? Math.sin((ph - .45) * 62) * s * .6 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        }
        actor(g, c, api, [690, 325, 34], 0, COL.white, Math.max(.18, echoA(650, 325, evs, t)), { t, fall: -PI / 2 }, { hair: 'spiky', blind: true });
      },
    },
    {
      id: 'listen', dur: 18, chapter: 'TWO YEARS OF LISTENING',
      lines: [
        { at: 2.4, text: 'So I listened.' },
        { at: 4.4, text: 'Footsteps. Breathing. Rain on steel.' },
        { at: 7.8, text: 'The weight a man puts on a floorboard, just before he pulls the trigger.' },
        { at: 13.4, text: 'They started calling me Echo.' },
        { at: 15.8, text: 'You only know I was there after I’m gone.' },
      ],
      enter(m) { m.drops = makeRain(220, 470, 810, -200, 950); m.sp = []; m.cut = {}; return A.rain(.09); },
      cues: [
        ...S5.pings.map(at => ({ at, fn: () => SFX.sonar() })),
        ...S5.pings.map(at => ({ at: at + .7, fn: () => A.slash() })),
        { at: 2.6, fn: () => A.thunder(.5) }, { at: 11, fn: () => A.thunder(.7) },
      ],
      draw(g, t, api) {
        const { W, H, m } = api;
        const th = lerp(.35, 1.45, easeIO(t / 18));
        const EL = eliasS5(t);
        if (!m.cf) m.cf = [...EL.pos]; m.cf[0] = lerp(m.cf[0], EL.pos[0], Math.min(1, api.dt * 2.5)); m.cf[1] = lerp(m.cf[1], EL.pos[1], Math.min(1, api.dt * 2.5));
        const c = camera([m.cf[0] + Math.sin(th) * 215, m.cf[1] + Math.cos(th) * 215, 225 + Math.sin(t * .4) * 10], [m.cf[0], m.cf[1], 38], 1.0, W, H);
        let flash = 0; for (const lt of [2.2, 2.35, 10.6]) { const d = t - lt; if (d > 0 && d < .25) flash = Math.max(flash, 1 - d / .25); }
        const pings = S5.pings.map((tt, i) => ({ x: S5P[i][0], y: S5P[i][1], t: tt, v: 800, R: 800, s: 1, k: 1.1 }));
        const rips = drawRain(g, c, m.drops, t, COL.cyan, 1);
        const aAt = mm => Math.max(.05, echoA(mm[0], mm[1], pings, t), ripA(rips, mm) * .7, flash * .9);
        grid(g, c, 494, -160, 794, 920, 48, COL.cyan, aAt);
        drawSet(g, c, ALLEY, COL.cyan, aAt);
        echoRings(g, c, pings, t, COL.cyan);
        if (m.face == null) m.face = -PI / 2;
        let faceT = -PI / 2 + Math.sin(t * .6) * .5, slash = -1;
        S5.foes.forEach(([x, y], i) => {
          const p = S5.pings[i], O = S5P[i], hitT = p + Math.hypot(x - O[0], y - O[1]) / 800, cut = p + .7;
          if (t > p + .15 && t < cut + .9) faceT = Math.atan2(y - EL.pos[1], x - EL.pos[0]);
          if (t > p + .5 && t < cut + .35) slash = (t - (p + .5)) / .35;
          if (t < hitT && flash < .3) return;
          const toE = Math.atan2(EL.pos[1] - y, EL.pos[0] - x);
          const vis = Math.max(flash, t >= hitT ? Math.max(.12, Math.exp(-(t - hitT) * .7)) : 0);
          if (t < cut) actor(g, c, api, [x, y, 0], toE, COL.red, vis, { t: t + i * 3, aim: 1, aimZ: 2 }, { helmet: true, gun: 'dark' });
          else {
            if (!m.cut[i]) { m.cut[i] = true; m.fallA = m.fallA || {}; m.fallA[i] = toE; burst(m.sp, [x, y, 60], 44, COL.red, 330, 220, 1.2, { drag: 3 }); burst(m.sp, [x, y, 60], 18, COL.white, 620, 160, .35, { streak: true }); }
            const k = t - cut, u = clamp(k / .55, 0, 1), fa = Math.max(Math.exp(-k * .4), flash * .8), fy = m.fallA[i];
            const kb = ease(k / .5) * 14, bx = x - Math.cos(fy) * kb, by = y - Math.sin(fy) * kb;
            pool(g, c, api, bx - Math.cos(fy) * 30, by - Math.sin(fy) * 30, COL.red, .25 * fa, 55 * ease(k / 1.2));
            actor(g, c, api, [bx, by, 0], fy, COL.red, fa, { t, fall: -u * u * PI / 2 - (u >= 1 ? Math.sin(Math.min(1, (k - .55) / .2) * PI) * .05 : 0), aim: 1 - ease(k / .4) }, { helmet: true });
            if (k < .3) ring3(g, c, EL.pos[0], EL.pos[1], 58, 34, COL.cyan, 1 - k / .3, 3, fy + PI - 1.2 + k * 3, fy + PI + .3 + k * 3);
          }
        });
        m.face = m.face + clamp(angDiff(m.face, faceT), -api.dt * 14, api.dt * 14);
        if (EL.moving) for (let j = 0; j < 2; j++) m.sp.push({ p: [EL.pos[0] + (Math.random() - .5) * 10, EL.pos[1] + (Math.random() - .5) * 10, 20 + Math.random() * 50], v: [-Math.cos(m.face) * 200, -Math.sin(m.face) * 200, 0], life: .25, max: .25, c: COL.cyan, drag: 4, streak: true });
        stepParts(m.sp, api.dt, 500); drawParts(g, c, m.sp);
        actor(g, c, api, [EL.pos[0], EL.pos[1], 0], m.face, COL.white, 1, { t, walk: EL.ph, stride: EL.moving ? 1.3 : 0, lean: EL.moving ? .6 : .1, slash, headDown: slash < 0 && !EL.moving ? .05 + Math.sin(t * .7) * .08 : 0, twist: slash >= 0 ? Math.sin(clamp(slash, 0, 1) * PI) * .4 : Math.sin(t * .6) * .12 }, { hair: 'spiky', coat: true, wind: t * 2.2 + (EL.moving ? t * 6 : 0), blind: true, knife: true });
        if (flash > 0) { g.fillStyle = rgba(COL.white, flash * .18); g.fillRect(0, 0, W, H); }
      },
    },
    {
      id: 'call', dur: 22, chapter: 'THE CALL',
      lines: [
        { at: 2.4, who: 'MARCUS', text: 'The ones who gave the order. Their names are in the Archive.' },
        { at: 6.6, who: 'MARCUS', text: 'Twenty guns. No lights. And they’ll hear you coming.' },
        { at: 10.4, who: 'ECHO', text: 'Then we’re even.' },
        { at: 12.8, who: 'MARCUS', text: '…Elias. Lena wouldn’t want this.' },
        { at: 16.4, who: 'ECHO', text: 'She’d want me to find my way home.' },
        { at: 19.2, who: 'ECHO', text: 'I can still hear her. I just follow the song.' },
      ],
      enter(m) { m.drops = makeRain(170, 250, 1030, 150, 700); return A.rain(.045); },
      cues: [
        { at: 2.2, fn: () => A.radio() }, { at: 6.4, fn: () => A.radio() }, { at: 12.6, fn: () => A.radio() },
        { at: 8.3, fn: () => A.thunder(.4) }, { at: 19.4, fn: () => A.motif(.08, .6) },
      ],
      draw(g, t, api) {
        const { W, H, m } = api, k = easeIO(t / 22);
        const c = camera(vl([650, 620, 330], [700, 520, 280], k), vl([650, -300, -120], [820, -500, -200], k), 1.0, W, H, -.015);
        let flash = 0; { const d = t - 8; if (d > 0 && d < .3) flash = 1 - d / .3; }
        const song = t > 19.3 ? [0, .6, 1.2, 1.8].map(d => ({ x: ARCHIVE.x, y: ARCHIVE.y, t: 19.3 + d, v: 900, R: 1600, s: .9, k: .6, c: COL.amber })) : [];
        // the city far below
        for (const b of CITY) {
          const a = .1 + flash * .6 + echoA(b.m[0], b.m[1], song, t) * .8;
          drawSet(g, c, [b], COL.steel, () => a);
          for (const w of b.win) if (w[3] > .55) dot3(g, c, w, COL.amber, (.25 + .2 * Math.sin(t * (1 + w[3] * 3) + w[3] * 20)) * (w[3] > .8 ? 1 : .6), 3);
        }
        const beacon = .3 + .3 * Math.sin(t * 2) + (t > 19.3 ? .5 : 0);
        L3(g, c, [ARCHIVE.x, ARCHIVE.y, -300], [ARCHIVE.x, ARCHIVE.y, 900], COL.amber, beacon * .5, 1.4);
        dot3(g, c, [ARCHIVE.x, ARCHIVE.y, 120], COL.amber, beacon, 10);
        for (const e of song) { const r = (t - e.t) * e.v; if (r > 0 && r < e.R) ring3(g, c, e.x, e.y, 110, r, COL.amber, (1 - r / e.R) * .7, 1.8); }
        const rips = drawRain(g, c, m.drops, t, COL.cyan, .7);
        drawSet(g, c, ROOF, COL.cyan, mm => Math.max(.1, ripA(rips, mm, 140) * .6, flash));
        actor(g, c, api, [640, 236, 0], -PI / 2 + Math.sin(t * .5) * .06, COL.white, 1, { t, headDown: t < 19.3 ? .45 : lerp(.45, -.15, ease((t - 19.3) / 1.2)) }, { hair: 'spiky', coat: true, wind: t * 1.8, blind: true });
        if (flash > 0) { g.fillStyle = rgba(COL.white, flash * .15); g.fillRect(0, 0, W, H); }
        // voice waveform
        const cur = api.currentLine, speaking = cur && cur.typing;
        const cc = cur && cur.who === 'MARCUS' ? COL.amber : COL.cyan, amp = speaking ? 1 : .06;
        const cx = W / 2, cy = H * .19, bw = Math.min(W * .42, 520);
        for (let i = 0; i < 72; i++) {
          const x = cx - bw / 2 + i * bw / 71, env = Math.exp(-Math.pow((i - 35.5) / 22, 2));
          const v = (Math.sin(t * 17 + i * .7) * .5 + .5) * (Math.sin(t * 7.3 + i * 1.9) * .5 + .5);
          const hh = 2 + v * 44 * env * amp;
          g.fillStyle = rgba(cc, .25 + .6 * env); g.fillRect(x - 1.5, cy - hh / 2, 3, hh);
        }
        g.font = '600 12px Rajdhani, sans-serif'; g.textAlign = 'center';
        g.fillStyle = rgba(COL.red, .55 + .35 * Math.sin(t * 4)); g.fillText('●  ENCRYPTED LINE  ·  M. VOSS', cx, cy + 38);
      },
    },
    {
      id: 'title', dur: 9.5, noFadeOut: true,
      lines: [],
      cues: [{ at: .4, fn: () => SFX.sonar() }, { at: 1.2, fn: () => A.boom() }],
      draw(g, t, api) {
        const { W, H } = api;
        const c = camera([640, 400 + 900, 650], [640, 400, 0], 1.0, W, H, Math.sin(t * .2) * .02);
        const evs = [.4, 2.2, 4, 5.8, 7.6].map(tt => ({ x: 640, y: 400, t: tt, v: 520, R: 1300, s: 1, k: .8 }));
        grid(g, c, 0, -400, 1280, 1200, 64, COL.cyan, mm => echoA(mm[0], mm[1], evs, t) * .8 + .04);
        echoRings(g, c, evs, t, COL.cyan);
        if (t > 8.3) api.fx.fade = ease((t - 8.3) / 1.1);
      },
      overlay(t) {
        const a1 = ease((t - .5) / 1.2), a2 = ease((t - 2.4) / 1), a3 = ease((t - 5) / 1);
        return h('div', { className: 'pr-titlecard' },
          h('div', { className: 'pr-logo' + (t > .5 && t < 1.4 ? ' glitch' : ''), style: { opacity: a1, letterSpacing: `${lerp(.9, .38, a1)}em` } }, 'ECH', h('span', { className: 'pr-o' })),
          h('div', { className: 'pr-tag', style: { opacity: a2 } }, 'They took his eyes. He kept his ears.'),
          h('div', { className: 'pr-lvl', style: { opacity: a3 } }, h('span', null, 'LEVEL 01'), ' THE ARCHIVE'));
      },
    },
  ];

  // =====================================================================
  //  REACT
  // =====================================================================
  const CSS = `
  .pr-root{position:fixed;inset:0;z-index:50;background:#000;cursor:pointer;color:#e2f2ff;
    font-family:Rajdhani,"Segoe UI",sans-serif;opacity:1;transition:opacity .9s ease;user-select:none;overflow:hidden}
  .pr-root.pr-in{animation:prFade 1.2s ease}
  .pr-root.pr-leave{opacity:0}
  .pr-canvas{position:absolute;inset:0;width:100%;height:100%}
  .pr-bar{position:absolute;left:0;right:0;height:10vh;background:#000;z-index:2}
  .pr-top{top:0;animation:prBarT 1.4s cubic-bezier(.2,.8,.2,1)} .pr-bot{bottom:0;animation:prBarB 1.4s cubic-bezier(.2,.8,.2,1)}
  .pr-card{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
  .pr-card small{font-size:12px;letter-spacing:10px;color:rgba(80,225,255,.8)}
  .pr-card b{margin-top:14px;font-size:clamp(28px,4vw,54px);font-weight:600;letter-spacing:.42em;padding-left:.42em;color:#eaf6ff;text-shadow:0 0 28px rgba(80,225,255,.45)}
  .pr-card i{display:block;height:1px;margin-top:18px;background:linear-gradient(90deg,transparent,#50e1ff,transparent)}
  .pr-chapter{position:absolute;top:calc(10vh + 24px);left:52px;z-index:3;font-size:11px;letter-spacing:6px;color:rgba(80,225,255,.7)}
  .pr-chapter b{display:block;margin-top:5px;font-size:16px;font-weight:600;letter-spacing:8px;color:rgba(226,242,255,.85)}
  .pr-subs{position:absolute;left:8%;right:8%;bottom:calc(10vh + 34px);text-align:center;z-index:3;min-height:70px}
  .pr-line{display:inline-block;padding:10px 26px;font-size:clamp(18px,2vw,29px);font-weight:500;letter-spacing:1.2px;line-height:1.35;
    text-shadow:0 0 22px rgba(80,225,255,.35),0 2px 0 #000;background:radial-gradient(ellipse at center,rgba(0,0,0,.55),transparent 72%)}
  .pr-line .scr{color:#50e1ff;opacity:.7}
  .pr-who{display:block;font-size:11px;font-weight:700;letter-spacing:8px;margin-bottom:8px}
  .pr-who.MARCUS,.pr-who.LENA{color:#ffb040}.pr-who.ECHO{color:#50e1ff}
  .pr-line.MARCUS,.pr-line.LENA{text-shadow:0 0 22px rgba(255,176,64,.35),0 2px 0 #000}
  .pr-hint{position:absolute;right:44px;bottom:3.6vh;z-index:3;font-size:11px;letter-spacing:4px;color:rgba(226,242,255,.45);display:flex;align-items:center;gap:12px}
  .pr-hint svg{width:22px;height:22px}
  .pr-dots{position:absolute;left:52px;bottom:4.2vh;z-index:3;display:flex;gap:6px}
  .pr-dots i{width:18px;height:2px;background:rgba(226,242,255,.15);transition:background .4s}
  .pr-dots i.done{background:rgba(80,225,255,.55)} .pr-dots i.on{background:#50e1ff;box-shadow:0 0 8px #50e1ff}
  .pr-label{position:absolute;left:52px;top:3.6vh;z-index:3;font-size:11px;letter-spacing:6px;color:rgba(226,242,255,.4)}
  .pr-time{position:absolute;right:44px;top:3.6vh;z-index:3;font-size:11px;letter-spacing:3px;color:rgba(226,242,255,.35);font-family:"Share Tech Mono",monospace}
  .pr-titlecard{position:absolute;inset:0;z-index:3;display:flex;flex-direction:column;align-items:center;justify-content:center;padding-bottom:6vh}
  .pr-logo{font-size:clamp(64px,10vw,150px);font-weight:500;color:#eaf6ff;text-shadow:0 0 30px rgba(80,225,255,.5);display:flex;align-items:center;padding-left:.38em}
  .pr-logo.glitch{animation:prGlitch .12s steps(2) infinite}
  .pr-o{display:inline-block;width:.72em;height:.72em;border-radius:50%;border:.045em solid #50e1ff;box-shadow:0 0 24px #50e1ff,inset 0 0 18px rgba(80,225,255,.5);position:relative}
  .pr-o::after{content:"";position:absolute;inset:26%;border-radius:50%;border:.07em solid #50e1ff;box-shadow:0 0 16px #50e1ff}
  .pr-tag{margin-top:26px;font-size:clamp(16px,1.7vw,24px);letter-spacing:5px;color:#50e1ff;text-shadow:0 0 16px rgba(80,225,255,.5)}
  .pr-lvl{margin-top:44px;font-size:14px;letter-spacing:8px;color:rgba(226,242,255,.7)}
  .pr-lvl span{color:#ffb040;margin-right:14px}
  @keyframes prFade{from{opacity:0}to{opacity:1}}
  @keyframes prBarT{from{transform:translateY(-100%)}to{transform:none}}
  @keyframes prBarB{from{transform:translateY(100%)}to{transform:none}}
  @keyframes prGlitch{0%{transform:translate(-3px,1px);text-shadow:3px 0 #ff3048,-3px 0 #50e1ff}50%{transform:translate(3px,-1px);text-shadow:-3px 0 #ff3048,3px 0 #50e1ff}100%{transform:none}}
  `;

  const CPS = 34; // typewriter characters per second
  const GLYPHS = '▮▯░▒/\\|<>_-=+#';
  function lineState(sc, t) {
    const L = sc.lines;
    for (let i = L.length - 1; i >= 0; i--) {
      const ln = L[i]; if (t < ln.at) continue;
      const end = i + 1 < L.length ? L[i + 1].at - .15 : sc.dur - .3;
      if (t > end) return null;
      const n = Math.floor((t - ln.at) * CPS);
      return { ...ln, i, n, typing: n < ln.text.length, alpha: Math.min(1, (t - ln.at) / .25, (end - t) / .35) };
    }
    return null;
  }
  function Subtitle({ line, t }) {
    if (!line) return null;
    const shown = line.text.slice(0, line.n);
    let scr = '';
    if (line.typing) for (let k = 0; k < Math.min(4, line.text.length - line.n); k++) scr += line.text[line.n + k] === ' ' ? ' ' : GLYPHS[Math.floor((t * 30 + k * 7) % GLYPHS.length)];
    return h('div', { className: 'pr-line ' + (line.who || ''), key: line.i, style: { opacity: Math.max(0, line.alpha) } },
      line.who && h('span', { className: 'pr-who ' + line.who }, line.who), shown, scr && h('span', { className: 'scr' }, scr));
  }
  function SkipRing({ k }) {
    const r = 9, c = 2 * PI * r;
    return h('svg', { viewBox: '0 0 22 22' },
      h('circle', { cx: 11, cy: 11, r, fill: 'none', stroke: 'rgba(226,242,255,.2)', strokeWidth: 1.5 }),
      h('circle', { cx: 11, cy: 11, r, fill: 'none', stroke: '#50e1ff', strokeWidth: 2, strokeDasharray: c, strokeDashoffset: c * (1 - k), transform: 'rotate(-90 11 11)' }));
  }
  function ChapterCard({ sc, si, t }) {
    if (!sc.chapter || t > 2.6) return null;
    const a = Math.min(ease(t / .5), 1 - ease((t - 1.9) / .6));
    return h('div', { className: 'pr-card', style: { opacity: a } },
      h('small', null, 'CHAPTER ' + String(si).padStart(2, '0')),
      h('b', { style: { letterSpacing: `${lerp(.7, .42, ease(t / 1.4))}em` } }, sc.chapter),
      h('i', { style: { width: `${ease(t / 1.2) * 320}px` } }));
  }

  // ---------- post: bloom, glitch, grain, vignette ----------
  function makePost() {
    const buf = document.createElement('canvas'), b1 = document.createElement('canvas'), b2 = document.createElement('canvas');
    const grain = document.createElement('canvas'); grain.width = grain.height = 200;
    const gx = grain.getContext('2d'), id = gx.createImageData(200, 200);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gx.putImageData(id, 0, 0);
    return { buf, bx: buf.getContext('2d'), b1, b1x: b1.getContext('2d'), b2, b2x: b2.getContext('2d'), grain };
  }
  function composite(ctx, post, W, H, d, fx) {
    const { buf, b1, b1x, b2, b2x } = post;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, buf.width, buf.height);
    ctx.drawImage(buf, 0, 0);
    b1x.globalCompositeOperation = 'copy'; b1x.filter = 'blur(2px)'; b1x.drawImage(buf, 0, 0, b1.width, b1.height);
    b2x.globalCompositeOperation = 'copy'; b2x.filter = 'blur(2px)'; b2x.drawImage(b1, 0, 0, b2.width, b2.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .8; ctx.drawImage(b1, 0, 0, buf.width, buf.height);
    ctx.globalAlpha = 1; ctx.drawImage(b2, 0, 0, buf.width, buf.height);
    if (fx.glitch > .02) {
      ctx.globalCompositeOperation = 'source-over';
      const n = 3 + Math.floor(fx.glitch * 12);
      for (let i = 0; i < n; i++) {
        const y = Math.random() * buf.height, hh = (3 + Math.random() * 28) * d, off = (Math.random() - .5) * 80 * fx.glitch * d;
        ctx.drawImage(buf, 0, y, buf.width, hh, off, y, buf.width, hh);
      }
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 * fx.glitch;
      ctx.drawImage(buf, 6 * fx.glitch * d, 0); ctx.drawImage(buf, -6 * fx.glitch * d, 0);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.setTransform(d, 0, 0, d, 0, 0);
    if (fx.white > 0) { ctx.fillStyle = `rgba(255,255,255,${fx.white})`; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = .05; ctx.globalCompositeOperation = 'lighter';
    const pat = ctx.createPattern(post.grain, 'repeat'); if (pat.setTransform) pat.setTransform(new DOMMatrix([1, 0, 0, 1, Math.random() * 200, Math.random() * 200]));
    ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .28, W / 2, H / 2, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.88)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1);
    if (fx.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fx.fade})`; ctx.fillRect(0, 0, W, H); }
  }

  function Prologue({ onDone }) {
    const [si, setSi] = useState(0);
    const [t, setT] = useState(0);
    const [skipK, setSkipK] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const canvasRef = useRef(null);
    const st = useRef(null);

    useEffect(() => {
      const s = st.current = { si: 0, t0: performance.now(), fired: new Set(), exit: null, done: false, spaceDown: null, mem: {}, last: 0 };
      const finish = () => {
        if (s.done) return; s.done = true;
        if (s.exit) s.exit(); s.exit = null;
        setLeaving(true); setTimeout(onDone, 900);
      };
      const go = n => {
        if (s.done) return;
        if (s.exit) s.exit(); s.exit = null;
        if (n >= SCENES.length) return finish();
        s.si = n; s.t0 = performance.now(); s.fired = new Set(); s.mem = {}; s.last = 0;
        setSi(n); setT(0);
        if (SCENES[n].enter) s.exit = SCENES[n].enter(s.mem) || null;
      };
      s.go = go; s.finish = finish;
      go(0);
      // dev hook: jump to (scene, time) and optionally hold the frame
      window.__prSeek = (n, tt, hold) => { go(n); s.t0 = performance.now() - tt * 1000; s.last = tt; s.hold = hold ? tt : null; };

      const cv = canvasRef.current, ctx = cv.getContext('2d'), post = makePost();
      const size = () => {
        const d = Math.min(devicePixelRatio || 1, 2); s.dpr = d;
        cv.width = post.buf.width = innerWidth * d; cv.height = post.buf.height = innerHeight * d;
        post.b1.width = Math.ceil(innerWidth / 4); post.b1.height = Math.ceil(innerHeight / 4);
        post.b2.width = Math.ceil(innerWidth / 10); post.b2.height = Math.ceil(innerHeight / 10);
      };
      size(); addEventListener('resize', size);

      let raf;
      const loop = now => {
        if (s.hold != null) s.t0 = now - s.hold * 1000;
        const sc = SCENES[s.si], tt = (now - s.t0) / 1000, dt = Math.min(.05, Math.max(0, tt - s.last)); s.last = tt;
        sc.cues.forEach((c, i) => { if (tt >= c.at && !s.fired.has(i)) { s.fired.add(i); try { c.fn(); } catch (e) {} } });
        const W = innerWidth, H = innerHeight, d = s.dpr, g = post.bx;
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#000'; g.fillRect(0, 0, post.buf.width, post.buf.height);
        g.setTransform(d, 0, 0, d, 0, 0); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        const fx = { glitch: 0, white: 0, fade: 0 };
        try { sc.draw(g, tt, { W, H, dpr: d, dt, m: s.mem, fx, currentLine: lineState(sc, tt) }); } catch (e) { console.error(e); }
        if (!sc.noFadeIn) fx.fade = Math.max(fx.fade, 1 - ease(tt / .8));
        if (!sc.noFadeOut) fx.fade = Math.max(fx.fade, ease((tt - (sc.dur - .7)) / .7));
        composite(ctx, post, W, H, d, fx);
        if (s.spaceDown) { const k = Math.min(1, (now - s.spaceDown) / 900); setSkipK(k); if (k >= 1) finish(); }
        setT(tt);
        if (tt >= sc.dur) go(s.si + 1);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);

      const kd = e => {
        if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) s.spaceDown = performance.now(); }
        else if (e.code === 'Escape') finish();
        else if ((e.code === 'Enter' || e.code === 'ArrowRight') && !e.repeat) go(s.si + 1);
      };
      const ku = e => { if (e.code === 'Space') { s.spaceDown = null; setSkipK(0); } };
      addEventListener('keydown', kd); addEventListener('keyup', ku);
      return () => { cancelAnimationFrame(raf); removeEventListener('resize', size); removeEventListener('keydown', kd); removeEventListener('keyup', ku); if (s.exit) s.exit(); };
    }, []);

    const sc = SCENES[si];
    const total = SCENES.reduce((a, b) => a + b.dur, 0), elapsed = SCENES.slice(0, si).reduce((a, b) => a + b.dur, 0) + t;
    const mmss = x => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, '0')}`;
    return h('div', { className: 'pr-root pr-in' + (leaving ? ' pr-leave' : ''), onMouseDown: () => st.current && st.current.go(st.current.si + 1) },
      h('canvas', { ref: canvasRef, className: 'pr-canvas' }),
      h('div', { className: 'pr-bar pr-top' }), h('div', { className: 'pr-bar pr-bot' }),
      h('div', { className: 'pr-label' }, 'PROLOGUE  ·  THE LAST THING I SAW'),
      h('div', { className: 'pr-time' }, `${mmss(elapsed)} / ${mmss(total)}`),
      h(ChapterCard, { sc, si, t }),
      sc.chapter && t > 2.4 && h('div', { className: 'pr-chapter', key: 'ch' + si, style: { opacity: ease((t - 2.4) / .8) } }, 'CHAPTER ' + String(si).padStart(2, '0'), h('b', null, sc.chapter)),
      h('div', { className: 'pr-subs' }, h(Subtitle, { line: lineState(sc, t), t })),
      sc.overlay && sc.overlay(t),
      h('div', { className: 'pr-dots' }, SCENES.map((_, i) => h('i', { key: i, className: i < si ? 'done' : i === si ? 'on' : '' }))),
      h('div', { className: 'pr-hint' }, 'CLICK  NEXT   ·   HOLD SPACE  SKIP', h(SkipRing, { k: skipK })));
  }

  // ---------- public API ----------
  let root = null, host = null;
  window.EchoPrologue = {
    play(onDone) {
      if (!document.getElementById('pr-style')) { const st = document.createElement('style'); st.id = 'pr-style'; st.textContent = CSS; document.head.appendChild(st); }
      host = document.createElement('div'); host.id = 'prologue-root'; document.body.appendChild(host);
      root = ReactDOM.createRoot(host);
      root.render(h(Prologue, {
        onDone: () => { const r = root, hh = host; root = host = null; setTimeout(() => { r.unmount(); hh.remove(); }, 0); onDone && onDone(); },
      }));
    },
  };
})();
