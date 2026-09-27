p = 'prologue.js'
s = open(p, encoding='utf-8').read()
L = s.split('\n')
a = next(i for i, l in enumerate(L) if l.startswith('  // ---------- characters (top-down'))
b = next(i for i, l in enumerate(L) if l.startswith('  // ---------- particles'))
L[a:b] = open('assets/prologue_actors.js', encoding='utf-8').read().rstrip('\n').split('\n') + ['']
s = '\n'.join(L)

def rep(old, new):
    global s
    assert s.count(old) == 1, old[:90]
    s = s.replace(old, new)

# Elias's route through the alley: he dashes to each man he hears
rep("  const LENA = [375, 306], ELIAS = [760, 372];",
"""  const LENA = [375, 295], ELIAS = [760, 372];
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
  }""")

# --- scene 1: Lena at the piano, Elias watching
rep("""        fig3(g, c, api, LENA[0], LENA[1], 55, -PI / 2 + Math.sin(t * 1.7) * .07, COL.amber, flick, { kind: 'lena', arms: 'piano' });
        fig3(g, c, api, ELIAS[0], ELIAS[1], 68, Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), COL.white, flick, { kind: 'elias', arms: 'side' });""",
"""        actor(g, c, api, [LENA[0], LENA[1], 0], -PI / 2 + Math.sin(t * .8) * .04, COL.amber, flick, { t, sit: 1, piano: pianoHands(t, NOTE_T), lean: .25 + Math.sin(t * 1.7) * .06, headDown: .3 }, { hair: 'long' });
        actor(g, c, api, [ELIAS[0], ELIAS[1], 0], Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), COL.white, flick, { t: t + 1, headDown: .12 }, { hair: 'spiky', coat: true, wind: t * .6 });""")

# --- scene 2: the door breaks
rep("""        const foes = [[930, 300], [930, 450], [860, 375]].map(([x, y], i) => {
          const k = ease((t - 6.3 - i * .25) / 1.8); if (t < 6.3) return null;
          const px = lerp(1080, x, k), py = lerp(375, y, k), a = Math.atan2(ELIAS[1] - py, ELIAS[0] - px);
          return { px, py, a };
        }).filter(Boolean);""",
"""        const foes = [[930, 300], [930, 450], [860, 375]].map(([x, y], i) => {
          const t0 = 6.3 + i * .25; if (t < t0) return null;
          const u = clamp((t - t0) / 1.9, 0, 1), k = easeIO(u), D = Math.hypot(x - 1080, y - 375);
          const px = lerp(1080, x, k), py = lerp(375, y, k), a = Math.atan2(ELIAS[1] - py, ELIAS[0] - px);
          return { px, py, a, ph: k * D * PI / 21, stride: u < 1 ? Math.min(1, u * 6) : Math.max(0, 1 - (t - t0 - 1.9) * 4) };
        }).filter(Boolean);""")
rep("""        fig3(g, c, api, LENA[0], LENA[1], 55, -PI / 2 + (t > 6.2 ? ease((t - 6.2) / .5) * 1.9 : 0), COL.amber, .95, { kind: 'lena', arms: t < 5.5 ? 'piano' : 'side' });
        const e0 = Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]);
        fig3(g, c, api, ELIAS[0], ELIAS[1], 68, t < 6.1 ? e0 : lerp(e0 + TAU, 0, ease((t - 6.1) / .4)), COL.white, .95, { kind: 'elias', arms: t > 6.3 ? 'gun' : 'side' });
        for (const f of foes) fig3(g, c, api, f.px, f.py, 64, f.a, COL.red, 1, { kind: 'enemy', arms: 'gun' });""",
"""        const up_ = ease((t - 6.25) / .7), toDoor = Math.atan2(375 - LENA[1], 1040 - LENA[0]);
        const lenaPose = t < 5.6 ? { t, sit: 1, piano: pianoHands(t, [.3, .9, 1.5, 2.1, 3.4, 4.0]), lean: .25, headDown: .3 } : { t, sit: 1 - up_, lean: .2 * (1 - up_), headDown: .3 * (1 - up_), twist: -.2 * up_ };
        actor(g, c, api, [LENA[0] + 6 * up_, LENA[1] + 14 * up_, 0], lerp(-PI / 2, toDoor, ease((t - 6.2) / .6)), COL.amber, .95, lenaPose, { hair: 'long' });
        const e0 = Math.atan2(LENA[1] - ELIAS[1], LENA[0] - ELIAS[0]), aimK = ease((t - 6.3) / .35);
        actor(g, c, api, [ELIAS[0] - 8 * aimK, ELIAS[1], 0], t < 6.1 ? e0 : lerp(e0 + TAU, .02, ease((t - 6.1) / .4)), COL.white, .95, { t: t + 1, aim: aimK, lean: .15 * aimK, headDown: .12 * (1 - aimK) }, { hair: 'spiky', coat: true, wind: t * .6, gun: aimK > .2 ? 'light' : null });
        for (const f of foes) actor(g, c, api, [f.px, f.py, 0], f.a, COL.red, 1, { t: t + f.px, walk: f.ph, stride: f.stride, aim: .9 }, { helmet: true, gun: 'dark' });""")

