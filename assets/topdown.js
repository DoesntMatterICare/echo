// ---------- characters: true top-down, rim-lit (same design language as the key art) ----------
// Each body part sits at its own height and gets the same camera parallax as the walls,
// so the head reads as closer to the camera than the feet.
const BODY = '#05080c';
const RIM = {
  player: { core: 'rgba(236,249,255,1)', glow: [80, 225, 255] },
  enemy: { core: 'rgba(255,190,200,1)', glow: [255, 48, 72] },
  hurt: { core: 'rgba(255,255,255,1)', glow: [255, 90, 110] },
};
const HGT = { hip: .014, sh: .03, head: .046 };
let RC = RIM.player;
function lift(x, y, h) { return [x + (x - cam.x) * h, y + (y - cam.y) * h]; }
function rimPath(lw) {
  ctx.strokeStyle = rgba(RC.glow, .3); ctx.lineWidth = (lw || 1.6) + 3.6; ctx.stroke();
  ctx.strokeStyle = RC.core; ctx.lineWidth = lw || 1.6; ctx.stroke();
}
function body(fill, lw) { ctx.fillStyle = fill || BODY; ctx.fill(); rimPath(lw); }
function tube(p, w) {
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  if (p.length === 3) ctx.quadraticCurveTo(p[1][0], p[1][1], p[2][0], p[2][1]); else ctx.lineTo(p[1][0], p[1][1]);
  ctx.strokeStyle = rgba(RC.glow, .28); ctx.lineWidth = w + 5.4; ctx.stroke();
  ctx.strokeStyle = RC.core; ctx.lineWidth = w + 2.6; ctx.stroke();
  ctx.strokeStyle = BODY; ctx.lineWidth = w; ctx.stroke();
}
function hand(x, y) { ctx.beginPath(); ctx.arc(x, y, 2.7, 0, TAU); body(null, 1.1); }
// kept for dropped-weapon drawing and older helpers
function outlineFill(C, lw) { ctx.fillStyle = DARK; ctx.fill(); ctx.strokeStyle = C; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
function gunShape(w) {
  ctx.beginPath();
  switch (w) {
    case 'pistol': ctx.rect(10, -2, 13, 4); break;
    case 'shotgun': ctx.rect(1, -2, 30, 4); ctx.rect(16, -3.2, 7, 6.4); break;
    case 'smg': ctx.rect(6, -2.4, 20, 4.4); ctx.rect(13, 2, 3.4, 7); break;
    case 'rifle': ctx.rect(0, -2, 33, 4); ctx.rect(12, -4.4, 7, 2.6); break;
    case 'heavygun': ctx.rect(0, -4, 29, 8); break;
  }
}

const GUN = {
  pistol: { grip: 15, len: 12, wd: 2.4 }, shotgun: { grip: 11, len: 27, wd: 2.8 }, smg: { grip: 13, len: 17, wd: 3 },
  rifle: { grip: 10, len: 31, wd: 2.6 }, heavygun: { grip: 10, len: 26, wd: 4.6 },
};
const KSCALE = { player: 1, hunter: 1, gunner: 1.02, assassin: .92, heavy: 1.3 };
const HALFW = { player: 15.5, hunter: 15.5, gunner: 15.5, assassin: 13.5, heavy: 18 };

function drawGunTop(wp, G, light) {
  const L = G.len, d = G.wd, fill = light ? '#d6e3ec' : BODY;
  const edge = () => { if (light) { ctx.strokeStyle = 'rgba(10,16,22,1)'; ctx.lineWidth = .8; ctx.stroke(); ctx.strokeStyle = rgba(RC.glow, .45); ctx.lineWidth = 2.6; ctx.globalCompositeOperation = 'destination-over'; ctx.stroke(); ctx.globalCompositeOperation = 'source-over'; } else rimPath(1.1); };
  ctx.beginPath();
  switch (wp) {
    case 'pistol': ctx.rect(-2, -d, L + 2, 2 * d); break;
    case 'shotgun': ctx.moveTo(-12, -d - .6); ctx.lineTo(-2, -d); ctx.lineTo(L, -d); ctx.lineTo(L, d); ctx.lineTo(-2, d); ctx.lineTo(-12, d + .6); ctx.closePath(); break;
    case 'smg': ctx.rect(-5, -d, L + 5, 2 * d); break;
    case 'rifle': ctx.moveTo(-12, -d - .4); ctx.lineTo(-2, -d); ctx.lineTo(L, -d * .8); ctx.lineTo(L, d * .8); ctx.lineTo(-2, d); ctx.lineTo(-12, d + .4); ctx.closePath(); break;
    case 'heavygun': ctx.rect(-8, -d, L + 8, 2 * d); break;
  }
  ctx.fillStyle = fill; ctx.fill(); edge();
  ctx.beginPath();
  if (wp === 'shotgun') ctx.rect(L * .42, -d - 1.2, 7, 2 * d + 2.4);
  if (wp === 'smg') ctx.rect(4, d, 3.2, 6);
  if (wp === 'rifle') ctx.rect(3, -d - 2.6, 9, 2.6);
  if (wp === 'heavygun') ctx.rect(L * .35, -d - 1.6, 8, 2 * d + 3.2);
  ctx.fillStyle = fill; ctx.fill(); edge();
  // slide / barrel line
  ctx.strokeStyle = light ? 'rgba(20,30,40,.8)' : rgba(RC.glow, .55); ctx.lineWidth = .8;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L - 1, 0); ctx.stroke();
}

