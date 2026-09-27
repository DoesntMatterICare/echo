p = 'echo.html'
s = open(p, encoding='utf-8').read()
L = s.split('\n')
start = next(i for i, l in enumerate(L) if l.startswith('function drawCorpse(e, a) {'))
end = next(i for i in range(start, len(L)) if L[i].startswith('// ---------- player sprite'))
L[start:end] = open('assets/enemy_draw.js', encoding='utf-8').read().rstrip('\n').split('\n')
s = '\n'.join(L)
reps = [
    # build red + hot variants once the sheet decodes
    ("    PSPR.ready = true;\n",
     "    PSPR.ready = true;\n    ESPR.red = recolorSheet(im, [255, 46, 70], .5); ESPR.hot = recolorSheet(im, [255, 232, 238], 1); ESPR.ready = true;\n"),
    ("    if (ai.enemy) drawHuman(ai.x, ai.y, ai.a, { col: CARR[1], alpha: k * .3, kind: ai.enemy, walk: ai.w, move: 1, weapon: ETYPE[ai.enemy].w });",
     "    if (ai.enemy) drawEnemySprite(ai.x, ai.y, ai.a, { kind: ai.enemy, frame: enemyFrame(ai.w, 1), alpha: k * .4, additive: true });"),
    ("  const mx = e.x + Math.cos(a0) * (e.type === 'heavy' ? 40 : 32), my = e.y + Math.sin(a0) * (e.type === 'heavy' ? 40 : 32);",
     "  const tip = enemyTip(e), mx = tip.x, my = tip.y;"),
    # enemies + player share the crisp character layer
    ("  drawEnemies();\n  playerLayerUsed = false;\n  if (showPlayer) {\n    const t = ctx.getTransform();\n    plx.setTransform(1, 0, 0, 1, 0, 0); plx.clearRect(0, 0, plc.width, plc.height); plx.setTransform(t);\n    ctx = plx; drawPlayer(); ctx = wctx; playerLayerUsed = true;\n  }",
     "  {\n    const t = ctx.getTransform();\n    plx.setTransform(1, 0, 0, 1, 0, 0); plx.clearRect(0, 0, plc.width, plc.height); plx.setTransform(t);\n    ctx = plx; drawEnemies(); if (showPlayer) drawPlayer(); ctx = wctx; playerLayerUsed = true;\n  }"),
    # HUD and menus go on the crisp layer too, so characters never cover them
    ("  if (state === 'title') { drawWorld(false); drawTitle(); drawCursor(); composite(); requestAnimationFrame(frame); return; }\n  drawWorld(true); drawIndicators();",
     "  if (state === 'title') { drawWorld(false); ctx = plx; plx.setTransform(DPR, 0, 0, DPR, 0, 0); drawTitle(); drawCursor(); ctx = wctx; composite(); requestAnimationFrame(frame); return; }\n  drawWorld(true);\n  ctx = plx; plx.setTransform(DPR, 0, 0, DPR, 0, 0);\n  drawIndicators();"),
    ("  drawCursor();\n  composite();\n  requestAnimationFrame(frame);",
     "  drawCursor();\n  ctx = wctx;\n  composite();\n  requestAnimationFrame(frame);"),
]
for a, b in reps:
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
