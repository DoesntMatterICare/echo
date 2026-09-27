import cv2, numpy as np, base64, json
im = cv2.imread('assets/player_src.png', cv2.IMREAD_UNCHANGED)
al = im[:, :, 3].astype(np.float32)
runs = [(49, 252), (292, 488), (533, 733), (779, 979), (1032, 1234), (1282, 1474), (1518, 1718), (1760, 1953)]
guns = json.load(open('assets/guns.json'))
S = 0.55; Y0, Y1 = 128, 572; FWs = 250; PIVY = 262
FW, FH = round(FWs * S), round((Y1 - Y0) * S)
sheet = np.zeros((FH, FW * 8, 4), np.uint8)
meta = []
for i, (a, b) in enumerate(runs):
    ys, xs = np.nonzero(al[144:300, a:b] > 128); cx = a + xs.mean()
    x0 = int(round(cx - FWs / 2))
    crop = np.zeros((Y1 - Y0, FWs, 4), np.uint8)
    sx0, sx1 = max(0, x0), min(im.shape[1], x0 + FWs)
    crop[:, sx0 - x0:sx1 - x0] = im[Y0:Y1, sx0:sx1]
    # premultiply-safe resize
    c = crop.astype(np.float32); c[:, :, :3] *= c[:, :, 3:] / 255
    r = cv2.resize(c, (FW, FH), interpolation=cv2.INTER_AREA)
    a_ = r[:, :, 3:]; rgb = np.where(a_ > 0, r[:, :, :3] * 255 / np.maximum(a_, 1e-3), 0)
    out = np.dstack([np.clip(rgb, 0, 255), np.clip(a_, 0, 255)]).astype(np.uint8)
    sheet[:, i * FW:(i + 1) * FW] = out
    gx, gy0, gy1 = guns[i]
    meta.append({'gx': round((gx - cx) * S, 1), 'gy0': round((gy0 - PIVY) * S, 1), 'gy1': round((gy1 + 8 - PIVY) * S, 1)})
cv2.imwrite('assets/player_sheet.png', sheet, [cv2.IMWRITE_PNG_COMPRESSION, 9])
b64 = base64.b64encode(open('assets/player_sheet.png', 'rb').read()).decode()
info = {'fw': FW, 'fh': FH, 'px': FW / 2, 'py': (PIVY - Y0) * S, 'frames': meta}
open('assets/player_sheet.js', 'w').write('const PLAYER_SHEET_SRC = "data:image/png;base64,' + b64 + '";\nconst PLAYER_SHEET = ' + json.dumps(info) + ';\n')
print(FW, FH, len(b64) // 1024, 'KB', json.dumps(info))