function drawTorso(k) {
  const w = HALFW[k], d = k === 'heavy' ? 10 : 8;
  ctx.beginPath();
  ctx.moveTo(d * .6, -w * .55);
  ctx.quadraticCurveTo(d * 1.05, -w * .95, d * .1, -w);
  ctx.quadraticCurveTo(-d * 1.1, -w * .95, -d, -w * .35);
  ctx.quadraticCurveTo(-d * 1.25, 0, -d, w * .35);
  ctx.quadraticCurveTo(-d * 1.1, w * .95, d * .1, w);
  ctx.quadraticCurveTo(d * 1.05, w * .95, d * .6, w * .55);
  ctx.quadraticCurveTo(d * 1.15, 0, d * .6, -w * .55);
  ctx.closePath();
  const g = ctx.createRadialGradient(-1, 0, 1, 0, 0, w);
  g.addColorStop(0, '#17222c'); g.addColorStop(.6, '#0a1016'); g.addColorStop(1, '#030507');
  ctx.fillStyle = g; ctx.fill(); rimPath(1.7);
  ctx.strokeStyle = rgba(RC.glow, .6); ctx.lineWidth = .9; ctx.beginPath();
  if (k !== 'heavy') { // collar and lapels opening toward the front
    ctx.moveTo(d * .7, -w * .45); ctx.lineTo(1.5, -3.2); ctx.lineTo(d * .8, 0);
    ctx.moveTo(d * .7, w * .45); ctx.lineTo(1.5, 3.2); ctx.lineTo(d * .8, 0);
  }
  ctx.moveTo(-2.5, -w * .74); ctx.quadraticCurveTo(1.5, -w * .84, 4.5, -w * .64);
  ctx.moveTo(-2.5, w * .74); ctx.quadraticCurveTo(1.5, w * .84, 4.5, w * .64);
  ctx.moveTo(-d * .98, 0); ctx.lineTo(-d * .35, 0);
  if (k === 'heavy') { ctx.moveTo(-7, -w * .52); ctx.lineTo(7, -w * .52); ctx.moveTo(-7, w * .52); ctx.lineTo(7, w * .52); ctx.rect(-5, -5, 9, 10); }
  if (k === 'gunner') { ctx.moveTo(-6, -w * .45); ctx.quadraticCurveTo(-8, 0, -6, w * .45); }
  ctx.stroke();
}

