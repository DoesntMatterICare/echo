p = 'echo.html'
s = open(p, encoding='utf-8').read()
reps = [
    # React + prologue scripts
    ("</script>\n</body>",
     "</script>\n<script src=\"https://cdnjs.cloudflare.com/ajax/libs/react/18.2.0/umd/react.production.min.js\"></script>\n"
     "<script src=\"https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.2.0/umd/react-dom.production.min.js\"></script>\n"
     "<script src=\"prologue.js\"></script>\n</body>"),
    # title -> prologue -> level 01
    ("  if (state === 'title') { if (c === 'Enter' || c === 'Space') startGame(false); return; }",
     "  if (state === 'prologue') return;\n  if (state === 'title') { if (c === 'Enter' || c === 'Space') beginPrologue(); return; }"),
    ("  if (state === 'title') { startGame(false); return; }",
     "  if (state === 'title') { beginPrologue(); return; }\n  if (state === 'prologue') return;"),
    ("function startGame(fromCheckpoint) {",
     "function beginPrologue() {\n  initAudio();\n  if (!window.EchoPrologue) { startGame(false); return; }\n  state = 'prologue';\n  window.EchoPrologue.play(() => startGame(false));\n}\nfunction startGame(fromCheckpoint) {"),
    ("  if (state === 'title') { drawWorld(false);",
     "  if (state === 'prologue') { mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.fillStyle = '#000'; mctx.fillRect(0, 0, cv.width, cv.height); requestAnimationFrame(frame); return; }\n  if (state === 'title') { drawWorld(false);"),
    # the objective hum is Lena's four notes
    ("  hum(x, y) { const s = spat(x, y, 3000), v = .05 + .18 * s.vol; tone({ pan: s.pan, vol: v, dur: 1.4, f0: 440, attack: .3, echo: .6 }); tone({ pan: s.pan, vol: v * .6, dur: 1.3, f0: 659, attack: .35, echo: .6, delay: .09 }); },",
     "  hum(x, y) { // Lena's four notes\n    const s = spat(x, y, 3000), v = .04 + .15 * s.vol;\n    [440, 523.25, 659.25, 587.33].forEach((f, i) => tone({ pan: s.pan, vol: v, dur: 1.1, f0: f, type: 'triangle', attack: .01, echo: .65, delay: i * .3 }));\n  },"),
    ("    [26.5, 29.0, 'THE KEYCARD HUMS  ·  FOLLOW THE COMPASS'],",
     "    [26.5, 29.0, 'THE KEYCARD HUMS HER SONG  ·  FOLLOW IT'],"),
    ("  text('LEVEL 01  ·  ' + LV.name + '   ·   🎧 HEADPHONES RECOMMENDED', x0, byy + bh + 22 * s, 11 * s, CARR[3], .45, 'left', 600, `${3 * s}px`);",
     "  text('PROLOGUE  +  LEVEL 01  ·  ' + LV.name + '   ·   🎧 HEADPHONES RECOMMENDED', x0, byy + bh + 22 * s, 11 * s, CARR[3], .45, 'left', 600, `${3 * s}px`);"),
]
for a, b in reps:
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
open(p, 'w', encoding='utf-8').write(s)
print('ok')
