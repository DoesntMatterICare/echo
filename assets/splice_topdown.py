import re
p = 'echo.html'
s = open(p, encoding='utf-8').read()
L = s.split('\n')
start = next(i for i, l in enumerate(L) if l.startswith('// ---------- characters ----------'))
end = next(i for i in range(start, len(L)) if L[i].startswith('function drawBullets() {'))
L[start:end] = open('assets/topdown.js', encoding='utf-8').read().rstrip('\n').split('\n')
s = '\n'.join(L)
# drop the embedded sprite sheet
s2 = re.sub(r'<script>\nconst PLAYER_SHEET_SRC = "[^"]*";\nconst PLAYER_SHEET = [^\n]*\n</script>\n', '', s, count=1)
assert s2 != s, 'sheet block not found'
s = s2
reps = [
    ("    afterimages.push({ x: P.x, y: P.y, a: P.a, t: time, w: P.walk });",
     "    afterimages.push({ x: P.x, y: P.y, a: P.a, t: time, w: P.walk, ma: P.moveA, ph: P.stepPh });"),
    ("  P.walk += moved * .12;",
     "  P.walk += moved * .12;\n  P.stepPh = (P.stepPh || 0) + moved * PI / (P.running ? 58 : 46);\n  if (P.moveA === undefined) P.moveA = P.a;\n  if (P.speedNow > 25) P.moveA = turnTo(P.moveA, Math.atan2(P.vy, P.vx), dt * 14);\n  else if (P.moveAmt < .1) P.moveA = turnTo(P.moveA, P.a, dt * 6);"),
]
for a, b in reps:
    assert s.count(a) == 1, a[:70]
    s = s.replace(a, b)
for bad in ['PSPR', 'ESPR', 'PLAYER_SHEET', 'drawHuman(', 'drawEnemySprite(', 'drawPlayerSprite(']:
    assert bad not in s, bad
open(p, 'w', encoding='utf-8').write(s)
print('ok', len(s) // 1024, 'KB')