function drawArmsWeapon(o, k) {
  const w = HALFW[k], wp = o.weapon;
  const shL = [1, -w * .78], shR = [1, w * .78];
  const G = GUN[wp];
  if (G) {
    const rk = -(o.recoil || 0) * (wp === 'shotgun' || wp === 'heavygun' ? 6 : 3.5);
    const rl = o.reload || 0, t = rl > 0 ? Math.sin(rl * PI) : 0;
    const gx = G.grip + rk - t * 3, drop = t * 4;
    ctx.save(); ctx.translate(gx, drop); ctx.rotate(t * .75);
    drawGunTop(wp, G, o.rim !== 'enemy');
    ctx.restore();
    const hR = [gx, 1.6 + drop];
    let hL = wp === 'pistol' ? [gx + 1.5, -1.6 + drop] : [gx + G.len * .45, -1 + drop];
    if (t > 0) hL = [lerp(hL[0], gx - 3, t), lerp(hL[1], 7, t)];
    tube([shL, [shL[0] + 7, shL[1] * .5], hL], 4.4);
    tube([shR, [shR[0] + 7, shR[1] * .5], hR], 4.4);
    hand(hL[0], hL[1]); hand(hR[0], hR[1]);
    return;
  }
  if (wp === 'knife') {
    const sw = o.swing ?? -1, ang = sw >= 0 ? lerp(1.1, -1.5, easeOut(sw)) : .5;
    const hx = shR[0] + Math.cos(ang) * 15, hy = shR[1] + Math.sin(ang) * 15 - 5;
    tube([shL, [8, -w * .8], [12, -5]], 4.4); hand(12, -5);
    tube([shR, [shR[0] + Math.cos(ang) * 8 + 2, shR[1] + Math.sin(ang) * 8], [hx, hy]], 4.4);
    const ba = ang - .55;
    ctx.beginPath(); ctx.moveTo(hx + Math.cos(ba + 1.57) * 1.6, hy + Math.sin(ba + 1.57) * 1.6);
    ctx.lineTo(hx + Math.cos(ba) * 14, hy + Math.sin(ba) * 14); ctx.lineTo(hx - Math.cos(ba + 1.57) * 1.6, hy - Math.sin(ba + 1.57) * 1.6); ctx.closePath();
    ctx.fillStyle = '#e4f0f7'; ctx.fill(); ctx.strokeStyle = rgba(RC.glow, .5); ctx.lineWidth = 1; ctx.stroke();
    hand(hx, hy);
    return;
  }
  if (wp === 'bat') {
    const sw = o.swing ?? -1, wu = o.windup || 0;
    const ang = sw >= 0 ? lerp(2.4, -1.3, easeOut(sw)) : lerp(2.3, 2.95, easeOut(wu));
    const hx = 9 + Math.cos(ang * .5) * 4, hy = 7 + Math.sin(ang * .5) * 3;
    tube([shL, [6, -4], [hx - 1, hy - 1.5]], 4.4);
    tube([shR, [5, w * .9], [hx, hy]], 4.4);
    const bx = hx + Math.cos(ang) * 30, by = hy + Math.sin(ang) * 30, pa = ang + PI / 2;
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(pa) * 1.6, hy + Math.sin(pa) * 1.6); ctx.lineTo(bx + Math.cos(pa) * 3.8, by + Math.sin(pa) * 3.8);
    ctx.arc(bx, by, 3.8, pa, pa + PI); ctx.lineTo(hx - Math.cos(pa) * 1.6, hy - Math.sin(pa) * 1.6); ctx.closePath();
    body(null, 1.3);
    hand(hx, hy); hand(hx - 1, hy - 1.5);
    return;
  }
  if (wp === 'blade') {
    const fwd = o.lunge || (o.swing ?? -1) >= 0;
    for (const s of [-1, 1]) {
      const hx = fwd ? 17 : 10, hy = s * (fwd ? 5 : 8);
      tube([s < 0 ? shL : shR, [6, s * w * .9], [hx, hy]], 4);
      const tx = fwd ? hx + 13 : hx - 10, ty = fwd ? hy - s : hy + s * 6;
      ctx.beginPath(); ctx.moveTo(hx, hy - 1.4); ctx.lineTo(tx, ty); ctx.lineTo(hx, hy + 1.4); ctx.closePath();
      ctx.fillStyle = 'rgba(255,225,230,1)'; ctx.fill();
      hand(hx, hy);
    }
  }
}