# --- scene 4: blind in the hospital bed
rep("""        fig3(g, c, api, 640, 325, 44, PI, COL.white, Math.max(.16, echoA(650, 325, evs, t)), { kind: 'elias', arms: 'side', blind: true });""",
"""        actor(g, c, api, [690, 325, 34], 0, COL.white, Math.max(.18, echoA(650, 325, evs, t)), { t, fall: -PI / 2 }, { hair: 'spiky', blind: true });""")

# --- scene 5: the alley
rep("""        const c = camera([640 + Math.sin(th) * 280, 400 + Math.cos(th) * 280, 330 + Math.sin(t * .4) * 12], [640, 400, 30], 1.0, W, H);""",
"""        const EL = eliasS5(t);
        if (!m.cf) m.cf = [...EL.pos]; m.cf[0] = lerp(m.cf[0], EL.pos[0], Math.min(1, api.dt * 2.5)); m.cf[1] = lerp(m.cf[1], EL.pos[1], Math.min(1, api.dt * 2.5));
        const c = camera([m.cf[0] + Math.sin(th) * 290, m.cf[1] + Math.cos(th) * 290, 330 + Math.sin(t * .4) * 12], [m.cf[0], m.cf[1], 30], 1.0, W, H);""")
rep("""        const pings = S5.pings.map(tt => ({ x: 640, y: 400, t: tt, v: 800, R: 800, s: 1, k: 1.1 }));""",
"""        const pings = S5.pings.map((tt, i) => ({ x: S5P[i][0], y: S5P[i][1], t: tt, v: 800, R: 800, s: 1, k: 1.1 }));""")
rep("""        let face = -PI / 2 + Math.sin(t * .6) * .4, reach = 0;
        S5.foes.forEach(([x, y], i) => {
          const p = S5.pings[i], hitT = p + Math.hypot(x - 640, y - 400) / 800, cut = p + .7;
          if (t < hitT && flash < .3) return;
          const aim = Math.atan2(y - 400, x - 640);
          if (t > p + .45 && t < cut + .6) { face = aim; reach = clamp((t - (p + .45)) / .25, 0, 1); }
          if (t < cut) fig3(g, c, api, x, y, 64, aim + PI, COL.red, Math.max(flash, t >= hitT ? Math.exp(-(t - hitT) * .8) : 0), { kind: 'enemy', arms: 'gun' });
          else {
            if (!m.cut[i]) { m.cut[i] = true; burst(m.sp, [x, y, 60], 40, COL.red, 320, 200, 1.2, { drag: 3 }); burst(m.sp, [x, y, 60], 18, COL.white, 600, 150, .35, { streak: true }); }
            const k = t - cut, fa = Math.max(Math.exp(-k * .45), flash * .8);
            pool(g, c, api, x, y, COL.red, .22 * fa, 50 * ease(k));
            fig3(g, c, api, x, y, 4, aim, COL.red, fa, { fallen: true });
            if (k < .3) ring3(g, c, 640, 400, 60, 70, COL.cyan, 1 - k / .3, 3, aim - .9 + k * 2, aim + .5 + k * 2);
          }
        });
        stepParts(m.sp, api.dt, 500); drawParts(g, c, m.sp);
        fig3(g, c, api, 640, 400, 66, face, COL.white, 1, { kind: 'elias', arms: reach > 0 ? 'knife' : 'side', reach, wind: t * 3, blind: true });""",
"""        if (m.face == null) m.face = -PI / 2;
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
        actor(g, c, api, [EL.pos[0], EL.pos[1], 0], m.face, COL.white, 1, { t, walk: EL.ph, stride: EL.moving ? 1.3 : 0, lean: EL.moving ? .6 : .1, slash, headDown: slash < 0 && !EL.moving ? .05 + Math.sin(t * .7) * .08 : 0, twist: slash >= 0 ? Math.sin(clamp(slash, 0, 1) * PI) * .4 : Math.sin(t * .6) * .12 }, { hair: 'spiky', coat: true, wind: t * 2.2 + (EL.moving ? t * 6 : 0), blind: true, knife: true });""")

# --- scene 6: the rooftop
rep("""        fig3(g, c, api, 640, 236, 66, -PI / 2 + Math.sin(t * .5) * .08, COL.white, 1, { kind: 'elias', arms: 'side', wind: t * 3, blind: true });""",
"""        actor(g, c, api, [640, 236, 0], -PI / 2 + Math.sin(t * .5) * .06, COL.white, 1, { t, headDown: t < 19.3 ? .45 : lerp(.45, -.15, ease((t - 19.3) / 1.2)) }, { hair: 'spiky', coat: true, wind: t * 1.8, blind: true });""")

# helpers used above
rep("  const vl = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];",
    "  const vl = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];\n  const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > PI) d -= TAU; if (d < -PI) d += TAU; return d; };")

assert 'fig3(' not in s and 'function figure' not in s
open(p, 'w', encoding='utf-8').write(s)
print('ok')
