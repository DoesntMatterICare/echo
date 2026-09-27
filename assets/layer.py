p = 'echo.html'
s = open(p, encoding='utf-8').read()
reps = [
    ("const wc = document.createElement('canvas'), ctx = wc.getContext('2d');",
     "const wc = document.createElement('canvas'), wctx = wc.getContext('2d');\nlet ctx = wctx;\n// the player is drawn on its own layer, composited after bloom so the artwork stays crisp\nconst plc = document.createElement('canvas'), plx = plc.getContext('2d');\nlet playerLayerUsed = false;"),
    ("cv.width = wc.width = W * DPR; cv.height = wc.height = H * DPR;",
     "cv.width = wc.width = plc.width = W * DPR; cv.height = wc.height = plc.height = H * DPR;"),
    ("  if (showPlayer) drawPlayer();",
     "  playerLayerUsed = false;\n  if (showPlayer) {\n    const t = ctx.getTransform();\n    plx.setTransform(1, 0, 0, 1, 0, 0); plx.clearRect(0, 0, plc.width, plc.height); plx.setTransform(t);\n    ctx = plx; drawPlayer(); ctx = wctx; playerLayerUsed = true;\n  }"),
    ("  mctx.globalAlpha = .9; mctx.drawImage(b2, 0, 0, cv.width, cv.height);",
     "  mctx.globalAlpha = .9; mctx.drawImage(b2, 0, 0, cv.width, cv.height);\n  if (playerLayerUsed) { mctx.globalCompositeOperation = 'source-over'; mctx.globalAlpha = 1; mctx.drawImage(plc, 0, 0); mctx.globalCompositeOperation = 'lighter'; }"),
    ("s: .3, pivY: 92", "s: .34, pivY: 92"),
]
for a, b in reps:
    assert s.count(a) == 1, a
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