function drawHeadTop(k, o) {
  if (k === 'player') {
    // ears tucked under the hair
    ctx.beginPath(); ctx.ellipse(.8, -7, 1.7, 1.2, 0, 0, TAU); ctx.moveTo(2.5, 7); ctx.ellipse(.8, 7, 1.7, 1.2, 0, 0, TAU); body(null, .9);
    // spiky crown, spikes swept back
    ctx.beginPath();
    const N = 13;
    for (let i = 0; i <= N * 2; i++) {
      const t = i / (N * 2) * TAU, back = Math.max(0, -Math.cos(t));
      const r = i % 2 === 0 ? 7.6 + back * 3.4 : 6.1 + back * .8;
      const tt = t + (i % 2 === 0 ? back * .22 * Math.sign(Math.sin(t)) : 0);
      const px = Math.cos(tt) * r, py = Math.sin(tt) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(1.5, 0, .5, 0, 0, 9); g.addColorStop(0, '#16212b'); g.addColorStop(1, '#020304');
    ctx.fillStyle = g; ctx.fill(); rimPath(1.5);
    ctx.strokeStyle = rgba(RC.glow, .55); ctx.lineWidth = .8; ctx.beginPath();
    for (const s of [-3, -1.2, .6, 2.4]) { ctx.moveTo(4, s * .5); ctx.quadraticCurveTo(-1, s * 1.4, -7, s * 2.3); }
    ctx.stroke();
    return;
  }
  if (k === 'hunter') {
    const wv = Math.sin((o.ph || 0) * 1.3) * 2;
    ctx.strokeStyle = RC.core; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-5, -1.5); ctx.quadraticCurveTo(-10, -3, -15, -3 + wv); ctx.moveTo(-5, 1.5); ctx.quadraticCurveTo(-10, 2, -16, 3 - wv); ctx.stroke();
    ctx.beginPath(); ctx.arc(1, 0, 7, 0, TAU); body(null, 1.5);
    ctx.strokeStyle = rgba(RC.glow, .75); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(1, 0, 5.2, PI * .55, PI * 1.45); ctx.stroke();
    return;
  }
  if (k === 'gunner') {
    ctx.beginPath(); ctx.arc(.5, 0, 8.2, 0, TAU); body(null, 1.6);
    ctx.strokeStyle = 'rgba(255,150,165,1)'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(.5, 0, 6, -.85, .85); ctx.stroke();
    ctx.strokeStyle = rgba(RC.glow, .6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(3, 0); ctx.stroke();
    return;
  }
  if (k === 'assassin') {
    ctx.beginPath(); ctx.moveTo(-13, 0); ctx.quadraticCurveTo(-5, -9.5, 2, -7); ctx.arc(2, 0, 7, -PI / 2, PI / 2); ctx.quadraticCurveTo(-5, 9.5, -13, 0); body(null, 1.5);
    ctx.fillStyle = 'rgba(255,215,222,1)'; ctx.beginPath(); ctx.arc(6.5, -2.4, 1.2, 0, TAU); ctx.arc(6.5, 2.4, 1.2, 0, TAU); ctx.fill();
    return;
  }
  // heavy
  ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(6, -9); ctx.quadraticCurveTo(11, -9, 11, -3); ctx.lineTo(11, 3); ctx.quadraticCurveTo(11, 9, 6, 9); ctx.lineTo(-6, 9); ctx.quadraticCurveTo(-9, 9, -9, 4); ctx.lineTo(-9, -4); ctx.quadraticCurveTo(-9, -9, -6, -9);
  body(null, 1.7);
  ctx.strokeStyle = 'rgba(255,150,165,1)'; ctx.lineWidth = 1.3; ctx.beginPath();
  for (let i = -4.5; i <= 4.5; i += 3) { ctx.moveTo(7, i); ctx.lineTo(10, i); }
  ctx.stroke();
  ctx.strokeStyle = rgba(RC.glow, .6); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-4, -9); ctx.lineTo(-4, 9); ctx.stroke();
}

