p = 'echo.html'
L = open(p, encoding='utf-8').read().split('\n')
start = next(i for i, l in enumerate(L) if l.startswith('function drawPlayer() {'))
end = next(i for i in range(start, len(L)) if L[i].startswith('function drawBullets() {'))
L[start:end] = open('assets/player_draw.js', encoding='utf-8').read().rstrip('\n').split('\n')
s = '\n'.join(L)
old = "  const len = P.weapon === 'shotgun' ? 31 : P.weapon === 'smg' ? 26 : 24;\n  const mx = P.x + Math.cos(P.a) * len, my = P.y + Math.sin(P.a) * len;"
assert old in s
s = s.replace(old, "  const tip = gunTip(P), mx = tip.x, my = tip.y, clear = los(P.x, P.y, mx, my);")
old2 = "bullets.push({ x: P.x + Math.cos(P.a) * 20, y: P.y + Math.sin(P.a) * 20, vx: Math.cos(a) * sp"
assert old2 in s
s = s.replace(old2, "bullets.push({ x: clear ? mx : P.x, y: clear ? my : P.y, vx: Math.cos(a) * sp")
sheet = open('assets/player_sheet.js', encoding='utf-8').read()
tag = '<canvas id="c"></canvas>\n<script>'
assert tag in s
s = s.replace(tag, '<canvas id="c"></canvas>\n<script>\n' + sheet + '</script>\n<script>', 1)
open(p, 'w', encoding='utf-8').write(s)
print('ok', len(s) // 1024, 'KB')
