// ---------- player sprite (hand-drawn sheet, 8-frame walk cycle) ----------
// The sheet faces +y (down); the game faces +x, so every draw rotates by a - PI/2.
const PSPR = { img: null, red: null, cyan: null, ready: false, s: .3, pivY: 92 };
(function loadPlayerSheet() {
  const im = new Image();
  im.onload = () => {
    const tint = col => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height);
      return c;
    };
    PSPR.img = im; PSPR.red = tint('rgba(255,40,70,.85)'); PSPR.cyan = tint('rgba(80,225,255,1)');
    PSPR.ready = true;
  };
  im.src = PLAYER_SHEET_SRC;
})();
function playerFrame(P) { return P.moveAmt > .08 ? Math.floor(P.walk / .12 / 12) % 8 : 1; }
// gun axis for a frame, in sheet pixels relative to the pivot (+y = forward)
function gunAxis(f) {
  const fr = PLAYER_SHEET.frames[f], off = PSPR.pivY - PLAYER_SHEET.py;
  return { x: fr.gx, y0: fr.gy0 - off, y1: fr.gy1 - off };
}
const WLEN = { pistol: null, shotgun: 82, smg: 60, knife: 34 };
function gunTip(P) {
  const g = gunAxis(playerFrame(P)), s = PSPR.s;
  const fwd = (P.weapon === 'pistol' ? g.y1 : g.y0 + WLEN[P.weapon]) * s, lat = g.x * s;
  return { x: P.x + Math.cos(P.a) * fwd + Math.sin(P.a) * lat, y: P.y + Math.sin(P.a) * fwd - Math.cos(P.a) * lat };
}
function drawSheetWeapon(w, g) {
  const O = 'rgba(228,246,255,1)', x = g.x;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const shape = fn => { ctx.beginPath(); fn(); ctx.fillStyle = '#020304'; ctx.fill(); ctx.strokeStyle = O; ctx.lineWidth = 3.2; ctx.stroke(); };
  if (w === 'shotgun') {
    const y0 = g.y0 - 10, y1 = g.y0 + WLEN.shotgun;
    shape(() => { ctx.moveTo(x - 7, y0); ctx.lineTo(x + 7, y0); ctx.lineTo(x + 6, y1); ctx.lineTo(x - 6, y1); ctx.closePath(); });
    shape(() => { ctx.rect(x - 9.5, g.y0 + 34, 19, 22); });
    ctx.strokeStyle = 'rgba(228,246,255,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x, g.y0 + 58); ctx.lineTo(x, y1 - 3); ctx.moveTo(x - 9.5, g.y0 + 41); ctx.lineTo(x + 9.5, g.y0 + 41); ctx.moveTo(x - 9.5, g.y0 + 48); ctx.lineTo(x + 9.5, g.y0 + 48); ctx.stroke();
  } else if (w === 'smg') {
    const y0 = g.y0 - 6, y1 = g.y0 + WLEN.smg;
    shape(() => { ctx.moveTo(x - 8, y0); ctx.lineTo(x + 8, y0); ctx.lineTo(x + 8, y1 - 18); ctx.lineTo(x + 4, y1 - 18); ctx.lineTo(x + 4, y1); ctx.lineTo(x - 4, y1); ctx.lineTo(x - 4, y1 - 18); ctx.lineTo(x - 8, y1 - 18); ctx.closePath(); });
    shape(() => { ctx.rect(x + 8, g.y0 + 14, 15, 8); });
    ctx.strokeStyle = 'rgba(228,246,255,.6)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(x - 3, g.y0 + 4); ctx.lineTo(x - 3, y1 - 22); ctx.stroke();
  } else if (w === 'knife') {
    // hide the pistol, put a blade in the same grip
    ctx.fillStyle = '#020304'; ctx.fillRect(x - 7.5, g.y0 + 8, 15, g.y1 - g.y0 - 4);
    shape(() => { ctx.rect(x - 4.5, g.y0 - 2, 9, 14); });
    ctx.beginPath(); ctx.moveTo(x - 5, g.y0 + 12); ctx.lineTo(x + 5, g.y0 + 12); ctx.lineTo(x + 1, g.y0 + WLEN.knife); ctx.lineTo(x - 5, g.y0 + WLEN.knife - 8); ctx.closePath();
    ctx.fillStyle = 'rgba(235,250,255,1)'; ctx.fill();
  }
}
function drawPlayerSprite(x, y, a, o) {
  const F = PLAYER_SHEET, s = PSPR.s * (o.scale || 1);
  const img = o.variant === 'red' ? PSPR.red : o.variant === 'cyan' ? PSPR.cyan : PSPR.img;
  ctx.save(); ctx.translate(x, y); ctx.rotate(a - PI / 2 + (o.twist || 0));
  ctx.translate(0, -(o.recoil || 0) * 4);
  ctx.scale(s, s * (o.squash || 1));
  ctx.globalAlpha = Math.min(1, o.alpha);
  if (o.additive) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, o.frame * F.fw, 0, F.fw, F.fh, -F.px, -PSPR.pivY, F.fw, F.fh);
  if (!o.additive && o.weapon && o.weapon !== 'pistol') drawSheetWeapon(o.weapon, gunAxis(o.frame));
  ctx.restore();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function drawPlayer() {
  const P = player;
  if (!PSPR.ready) return;
  for (const ai of afterimages) {
    const k = 1 - (time - ai.t) / .35;
    if (ai.enemy) drawHuman(ai.x, ai.y, ai.a, { col: CARR[1], alpha: k * .3, kind: ai.enemy, walk: ai.w, move: 1, weapon: ETYPE[ai.enemy].w });
    else drawPlayerSprite(ai.x, ai.y, ai.a, { frame: Math.floor(ai.w / .12 / 12) % 8, alpha: k * .5, variant: 'cyan', additive: true });
  }
  if (P.dead) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = easeOut((time - P.dieT) / 2), g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 60 * k + 5);
    g.addColorStop(0, rgba(CARR[1], .45)); g.addColorStop(1, rgba(CARR[1], 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(P.x, P.y, 60 * k + 5, 0, TAU); ctx.fill(); ctx.restore();
    const f = easeOut((time - P.dieT) / .5);
    drawPlayerSprite(P.x, P.y, P.a + PI + f * .5, { frame: 1, alpha: .9, squash: 1 - .15 * f, weapon: P.weapon });
    drawPlayerSprite(P.x, P.y, P.a + PI + f * .5, { frame: 1, alpha: .35 * f, squash: 1 - .15 * f, variant: 'red', additive: true });
    return;
  }
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, 80);
  g.addColorStop(0, rgba(CARR[0], .12)); g.addColorStop(1, rgba(CARR[0], 0));
  ctx.fillStyle = g; ctx.fillRect(P.x - 80, P.y - 80, 160, 160);
  ctx.globalCompositeOperation = 'source-over';
  const blink = P.iframe > 0 && P.dashT <= 0 && Math.floor(realT * 20) % 2 === 0;
  const w = WEAP[P.weapon];
  const swing = P.meleeT > 0 ? 1 - P.meleeT / .2 : -1;
  const rl = P.reload > 0 ? 1 - P.reload / w.rl : 0;
  const idle = P.moveAmt < .08;
  const o = {
    frame: playerFrame(P), alpha: blink ? .45 : 1, weapon: P.weapon, recoil: P.recoil,
    twist: (swing >= 0 ? Math.sin(swing * PI) * .45 : 0) + (rl > 0 ? Math.sin(rl * PI * 4) * .04 : 0),
    scale: idle ? 1 + Math.sin(realT * 2.2) * .012 : 1,
  };
  drawPlayerSprite(P.x, P.y, P.a, o);
  if (hurtFlash > .3) drawPlayerSprite(P.x, P.y, P.a, { ...o, alpha: hurtFlash * .9, variant: 'red', additive: true });
  if (P.meleeT > 0) {
    const k = 1 - P.meleeT / .2, a0 = P.meleeA;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(P.x, P.y); ctx.rotate(a0);
    ctx.beginPath(); ctx.arc(0, 0, 50, -1.1 + k * .2, lerp(-1.1, 1.1, easeOut(k * 1.4)));
    ctx.arc(0, 0, 36, lerp(-1.1, 1.1, easeOut(k * 1.4)), -1.1 + k * .6, true); ctx.closePath();
    const gg = ctx.createRadialGradient(0, 0, 32, 0, 0, 52); gg.addColorStop(0, rgba(CARR[0], 0)); gg.addColorStop(1, rgba(CARR[0], .8 * (1 - k)));
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