// o: a (aim), ma (legs/move dir), ph (stride phase), mv (0..1.3), kind, rim, alpha, weapon,
//    recoil, swing, windup, reload, hurt, lunge, run, additive, twist
function drawCharacter(x, y, o) {
  if (!(o.alpha > .01)) return;
  const k = o.kind || 'player', S = KSCALE[k] * (o.scale || 1);
  RC = (o.hurt || 0) > .4 ? RIM.hurt : o.rim === 'enemy' ? RIM.enemy : RIM.player;
  ctx.save();
  ctx.globalAlpha = Math.min(1, o.alpha);
  if (o.additive) ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const mv = clamp(o.mv || 0, 0, 1.3), m1 = Math.min(1, mv), ph = o.ph || 0;
  if (!o.additive) {
    const R = 32 * S, g = ctx.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, rgba(RC.glow, .16)); g.addColorStop(1, rgba(RC.glow, 0));
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - R, y - R, R * 2, R * 2); ctx.globalCompositeOperation = 'source-over';
  }
  // legs follow movement; walking backwards backpedals instead of twisting the hips 180°
  let la = o.ma ?? o.a, dir = 1;
  if (Math.abs(angDiff(o.a, la)) > PI * .55) { la += PI; dir = -1; }
  const ca = Math.cos(la), sa = Math.sin(la);
  const Lp = (lx, ly) => [x + (lx * ca - ly * sa) * S, y + (lx * sa + ly * ca) * S];
  const stride = (o.run ? 12 : 8.5) * m1;
  for (const s of [-1, 1]) {
    const sw = Math.sin(ph) * s * dir;
    const up = Math.max(0, Math.cos(ph) * s * dir) * m1; // the swinging foot lifts toward the camera
    const fx = sw * stride + 1.5, fy = s * 6.2;
    const hip = lift(...Lp(-1, s * 5.4), HGT.hip);
    const foot = lift(...Lp(fx, fy), .006 * up);
    const knee = lift(...Lp(fx * .55, s * 6.4), HGT.hip * .6 + .004 * up);
    tube([hip, knee, foot], 5.4 * S);
    ctx.save(); ctx.translate(foot[0], foot[1]); ctx.rotate(la); ctx.scale(S * (1 + .08 * up), S * (1 + .08 * up));
    ctx.beginPath(); ctx.ellipse(2.8, 0, 5.4, 3.5, 0, 0, TAU); body(null, 1.2);
    ctx.restore();
  }
  // torso + arms + weapon (aim direction)
  const sway = Math.sin(ph) * .08 * m1 * dir + (o.twist || 0);
  const lean = (o.run ? 2.5 : .8) * m1 + (o.lunge ? 4 : 0);
  const [tx, ty] = lift(x + Math.cos(o.a) * lean, y + Math.sin(o.a) * lean, HGT.sh);
  const breath = 1 + Math.sin(realT * 2.2) * .014 * (1 - m1);
  ctx.save(); ctx.translate(tx, ty); ctx.rotate(o.a + sway);
  const sS = S * (1 + HGT.sh * 1.4) * breath; ctx.scale(sS, sS);
  drawTorso(k);
  drawArmsWeapon(o, k);
  ctx.restore();
  // head, slightly ahead of the shoulders and the closest thing to the camera
  const bob = Math.abs(Math.cos(ph)) * .018 * m1;
  const hf = 2 + lean;
  const [hx, hy] = lift(x + Math.cos(o.a) * hf, y + Math.sin(o.a) * hf, HGT.head + bob);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(o.a + sway * .4 + (o.stun ? Math.sin(realT * 10) * .3 : 0));
  const hS = S * (1 + (HGT.head + bob) * 1.8); ctx.scale(hS, hS);
  drawHeadTop(k, o);
  ctx.restore();
  ctx.restore();
}

