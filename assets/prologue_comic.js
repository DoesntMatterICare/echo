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
  function L3raw(g, c, a, b, col, al, w = 1.3) {
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
  function ring3raw(g, c, x, y, z, r, col, al, w = 1.6, a0 = 0, a1 = TAU) {
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
  function dot3raw(g, c, p, col, al, size) {
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
  function poolRaw(g, c, api, x, y, col, al, R) {
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
  function drawSetRaw(g, c, set, col, alphaAt) {
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
  function gridRaw(g, c, x0, y0, x1, y1, step, col, alphaAt) {
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
  function actorRaw(g, c, api, base, yaw, col, al, o = {}, st = {}) {
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

  // =====================================================================
  //  INK RENDERER — solid, cel-shaded, outlined geometry: comic art, not wireframe.
  //  Scenes still call grid / drawSet / actor / L3 …; those now fill per-frame
  //  display lists that are depth-sorted and inked in flush().
  // =====================================================================
  const INKL = '#05060a';
  const FR = { floor: [], geo: [], ov: [], under: [], bg: [0, 0, 0], ht: null, pal: null };
  // local colour = the material, tinted by the scene's light
  const tint = (mat, col) => mat.map((v, i) => Math.min(255, v * (.42 + .58 * col[i] / 255) * 1.2));
  const matOf = (kind, col) => FR.pal && FR.pal[kind] ? tint(FR.pal[kind], col) : col;
  const LDIR = norm([-.45, -.35, .82]);
  function frameReset(bg, pal) { FR.floor.length = 0; FR.geo.length = 0; FR.ov.length = 0; FR.under.length = 0; FR.bg = bg || [0, 0, 0]; FR.pal = pal || null; }
  function L3(...a) { FR.ov.push(() => L3raw(...a)); }
  function ring3(...a) { FR.ov.push(() => ring3raw(...a)); }
  function dot3(...a) { FR.ov.push(() => dot3raw(...a)); }
  function pool(...a) { FR.under.push(() => poolRaw(...a)); }
  function later(fn) { FR.ov.push(fn); }
  const viewZ = (c, p) => dot(sub(p, c.pos), c.f);
  const rgbS = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  function halftoneOf(g) {
    if (FR.ht) return FR.ht;
    const cv = document.createElement('canvas'); cv.width = cv.height = 5;
    const x = cv.getContext('2d'); x.fillStyle = 'rgba(0,0,0,.6)';
    for (const [px, py] of [[0, 0], [5, 0], [0, 5], [5, 5], [2.5, 2.5]]) { x.beginPath(); x.arc(px, py, 1.05, 0, TAU); x.fill(); }
    return (FR.ht = g.createPattern(cv, 'repeat'));
  }
  // flat comic colour: deep tinted shadow → local colour → warm highlight, then fog toward the backdrop
  function shadeOf(col, lit, lam, z) {
    const k = clamp(lit, 0, 1) * lam;
    const dark = [col[0] * .1 + 6, col[1] * .1 + 7, col[2] * .1 + 12], hi = mixC(col, [255, 246, 230], .22);
    let rgb = k < .55 ? mixC(dark, mixC(col, dark, .25), k / .55) : mixC(mixC(col, dark, .25), hi, (k - .55) / .45);
    rgb = mixC(rgb, FR.bg, (1 - fogOf(z)) * .85);
    return { rgb, k };
  }
  function inkStroke(g, k, col, lit, z, w = 1) {
    g.lineWidth = clamp(w * 1100 / z, .7, 2.8);
    g.strokeStyle = k > .26 ? INKL : rgbS(lite(col), clamp(lit * 1.5, .16, 1)); // in the dark, the echo draws the edges
    g.stroke();
  }
  function face(c, pts3, col, lit, n, zBias = 0) {
    const ps = pts3.map(p => P(c, p)); if (ps.some(p => !p)) return;
    const cen = mul(pts3.reduce((a, p) => add(a, p), [0, 0, 0]), 1 / pts3.length), z = viewZ(c, cen);
    const lam = .38 + .62 * Math.abs(dot(n, LDIR));
    const { rgb, k } = shadeOf(col, lit, lam, z);
    FR.geo.push({ z: z + zBias, fn: g => {
      g.beginPath(); ps.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
      g.fillStyle = rgbS(rgb); g.fill();
      if (k > .1 && k < .62) { g.globalAlpha = .55 * (1 - Math.abs(k - .36) / .26); g.fillStyle = halftoneOf(g); g.fill(); g.globalAlpha = 1; }
      inkStroke(g, k, col, lit, z);
    } });
  }
  function drawSet(g, c, set, col, alphaAt) {
    for (const it of set) {
      const a = alphaAt(it.m), lit = Math.max(.1, Math.min(1, a * 1.4)), mc = matOf(it.k === 'wall' ? 'wall' : 'box', col);
      if (it.k === 'wall') {
        const [x1, y1] = it.a, [x2, y2] = it.b, hh = it.h;
        face(c, [[x1, y1, 0], [x2, y2, 0], [x2, y2, hh], [x1, y1, hh]], mc, lit, norm([y2 - y1, x1 - x2, 0]));
      } else if (it.k === 'box') {
        const { x, y, w, d, z0 } = it, z1 = z0 + it.h, q = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
        for (let i = 0; i < 4; i++) {
          const p0 = q[i], p1 = q[(i + 1) % 4], n = norm([p1[1] - p0[1], p0[0] - p1[0], 0]);
          const cen = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (z0 + z1) / 2];
          if (dot(n, sub(c.pos, cen)) <= 0) continue; // back face
          face(c, [[p0[0], p0[1], z0], [p1[0], p1[1], z0], [p1[0], p1[1], z1], [p0[0], p0[1], z1]], mc, lit, n);
        }
        if (c.pos[2] > z1) face(c, q.map(p => [p[0], p[1], z1]), mc, Math.min(1, lit * 1.1), [0, 0, 1], -1);
      } else {
        const p = P(c, it.p), q2 = P(c, it.q); if (!p || !q2) continue;
        const z = Math.min(p[2], q2[2]), w = it.w;
        FR.geo.push({ z: z - 3, fn: g2 => {
          g2.beginPath(); g2.moveTo(p[0], p[1]); g2.lineTo(q2[0], q2[1]);
          g2.lineWidth = clamp(w * 1700 / z, .9, 3.4); g2.strokeStyle = INKL; g2.stroke();
          if (lit < .45) { g2.lineWidth *= .45; g2.strokeStyle = rgbS(lite(col), clamp(lit * 1.6, .2, 1)); g2.stroke(); }
        } });
      }
    }
  }
  // the floor: big checkered tiles, shaded by the same light (and by the echo)
  function grid(g, c, x0, y0, x1, y1, step, col, alphaAt) {
    const s = step * 2, fc = FR.pal && FR.pal.floor ? tint(FR.pal.floor, col) : mixC(col, [70, 70, 80], .35);
    for (let x = x0, i = 0; x < x1; x += s, i++) for (let y = y0, j = 0; y < y1; y += s, j++) {
      const xe = Math.min(x1, x + s), ye = Math.min(y1, y + s);
      const ps = [[x, y, 0], [xe, y, 0], [xe, ye, 0], [x, ye, 0]].map(p => P(c, p)); if (ps.some(p => !p)) continue;
      const cx = (x + xe) / 2, cy = (y + ye) / 2, z = viewZ(c, [cx, cy, 0]);
      const lit = Math.max(.1, Math.min(1, alphaAt([cx, cy]) * 1.4));
      const { rgb } = shadeOf(fc, lit, (i + j) % 2 ? .62 : .54, z);
      FR.floor.push({ z, fn: g2 => {
        g2.beginPath(); ps.forEach((p, k) => k ? g2.lineTo(p[0], p[1]) : g2.moveTo(p[0], p[1])); g2.closePath();
        g2.fillStyle = rgbS(rgb); g2.fill(); g2.lineWidth = .7; g2.strokeStyle = 'rgba(0,0,0,.35)'; g2.stroke();
      } });
    }
  }
  function actor(g, c, api, base, yaw, col, al, o = {}, st = {}) {
    if (al < .01) return;
    const q = P(c, [base[0], base[1], (base[2] || 0) + 40]); if (!q) return;
    FR.geo.push({ z: q[2] - 30, fn: g2 => actorInk(g2, c, base, yaw, col, al, o, st) });
  }
  // characters, inked: flat clothes and skin, black outlines, a rim of the scene's light
  function actorInk(g, c, base, yaw, col, al, o, st) {
    const fall = o.fall || 0, lift_ = 5.5 * Math.abs(Math.sin(fall));
    const J = place(rig(o), [base[0], base[1], (base[2] || 0) + lift_], yaw, fall);
    const fwd = rotZ([Math.cos(fall), 0, -Math.sin(fall)], yaw), up = rotZ([Math.sin(fall), 0, Math.cos(fall)], yaw);
    const side = cross(up, fwd);
    const isL = st.hair === 'long', isQ = st.helmet;
    const body = isQ ? '#2a2d35' : isL ? '#c8642a' : '#1d2738', legs = isQ ? '#1b1d23' : isL ? '#a24c1f' : '#141a26';
    const skin = '#e9b98f', hair = isL ? '#4a2412' : '#0b0d12', rim = rgbS(lite(col), .95);
    const prims = [];
    const cap = (a, b, r, fill) => prims.push({ k: 'c', a, b, r, fill });
    cap(J.shL, J.shR, 4.8, body); cap(add(J.chest, mul(up, -4)), add(J.pelvis, mul(up, 3)), 7.4, body);
    cap(J.hipL, J.hipR, 5, legs); cap(J.chest, J.neck, 3.2, skin);
    cap(J.shL, J.elL, 3.4, body); cap(J.elL, J.haL, 2.9, body); cap(J.shR, J.elR, 3.4, body); cap(J.elR, J.haR, 2.9, body);
    cap(J.hipL, J.knL, 4.5, legs); cap(J.knL, J.ftL, 3.7, legs); cap(J.hipR, J.knR, 4.5, legs); cap(J.knR, J.ftR, 3.7, legs);
    cap(J.ftL, J.toeL, 2.9, INKL); cap(J.ftR, J.toeR, 2.9, INKL);
    prims.push({ k: 'b', p: J.haL, r: 2.7 }, { k: 'b', p: J.haR, r: 2.7 });
    prims.push({ k: 'head', p: J.head, r: B.hr * (isQ ? 1.14 : 1.04) });
    if (isL) cap(add(J.head, mul(fwd, -3.5)), add(add(J.neck, mul(fwd, -5)), mul(up, -9)), 5.8, hair);
    if (st.coat) {
      const back = mul(fwd, -1), wv = st.wind || 0, fl = Math.sin(wv * 2.3) * 2 + Math.sin(wv * 3.7) * 1.2, kz = mid(J.knL, J.knR);
      prims.push({ k: 'poly', fill: '#121826', pts: [add(J.shL, mul(back, 3)), add(J.shR, mul(back, 3)), add(add(add(J.knR, mul(back, 6 + fl)), mul(side, -3)), mul(up, 3)), add(add(add(J.knL, mul(back, 6 + fl * .7)), mul(side, 3)), mul(up, 3))], z: mid(J.chest, kz) });
    }
    if (st.gun) { const hm = mid(J.haL, J.haR), dir = norm(sub(hm, J.chest)); cap(hm, add(hm, mul(dir, 15)), 2, st.gun === 'light' ? '#c9d3dc' : '#0b0d12'); }
    if (st.knife) { const dir = norm(sub(J.haR, J.elR)); cap(J.haR, add(J.haR, mul(dir, 13)), 1, '#eef6ff'); }
    for (const p of prims) { const q = P(c, p.k === 'c' ? mid(p.a, p.b) : p.k === 'poly' ? p.z : p.p); p.d = q ? q[2] : -1; }
    prims.sort((a, b) => b.d - a.d);
    g.save(); g.globalCompositeOperation = 'source-over'; g.globalAlpha = Math.min(1, al); g.lineCap = 'round'; g.lineJoin = 'round';
    for (const p of prims) {
      if (p.d < 0) continue;
      if (p.k === 'c') {
        const a = P(c, p.a), b = P(c, p.b); if (!a || !b) continue;
        const rp = Math.max(.9, p.r * c.foc / ((a[2] + b[2]) / 2));
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0] + .01, b[1]);
        g.strokeStyle = INKL; g.lineWidth = 2 * rp + 2.6; g.stroke();
        g.strokeStyle = p.fill; g.lineWidth = 2 * rp; g.stroke();
        const o2 = rp * .42; // rim light on the upper-left edge
        g.beginPath(); g.moveTo(a[0] - o2, a[1] - o2); g.lineTo(b[0] - o2 + .01, b[1] - o2);
        g.strokeStyle = rim; g.lineWidth = Math.max(.7, rp * .36); g.globalAlpha = Math.min(1, al) * .8; g.stroke(); g.globalAlpha = Math.min(1, al);
      } else if (p.k === 'b') {
        const q = P(c, p.p); if (!q) continue; const rp = p.r * c.foc / q[2];
        g.beginPath(); g.arc(q[0], q[1], rp, 0, TAU); g.fillStyle = isQ ? '#111318' : skin; g.fill(); g.strokeStyle = INKL; g.lineWidth = 1.3; g.stroke();
      } else if (p.k === 'poly') {
        const ps = p.pts.map(x => P(c, x)); if (ps.some(x => !x)) continue;
        g.beginPath(); ps.forEach((x, i) => i ? g.lineTo(x[0], x[1]) : g.moveTo(x[0], x[1])); g.closePath();
        g.fillStyle = p.fill; g.fill(); g.strokeStyle = INKL; g.lineWidth = 1.6; g.stroke();
      } else if (p.k === 'head') {
        const q = P(c, p.p); if (!q) continue;
        const rp = p.r * c.foc / q[2];
        const qb = P(c, add(p.p, mul(fwd, -p.r))) || q, qu = P(c, add(p.p, mul(up, p.r))) || q, qf = P(c, add(p.p, mul(fwd, p.r))) || q;
        let bx = qb[0] - q[0], by = qb[1] - q[1], ux = qu[0] - q[0], uy = qu[1] - q[1];
        const bl = Math.hypot(bx, by) || 1, ul = Math.hypot(ux, uy) || 1; bx /= bl; by /= bl; ux /= ul; uy /= ul;
        const facing = qf[2] < q[2];
        g.beginPath();
        if (st.hair === 'spiky') {
          for (let i = 0; i <= 28; i++) {
            const a = i / 28 * TAU, dx = Math.cos(a), dy = Math.sin(a);
            const w = Math.max(0, dx * bx + dy * by) * .7 + Math.max(0, dx * ux + dy * uy) * .5;
            const r = rp * (i % 2 === 0 ? 1.1 + w * .5 : .97 + w * .08);
            i ? g.lineTo(q[0] + dx * r, q[1] + dy * r) : g.moveTo(q[0] + dx * r, q[1] + dy * r);
          }
          g.closePath();
        } else g.arc(q[0], q[1], rp, 0, TAU);
        g.fillStyle = isQ ? '#2a2e36' : hair; g.fill(); g.strokeStyle = INKL; g.lineWidth = 1.6; g.stroke();
        const fx_ = q[0] + (qf[0] - q[0]) * .42, fy_ = q[1] + (qf[1] - q[1]) * .42;
        if (!isQ && facing) { g.beginPath(); g.arc(fx_, fy_, rp * .74, 0, TAU); g.fillStyle = skin; g.fill(); }
        g.beginPath(); g.arc(q[0], q[1], rp * 1.02, PI * 1.05, PI * 1.62); g.strokeStyle = rim; g.lineWidth = Math.max(1, rp * .22); g.stroke();
        const eyeL = P(c, add(add(p.p, mul(fwd, p.r * .86)), mul(side, p.r * .62))), eyeR = P(c, add(add(p.p, mul(fwd, p.r * .86)), mul(side, -p.r * .62)));
        if (eyeL && eyeR && (facing || isQ || st.blind)) {
          g.beginPath(); g.moveTo(eyeL[0], eyeL[1]); g.lineTo(eyeR[0], eyeR[1]);
          if (st.blind) { g.strokeStyle = INKL; g.lineWidth = rp * .62 + 2; g.stroke(); g.strokeStyle = '#efe9dc'; g.lineWidth = rp * .62; g.stroke(); }
          else if (isQ) { g.strokeStyle = INKL; g.lineWidth = rp * .45 + 2; g.stroke(); g.strokeStyle = '#ff3048'; g.lineWidth = rp * .4; g.stroke(); }
          else { for (const e of [eyeL, eyeR]) { g.beginPath(); g.arc(e[0], e[1], Math.max(.7, rp * .12), 0, TAU); g.fillStyle = INKL; g.fill(); } }
        }
      }
    }
    g.restore();
    g.globalCompositeOperation = 'lighter';
  }
  // backdrop, then floor → light pools → depth-sorted solids → glowing effects on top
  function paintBackdrop(g, W, H, bg) {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = rgbS(bg); g.fillRect(0, 0, W, H);
    const gr = g.createRadialGradient(W * .5, H * .42, 0, W * .5, H * .42, Math.max(W, H) * .7);
    gr.addColorStop(0, rgbS(mixC(bg, [255, 240, 220], .1))); gr.addColorStop(1, rgbS(bg, 0));
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.globalAlpha = .35; g.fillStyle = halftoneOf(g); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
    g.globalCompositeOperation = 'lighter';
  }
  function flush(g) {
    g.globalAlpha = 1; g.lineJoin = 'round'; g.lineCap = 'round';
    g.globalCompositeOperation = 'source-over';
    FR.floor.sort((a, b) => b.z - a.z); for (const f of FR.floor) f.fn(g);
    g.globalCompositeOperation = 'lighter'; for (const f of FR.under) f();
    g.globalCompositeOperation = 'source-over';
    FR.geo.sort((a, b) => b.z - a.z); for (const f of FR.geo) { g.globalCompositeOperation = 'source-over'; f.fn(g); }
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    for (const f of FR.ov) f();
  }

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
  const INKC = { yellow: '#ffe14d', red: '#ff3048', white: '#ffffff', cyan: '#50e1ff', amber: '#ffb040', black: '#07080b', paper: '#efe6cf' }; // comic inks
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
      id: 'open', bg: [30, 6, 12], dur: 9, chapter: 'THE LAST THING I SAW',
      words: [1, 2.2, 3.4, 4.6, 5.8, 7].map((at, i) => ({ at, text: 'ba-DUM', x: .22 + i * .11, y: .62 + (i % 2) * .1, col: INKC.red, size: .07, rot: (i % 2 ? .1 : -.12), life: 1 })),
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
        g.globalCompositeOperation = 'source-over'; g.strokeStyle = INKL; g.lineWidth = 9; g.stroke();
        g.strokeStyle = rgba([255, 214, 220], Math.min(1, a + .3)); g.lineWidth = 3.6; g.stroke(); g.globalCompositeOperation = 'lighter';
        const sweep = x0 + ((t * .35) % 1) * (x1 - x0);
        g.fillStyle = rgba(COL.white, .9); g.beginPath(); g.arc(sweep, cy, 2.4, 0, TAU); g.fill();
      },
    },
    {
      id: 'lena', pal: { wall: [176, 120, 92], box: [92, 58, 44], floor: [150, 96, 58] }, bg: [44, 24, 10], dur: 17, chapter: 'TWO YEARS AGO',
      words: [{ at: 2.2, text: '♪ plink', x: .3, y: .62, col: INKC.amber, size: .07, rot: -.1, life: 2 }, { at: 6.7, text: 'plonk ♪', x: .55, y: .7, col: INKC.amber, size: .07, rot: .08, life: 2 }, { at: 11.2, text: '♪ plink… plonk ♫', x: .42, y: .74, col: INKC.amber, size: .07, rot: -.05, life: 2.4 }],
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
        later(() => {
          g.textAlign = 'center';
          for (const n of m.notes) {
            const age = t - n.t0; if (age > 3) continue;
            const q = P(c, [n.p[0] + Math.sin(age * 2) * 12, n.p[1] - age * 10, n.p[2] + age * 38]); if (!q) continue;
            g.font = `${clamp(22 * c.foc / q[2], 8, 40)}px serif`; g.fillStyle = rgba(COL.amber, (1 - age / 3) * .9); g.fillText(n.g, q[0], q[1]);
          }
        });
        for (const d of m.dust) dot3(g, c, [d.p[0] + Math.sin(t * .3 + d.ph) * 14, d.p[1] + Math.cos(t * .23 + d.ph) * 10, d.p[2] + Math.sin(t * .5 + d.ph) * 6], COL.amber, .35 + .25 * Math.sin(t * 2 + d.ph), 1.1);
        { const q = P(c, [LENA[0], LENA[1], 70]); if (q) api.anchors.LENA = q; }
        actor(g, c, api, [LENA[0], LENA[1], 0], -PI / 2 + Math.sin(t * .8) * .04, COL.amber, flick, { t, sit: 1, piano: pianoHands(t, NOTE_T), lean: .25 + Math.sin(t * 1.7) * .06, headDown: .3 }, { hair: 'long' });
        actor(g, c, api, [ELIAS[0], ELIAS[1], 0], Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), COL.white, flick, { t: t + 1, headDown: .12 }, { hair: 'spiky', coat: true, wind: t * .6 });
        const lk = g.createLinearGradient(0, 0, W, H); lk.addColorStop(0, rgba(COL.amber, .09)); lk.addColorStop(.5, rgba(COL.amber, 0)); lk.addColorStop(1, rgba(COL.red, .05));
        later(() => { g.fillStyle = lk; g.fillRect(0, 0, W, H); });
      },
    },
    {
      id: 'night', pal: { wall: [176, 120, 92], box: [92, 58, 44], floor: [150, 96, 58] }, bg: [20, 18, 30], dur: 13, chapter: 'THE NIGHT THEY CAME', noFadeOut: true, snapAt: 9.2,
      words: [
        { at: 6, text: 'KRAKK!', x: .78, y: .4, col: INKC.white, size: .17, rot: .12, burst: INKC.red, life: 1.6 },
        { at: 6.7, text: 'tmp tmp tmp', x: .7, y: .8, col: INKC.red, size: .06, rot: -.05, life: 2 },
        { at: 10.1, text: 'tink… tink…', x: .42, y: .82, col: INKC.white, size: .06, rot: .06, life: 1.4 },
        { at: 11.4, text: 'BLAM!!', x: .5, y: .48, col: INKC.red, size: .26, rot: -.08, burst: INKC.yellow, life: 1.6 },
      ],
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
      id: 'light', bg: [14, 4, 6], dur: 12, noFadeIn: true, snapAt: 7.6,
      words: [
        { at: .4, text: 'EEEEEEEEEEEE', x: .5, y: .18, col: INKC.white, size: .06, rot: 0, life: 5 },
        { at: 3.1, text: 'thud', x: .3, y: .66, col: INKC.red, size: .08, rot: -.15 },
        { at: 4.3, text: 'THUD', x: .68, y: .58, col: INKC.red, size: .1, rot: .12 },
        { at: 6.7, text: 'hmm~ hm~ hmmm~', x: .5, y: .8, col: INKC.amber, size: .06, rot: -.04, life: 2.4 },
        { at: 8.9, text: 'THUD.', x: .5, y: .4, col: INKC.red, size: .15, rot: .06, life: 1.6 },
      ],
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
      id: 'after', pal: { wall: [150, 178, 190], box: [214, 222, 226], floor: [86, 108, 120] }, bg: [8, 14, 24], dur: 16, chapter: 'AFTER', snapAt: 14.8,
      words: [
        { at: .8, text: 'ba-dum', x: .8, y: .6, col: INKC.white, size: .07, rot: .08 }, { at: 4.7, text: 'ba-dum', x: .72, y: .7, col: INKC.white, size: .07, rot: -.06 },
        { at: 10.3, text: 'TAP', x: .55, y: .55, col: INKC.cyan, size: .14, rot: -.1 }, { at: 12.4, text: 'TAP', x: .68, y: .45, col: INKC.cyan, size: .14, rot: .1 }, { at: 14.3, text: 'TAP', x: .4, y: .5, col: INKC.cyan, size: .14, rot: -.05 },
      ],
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
        if (mq) later(() => {
          g.strokeStyle = rgba(COL.cyan, .5); g.lineWidth = 1.2; g.beginPath();
          const s = c.foc / mq[2] * 18;
          for (let i = 0; i <= 40; i++) { const u = i / 40, x = mq[0] - s + u * 2 * s, ph = (u * 2 + t * .8) % 1; const y = mq[1] - (ph > .45 && ph < .55 ? Math.sin((ph - .45) * 62) * s * .6 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }
          g.stroke();
        });
        actor(g, c, api, [690, 325, 34], 0, COL.white, Math.max(.18, echoA(650, 325, evs, t)), { t, fall: -PI / 2 }, { hair: 'spiky', blind: true });
      },
    },
    {
      id: 'listen', pal: { wall: [120, 96, 104], box: [130, 100, 70], floor: [66, 72, 86] }, bg: [6, 12, 22], dur: 18, chapter: 'TWO YEARS OF LISTENING',
      words: [
        { at: 2.4, text: 'KRA-KOOOM', x: .62, y: .16, col: INKC.white, size: .11, rot: -.06, life: 1.6 }, { at: 10.7, text: 'KRA-KOOOM', x: .38, y: .2, col: INKC.white, size: .11, rot: .06, life: 1.6 },
        ...S5.pings.map((at, i) => ({ at, text: 'PING', x: [.32, .7, .5][i], y: [.5, .42, .62][i], col: INKC.cyan, size: .08, rot: [-.1, .1, -.05][i], life: 1 })),
        ...S5.pings.map((at, i) => ({ at: at + .7, text: 'SHNK!', x: [.66, .3, .62][i], y: [.32, .55, .7][i], col: INKC.white, size: .1, rot: [.12, -.12, .08][i], burst: INKC.red, life: 1.1 })),
      ],
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
        if (flash > 0) later(() => { g.fillStyle = rgba(COL.white, flash * .18); g.fillRect(0, 0, W, H); });
      },
    },
    {
      id: 'call', pal: { wall: [100, 106, 124], box: [86, 94, 116], floor: [72, 76, 90] }, bg: [14, 22, 40], dur: 22, chapter: 'THE CALL',
      words: [
        ...[2.2, 6.4, 12.6].map(at => ({ at, text: 'kssht', x: .9, y: .1, col: INKC.yellow, size: .05, rot: .15, life: 1 })),
        { at: 8.1, text: 'BRRROOOM', x: .3, y: .62, col: INKC.white, size: .1, rot: -.05, life: 1.8 },
        { at: 19.4, text: '♪ ♪ ♪ ♪', x: .76, y: .5, col: INKC.amber, size: .08, rot: -.1, life: 2.6 },
      ],
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
        { const q = P(c, [640, 236, 82]); if (q) api.anchors.ECHO = q; }
        actor(g, c, api, [640, 236, 0], -PI / 2 + Math.sin(t * .5) * .06, COL.white, 1, { t, headDown: t < 19.3 ? .45 : lerp(.45, -.15, ease((t - 19.3) / 1.2)) }, { hair: 'spiky', coat: true, wind: t * 1.8, blind: true });
        if (flash > 0) later(() => { g.fillStyle = rgba(COL.white, flash * .15); g.fillRect(0, 0, W, H); });
        if (api.anchors) return; // comic mode: the jagged radio bubble replaces the waveform
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
      id: 'title', pal: { floor: [52, 64, 92] }, bg: [8, 12, 22], dur: 9.5, noFadeOut: true,
      lines: [],
      cues: [{ at: .4, fn: () => SFX.sonar() }, { at: 1.2, fn: () => A.boom() }],
      draw(g, t, api) {
        const { W, H } = api;
        const c = camera([640 + Math.sin(t * .2) * 30, 400 + 400 - t * 9, 250 - t * 4], [640, 400, 46], 1.0, W, H, Math.sin(t * .2) * .02);
        const evs = [.4, 2.2, 4, 5.8, 7.6].map(tt => ({ x: 640, y: 400, t: tt, v: 520, R: 1300, s: 1, k: .8 }));
        grid(g, c, 0, -400, 1280, 1200, 64, COL.cyan, mm => echoA(mm[0], mm[1], evs, t) * .8 + .04);
        echoRings(g, c, evs, t, COL.cyan);
        actor(g, c, api, [640, 400, 0], PI / 2 + Math.sin(t * .4) * .08, COL.white, 1, { t, headDown: .08 }, { hair: 'spiky', coat: true, wind: t * 1.5, blind: true, knife: true });
        if (t > 8.3) api.fx.fade = ease((t - 8.3) / 1.1);
      },
      cover(g, t, G) { // ECHO #1: LIGHTS ON
        const s = clamp(Math.min(G.w / 1100, G.h / 640), .45, 1.6), fade = t > 8.3 ? 1 - ease((t - 8.3) / 1.1) : 1;
        const a1 = ease((t - .3) / .5), a2 = ease((t - 1.3) / .45), a3 = ease((t - 2.6) / .5), a4 = ease((t - 3.6) / .5);
        g.save(); g.globalAlpha *= fade;
        g.fillStyle = INKC.black; g.fillRect(G.x, G.y, G.w, 26 * s);
        g.font = `${15 * s}px ${BANG}`; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillStyle = INKC.yellow;
        g.fillText('PROLOGUE  ·  THE LAST THING I SAW', G.x + 14 * s, G.y + 14 * s);
        g.textAlign = 'right'; g.fillStyle = INKC.white; g.fillText('No. 1', G.x + G.w - 14 * s, G.y + 14 * s);
        // masthead
        g.save(); g.translate(G.x + 30 * s, G.y + 40 * s - (1 - a1) * 90 * s); g.globalAlpha *= a1;
        g.font = `${170 * s}px ${BANG}`; g.textAlign = 'left'; g.textBaseline = 'top'; g.lineJoin = 'round';
        g.fillStyle = INKC.red; g.fillText('ECHO', 9 * s, 9 * s);
        g.lineWidth = 12 * s; g.strokeStyle = INKC.black; g.strokeText('ECHO', 0, 0);
        g.fillStyle = INKC.yellow; g.fillText('ECHO', 0, 0);
        const mw = g.measureText('ECHO').width;
        g.restore();
        // issue badge
        g.save(); g.translate(G.x + 30 * s + mw + 110 * s, G.y + 120 * s); g.rotate(-.12); g.scale(.4 + .6 * a2, .4 + .6 * a2); g.globalAlpha *= a2;
        star(g, 112 * s, 66 * s, INKC.white, 3);
        g.fillStyle = INKC.black; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `${22 * s}px ${BANG}`; g.fillText('ISSUE #1', 0, -20 * s);
        g.font = `${38 * s}px ${BANG}`; g.fillStyle = INKC.red; g.fillText('LIGHTS ON', 0, 12 * s);
        g.restore();
        // tagline and level box
        if (a3 > 0) captionBox(g, G.x + 34 * s, G.y + G.h - 130 * s, 'They took his eyes. He kept his ears.', 24 * s, G.w * .6, { alpha: a3, rot: -.015 });
        if (a4 > 0) captionBox(g, G.x + 34 * s, G.y + G.h - 64 * s, 'LEVEL 01 — THE ARCHIVE', 26 * s, 400 * s, { alpha: a4, bang: true, bg: INKC.red, fg: INKC.white, rot: .02 });
        g.restore();
      },
    },
  ];

  // =====================================================================
  //  COMIC PAGES — every scene is an inked panel; finished panels stay on the page
  // =====================================================================
  const LET = '"Comic Neue", "Comic Sans MS", "Segoe UI", sans-serif', BANG = 'Bangers, Impact, sans-serif';
  const WHO_C = { LENA: INKC.amber, MARCUS: INKC.amber, ECHO: INKC.cyan };
  const PAGES = [
    [{ s: 0, poly: [[0, 0], [.385, 0], [.345, 1], [0, 1]] }, { s: 1, poly: [[.4, 0], [1, 0], [1, 1], [.36, 1]] }],
    [{ s: 2, poly: [[0, 0], [.6, 0], [.64, 1], [0, 1]] }, { s: 3, poly: [[.615, 0], [1, 0], [1, 1], [.655, 1]] }],
    [{ s: 4, poly: [[0, 0], [1, 0], [1, .37], [0, .43]] }, { s: 5, poly: [[0, .455], [1, .395], [1, 1], [0, 1]] }],
    [{ s: 6, poly: [[0, 0], [1, 0], [1, 1], [0, 1]] }],
    [{ s: 7, poly: [[0, 0], [1, 0], [1, 1], [0, 1]], cover: true }],
  ];
  const WHERE = []; PAGES.forEach((pg, p) => pg.forEach((pn, i) => { WHERE[pn.s] = { p, i }; }));
  function pageRect(W, H) { const m = clamp(Math.min(W, H) * .03, 8, 26); return { x: m, y: m, w: W - 2 * m, h: H - 2 * m - 22, m }; }
  function panelGeo(pn, R) {
    const pts = pn.poly.map(([u, v]) => [R.x + u * R.w, R.y + v * R.h]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x = Math.floor(Math.min(...xs)), y = Math.floor(Math.min(...ys));
    return { pts, x, y, w: Math.max(16, Math.ceil(Math.max(...xs)) - x), h: Math.max(16, Math.ceil(Math.max(...ys)) - y) };
  }
  function polyPath(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
  function dotPattern(g, col, r, step) {
    const c = document.createElement('canvas'); c.width = c.height = step;
    const x = c.getContext('2d'); x.fillStyle = col;
    for (const [px, py] of [[0, 0], [step, 0], [0, step], [step, step], [step / 2, step / 2]]) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
    return g.createPattern(c, 'repeat');
  }
  function wrapLines(g, s, maxW) {
    const out = []; let cur = '';
    for (const w of s.split(' ')) { const t2 = cur ? cur + ' ' + w : w; if (cur && g.measureText(t2).width > maxW) { out.push(cur); cur = w; } else cur = t2; }
    if (cur) out.push(cur);
    return out;
  }
  function star(g, rx, ry, col, seed = 1) {
    g.beginPath(); const n = 16;
    for (let i = 0; i <= n * 2; i++) { const a = i / (n * 2) * TAU, k = i % 2 ? .66 + rnd(i, seed) * .14 : 1; const px = Math.cos(a) * rx * k, py = Math.sin(a) * ry * k; i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.fillStyle = col; g.fill(); g.lineWidth = 3; g.lineJoin = 'round'; g.strokeStyle = INKC.black; g.stroke();
  }
  // a sound effect, lettered: pops in, holds, fades
  function sfxWord(g, x, y, w, k) {
    const size = w.size, pop = k < .08 ? 1.45 - k / .08 * .45 : 1, a = k > .72 ? 1 - (k - .72) / .28 : 1;
    if (a <= 0) return;
    g.save(); g.translate(x, y); g.rotate(w.rot || 0); g.scale(pop, pop); g.globalAlpha = a;
    g.font = `${size}px ${BANG}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    if (w.burst) star(g, g.measureText(w.text).width * .62 + size * .55, size * 1.02, w.burst, size);
    g.lineWidth = Math.max(3, size * .17); g.strokeStyle = INKC.black;
    g.fillStyle = INKC.black; g.fillText(w.text, size * .06, size * .08);
    g.strokeText(w.text, 0, 0); g.fillStyle = w.col || INKC.white; g.fillText(w.text, 0, 0);
    g.restore();
  }
  function captionBox(g, x, y, text, size, maxW, o = {}) {
    g.font = `${o.bang ? '' : '700 '}${size}px ${o.bang ? BANG : LET}`;
    const L = wrapLines(g, text, maxW), lh = size * 1.2, pad = size * .6;
    const w = Math.max(...L.map(l => g.measureText(l).width)) + pad * 2, hh = L.length * lh + pad * 1.2;
    g.save(); g.translate(x, y); g.rotate(o.rot || 0); g.globalAlpha = o.alpha ?? 1;
    g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(4, 4, w, hh);
    g.fillStyle = o.bg || INKC.yellow; g.fillRect(0, 0, w, hh);
    g.strokeStyle = INKC.black; g.lineWidth = 2.4; g.strokeRect(0, 0, w, hh);
    g.fillStyle = o.fg || INKC.black; g.textAlign = 'left'; g.textBaseline = 'middle';
    L.forEach((l, i) => g.fillText(l, pad, pad * .6 + lh * (i + .5)));
    g.restore();
    return hh;
  }
  function bubbleSize(g, text, size, maxW) {
    g.font = `700 ${size}px ${LET}`;
    const L = wrapLines(g, text, maxW), lh = size * 1.2, tw = Math.max(...L.map(l => g.measureText(l).width)), th = L.length * lh;
    return { L, lh, th, rx: tw / 2 + size * 1.15, ry: th / 2 + size * .95 };
  }
  // speech bubble with a tail; radio voices get the jagged electric outline
  function bubble(g, cx, cy, B, size, tail, o = {}) {
    const { rx, ry } = B;
    const body = () => {
      g.beginPath();
      if (o.radio) { const n = 28; for (let i = 0; i <= n; i++) { const a = i / n * TAU, k = i % 2 ? 1.1 : .95; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath(); }
      else g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    };
    const tl = () => {
      const a = Math.atan2(tail[1] - cy, tail[0] - cx), pe = a + PI / 2, b = size * .55;
      const bx = cx + Math.cos(a) * rx * .7, by = cy + Math.sin(a) * ry * .7;
      g.beginPath(); g.moveTo(bx + Math.cos(pe) * b, by + Math.sin(pe) * b);
      if (o.radio) { const mx = (bx + tail[0]) / 2, my = (by + tail[1]) / 2; g.lineTo(mx + Math.cos(pe) * b * 1.3, my + Math.sin(pe) * b * 1.3); g.lineTo(mx - Math.cos(pe) * b * .3, my - Math.sin(pe) * b * .3); }
      g.lineTo(tail[0], tail[1]); g.lineTo(bx - Math.cos(pe) * b, by - Math.sin(pe) * b); g.closePath();
    };
    g.save(); g.globalAlpha = o.alpha ?? 1; g.lineJoin = 'round';
    g.lineWidth = 5; g.strokeStyle = INKC.black; body(); g.stroke(); if (tail) { tl(); g.stroke(); }
    g.fillStyle = o.bg || '#fff'; body(); g.fill(); if (tail) { tl(); g.fill(); }
    g.fillStyle = INKC.black; g.font = `700 ${size}px ${LET}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    B.L.forEach((l, i) => g.fillText(l, cx, cy - B.th / 2 + B.lh * (i + .5)));
    if (o.who) { // name tag, so nobody has to guess who's talking
      g.font = `${size * .8}px ${BANG}`; const w = g.measureText(o.who).width + size * .8, x = cx - rx * .7, y = cy - ry - size * .45;
      g.fillStyle = INKC.black; g.fillRect(x, y - size * .5, w, size); g.fillStyle = WHO_C[o.who] || INKC.white; g.textAlign = 'left'; g.fillText(o.who, x + size * .4, y + 1);
    }
    g.restore();
  }
  // chapter label, narration captions and the speech bubble for one panel at scene time t
  function drawLettering(g, sc, si, t, G, anchors) {
    const size = clamp(Math.min(G.w * .045, G.h * .046), 13, 22), maxW = Math.min(G.w * .62, 440);
    let x = G.pts[0][0] + 14, y = G.pts[0][1] + 14;
    if (sc.chapter) {
      const hh = captionBox(g, x, y, (si ? 'CHAPTER ' + String(si).padStart(2, '0') : 'PROLOGUE') + ' — ' + sc.chapter, size * .95, G.w - 40, { bang: true, bg: INKC.black, fg: INKC.yellow });
      y += hh + 8;
    }
    const seen = sc.lines.filter(l => l.at <= t);
    for (const l of seen.filter(l => !l.who).slice(-2)) {
      const age = t - l.at, k = ease(age / .25);
      y += captionBox(g, x + (1 - k) * -12, y, l.text, size, maxW, { alpha: k, rot: -.008 }) + 6;
    }
    const last = seen[seen.length - 1];
    if (last && last.who) {
      const B = bubbleSize(g, last.text, size, Math.min(G.w * .5, 360)), k = ease((t - last.at) / .2);
      const radio = last.who === 'MARCUS', an = anchors && anchors[last.who];
      if (radio) { B.rx *= 1.16; B.ry *= 1.25; } // room inside the zig-zag
      let cx, cy, tail;
      if (an) { cx = an[0] * G.w + G.x + G.w * .06; cy = an[1] * G.h + G.y - B.ry - size * 3.2; tail = [an[0] * G.w + G.x, an[1] * G.h + G.y - size * .6]; }
      else if (radio) { cx = G.x + G.w * .66; cy = G.y + G.h * .24; tail = [G.x + G.w - 8, G.y + 8]; }
      else { cx = G.x + G.w * .5; cy = G.y + G.h * .25; tail = [cx, cy + B.ry + size * 2]; }
      cx = clamp(cx, G.x + B.rx + 14, G.x + G.w - B.rx - 14); cy = clamp(cy, G.y + B.ry + size * 1.6, G.y + G.h - B.ry - 14);
      g.save(); g.translate(cx, cy); g.scale(.85 + .15 * k, .85 + .15 * k); g.translate(-cx, -cy);
      bubble(g, cx, cy, B, size, tail, { radio, who: last.who, alpha: k, bg: radio ? '#fff6c8' : '#fff' });
      g.restore();
    }
  }
  function drawWords(g, sc, t, G) {
    for (const w of sc.words || []) {
      const life = w.life || 1.3, k = (t - w.at) / life; if (k < 0 || k > 1) continue;
      sfxWord(g, G.x + w.x * G.w, G.y + w.y * G.h, { ...w, size: w.size * Math.min(G.h, G.w * 1.2) }, k);
    }
  }

  const CSS = `
  .pr-root{position:fixed;inset:0;z-index:50;background:#0b0c10;cursor:pointer;color:#07080b;
    font-family:Rajdhani,"Segoe UI",sans-serif;opacity:1;transition:opacity .9s ease;user-select:none;overflow:hidden}
  .pr-root.pr-in{animation:prFade 1s ease}
  .pr-root.pr-leave{opacity:0}
  .pr-canvas{position:absolute;inset:0;width:100%;height:100%}
  .pr-hint{position:absolute;right:min(3vmin,24px);bottom:max(calc(min(3vmin,26px) * .4 + 1px),4px);z-index:3;font:15px Bangers,Impact,sans-serif;letter-spacing:1px;
    color:#07080b;display:flex;align-items:center;gap:8px;height:20px}
  .pr-hint svg{width:16px;height:16px}
  @keyframes prFade{from{opacity:0}to{opacity:1}}
  `;

  function lineState(sc, t) {
    const L = sc.lines;
    for (let i = L.length - 1; i >= 0; i--) {
      const ln = L[i]; if (t < ln.at) continue;
      const end = i + 1 < L.length ? L[i + 1].at - .15 : sc.dur - .3;
      if (t > end) return null;
      return { ...ln, i, typing: (t - ln.at) * 30 < ln.text.length };
    }
    return null;
  }
  function SkipRing({ k }) {
    const r = 9, c = 2 * PI * r;
    return h('svg', { viewBox: '0 0 22 22' },
      h('circle', { cx: 11, cy: 11, r, fill: 'none', stroke: 'rgba(7,8,11,.25)', strokeWidth: 2 }),
      h('circle', { cx: 11, cy: 11, r, fill: 'none', stroke: '#07080b', strokeWidth: 3, strokeDasharray: c, strokeDashoffset: c * (1 - k), transform: 'rotate(-90 11 11)' }));
  }

  // ---------- post: bloom and grain for the art inside a panel ----------
  function makePost() {
    const mk = () => document.createElement('canvas');
    const buf = mk(), b1 = mk(), b2 = mk(), art = mk();
    const grain = mk(); grain.width = grain.height = 200;
    const gx = grain.getContext('2d'), id = gx.createImageData(200, 200);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gx.putImageData(id, 0, 0);
    return { buf, bx: buf.getContext('2d'), b1, b1x: b1.getContext('2d'), b2, b2x: b2.getContext('2d'), art, ax: art.getContext('2d'), grain };
  }
  function fitPost(post, w, hh, d) {
    const W2 = Math.round(w * d), H2 = Math.round(hh * d);
    if (post.buf.width === W2 && post.buf.height === H2) return;
    post.buf.width = post.art.width = W2; post.buf.height = post.art.height = H2;
    post.b1.width = Math.ceil(w / 4); post.b1.height = Math.ceil(hh / 4);
    post.b2.width = Math.ceil(w / 10); post.b2.height = Math.ceil(hh / 10);
  }
  function composite(ctx, post, W, H, d, fx) {
    const { buf, b1, b1x, b2, b2x } = post;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, buf.width, buf.height);
    ctx.drawImage(buf, 0, 0);
    b1x.globalCompositeOperation = 'copy'; b1x.filter = 'blur(2px)'; b1x.drawImage(buf, 0, 0, b1.width, b1.height);
    b2x.globalCompositeOperation = 'copy'; b2x.filter = 'blur(2px)'; b2x.drawImage(b1, 0, 0, b2.width, b2.height);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .22; ctx.drawImage(b1, 0, 0, buf.width, buf.height);
    ctx.globalAlpha = .3; ctx.drawImage(b2, 0, 0, buf.width, buf.height);
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
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .3, W / 2, H / 2, Math.max(W, H) * .75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    if (fx.fade > 0) { ctx.fillStyle = `rgba(0,0,0,${fx.fade})`; ctx.fillRect(0, 0, W, H); }
  }

  function Prologue({ onDone }) {
    const [skipK, setSkipK] = useState(0);
    const [leaving, setLeaving] = useState(false);
    const canvasRef = useRef(null);
    const st = useRef(null);

    useEffect(() => {
      const cv = canvasRef.current, ctx = cv.getContext('2d'), post = makePost();
      const paperDots = dotPattern(ctx, 'rgba(120,90,40,.13)', 1.1, 7), halftone = dotPattern(ctx, 'rgba(0,0,0,.55)', 1.15, 4.5);
      const s = st.current = { si: 0, t0: performance.now(), fired: new Set(), exit: null, done: false, spaceDown: null, mem: {}, last: 0, snaps: {}, pageT0: performance.now(), anchors: {} };
      const snap = () => {
        if (s.snaps[s.si] || !post.art.width) return;
        const c2 = document.createElement('canvas'); c2.width = post.art.width; c2.height = post.art.height; c2.getContext('2d').drawImage(post.art, 0, 0);
        s.snaps[s.si] = { img: c2, t: s.last, anchors: { ...s.anchors } };
      };
      const finish = () => {
        if (s.done) return; s.done = true;
        if (s.exit) s.exit(); s.exit = null;
        if (window.echoVoiceStop) window.echoVoiceStop();
        setLeaving(true); setTimeout(onDone, 900);
      };
      const go = n => {
        if (s.done) return;
        if (s.exit) s.exit(); s.exit = null;
        if (n >= SCENES.length) return finish();
        snap(); // a skipped panel still keeps its picture on the page
        delete s.snaps[n]; // re-entering a scene redraws its panel
        if (WHERE[n].p !== WHERE[s.si].p) s.pageT0 = performance.now();
        s.si = n; s.t0 = performance.now(); s.fired = new Set(); s.mem = {}; s.last = 0; s.spoken = new Set(); s.anchors = {}; s.panelT0 = performance.now();
        if (window.echoVoiceStop) window.echoVoiceStop();
        if (SCENES[n].enter) s.exit = SCENES[n].enter(s.mem) || null;
      };
      s.go = go; s.finish = finish;
      go(0);
      // dev hook: jump to (scene, time) and optionally hold the frame
      window.__prSeek = (n, tt, hold) => { go(n); s.t0 = performance.now() - tt * 1000; s.last = tt; s.hold = hold ? tt : null; };

      const size = () => {
        s.dpr = Math.min(devicePixelRatio || 1, 2);
        // never 0×0 (a hidden or minimised window would make drawImage throw and kill the loop)
        cv.width = Math.max(16, innerWidth) * s.dpr; cv.height = Math.max(16, innerHeight) * s.dpr;
      };
      size(); addEventListener('resize', size);

      const ink = (g, pts) => { g.lineJoin = 'miter'; polyPath(g, pts); g.lineWidth = 4.5; g.strokeStyle = INKC.black; g.stroke(); };
      const artIn = (g, img, G) => {
        g.save(); polyPath(g, G.pts); g.clip();
        g.drawImage(img, G.x, G.y, G.w, G.h);
        g.globalAlpha = .28; g.fillStyle = halftone; g.fillRect(G.x, G.y, G.w, G.h);
        g.restore();
      };

      let raf;
      const loop = now => {
        if (s.hold != null) s.t0 = now - s.hold * 1000;
        const sc = SCENES[s.si], tt = (now - s.t0) / 1000, dt = Math.min(.05, Math.max(0, tt - s.last)); s.last = tt;
        sc.cues.forEach((c, i) => { if (tt >= c.at && !s.fired.has(i)) { s.fired.add(i); try { c.fn(); } catch (e) {} } });
        // voice: each line is spoken once, as it appears (narration is Elias)
        const vl = lineState(sc, tt);
        if (vl && !s.spoken.has(vl.i) && tt - vl.at < .4) { s.spoken.add(vl.i); if (window.echoSpeak) window.echoSpeak(vl.who || 'ECHO', vl.text, { ch: 'prologue' }); }

        const W = Math.max(16, innerWidth), H = Math.max(16, innerHeight), d = s.dpr, R = pageRect(W, H);
        const wh = WHERE[s.si], page = PAGES[wh.p], G = panelGeo(page[wh.i], R);
        // 1. the scene's art, rendered at panel size
        fitPost(post, G.w, G.h, d);
        const g = post.bx;
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
        g.fillStyle = '#000'; g.fillRect(0, 0, post.buf.width, post.buf.height);
        g.setTransform(d, 0, 0, d, 0, 0); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
        const fx = { glitch: 0, white: 0, fade: 0 }, anchors = {};
        frameReset(sc.bg, sc.pal); paintBackdrop(g, G.w, G.h, sc.bg || [0, 0, 0]);
        try { sc.draw(g, tt, { W: G.w, H: G.h, dpr: d, dt, m: s.mem, fx, anchors, currentLine: vl }); flush(g); } catch (e) { console.error(e); }
        for (const k in anchors) if (anchors[k]) s.anchors[k] = [anchors[k][0] / G.w, anchors[k][1] / G.h];
        if (!sc.noFadeIn) fx.fade = Math.max(fx.fade, 1 - ease(tt / .45));
        composite(post.ax, post, G.w, G.h, d, fx);
        if (tt >= (sc.snapAt ?? sc.dur - 1)) snap();

        // 2. the page
        ctx.setTransform(d, 0, 0, d, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
        const pk = ease((now - s.pageT0) / 520);
        ctx.save(); ctx.globalAlpha = pk; ctx.translate((1 - pk) * W * .25, 0); ctx.rotate((1 - pk) * .03);
        const pm = R.m * .6;
        ctx.fillStyle = INKC.paper; ctx.fillRect(R.x - pm, R.y - pm, R.w + pm * 2, R.h + pm * 2 + 22);
        ctx.fillStyle = paperDots; ctx.fillRect(R.x - pm, R.y - pm, R.w + pm * 2, R.h + pm * 2 + 22);
        page.forEach((pn, i) => {
          const Gi = panelGeo(pn, R), si = pn.s, sci = SCENES[si];
          if (i < wh.i) {
            const sn = s.snaps[si]; if (!sn) return;
            artIn(ctx, sn.img, Gi); ink(ctx, Gi.pts);
            drawLettering(ctx, sci, si, sn.t, Gi, sn.anchors);
          } else if (i === wh.i) {
            const k = ease((now - s.panelT0) / 380);
            ctx.save(); ctx.globalAlpha *= k;
            const cx = Gi.x + Gi.w / 2, cy = Gi.y + Gi.h / 2; ctx.translate(cx, cy); ctx.scale(.94 + .06 * k, .94 + .06 * k); ctx.translate(-cx, -cy);
            artIn(ctx, post.art, Gi); ink(ctx, Gi.pts);
            if (pn.cover && sci.cover) sci.cover(ctx, tt, Gi);
            else { drawWords(ctx, sci, tt, Gi); drawLettering(ctx, sci, si, tt, Gi, s.anchors); }
            ctx.restore();
          } else { ctx.save(); ctx.setLineDash([6, 6]); polyPath(ctx, Gi.pts); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(7,8,11,.18)'; ctx.stroke(); ctx.restore(); }
        });
        if (!page[0].cover) { // page number
          ctx.fillStyle = INKC.black; ctx.font = `${clamp(R.m * .7, 10, 16)}px ${BANG}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(String(wh.p + 1), R.x + R.w / 2, R.y + R.h + pm + 11);
          ctx.textAlign = 'left'; ctx.fillText('ECHO #1 · PROLOGUE', R.x, R.y + R.h + pm + 11);
        }
        ctx.restore();

        if (s.spaceDown) { const k = Math.min(1, (now - s.spaceDown) / 900); setSkipK(k); if (k >= 1) finish(); }
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

    return h('div', { className: 'pr-root pr-in' + (leaving ? ' pr-leave' : ''), onMouseDown: () => st.current && st.current.go(st.current.si + 1) },
      h('canvas', { ref: canvasRef, className: 'pr-canvas' }),
      h('div', { className: 'pr-hint' }, 'CLICK — NEXT PANEL   ·   HOLD SPACE — SKIP', h(SkipRing, { k: skipK })));
  }

  // ---------- public API ----------
  let root = null, host = null;
  // give every voiced line room to finish: push later lines back and stretch the scene if needed
  function voiceRetime() {
    const V = window.VO_LINES; if (!V) return;
    for (const sc of SCENES) {
      if (!sc.lines || !sc.lines.length) continue;
      sc.dur0 = sc.dur0 ?? sc.dur;
      let shift = 0, prevEnd = 0;
      for (const ln of sc.lines) {
        ln.at0 = ln.at0 ?? ln.at;
        let at = ln.at0 + shift;
        if (at < prevEnd) { shift += prevEnd - at; at = prevEnd; }
        ln.at = at;
        const e = V[(ln.who || 'ECHO') + '|' + ln.text];
        prevEnd = at + (e ? e.d : 1.5) + .35;
      }
      sc.dur = Math.max(sc.dur0, prevEnd + .6);
    }
  }
  window.EchoPrologue = {
    play(onDone) {
      voiceRetime();
      if (!document.getElementById('pr-style')) { const st = document.createElement('style'); st.id = 'pr-style'; st.textContent = CSS; document.head.appendChild(st); }
      host = document.createElement('div'); host.id = 'prologue-root'; document.body.appendChild(host);
      root = ReactDOM.createRoot(host);
      root.render(h(Prologue, {
        onDone: () => { const r = root, hh = host; root = host = null; setTimeout(() => { r.unmount(); hh.remove(); }, 0); onDone && onDone(); },
      }));
    },
  };
})();
