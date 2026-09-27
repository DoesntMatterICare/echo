import cv2, numpy as np, base64, json, sys
SP = sys.argv[1]
im = cv2.imread('assets/player_src.png', cv2.IMREAD_UNCHANGED).astype(np.float32)
al = im[:, :, 3]; lum = im[:, :, :3].mean(2)
runs = [(49, 252), (292, 488), (533, 733), (779, 979), (1032, 1234), (1282, 1474), (1518, 1718), (1760, 1953)]
guns = []
for (a, b) in runs:
    # the pistol: a bright, fully-opaque ~12px wide vertical bar between y 380 and 450
    band = ((lum[380:450, a:b] > 185) & (al[380:450, a:b] > 230)).astype(np.float32)
    col = band.sum(0)
    win = np.convolve(col, np.ones(12), 'valid')
    gx = a + int(np.argmax(win)) + 6
    # vertical extent: rows where the bar is bright near gx
    strip = (lum[300:600, gx - 5:gx + 6] > 170).sum(1) >= 6
    ys = np.nonzero(strip)[0] + 300
    # longest contiguous run containing 415
    runsy = np.split(ys, np.where(np.diff(ys) > 3)[0] + 1)
    r = [q for q in runsy if q.min() <= 415 <= q.max()] or [max(runsy, key=len)]
    guns.append((gx, int(r[0].min()), int(r[0].max())))
dbg = (im[:, :, :3] * (al[:, :, None] / 255)).astype(np.uint8).copy()
for (gx, y0, y1) in guns: cv2.rectangle(dbg, (gx - 10, y0), (gx + 10, y1 + 4), (0, 0, 255), 1)
cv2.imwrite(SP + '/gundbg.png', dbg[120:600])
print(guns)
json.dump(guns, open('assets/guns.json', 'w'))