// a body lying on the floor, head toward angle a
function drawFallen(x, y, a, o) {
  const k = o.kind || 'player', S = KSCALE[k];
  RC = o.rim === 'enemy' ? RIM.enemy : RIM.player;
  const f = clamp(o.fall ?? 1, 0, 1);
  ctx.save(); ctx.globalAlpha = Math.min(1, o.alpha);
  ctx.translate(x, y); ctx.rotate(a); ctx.scale(S, S);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tube([[-7, -4], [-16, -5 - 3 * f], [-26, -9 * f - 3]], 5.2);
  tube([[-7, 4], [-16, 6], [-25, 9 * f + 3]], 5.2);
  for (const [fx, fy] of [[-26, -9 * f - 3], [-25, 9 * f + 3]]) { ctx.beginPath(); ctx.ellipse(fx - 2, fy, 4.5, 3.4, 0, 0, TAU); body(null, 1.1); }
  tube([[5, -11], [9, -17], [14 - 3 * f, -22 * f - 3]], 4.2); hand(14 - 3 * f, -22 * f - 3);
  tube([[5, 11], [11, 15], [17, 15 * f + 4]], 4.2); hand(17, 15 * f + 4);
  const w = HALFW[k];
  ctx.beginPath();
  ctx.moveTo(8, -w * .9); ctx.quadraticCurveTo(12, 0, 8, w * .9); ctx.quadraticCurveTo(0, w, -9, w * .6);
  ctx.quadraticCurveTo(-12, 0, -9, -w * .6); ctx.quadraticCurveTo(0, -w, 8, -w * .9); ctx.closePath();
  const g = ctx.createRadialGradient(0, 0, 1, 0, 0, w); g.addColorStop(0, '#17222c'); g.addColorStop(1, '#030507');
  ctx.fillStyle = g; ctx.fill(); rimPath(1.6);
  ctx.save(); ctx.translate(15, 0); drawHeadTop(k, { ph: 0 }); ctx.restore();
  ctx.restore();
  ctx.globalAlpha = 1;
}

