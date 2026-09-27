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
        g.strokeStyle = rgba(core, 1); g.lineWidth = 2 * rp + 2.2; g.stroke();
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
