// =====================================================================
//  ENEMY DESIGN — each type gets its own silhouette, gear and tells,
//  all in the same rim-lit neon style. Every Quiet member wears the hush mark.
// =====================================================================
let CUR = null; // the pose being drawn right now
const QUIET_KINDS = new Set(['hunter', 'gunner', 'assassin', 'jammer', 'heavy']);
{
  const dc = drawCharacter;
  drawCharacter = function (x, y, o) { CUR = o; try { return dc(x, y, o); } finally { CUR = null; } };
  const df = drawFallen;
  drawFallen = function (x, y, a, o) { CUR = { ...o, dead: true }; try { return df(x, y, a, o); } finally { CUR = null; } };
  const ep = enemyPose;
  enemyPose = function (e, live) { const o = ep(e, live); o.flash = !!e.flash; o.hunting = e.state === 'hunt' || e.state === 'charge' || e.state === 'aim' || e.state === 'burst' || e.state === 'windup' || e.state === 'lunge'; return o; };
}
const eyeHeat = () => (CUR && CUR.dead) ? 0 : (CUR && CUR.hunting) ? 1 : .35; // dim on patrol, white-hot on the hunt
function eyeCol(a) {
  const h = eyeHeat();
  return h >= 1 ? `rgba(255,${235 - 30 * Math.sin(realT * 14)},${235 - 30 * Math.sin(realT * 14)},${a})` : rgba(RC.glow, a * (.45 + h));
}
function hushMark(x, y, r) { // The Quiet's insignia: a closed circle, a bar through it
  ctx.strokeStyle = rgba(RC.glow, .85); ctx.lineWidth = .9;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.moveTo(x, y - r * 1.45); ctx.lineTo(x, y + r * 1.45); ctx.stroke();
}
{
  const dt = drawTorso;
  drawTorso = function (k) {
    if (!QUIET_KINDS.has(k)) return dt(k);
    const w = HALFW[k], d = k === 'heavy' ? 10 : 8, mv = CUR ? clamp(CUR.mv || 0, 0, 1.3) : 0;
    if (k === 'assassin') { // a cloak streaming behind, longer the faster she moves
      const fl = Math.sin(realT * 7) * 1.6 * (.3 + mv), L = 9 + mv * 9;
      ctx.beginPath();
      ctx.moveTo(1, -w * .92);
      ctx.quadraticCurveTo(-d - L * .5, -w * 1.05 - fl, -d - L, -w * .45 + fl);
      ctx.quadraticCurveTo(-d - L - 3, 0, -d - L, w * .45 - fl);
      ctx.quadraticCurveTo(-d - L * .5, w * 1.05 + fl, 1, w * .92);
      ctx.closePath(); ctx.fillStyle = BODY; ctx.fill(); rimPath(1.2);
      ctx.strokeStyle = rgba(RC.glow, .35); ctx.lineWidth = .7; ctx.beginPath();
      for (const s of [-.5, 0, .5]) { ctx.moveTo(-d, s * w); ctx.lineTo(-d - L + 2, s * w * 1.2 + fl * .5); }
      ctx.stroke();
    }
    if (k === 'heavy') for (const s of [-1, 1]) { // pauldrons
      ctx.beginPath(); ctx.ellipse(0, s * w * .86, 7.5, 5.2, 0, 0, TAU); body(null, 1.4);
      ctx.strokeStyle = rgba(RC.glow, .55); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(-5, s * w * .86); ctx.lineTo(5, s * w * .86); ctx.stroke();
    }
    dt(k);
    hushMark(-d * .52, 0, 2.4);
    ctx.strokeStyle = rgba(RC.glow, .7); ctx.lineWidth = .9;
    if (k === 'gunner') { // plate carrier: three mag pouches, a radio on the shoulder
      ctx.beginPath(); for (const py of [-6.2, -1.6, 3]) ctx.rect(d * .05, py, 3.4, 3.2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -w * .7); ctx.lineTo(-10, -w * 1.02); ctx.stroke();
      ctx.fillStyle = rgba(RC.glow, .5 + .5 * Math.sin(realT * 5)); ctx.beginPath(); ctx.arc(-10, -w * 1.02, 1.3, 0, TAU); ctx.fill();
    }
    if (k === 'hunter') { // cross-strap and a pad on the bat shoulder
      ctx.beginPath(); ctx.moveTo(4, -w * .66); ctx.lineTo(-5, w * .58); ctx.stroke();
      ctx.beginPath(); ctx.arc(-.5, w * .74, 5.2, -PI * .9, PI * .1); ctx.closePath(); body(null, 1.2);
    }
    if (k === 'jammer') { // the pack broadcasts
      for (let i = 0; i < 2; i++) {
        const u = ((realT * .9 + i * .5) % 1), r = 4 + u * 16;
        ctx.strokeStyle = rgba(VIO, (1 - u) * .7); ctx.lineWidth = 1.1; ctx.beginPath(); ctx.arc(-12, 0, r, PI * .55, PI * 1.45); ctx.stroke();
      }
    }
  };
}
{
  const dh = drawHeadTop;
  drawHeadTop = function (k, o) {
    dh(k, o);
    if (!QUIET_KINDS.has(k)) return;
    const flash = CUR && CUR.flash && !CUR.dead;
    if (k === 'hunter') { // a cracked half-mask, two burning slits
      ctx.strokeStyle = eyeCol(1); ctx.lineWidth = 1.5; ctx.beginPath();
      ctx.moveTo(5.2, -3.4); ctx.lineTo(6.6, -1.4); ctx.moveTo(5.2, 3.4); ctx.lineTo(6.6, 1.4); ctx.stroke();
      ctx.strokeStyle = rgba(RC.glow, .6); ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(7.6, -.4); ctx.lineTo(4, .6); ctx.lineTo(2.6, -1.6); ctx.stroke();
    }
    if (k === 'gunner') { // night-vision mount over the visor
      ctx.beginPath(); ctx.rect(5.6, -3, 3.6, 6); body(null, 1);
      ctx.fillStyle = eyeCol(1); ctx.beginPath(); ctx.arc(9.2, -1.6, 1.1, 0, TAU); ctx.arc(9.2, 1.6, 1.1, 0, TAU); ctx.fill();
    }
    if (k === 'assassin') { // the hood's point, and the eyes heat up
      ctx.beginPath(); ctx.moveTo(-5, -4.6); ctx.lineTo(-13, 0); ctx.lineTo(-5, 4.6); ctx.closePath(); body(null, 1.1);
      ctx.fillStyle = eyeCol(1); ctx.beginPath(); ctx.arc(6.5, -2.4, 1.3, 0, TAU); ctx.arc(6.5, 2.4, 1.3, 0, TAU); ctx.fill();
    }
    if (k === 'jammer' || k === 'heavy') { ctx.fillStyle = eyeCol(.95); ctx.beginPath(); ctx.arc(k === 'heavy' ? 8.5 : 6.6, 0, 1.2, 0, TAU); ctx.fill(); }
    if (flash) { // a lamp strapped to the helmet
      const g = ctx.createRadialGradient(9, 0, 0, 9, 0, 9);
      g.addColorStop(0, 'rgba(255,245,215,.9)'); g.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(9, 0, 9, 0, TAU); ctx.fill(); ctx.restore();
      ctx.beginPath(); ctx.rect(5, -2.2, 4, 4.4); body(null, .9);
      ctx.fillStyle = 'rgba(255,250,230,1)'; ctx.fillRect(8.2, -1.6, 1.4, 3.2);
    }
  };
}
