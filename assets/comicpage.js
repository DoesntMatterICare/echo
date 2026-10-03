// =====================================================================
//  COMIC-BOOK CUTSCENES — every spoken beat becomes a panel on a printed page.
//  The live frame plays inside the current panel; earlier beats stay frozen
//  beside it with their speech bubbles, like reading a comic.
// =====================================================================
const LETF = '"Comic Neue", "Comic Sans MS", "Segoe UI", sans-serif', BANGF = 'Bangers, Impact, sans-serif', INKD = '#05060a';
const CP_LAYOUT = {
  1: [[[0, 0], [1, 0], [1, 1], [0, 1]]],
  2: [[[0, 0], [.56, 0], [.51, 1], [0, 1]], [[.575, 0], [1, 0], [1, 1], [.525, 1]]],
  3: [[[0, 0], [1, 0], [1, .48], [0, .53]], [[0, .555], [.5, .53], [.47, 1], [0, 1]], [[.515, .528], [1, .505], [1, 1], [.485, 1]]],
};
const CP_WHO = { ECHO: INK.cyan, MARCUS: [255, 176, 64], CONDUCTOR: INK.red, FOREMAN: INK.red };
let CPF = null; // the last page, faded out after the cutscene ends
const cpBeat = st => !!(st.say || st.card);
function cpTotal(S) { let n = 0; for (const st of S.steps) if (cpBeat(st)) n++; return Math.max(1, n); }
function cpIndex(S) { let n = -1; for (let i = 0; i <= S.i && i < S.steps.length; i++) if (cpBeat(S.steps[i])) n++; return Math.max(0, n); }
function cpPage() { const m = clamp(Math.min(W, H) * .03, 8, 24); return { x: m, y: m, w: W - 2 * m, h: H - 2 * m - 22, m }; }
function cpGeo(poly, R) {
  const pts = poly.map(([u, v]) => [R.x + u * R.w, R.y + v * R.h]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x = Math.min(...xs), y = Math.min(...ys);
  return { pts, x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
function cpPath(pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
function cpDots(col, r, step) {
  const c = document.createElement('canvas'); c.width = c.height = step;
  const x = c.getContext('2d'); x.fillStyle = col;
  for (const [px, py] of [[0, 0], [step, 0], [0, step], [step, step], [step / 2, step / 2]]) { x.beginPath(); x.arc(px, py, r, 0, TAU); x.fill(); }
  return c;
}
let cpPaper = null, cpTone = null;
// the live (or frozen) frame, cropped into a panel; returns the world→panel mapping for bubbles
function cpArt(img, G) {
  const sc = Math.max(G.w / W, G.h / H), rw = G.w / sc, rh = G.h / sc, rx = (W - rw) / 2, ry = (H - rh) / 2;
  const kx = img.width / W, ky = img.height / H;
  ctx.save(); cpPath(G.pts); ctx.clip();
  ctx.fillStyle = '#000'; ctx.fillRect(G.x, G.y, G.w, G.h);
  ctx.drawImage(img, rx * kx, ry * ky, rw * kx, rh * ky, G.x, G.y, G.w, G.h);
  ctx.globalAlpha = .2; ctx.fillStyle = ctx.createPattern(cpTone, 'repeat'); ctx.fillRect(G.x, G.y, G.w, G.h);
  ctx.restore();
  ctx.lineJoin = 'miter'; cpPath(G.pts); ctx.lineWidth = 4.5; ctx.strokeStyle = INKD; ctx.stroke();
  return (ax, ay) => [G.x + (ax - rx) * sc, G.y + (ay - ry) * sc];
}
function cpWrap(text, maxW) { const out = []; let cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; }
function cpBubble(cx, cy, L, size, lh, rx, ry, tail, o) {
  const body = () => {
    ctx.beginPath();
    if (o.radio) { const n = 28; for (let i = 0; i <= n; i++) { const a = i / n * TAU, k = i % 2 ? 1.1 : .95; const px = cx + Math.cos(a) * rx * k, py = cy + Math.sin(a) * ry * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); }
    else ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
  };
  const tl = () => {
    const a = Math.atan2(tail[1] - cy, tail[0] - cx), pe = a + PI / 2, b = size * .55, bx = cx + Math.cos(a) * rx * .7, by = cy + Math.sin(a) * ry * .7;
    ctx.beginPath(); ctx.moveTo(bx + Math.cos(pe) * b, by + Math.sin(pe) * b);
    if (o.radio) { const mx = (bx + tail[0]) / 2, my = (by + tail[1]) / 2; ctx.lineTo(mx + Math.cos(pe) * b * 1.3, my + Math.sin(pe) * b * 1.3); ctx.lineTo(mx - Math.cos(pe) * b * .3, my - Math.sin(pe) * b * .3); }
    ctx.lineTo(tail[0], tail[1]); ctx.lineTo(bx - Math.cos(pe) * b, by - Math.sin(pe) * b); ctx.closePath();
  };
  ctx.lineJoin = 'round'; ctx.lineWidth = 5; ctx.strokeStyle = INKD;
  body(); ctx.stroke(); if (tail) { tl(); ctx.stroke(); }
  ctx.fillStyle = o.radio ? '#fff6c8' : '#ffffff'; body(); ctx.fill(); if (tail) { tl(); ctx.fill(); }
  ctx.fillStyle = INKD; ctx.font = `700 ${size}px ${LETF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  L.forEach((l, i) => ctx.fillText(l, cx, cy - L.length * lh / 2 + lh * (i + .5)));
  // name tag
  ctx.font = `${size * .82}px ${BANGF}`; const tag = o.tag, tw = ctx.measureText(tag).width + size * .9, x = cx - rx * .72, y = cy - ry - size * .4;
  ctx.fillStyle = INKD; ctx.fillRect(x, y - size * .52, tw, size * 1.04);
  ctx.fillStyle = rgba(o.col || INK.white, 1); ctx.textAlign = 'left'; ctx.fillText(tag, x + size * .45, y + 1);
}
function cpLetter(Lt, G, map, k) {
  if (!Lt) return;
  const size = clamp(Math.min(G.w * .034, G.h * .052), 13, 21);
  ctx.save(); ctx.globalAlpha = k;
  if (Lt.card) {
    const ts = clamp(G.w * .06, 26, 52);
    ctx.font = `${ts}px ${BANGF}`; const tw = ctx.measureText(Lt.card.title).width;
    ctx.font = `700 ${size * .85}px ${LETF}`; const sw = ctx.measureText(Lt.card.sub.toUpperCase()).width;
    const w = Math.max(tw, sw) + ts * .9, hh = ts * 1.05 + size * 2.1, x = G.x + G.w / 2 - w / 2, y = G.y + G.h * .2;
    ctx.save(); ctx.translate(x + w / 2, y + hh / 2); ctx.rotate(-.025); ctx.translate(-w / 2, -hh / 2);
    ctx.fillStyle = INKD; ctx.fillRect(6, 6, w, hh); ctx.fillStyle = rgba(INK.yellow, 1); ctx.fillRect(0, 0, w, hh);
    ctx.lineWidth = 3; ctx.strokeStyle = INKD; ctx.strokeRect(0, 0, w, hh);
    ctx.translate(w / 2, ts * .62); inkText(Lt.card.title, ts, Lt.card.col || INK.white);
    ctx.fillStyle = INKD; ctx.font = `700 ${size * .85}px ${LETF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Lt.card.sub.toUpperCase(), 0, ts * .45 + size * .9);
    ctx.restore();
  }
  if (Lt.sub) {
    ctx.font = `700 ${size}px ${LETF}`;
    const L = cpWrap(Lt.sub.text, Math.min(G.w * .5, 380)), lh = size * 1.22;
    const tw = Math.max(...L.map(l => ctx.measureText(l).width)), radio = !Lt.anchor;
    const rx = tw / 2 + size * (radio ? 1.5 : 1.15), ry = L.length * lh / 2 + size * (radio ? 1.25 : .95);
    let cx, cy, tail;
    if (Lt.anchor) {
      const [ax, ay] = map(Lt.anchor[0], Lt.anchor[1]);
      cx = ax + G.w * .05; cy = ay - ry - size * 3.4; tail = [clamp(ax, G.x + 10, G.x + G.w - 10), clamp(ay - size * 1.4, G.y + 10, G.y + G.h - 10)];
    } else { cx = G.x + G.w * .62; cy = G.y + G.h * .26; tail = [G.x + G.w - 8, G.y + 8]; }
    cx = clamp(cx, G.x + rx + 14, G.x + G.w - rx - 14); cy = clamp(cy, G.y + ry + size * 1.7, G.y + G.h - ry - 14);
    const who = Lt.sub.who, tag = radio ? (who === 'CONDUCTOR' || who === 'FOREMAN' ? who + ' · PA' : who + ' · RADIO') : who;
    cpBubble(cx, cy, L, size, lh, rx, ry, tail, { radio, tag, col: CP_WHO[who] });
  }
  ctx.restore();
}
function cpLetState(S) {
  let anchor = null;
  if (S.sub) {
    const who = S.sub.who, o = who === 'ECHO' ? player : (who === 'CONDUCTOR' || who === 'FOREMAN') && MS.boss && !MS.boss.dead && !MS.boss.hidden ? MS.boss : null;
    if (o) { const p = worldToScreen(o.x, o.y); anchor = [p.x, p.y - 14 * ZE]; }
  }
  const card = S.card && realT - S.card.t < S.card.dur ? S.card : null;
  return { sub: S.sub ? { who: S.sub.who, text: S.sub.text } : null, anchor, card };
}
function comicPage() {
  const S = CS; if (!S) return;
  if (!cpPaper) { cpPaper = cpDots('rgba(120,90,40,.14)', 1.1, 7); cpTone = cpDots('rgba(0,0,0,.6)', 1.1, 4.5); }
  const C = S.cp || (S.cp = { panels: [], pi: -1, raw: document.createElement('canvas'), pageT: realT, panelT: realT, let: null });
  const pi = cpIndex(S);
  if (pi !== C.pi) {
    if (C.pi >= 0 && C.raw.width) { // freeze the panel that just ended
      const im = document.createElement('canvas'); im.width = C.raw.width >> 1; im.height = C.raw.height >> 1;
      im.getContext('2d').drawImage(C.raw, 0, 0, im.width, im.height); C.panels[C.pi] = { img: im, let: C.let };
    }
    if (C.pi >= 0 && Math.floor(pi / 3) !== Math.floor(C.pi / 3)) C.pageT = realT;
    C.pi = pi; C.panelT = realT;
  }
  if (C.raw.width !== cv.width || C.raw.height !== cv.height) { C.raw.width = cv.width; C.raw.height = cv.height; }
  C.raw.getContext('2d').drawImage(cv, 0, 0);
  C.let = cpLetState(S);

  const prev = ctx; ctx = mctx;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0b0c10'; ctx.fillRect(0, 0, W, H);
  const R = cpPage(), pm = R.m * .6, ps = Math.floor(pi / 3), n = Math.min(3, Math.max(1, cpTotal(S) - ps * 3));
  const pk = easeOut(Math.min(1, (realT - C.pageT) / .45));
  ctx.save(); ctx.globalAlpha = pk; ctx.translate((1 - pk) * W * .2, 0);
  ctx.fillStyle = rgba(INK.paper, 1); ctx.fillRect(R.x - pm, R.y - pm, R.w + pm * 2, R.h + pm * 2 + 22);
  ctx.fillStyle = ctx.createPattern(cpPaper, 'repeat'); ctx.fillRect(R.x - pm, R.y - pm, R.w + pm * 2, R.h + pm * 2 + 22);
  CP_LAYOUT[n].forEach((poly, k) => {
    const idx = ps * 3 + k, G = cpGeo(poly, R);
    if (idx < pi) { const f = C.panels[idx]; if (f) cpLetter(f.let, G, cpArt(f.img, G), 1); }
    else if (idx === pi) {
      const a = easeOut(Math.min(1, (realT - C.panelT) / .3)), cx = G.x + G.w / 2, cy = G.y + G.h / 2;
      ctx.save(); ctx.globalAlpha *= a; ctx.translate(cx, cy); ctx.scale(.95 + .05 * a, .95 + .05 * a); ctx.translate(-cx, -cy);
      cpLetter(C.let, G, cpArt(C.raw, G), Math.min(1, (realT - (S.sub ? S.sub.t : 0)) / .18));
      ctx.restore();
    } else { ctx.save(); ctx.setLineDash([6, 6]); cpPath(G.pts); ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(5,6,10,.2)'; ctx.stroke(); ctx.restore(); }
  });
  // big callouts still pop over the page
  if (MS.call) {
    const k = realT - MS.call.t, dur = MS.call.big ? 2.3 : 1.5;
    if (k <= dur) {
      const s = clamp(Math.min(W / 1400, H / 860), .62, 1.2), a = Math.min(1, k / .12, (dur - k) / .4), pop = 1 + Math.max(0, .4 - k * 2.4);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, H * .34); ctx.rotate(-.04); ctx.scale(pop, pop);
      inkText(MS.call.text, (MS.call.big ? 50 : 34) * s, MS.call.col === 1 ? INK.red : MS.call.col === 2 ? INK.yellow : INK.cyan);
      ctx.restore();
    }
  }
  // footer: issue, page number, controls with the hold-to-skip ring
  const fy = R.y + R.h + pm + 11, hk = csHold ? Math.min(1, (realT - csHold) / .7) : 0;
  ctx.fillStyle = INKD; ctx.font = `15px ${BANGF}`; ctx.textBaseline = 'middle';
  ctx.textAlign = 'left'; ctx.fillText(`ECHO #${LV.num.replace(/^0/, '')} · ${LV.name}`, R.x, fy);
  ctx.textAlign = 'center'; ctx.fillText(String(ps + 1), R.x + R.w / 2, fy);
  ctx.textAlign = 'right'; ctx.fillText('CLICK — NEXT   ·   HOLD SPACE — SKIP', R.x + R.w - 22, fy);
  ctx.beginPath(); ctx.arc(R.x + R.w - 8, fy, 7, 0, TAU); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(5,6,10,.25)'; ctx.stroke();
  if (hk > 0) { ctx.beginPath(); ctx.arc(R.x + R.w - 8, fy, 7, -PI / 2, -PI / 2 + hk * TAU); ctx.strokeStyle = INKD; ctx.lineWidth = 3; ctx.stroke(); }
  ctx.restore();
  ctx = prev;
  // keep the finished page for the fade back into play
  if (!CPF) CPF = { c: document.createElement('canvas'), t: 0 };
  if (CPF.c.width !== cv.width || CPF.c.height !== cv.height) { CPF.c.width = cv.width; CPF.c.height = cv.height; }
  CPF.c.getContext('2d').drawImage(cv, 0, 0); CPF.t = realT; CPF.live = true;
}
drawCutscene = function () {}; // the page replaces the old letterbox overlay
{
  const base = composite;
  composite = function () {
    base();
    if (state === 'cutscene' && CS) comicPage();
    else if (CPF && CPF.live) { // the page lifts away as play resumes
      const k = (realT - CPF.t) / .35;
      if (k >= 1) CPF.live = false;
      else { mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.globalAlpha = 1 - k; mctx.drawImage(CPF.c, 0, 0); mctx.globalAlpha = 1; }
    }
  };
}
