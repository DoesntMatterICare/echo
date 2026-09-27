p = 'echo.html'
s = open(p, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    assert n == count, (n, old[:100])
    s = s.replace(old, new)

# ---------- data ----------
rep("""    { t: 'heavy', x: 48, y: 10, p: [[48, 10], [58, 10]] },
    { t: 'gunner', x: 57, y: 6, f: PI },
    { t: 'hunter', x: 47, y: 6, f: 0 },
""", "")
rep("  exit: [57, 1, 3, 2],", "  exit: [2, 35, 3, 4], // Marcus's extraction, back where you came in")
rep("    [6.5, 39.6, 'Q — SONAR  ·  YOU SEE THEM. THEY HEAR YOU.'],", "    [6.5, 39.6, 'Q — SONAR  ·  MARKS EVERY ENEMY IT TOUCHES'],")
rep("    [23.5, 41.4, 'SPACE — DASH'],", "    [23.5, 41.4, 'SPACE ON A MARKED ENEMY — ECHO STRIKE  ·  KILLS RESET IT'],")
rep("    [26.5, 29.0, 'THE KEYCARD HUMS HER SONG  ·  FOLLOW IT'],", "    [26.5, 29.0, 'THE KEYCARD HUMS HER SONG  ·  FOLLOW IT  ·  THE VAULT IS NORTH-EAST'],")
rep("  heavy:    { hp: 6, walk: 52, run: 82, ear: 0.9, stepR: 210, stride: 52, stepVol: .7, r: 18, pts: 1000, w: 'heavygun' },",
    "  heavy:    { hp: 6, walk: 52, run: 82, ear: 0.9, stepR: 210, stride: 52, stepVol: .7, r: 18, pts: 1000, w: 'heavygun' },\n  boss:     { hp: 28, walk: 105, run: 150, ear: 1.5, stepR: 170, stride: 50, stepVol: .6, r: 20, pts: 5000, w: 'heavygun' },")
rep("const KSCALE = { player: 1, hunter: 1, gunner: 1.02, assassin: .92, heavy: 1.3 };", "const KSCALE = { player: 1, hunter: 1, gunner: 1.02, assassin: .92, heavy: 1.3, boss: 1.55 };")
rep("const HALFW = { player: 15.5, hunter: 15.5, gunner: 15.5, assassin: 13.5, heavy: 18 };", "const HALFW = { player: 15.5, hunter: 15.5, gunner: 15.5, assassin: 13.5, heavy: 18, boss: 19 };")

# ---------- mission code block ----------
mission = open('assets/mission.js', encoding='utf-8').read()
anchor = "// =====================================================================\n//  WORLD UPDATE"
rep(anchor, mission + "\n" + anchor)

# ---------- build / checkpoints ----------
rep("  showMsg(cp ? 'CHECKPOINT — THE KEYCARD IS YOURS' : 'PRESS  Q  TO PING', 0);\n}",
    "  showMsg(cp ? 'CHECKPOINT' : 'PRESS  Q  TO PING', 0);\n  initPhases(cp);\n}")
rep("    key: true, time, stats: { ...stats },", "    key: true, time, stats: { ...stats }, phase: MS.phase === 'escape' ? 'escape' : MS.phase === 'boss' ? 'boss' : 'vault',")

# ---------- hooks ----------
rep("  emitSound(P.x, P.y, { hear: 720, reveal: 1000, col: 0, owner: 'player', str: 1.05 });\n  const poly",
    "  emitSound(P.x, P.y, { hear: 720, reveal: 1000, col: 0, owner: 'player', str: 1.05 });\n  markFromSonar();\n  const poly")
rep("function dash() {\n  const P = player;\n  if (P.dashCD > 0) return;", "function dash() {\n  const P = player;\n  if (tryStrike()) return;\n  if (P.dashCD > 0) return;")
rep("  P.spread = Math.max(0, P.spread - dt * 60);\n  if (P.dead) return;", "  P.spread = Math.max(0, P.spread - dt * 60);\n  if (P.dead) return;\n  if (P.strike) { updStrike(dt); return; }")
rep("  if (P.key && P.x > exitObj.x0 && P.x < exitObj.x0 + exitObj.w && P.y > exitObj.y0 && P.y < exitObj.y0 + exitObj.h) win();",
    "  if (MS.phase === 'escape' && P.x > exitObj.x0 && P.x < exitObj.x0 + exitObj.w && P.y > exitObj.y0 && P.y < exitObj.y0 + exitObj.h) win();")
rep("  if (e.hp <= 0) return killEnemy(e, cause, silent);\n  e.know",
    "  if (e.hp <= 0) return killEnemy(e, cause, silent);\n  if (e.type === 'boss') { bossHurt(e, dmg); return; }\n  e.know")
rep("  if (silent) { pts += 400; stats.silent++; label = 'SILENT  '; }",
    "  if (silent) { pts += 400; stats.silent++; label = 'SILENT  '; }\n  if (cause === 'strike') { pts += 300; label = 'ECHO STRIKE  '; }")
rep("  if (enemies.every(o => o.dead)) showMsg('THE HOUSE IS SILENT', 2);\n}",
    "  if (enemies.every(o => o.dead) && MS.phase !== 'escape') showMsg('THE HOUSE IS SILENT', 2);\n  onKill(e, cause);\n}")
rep("function updEnemy(e, dt) {\n  const P = player, ty = ETYPE[e.type];", "function updEnemy(e, dt) {\n  if (e.type === 'boss') return updBoss(e, dt);\n  const P = player, ty = ETYPE[e.type];")
rep("  for (const e of enemies) if (!e.dead) updEnemy(e, dt);\n  separateEnemies();", "  for (const e of enemies) if (!e.dead) updEnemy(e, dt);\n  separateEnemies();\n  updPhases(dt);")
rep("        if (fast) { killEnemy(e, 'door', false); }", "        if (e.type === 'boss') continue;\n        if (fast) { killEnemy(e, 'door', false); }")
rep("for (const e of enemies) if (!e.dead && Math.hypot(e.x - b.x, e.y - b.y) < 125 && los(b.x, b.y, e.x, e.y)) { e.hp = 1; damageEnemy(e, 99, 'blast', false); }",
    "for (const e of enemies) if (!e.dead && !e.hidden && Math.hypot(e.x - b.x, e.y - b.y) < 125 && los(b.x, b.y, e.x, e.y)) { if (e.type === 'boss') damageEnemy(e, 6, 'blast', false); else { e.hp = 1; damageEnemy(e, 99, 'blast', false); } }")
rep("  if (e.type === 'heavy' && !(behind || e.state === 'stun')) damageEnemy(e, 2, 'knife', false);",
    "  if (e.type === 'boss') damageEnemy(e, behind ? 4 : 2, 'knife', false);\n  else if (e.type === 'heavy' && !(behind || e.state === 'stun')) damageEnemy(e, 2, 'knife', false);")
rep("      for (const e of enemies) if (!e.dead && e !== b.src && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3) {",
    "      for (const e of enemies) if (!e.dead && !e.hidden && e !== b.src && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 3) {")
rep("    if (d < 85 && !player.dead && los(e.x, e.y, player.x, player.y)) {", "    if (d < 85 && !player.dead && !e.hidden && los(e.x, e.y, player.x, player.y)) {")
rep("  for (const e of enemies) if (!e.dead) nd = Math.min(nd, Math.hypot(e.x - player.x, e.y - player.y));",
    "  for (const e of enemies) if (!e.dead && !e.hidden) nd = Math.min(nd, Math.hypot(e.x - player.x, e.y - player.y));")

# objective hum: whatever the current objective is
rep("""    const kp = pickups.find(p => p.type === 'key');
    const src = player.key || !kp || kp.taken ? exitObj : kp;
    emitSound(src.x, src.y, { hear: 0, reveal: 200, col: 2, owner: 'env', str: .8 });
    SFX.hum(src.x, src.y);
    compass.a = Math.atan2(src.y - player.y, src.x - player.x); compass.t = time; compass.d = Math.hypot(src.x - player.x, src.y - player.y);
    if (src === exitObj) { exitObj.litS = .9; exitObj.litT = time; }""",
"""    const kp = pickups.find(p => p.type === 'key');
    const src = objectiveSrc(kp);
    if (src) {
      emitSound(src.x, src.y, { hear: 0, reveal: 200, col: 2, owner: 'env', str: .8 });
      SFX.hum(src.x, src.y);
      compass.a = Math.atan2(src.y - player.y, src.x - player.x); compass.t = time; compass.d = Math.hypot(src.x - player.x, src.y - player.y);
      if (src === exitObj) { exitObj.litS = .9; exitObj.litT = time; }
    }""")

# pickups: the keycard now opens the vault; the ledger starts the escape
rep("      showMsg('KEYCARD ACQUIRED — REACH THE EXIT', 2); SFX.key(); humT = .6;",
    "      showMsg('VAULT KEYCARD ACQUIRED', 2); SFX.key(); humT = .6; MS.phase = 'vault';\n      radio('MARCUS', \"That's the vault key. The Conductor's in there with the ledger — he's the one who gave the order, Elias.\");")
rep("    case 'decoy': P.decoys += 2; showMsg('+2 DECOYS  ·  [E] THROW', 0); break;",
    "    case 'decoy': P.decoys += 2; showMsg('+2 DECOYS  ·  [E] THROW', 0); break;\n    case 'ledger':\n      p.taken = true; SFX.key(); stats.score += 3000;\n      ring(p.x, p.y, 8, 180, 2, .8, 3); light(p.x, p.y, 300, 2, .8, 1);\n      startEscape(false);\n      return;")
rep("    const c = p.type === 'med' ? CARR[0] : p.type === 'key' ? CARR[2] : CARR[3];",
    "    if (p.type === 'ledger') a = Math.max(a, .65 + .3 * Math.sin(realT * 4));\n    const c = p.type === 'med' ? CARR[0] : p.type === 'key' || p.type === 'ledger' ? CARR[2] : CARR[3];")
rep("      case 'key': ctx.rect(-12, -8, 24, 16); ctx.fill(); ctx.rect(-7, -3, 7, 6); ctx.moveTo(4, -3); ctx.lineTo(9, -3); ctx.moveTo(4, 2); ctx.lineTo(9, 2); break;",
    "      case 'key': ctx.rect(-12, -8, 24, 16); ctx.fill(); ctx.rect(-7, -3, 7, 6); ctx.moveTo(4, -3); ctx.lineTo(9, -3); ctx.moveTo(4, 2); ctx.lineTo(9, 2); break;\n      case 'ledger': ctx.rect(-11, -14, 22, 28); ctx.fill(); ctx.moveTo(-7, -14); ctx.lineTo(-7, 14); for (let i = -8; i <= 8; i += 4) { ctx.moveTo(-3, i); ctx.lineTo(7, i); } break;")

# the extraction only exists during the escape
rep("function drawExit() {\n  const o = exitObj, a0 = alphaOf(o);\n  const a = Math.min(1, player.key ? Math.max(a0, .2 + .12 * Math.sin(realT * 4)) : a0);",
    "function drawExit() {\n  if (MS.phase !== 'escape') return;\n  const o = exitObj, a0 = alphaOf(o);\n  const a = Math.min(1, Math.max(a0, .35 + .2 * Math.sin(realT * 5)));")
rep("ctx.fillStyle = rgba(c, a); ctx.fillText(player.key ? 'EXIT' : 'LOCKED', o.x, o.y0 - 10); setLS('0px');",
    "ctx.fillStyle = rgba(c, a); ctx.fillText('MARCUS', o.x, o.y0 - 10); setLS('0px');")

# ---------- drawing ----------
rep("    ctx = plx; drawEnemies(); if (showPlayer) drawPlayer(); ctx = wctx; playerLayerUsed = true;",
    "    ctx = plx; drawEnemies(); if (showPlayer) { drawMarks(); drawPlayer(); } ctx = wctx; playerLayerUsed = true;")
rep("  drawBullets(); drawParticles(); drawPopups();\n  ctx.globalCompositeOperation = 'source-over';\n  ctx.restore();",
    "  drawBullets(); drawParticles(); drawBossFX(); drawPopups();\n  ctx.globalCompositeOperation = 'source-over';\n  ctx.restore();")
rep("    ctx.strokeStyle = rgba(P.key ? A : C, .95); ctx.lineWidth = 1.5; ctx.beginPath();",
    "    const OB = objective();\n    ctx.strokeStyle = rgba(OB.c, .95); ctx.lineWidth = 1.5; ctx.beginPath();")
rep("    text(P.key ? 'Reach the exit' : 'Find the keycard', x + 38 * S, dy, 17 * S, P.key ? A : Wt, .95, 'left', 600, '1px');",
    "    text(OB.t, x + 38 * S, dy, 17 * S, OB.c, .95, 'left', 600, '1px');")
rep("    const ht = time - compass.t, ca = .4 + .6 * Math.max(0, 1 - ht / 2.4), oc = P.key ? A : Wt;",
    "    const ht = time - compass.t, ca = .4 + .6 * Math.max(0, 1 - ht / 2.4), oc = objective().c;")
rep("      text(`${P.key ? 'EXIT' : 'KEYCARD'}  ·  ${Math.round(compass.d / T * 1.5)}m`",
    "      text(`${objective().s}  ·  ${Math.round(compass.d / T * 1.5)}m`")
rep("    ab(bx, '␣', 'DASH', P.dashCD, .8, 'sp');",
    "    ab(bx, '␣', MS.target ? 'STRIKE' : 'DASH', MS.target ? 0 : P.dashCD, .8, 'sp');\n    if (MS.target) { hexPath(bx, yy, 24 * S + 5 + Math.sin(realT * 10) * 2); ctx.strokeStyle = rgba(C, .9); ctx.lineWidth = 2; ctx.stroke(); }")
rep("    text(msg.text ? s : s, W / 2 - tw / 2, y, sz, CARR[msg.col], a, 'left', 700, `${4 * S}px`);\n  }\n}", "XX", 0)
rep("    text(s, W / 2 - tw / 2, y, sz, CARR[msg.col], a, 'left', 700, `${4 * S}px`);\n  }\n}",
    "    text(s, W / 2 - tw / 2, y, sz, CARR[msg.col], a, 'left', 700, `${4 * S}px`);\n  }\n  drawMissionHUD(S, pad);\n}")
rep("""  text("Find the keycard. Reach the exit. Stay quiet — or don't.", W / 2, H * .38 + 84 * s, 15 * s, CARR[3], a * .6, 'center', 500, '2px');""",
    """  text('Take the vault key. Kill The Conductor. Take the ledger. Get out.', W / 2, H * .38 + 84 * s, 15 * s, CARR[3], a * .6, 'center', 500, '2px');""")
rep("  glitchText('YOU WERE HEARD.', W / 2, H * .42, 60 * s, CARR[1], k2, 'center', 700, `${12 * s}px`, 3);",
    "  glitchText(MS.deathMsg || 'YOU WERE HEARD.', W / 2, H * .42, 60 * s, CARR[1], k2, 'center', 700, `${12 * s}px`, 3);")
rep("['SPACE', 'Dash — brief invulnerability']", "['SPACE', 'Dash  ·  on a marked enemy: ECHO STRIKE']")
rep("['Q', 'Sonar — see all. They hear it too.']", "['Q', 'Sonar — marks enemies. They hear it too.']")

# ---------- win & results ----------
rep("""  const allKill = stats.kills === total ? 2500 : 0;
  const final = stats.score + timeBonus + clean + allKill;
  const grade = final >= 20000 ? 'S' : final >= 14000 ? 'A' : final >= 9000 ? 'B' : final >= 5000 ? 'C' : 'D';""",
"""  const allKill = stats.kills >= total ? 2500 : 0;
  const escape = Math.round(MS.escT * 60);
  const final = stats.score + timeBonus + clean + allKill + escape;
  const grade = final >= 34000 ? 'S' : final >= 25000 ? 'A' : final >= 17000 ? 'B' : final >= 10000 ? 'C' : 'D';""")
rep("  result = { total, timeBonus, clean, allKill, final, grade, best, newBest: final > best };",
    "  result = { total, timeBonus, clean, allKill, escape, final, grade, best, newBest: final > best };")
rep("""    ['KILL SCORE', stats.score], ['TIME BONUS', '+' + r.timeBonus], ['CLEAN BONUS', '+' + r.clean], ['ALL TARGETS', r.allKill ? '+' + r.allKill : '—'],
  ];""",
"""    ['THE CONDUCTOR', 'SILENCED'], ['KILL SCORE', stats.score], ['ESCAPE BONUS', '+' + r.escape], ['TIME BONUS', '+' + r.timeBonus], ['CLEAN BONUS', '+' + r.clean],
  ];""")
rep("  const px = cx - 260 * s, pw = 520 * s, ph = 10 * 27 * s + 30 * s;", "  const px = cx - 260 * s, pw = 520 * s, ph = 11 * 27 * s + 30 * s;")
rep("  glitchText('LEVEL 01 CLEARED', cx, y, 46 * s", "  glitchText('THE LEDGER IS YOURS', cx, y, 46 * s")

open(p, 'w', encoding='utf-8').write(s)
print('ok')
