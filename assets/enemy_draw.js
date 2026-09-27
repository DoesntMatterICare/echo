// ---------- enemies: the player artwork recoloured red ----------
const ESPR = { red: null, hot: null, ready: false };
const ESC = { hunter: 1, gunner: 1.03, assassin: .9, heavy: 1.32 };
// keep the black body, push the rim light toward a colour (bright highlights drift toward white)
function recolorSheet(im, c, hotMix) {
  const cvs = document.createElement('canvas'); cvs.width = im.width; cvs.height = im.height;
  const x = cvs.getContext('2d'); x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, cvs.width, cvs.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) {
    const L = Math.max(p[i], p[i + 1], p[i + 2]) / 255, h = Math.max(0, (L - .72) / .28) * hotMix;
    const r = c[0] * L, g = c[1] * L, b = c[2] * L;
    p[i] = r + (255 - r) * h; p[i + 1] = g + (255 - g) * h * .7; p[i + 2] = b + (255 - b) * h * .75;
  }
  x.putImageData(d, 0, 0);
  return cvs;
}
function enemyFrame(walk, move) { return move > .08 ? Math.floor(walk / .13 / 11) % 8 : 1; }
const EMUZ = { gunner: 100, heavy: 84 };
function enemyTip(e) {
  const g = gunAxis(enemyFrame(e.walk, e.moveAmt)), s = PSPR.s * ESC[e.type];
  const fwd = (g.y0 + (EMUZ[e.type] || 40)) * s, lat = g.x * s;
  return { x: e.x + Math.cos(e.a) * fwd + Math.sin(e.a) * lat, y: e.y + Math.sin(e.a) * fwd - Math.cos(e.a) * lat };
}
function drawEnemyWeapon(kind, g, o) {
  const O = 'rgba(255,105,120,1)', x = g.x;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shape = fn => { ctx.beginPath(); fn(); ctx.fillStyle = '#030102'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3.2; ctx.stroke(); };
  const hidePistol = () => { ctx.fillStyle = '#030102'; ctx.fillRect(x - 7.5, g.y0 + 8, 15, g.y1 - g.y0 - 4); };
  if (kind === 'hunter') {
    hidePistol();
    const sw = o.swing ?? -1;
    const ang = sw >= 0 ? lerp(1.5, -.9, easeOut(sw)) : .55 + (o.windup || 0) * 1.1;
    ctx.save(); ctx.translate(x, g.y0 + 4); ctx.rotate(-ang);
    shape(() => { ctx.moveTo(-3, -4); ctx.lineTo(3, -4); ctx.lineTo(7, 80); ctx.quadraticCurveTo(0, 86, -7, 80); ctx.closePath(); });
    ctx.strokeStyle = 'rgba(255,105,120,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-4, 14); ctx.lineTo(4, 14); ctx.moveTo(-4, 20); ctx.lineTo(4, 20); ctx.stroke();
    ctx.restore();
  } else if (kind === 'gunner') {
    const y1 = g.y0 + EMUZ.gunner;
    shape(() => { ctx.moveTo(x - 6.5, g.y0 - 14); ctx.lineTo(x + 6.5, g.y0 - 14); ctx.lineTo(x + 5, y1); ctx.lineTo(x - 5, y1); ctx.closePath(); });
    shape(() => { ctx.rect(x - 9, g.y0 + 18, 18, 18); });
    shape(() => { ctx.rect(x - 7, y1 - 10, 14, 10); });
    ctx.strokeStyle = 'rgba(255,105,120,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, g.y0 + 38); ctx.lineTo(x, y1 - 12); ctx.stroke();
  } else if (kind === 'heavy') {
    const y1 = g.y0 + EMUZ.heavy;
    shape(() => { ctx.rect(x - 11, g.y0 - 12, 22, y1 - g.y0 + 12); });
    shape(() => { ctx.rect(x - 14, g.y0 + 34, 28, 20); });
    ctx.strokeStyle = 'rgba(255,105,120,.6)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(x, g.y0 + 56); ctx.lineTo(x, y1 - 3); ctx.moveTo(x - 14, g.y0 + 41); ctx.lineTo(x + 14, g.y0 + 41); ctx.moveTo(x - 14, g.y0 + 47); ctx.lineTo(x + 14, g.y0 + 47); ctx.stroke();
  } else if (kind === 'assassin') {
    hidePistol();
    const fwd = o.lunge || (o.swing ?? -1) >= 0;
    for (const dx of [0, -24]) {
      const hx = x + dx, hy = g.y0 + (dx ? -6 : 4);
      shape(() => { ctx.rect(hx - 4, hy - 4, 8, 11); });
      ctx.beginPath();
      if (fwd) { ctx.moveTo(hx - 4, hy + 7); ctx.lineTo(hx + 4, hy + 7); ctx.lineTo(hx, hy + 38); }
      else { ctx.moveTo(hx - 4, hy - 4); ctx.lineTo(hx + 4, hy - 4); ctx.lineTo(hx + (dx ? -6 : 6), hy - 32); }
      ctx.closePath(); ctx.fillStyle = 'rgba(255,215,222,1)'; ctx.fill();
    }
  }
}
function drawEnemySprite(x, y, a, o) {
  if (!ESPR.ready) return;
  const F = PLAYER_SHEET, sc = PSPR.s * ESC[o.kind] * (o.scale || 1);
  const img = o.variant === 'hot' ? ESPR.hot : ESPR.red;
  let tw = 0;
  if ((o.swing ?? -1) >= 0) tw += Math.sin(o.swing * PI) * .55 * (o.kind === 'hunter' ? -1 : 1);
  if (o.windup) tw += o.windup * .35;
  if (o.stun) tw += Math.sin(realT * 10) * .15;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a - PI / 2 + tw);
  ctx.translate(0, -(o.recoil || 0) * 5);
  ctx.scale(sc, sc * (o.lunge ? 1.1 : 1) * (o.squash || 1));
  ctx.globalAlpha = clamp(o.alpha, 0, 1);
  if (o.additive) ctx.globalCompositeOperation = 'lighter';
  const sx = o.frame * F.fw;
  ctx.drawImage(img, sx, 0, F.fw, F.fh, -F.px, -PSPR.pivY, F.fw, F.fh);
  if (!o.additive && !o.noWeapon) drawEnemyWeapon(o.kind, gunAxis(o.frame), o);
  if (!o.additive && (o.hurt || 0) > .05) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(o.alpha, 0, 1) * o.hurt;
    ctx.drawImage(ESPR.hot, sx, 0, F.fw, F.fh, -F.px, -PSPR.pivY, F.fw, F.fh);
  }
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawCorpse(e, a) {
  const k = easeOut((time - e.dieT) / 1.6), fall = easeOut((time - e.dieT) / .35);
  const col = CARR[1];
  // blood pool spreading under the body
  ctx.save(); ctx.translate(e.x, e.y);
  ctx.globalAlpha = Math.min(1, a);
  ctx.globalCompositeOperation = 'lighter';
  const pr = (e.type === 'heavy' ? 44 : 34) * (.25 + .75 * k), px = Math.cos(e.corpseA) * 10, py = Math.sin(e.corpseA) * 10;
  const g = ctx.createRadialGradient(px, py, 0, px, py, pr);
  g.addColorStop(0, rgba(col, .32)); g.addColorStop(.7, rgba(col, .16)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, pr, 0, TAU); ctx.fill();
  ctx.restore();
  // body falls backwards, away from what killed it
  drawEnemySprite(e.x, e.y, e.corpseA + PI + fall * .35, { kind: e.type, frame: 1, alpha: Math.min(1, a) * .85, squash: 1 - .22 * fall, noWeapon: true });
  // dropped weapon
  const C = rgba(col, .85);
  ctx.save(); ctx.translate(e.x + Math.cos(e.corpseA + 1.2) * 30, e.y + Math.sin(e.corpseA + 1.2) * 30); ctx.rotate(e.corpseA + 2);
  ctx.globalAlpha = Math.min(1, a) * .7;
  const w = ETYPE[e.type].w;
  if (w === 'bat') { ctx.beginPath(); ctx.moveTo(-12, -1.5); ctx.lineTo(12, -3); ctx.lineTo(12, 3); ctx.lineTo(-12, 1.5); ctx.closePath(); outlineFill(C, 1.2); }
  else if (w === 'blade') { ctx.fillStyle = C; ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(8, 0); ctx.lineTo(-6, 1); ctx.fill(); }
  else { ctx.translate(-15, 0); gunShape(w); outlineFill(C, 1.2); }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function enemyPose(e, live) {
  const p = live ? null : e.gpose;
  return {
    kind: e.type,
    frame: live ? enemyFrame(e.walk, e.moveAmt) : enemyFrame(e.gw, e.gmove),
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
      // echo glitch: freshly revealed silhouettes flicker with a hot ghost
      const ht = hot(e);
      if (ht > .1) drawEnemySprite(e.gx + 3, e.gy, e.ga, { ...o, variant: 'hot', alpha: ht * .55, additive: true });
      drawEnemySprite(e.gx, e.gy, e.ga, o);
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
      if (la > fa + .05) { const o = enemyPose(e, true); o.alpha = la; drawEnemySprite(e.x, e.y, e.a, o); }
    }
  }
}