// ---------- enemies ----------
const EMUZ = { gunner: 1, heavy: 1 };
function enemyTip(e) {
  const G = GUN[ETYPE[e.type].w] || { grip: 12, len: 12 }, S = KSCALE[e.type] * (1 + HGT.sh * 1.4);
  const f = (G.grip + G.len + 1) * S;
  const [x, y] = lift(e.x + Math.cos(e.a) * f, e.y + Math.sin(e.a) * f, HGT.sh);
  return { x, y };
}
function drawCorpse(e, a) {
  const k = easeOut((time - e.dieT) / 1.6), fall = easeOut((time - e.dieT) / .35);
  const col = CARR[1];
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.globalAlpha = Math.min(1, a);
  ctx.globalCompositeOperation = 'lighter';
  const pr = (e.type === 'heavy' ? 44 : 34) * (.25 + .75 * k), px = Math.cos(e.corpseA) * 8, py = Math.sin(e.corpseA) * 8;
  const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
  g.addColorStop(0, rgba(col, .32)); g.addColorStop(.7, rgba(col, .16)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.restore();
  drawFallen(e.x, e.y, e.corpseA, { kind: e.type, rim: 'enemy', alpha: Math.min(1, a) * .85, fall });
  const C = rgba(col, .85);
  ctx.save(); ctx.translate(e.x + Math.cos(e.corpseA + 1.4) * 32, e.y + Math.sin(e.corpseA + 1.4) * 32); ctx.rotate(e.corpseA + 2);
  ctx.globalAlpha = Math.min(1, a) * .7;
  const w = ETYPE[e.type].w;
  if (w === 'bat') { ctx.beginPath(); ctx.moveTo(-14, -1.5); ctx.lineTo(14, -3.5); ctx.lineTo(14, 3.5); ctx.lineTo(-14, 1.5); ctx.closePath(); outlineFill(C, 1.2); }
  else if (w === 'blade') { ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(8, 0); ctx.lineTo(-6, 1); ctx.fill(); }
  else { ctx.translate(-15, 0); gunShape(w); outlineFill(C, 1.2); }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function enemyPose(e, live) {
  const p = live ? null : e.gpose;
  const walk = live ? e.walk : e.gw;
  return {
    kind: e.type, rim: 'enemy', weapon: ETYPE[e.type].w,
    a: live ? e.a : e.ga, ph: walk * .575, mv: live ? e.moveAmt : e.gmove,
    run: live ? e.state === 'hunt' : false,
    recoil: live ? e.recoil : (p ? p.recoil : 0),
    windup: live ? (e.state === 'windup' ? 1 - e.wT / e.wT0 : 0) : (p ? p.windup : 0),
    swing: live ? swingOf(e) : (p ? p.swing : -1),
    lunge: live ? e.state === 'lunge' : (p ? p.lunge : false),
    stun: live ? e.state === 'stun' : (p ? p.stun : false),
    hurt: Math.max(0, 1 - (time - e.hurtT) / .15),
  };
}
function drawEnemies() {
  for (const e of enemies) {
    if (e.x < vx0 - 80 || e.x > vx1 + 80 || e.y < vy0 - 80 || e.y > vy1 + 80) { if (!e.dead && (e.gx < vx0 - 80 || e.gx > vx1 + 80 || e.gy < vy0 - 80 || e.gy > vy1 + 80)) continue; }
    if (e.dead) {
      const a = Math.max(alphaOf(e), glintAlpha(e, 0) * .8);
      if (a > .02) drawCorpse(e, a);
      continue;
    }
    const fa = flash(e.litS, e.litT);
    if (fa > .02) {
      const o = enemyPose(e, false); o.alpha = fa;
      const ht = hot(e);
      if (ht > .1) drawCharacter(e.gx + 3, e.gy, { ...o, alpha: ht * .6, additive: true, hurt: 1 });
      drawCharacter(e.gx, e.gy, o);
      if (e.gpose && e.gpose.stun) {
        ctx.fillStyle = rgba(CARR[2], fa); ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'center';
        for (let i = 0; i < 3; i++) { const aa = realT * 4 + i * TAU / 3; ctx.fillText('✦', e.gx + Math.cos(aa) * 15, e.gy - 30 + Math.sin(aa) * 4); }
      }
      if (e.gpose && e.gpose.aim && fa > .3) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(e.gx, e.gy, e.gx + Math.cos(e.ga) * 180, e.gy + Math.sin(e.ga) * 180);
        g.addColorStop(0, rgba(CARR[1], .5 * fa)); g.addColorStop(1, rgba(CARR[1], 0));
        ctx.strokeStyle = g; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(e.gx, e.gy); ctx.lineTo(e.gx + Math.cos(e.ga) * 180, e.gy + Math.sin(e.ga) * 180); ctx.stroke();
        ctx.restore();
      }
    }
    const d = Math.hypot(e.x - player.x, e.y - player.y);
    if (d < 85 && !player.dead && los(e.x, e.y, player.x, player.y)) {
      const la = clamp((85 - d) / 40, 0, .9);
      if (la > fa + .05) { const o = enemyPose(e, true); o.alpha = la; drawCharacter(e.x, e.y, o); }
    }
  }
}

// ---------- player ----------
function gunTip(P) {
  const G = GUN[P.weapon], S = 1 + HGT.sh * 1.4;
  const f = (G ? G.grip + G.len + 1 : 22) * S;
  const [x, y] = lift(P.x + Math.cos(P.a) * f, P.y + Math.sin(P.a) * f, HGT.sh);
  return { x, y };
}
function drawPlayer() {
  const P = player;
  for (const ai of afterimages) {
    const k = 1 - (time - ai.t) / .35;
    if (ai.enemy) drawCharacter(ai.x, ai.y, { kind: ai.enemy, rim: 'enemy', weapon: ETYPE[ai.enemy].w, a: ai.a, ph: ai.w * .575, mv: 1, run: true, lunge: true, alpha: k * .45, additive: true });
    else drawCharacter(ai.x, ai.y, { kind: 'player', weapon: P.weapon, a: ai.a, ma: ai.ma, ph: ai.ph, mv: 1, run: true, alpha: k * .5, additive: true });
  }
  if (P.dead) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = easeOut((time - P.dieT) / 2), g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 60 * k + 5);
    g.addColorStop(0, rgba(CARR[1], .45)); g.addColorStop(1, rgba(CARR[1], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, 60 * k + 5, 0, TAU); ctx.fill(); ctx.restore();
    drawFallen(P.x, P.y, P.a + PI, { kind: 'player', alpha: .95, fall: easeOut((time - P.dieT) / .4) });
    return;
  }
  const blink = P.iframe > 0 && P.dashT <= 0 && Math.floor(realT * 20) % 2 === 0;
  const w = WEAP[P.weapon];
  drawCharacter(P.x, P.y, {
    kind: 'player', weapon: P.weapon, alpha: blink ? .45 : 1,
    a: P.a, ma: P.moveA, ph: P.stepPh || 0, mv: P.moveAmt, run: P.running,
    recoil: P.recoil, reload: P.reload > 0 ? 1 - P.reload / w.rl : 0,
    swing: P.meleeT > 0 ? 1 - P.meleeT / .2 : -1, hurt: hurtFlash > .6 ? hurtFlash : 0,
    twist: P.meleeT > 0 ? Math.sin((1 - P.meleeT / .2) * PI) * .35 : 0,
  });
  if (P.meleeT > 0) {
    const k = 1 - P.meleeT / .2, a0 = P.meleeA;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(P.x, P.y); ctx.rotate(a0);
    ctx.beginPath(); ctx.arc(0, 0, 46, -1.1 + k * .2, lerp(-1.1, 1.1, easeOut(k * 1.4)));
    ctx.arc(0, 0, 34, lerp(-1.1, 1.1, easeOut(k * 1.4)), -1.1 + k * .6, true); ctx.closePath();
    const gg = ctx.createRadialGradient(0, 0, 30, 0, 0, 48); gg.addColorStop(0, rgba(CARR[0], 0)); gg.addColorStop(1, rgba(CARR[0], .8 * (1 - k)));
    ctx.fillStyle = gg; ctx.fill();
    ctx.restore();
  }
  if (P.weapon !== 'knife') {
    const t = gunTip(P), L = 150;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g2 = ctx.createLinearGradient(t.x, t.y, t.x + Math.cos(P.a) * L, t.y + Math.sin(P.a) * L);
    g2.addColorStop(0, rgba(CARR[0], .14)); g2.addColorStop(1, rgba(CARR[0], 0));
    ctx.strokeStyle = g2; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + Math.cos(P.a) * L, t.y + Math.sin(P.a) * L); ctx.stroke();
    ctx.restore();
  }
}
