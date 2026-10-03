"""ECHO sound design: renders every sound effect offline (48 kHz, layered, physically-inspired synthesis,
several randomised variants each) and bakes them into sfx.js as base64 MP3.
    python assets/sfx/generate_sfx.py
"""
import base64, io, json, os, subprocess, tempfile
import numpy as np
from scipy import signal

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(7)


# ---------------------------------------------------------------- primitives
def t_(dur): return np.arange(int(dur * SR)) / SR
def noise(dur): return rng.uniform(-1, 1, int(dur * SR))
def pad(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n] if len(x) < n else x[:n]

def mix(*parts):
    n = max(len(p) + int(at * SR) for p, at in parts)  # room for layers that start late
    out = np.zeros(n)
    for p, at in parts:
        i = int(at * SR)
        if i >= n: continue
        seg = p[: n - i]
        out[i:i + len(seg)] += seg
    return out

def add(*xs): return mix(*[(x, 0) for x in xs])

def place(x, at, total):
    out = np.zeros(int(total * SR)); i = int(at * SR); seg = x[: len(out) - i]; out[i:i + len(seg)] += seg; return out

def env_exp(dur, decay, attack=0.0005):
    t = t_(dur); a = np.clip(t / max(attack, 1e-6), 0, 1)
    return a * np.exp(-t / decay)

def sos(kind, f, order=2, q=None):
    nyq = SR / 2
    if kind == 'bp':
        lo, hi = f
        return signal.butter(order, [max(lo, 10) / nyq, min(hi, nyq * .98) / nyq], btype='band', output='sos')
    return signal.butter(order, min(f, nyq * .98) / nyq, btype={'lp': 'low', 'hp': 'high'}[kind], output='sos')

def filt(x, kind, f, order=2): return signal.sosfilt(sos(kind, f, order), x)

def sweep_lp(x, f0, f1, curve=3.0):
    """time-varying one-pole lowpass from f0 to f1 (exponential glide)"""
    n = len(x); t = np.linspace(0, 1, n); f = f0 * (f1 / f0) ** (t ** (1 / curve))
    a = np.exp(-2 * np.pi * f / SR); y = np.zeros(n); s = 0.0
    for i in range(n):
        s = a[i] * s + (1 - a[i]) * x[i]; y[i] = s
    return y

def sine_glide(dur, f0, f1, curve=1.0):
    t = t_(dur); k = (t / dur) ** curve
    f = f0 * (f1 / f0) ** k
    return np.sin(2 * np.pi * np.cumsum(f) / SR)

def modes(dur, freqs, decays, amps, jitter=0.0):
    t = t_(dur); out = np.zeros(len(t))
    for f, d, a in zip(freqs, decays, amps):
        f = f * (1 + rng.uniform(-jitter, jitter))
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / d)
    return out

def sat(x, drive=2.0): return np.tanh(x * drive) / np.tanh(drive)

def room(x, size=0.35, mix_=0.3, damp=3000):
    """small synthetic room for body/tail baked into a sample"""
    n = int(size * SR); t = np.arange(n) / SR
    ir = rng.normal(0, 1, n) * np.exp(-t / (size / 5))
    ir = filt(ir, 'lp', damp); ir[0] = 0; ir /= np.max(np.abs(ir)) + 1e-9
    wet = np.pad(signal.fftconvolve(x, ir), (0, 1))[: len(x) + n]
    dry = np.pad(x, (0, n))
    return dry * (1 - mix_) + wet / (np.max(np.abs(wet)) + 1e-9) * np.max(np.abs(x)) * mix_

def fade(x, fin=0.0005, fout=0.02):
    n = len(x); a = np.ones(n)
    i = int(fin * SR); o = int(fout * SR)
    if i: a[:i] = np.linspace(0, 1, i)
    if o: a[-o:] *= np.linspace(1, 0, o)
    return x * a

def norm(x, peak=0.89): return x / (np.max(np.abs(x)) + 1e-9) * peak

def grains(dur, rate, glen, band, decay=0.004):
    """sparse crackle: many tiny filtered noise grains"""
    out = np.zeros(int(dur * SR))
    for _ in range(int(dur * rate)):
        at = rng.uniform(0, dur - glen); g = noise(glen) * env_exp(glen, decay)
        g = filt(g, 'bp', band) * rng.uniform(.2, 1)
        i = int(at * SR); out[i:i + len(g)] += g
    return out


# ---------------------------------------------------------------- designs
def gunshot(kind):
    p = dict(pistol=(1.0, 150, 0.25, 0.05, 0.55), smg=(0.8, 175, 0.18, 0.035, 0.35), enemy=(0.9, 160, 0.22, 0.045, 0.6),
             shotgun=(1.35, 105, 0.42, 0.09, 0.9), heavy=(1.3, 95, 0.4, 0.085, 0.85))[kind]
    size, boomf, boomd, bodyd, taild = p
    v = rng.uniform(.93, 1.07)
    crack = filt(noise(.012), 'hp', 2500) * env_exp(.012, .0016)                      # supersonic crack / muzzle
    body = sat(filt(noise(.25), 'lp', 4200 * v) * env_exp(.25, bodyd * v), 3.0)        # gas blast
    boom = sat(sine_glide(.6, boomf * v, 38, .5) * env_exp(.6, boomd * .5), 1.6) * .9  # chest thump
    mech = modes(.08, [2150, 3420, 5230, 7100], [.02, .015, .012, .008], [.25, .2, .15, .1], .05)  # slide / action
    tail = sweep_lp(noise(taild + .5), 2600, 300) * env_exp(taild + .5, taild * .45, .004)        # room slap
    x = mix((crack * 1.2, 0), (body, .0005), (boom * 1.1 * size, 0), (mech * .35, .004), (tail * .45 * size, .008))
    if kind in ('enemy', 'heavy'): x = filt(x, 'lp', 7000)     # theirs read a touch darker than yours
    return fade(norm(room(x, .45, .22, 5000)), 0, .05)

def step(kind):
    if kind == 'paw':
        a = filt(noise(.03), 'bp', (900, 3500)) * env_exp(.03, .005)
        b = filt(noise(.03), 'bp', (700, 3000)) * env_exp(.03, .005)
        return fade(norm(mix((a, 0), (b * .7, rng.uniform(.04, .07)))))
    heavy = kind == 'heavy'; run = kind == 'run'; boot = kind in ('boot', 'heavy')
    lo = 70 if heavy else 120 if boot else 160
    heel_thump = sine_glide(.08, lo * rng.uniform(.9, 1.1), lo * .6) * env_exp(.08, .018 if heavy else .012)
    grit = filt(noise(.06), 'bp', (1800, 7000)) * env_exp(.06, .007) * rng.uniform(.5, 1)
    scuff = filt(noise(.12), 'bp', (500, 2500)) * env_exp(.12, .03, .01) * (.5 if run else .25)
    heel = add(heel_thump * (1.4 if heavy else 1), grit * (.5 if heavy else 1))
    toe = filt(noise(.05), 'bp', (900, 5000)) * env_exp(.05, .008) * .6
    x = mix((heel, 0), (scuff, .005), (toe, rng.uniform(.035, .06) if not run else .025))
    if heavy: x = sat(x, 1.5)
    return fade(norm(room(x, .25, .18, 4000)), 0, .03)

def sonar():
    dur = 2.6; t = t_(dur)
    sub = sine_glide(.5, 70, 38, .6) * env_exp(.5, .14) * .9
    f = 1480 * (1 - .02 * (t / dur))                                           # FM glass bell, gently falling
    idx = 2.2 * np.exp(-t / .25)
    bell = np.sin(2 * np.pi * np.cumsum(f) / SR + idx * np.sin(2 * np.pi * np.cumsum(f * 1.41) / SR)) * env_exp(dur, .65, .002)
    shimmer = sum(np.sin(2 * np.pi * 2960 * (1 + d) * t) for d in (-.004, .0, .005)) * env_exp(dur, .5, .01) * .12
    whoosh = sweep_lp(filt(noise(1.1), 'hp', 700), 9000, 600) * env_exp(1.1, .3, .02) * .35
    x = mix((sub, 0), (bell * .6, 0), (shimmer, .01), (whoosh, 0))
    return fade(norm(room(x, 1.6, .45, 6000)), 0, .2)

def swish():
    d = .22; t = t_(d); bell = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    n = noise(d); f = 900 * (6.0 ** (t / d))
    out = np.zeros(len(n)); s1 = s2 = 0.0
    for i in range(len(n)):   # moving state-variable bandpass
        w = 2 * np.sin(np.pi * min(f[i], 18000) / SR); s1 += w * (n[i] - s1 - .7 * s2); s2 += w * s1; out[i] = s2
    return fade(norm(out * bell))

def stab():
    thud = sine_glide(.16, 110, 55) * env_exp(.16, .035)
    wet = filt(noise(.18), 'bp', (350, 1400)) * env_exp(.18, .04) * (1 + .6 * np.sin(2 * np.pi * 38 * t_(.18)))
    tear = filt(noise(.06), 'bp', (2000, 6000)) * env_exp(.06, .008)
    fall = filt(noise(.35), 'lp', 700) * env_exp(.35, .07, .02) * .5
    return fade(norm(room(mix((thud, 0), (wet * .8, .004), (tear * .5, 0), (fall, .12)), .3, .2)), 0, .05)

def impact():
    crack = filt(noise(.02), 'hp', 1800) * env_exp(.02, .003)
    debris = grains(.25, 260, .006, (2000, 9000)) * env_exp(.25, .07)
    x = mix((crack, 0), (debris * .6, .003))
    if rng.random() < .45:   # ricochet whine
        wh = sine_glide(.4, rng.uniform(2600, 3600), rng.uniform(1300, 1900), .7) * env_exp(.4, .12, .01)
        wh *= 1 + .3 * np.sin(2 * np.pi * 32 * t_(.4))
        x = mix((x, 0), (wh * .35, .01))
    return fade(norm(room(x, .3, .25)))

def shell():
    hits = []
    for k, at in enumerate((0, .09, .16, .21)):
        hits.append((modes(.12, [4300, 6150, 8370, 9900], [.04, .03, .02, .015], [1, .7, .5, .3], .03) * (.8 ** k), at))
    return fade(norm(mix(*hits)))

def door(slam):
    if slam:
        thud = sine_glide(.4, 95, 45) * env_exp(.4, .09)
        wood = modes(.3, [180, 410, 690, 1130], [.06, .05, .035, .02], [1, .6, .4, .25], .05)
        rattle = grains(.3, 90, .01, (1500, 6000)) * env_exp(.3, .08)
        return fade(norm(room(mix((sat(thud, 2), 0), (wood * .6, 0), (rattle * .4, .02)), .45, .3)), 0, .05)
    # opening: latch click + friction creak with wobbling pitch
    latch = modes(.05, [3100, 4700], [.008, .006], [1, .6], .05)
    d = .45; t = t_(d); f0 = rng.uniform(260, 380)
    f = f0 * (1 + .35 * t / d + .08 * np.sin(2 * np.pi * 7 * t))
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    creak = filt(saw * (filt(noise(d), 'lp', 400) * 3 + .4), 'bp', (300, 2600)) * np.sin(np.pi * t / d) ** 1.5
    return fade(norm(room(mix((latch, 0), (creak * .5, .04)), .4, .25)), 0, .05)

def explosion():
    d = 2.8
    crack = filt(noise(.03), 'hp', 1500) * env_exp(.03, .005)
    sub = sat(sine_glide(1.6, 62, 24, .5) * env_exp(1.6, .5), 1.8)
    body = sweep_lp(noise(d), 5000, 120, 2.2) * env_exp(d, .55, .003)
    debris = grains(1.8, 120, .02, (800, 6000)) * env_exp(1.8, .5)
    x = mix((crack, 0), (sub * 1.2, 0), (sat(body, 2.5) * .9, 0), (debris * .35, .15))
    return fade(norm(room(x, 1.2, .3, 3000)), 0, .3)

def reload():
    out = []
    out.append((add(modes(.06, [2600, 3900, 5400], [.012, .01, .008], [1, .7, .5], .05), filt(noise(.06), 'bp', (1500, 5000)) * env_exp(.06, .01) * .5), 0))      # mag release
    out.append((filt(noise(.12), 'bp', (800, 3000)) * env_exp(.12, .04, .02) * .4, .05))                                                                      # mag slides out
    out.append((add(modes(.08, [1900, 3100, 4400], [.02, .015, .01], [1, .8, .5], .05) * 1.1, sine_glide(.06, 180, 90) * env_exp(.06, .01) * .5), .42))         # mag seats
    out.append((add(modes(.06, [2400, 3700], [.012, .009], [1, .6], .05), filt(noise(.08), 'bp', (1200, 5000)) * env_exp(.08, .02) * .6), .7))                    # slide rack
    out.append((modes(.06, [2900, 4600], [.01, .008], [1, .6], .05), .8))
    return fade(norm(mix(*out)), 0, .03)

def pump():
    a = add(modes(.08, [1500, 2600, 3900], [.02, .015, .01], [1, .7, .4], .05), filt(noise(.1), 'bp', (600, 3000)) * env_exp(.1, .02) * .6)
    b = modes(.08, [1700, 2900], [.02, .012], [1, .6], .05) + filt(noise(.08), 'bp', (800, 3500)) * env_exp(.08, .015) * .5
    return fade(norm(room(mix((a, 0), (b, .18)), .3, .2)))

def click():
    return fade(norm(add(modes(.04, [3800, 5600, 8100], [.005, .004, .003], [1, .6, .3], .08), filt(noise(.01), 'hp', 3000) * env_exp(.01, .001) * .5)))

def ui(kind):
    t = t_(.5)
    if kind == 'ui':
        x = np.sin(2 * np.pi * 1760 * t + .6 * np.sin(2 * np.pi * 3520 * t) * np.exp(-t / .02)) * env_exp(.5, .03, .001)
        return fade(norm(x, .5))
    if kind == 'pickup':
        notes = [(1318.5, 0), (1975.5, .07)]
    elif kind == 'key':
        notes = [(880, 0), (1046.5, .09), (1318.5, .18), (1174.7, .27)]    # Lena's four notes, an octave up
    else:  # win stinger
        notes = [(587.3, 0), (880, .12), (1174.7, .24), (1760, .4)]
    d = 1.6; out = []
    for f, at in notes:
        tt = t_(d)
        tone = (np.sin(2 * np.pi * f * tt + 1.2 * np.exp(-tt / .06) * np.sin(2 * np.pi * f * 2.01 * tt)) +
                .25 * np.sin(2 * np.pi * f * 3.0 * tt) * np.exp(-tt / .15)) * env_exp(d, .45, .003)
        out.append((tone, at))
    return fade(norm(room(mix(*out), 1.0, .4, 8000), .6), 0, .2)

def dash():
    d = .32; t = t_(d); e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    air = sweep_lp(noise(d), 1200, 7000, .6) * e
    low = filt(noise(d), 'lp', 300) * e * .6
    return fade(norm(air + low))

def strike():
    pre = d_ = .16; t = t_(pre); swell = (t / pre) ** 2.5
    rev = filt(noise(pre), 'bp', (2000, 9000)) * swell
    hit = add(filt(noise(.05), 'hp', 1200) * env_exp(.05, .006), sine_glide(.35, 120, 40) * env_exp(.35, .07) * .9)
    zap = np.sin(2 * np.pi * np.cumsum(np.linspace(4200, 2600, int(.4 * SR))) / SR) * env_exp(.4, .1, .002) * .3
    x = mix((rev * .6, 0), (sat(hit, 2), pre), (zap, pre))
    return fade(norm(room(x, .8, .35, 7000)), 0, .1)

def hurt():
    thump = sat(sine_glide(.3, 90, 40) * env_exp(.3, .06), 2)
    crunch = filt(noise(.12), 'bp', (500, 3000)) * env_exp(.12, .025)
    ring = np.sin(2 * np.pi * 3400 * t_(.8)) * env_exp(.8, .25, .02) * .08
    return fade(norm(mix((thump, 0), (crunch * .7, .003), (ring, .02))), 0, .1)

def death():
    d = 3.2; t = t_(d)
    boom = sine_glide(2.4, 70, 26, .4) * env_exp(2.4, .7)
    swell = sweep_lp(noise(d), 300, 3000, 1) * (t / d) ** 2 * np.exp(-(t - d) ** 2 / .05) * .4
    tone_ = sum(np.sin(2 * np.pi * f * t) for f in (110, 164.8, 220.5)) * env_exp(d, 1.2, .3) * .12
    return fade(norm(room(mix((boom, 0), (tone_, 0), (swell, 0)), 1.8, .5, 2500)), 0, .4)

def heart(enemy):
    f = 78 if enemy else 52
    lub = add(sine_glide(.16, f * 1.4, f * .75) * env_exp(.16, .045), filt(noise(.03), 'lp', 600) * env_exp(.03, .005) * .3)
    dub = sine_glide(.13, f * 1.6, f * .8) * env_exp(.13, .035)
    return fade(norm(sat(mix((lub, 0), (dub * .7, .17 if not enemy else .13)), 1.3)))

def clang():
    a = modes(.9, [920, 1653, 2741, 4107, 5590], [.35, .25, .18, .12, .08], [1, .7, .5, .35, .2], .03)
    b = modes(.5, [910, 1640, 2700], [.15, .1, .08], [1, .6, .4], .03) * .4
    return fade(norm(room(mix((a, 0), (b, .21)), .6, .3, 6000)), 0, .1)

def glass():
    x = add(grains(.18, 900, .004, (3000, 12000)) * env_exp(.18, .05), modes(.15, [5200, 7400, 9800], [.02, .015, .01], [1, .7, .5], .2) * .25, filt(noise(.08), 'lp', 900) * env_exp(.08, .02) * .4)
    return fade(norm(x))

def splash():
    d = .35; t = t_(d)
    body = filt(noise(d), 'bp', (400, 3000)) * env_exp(d, .08, .005)
    bubbles = sum(np.sin(2 * np.pi * np.cumsum(np.full(int(d * SR), rng.uniform(600, 1800)) * (1 + .5 * t)) / SR) * np.exp(-((t - rng.uniform(.02, .2)) ** 2) / .0004) for _ in range(6)) * .25
    return fade(norm(body + bubbles))

def beep():
    t = t_(.12); x = np.sin(2 * np.pi * 2900 * t) * env_exp(.12, .03, .002) + .3 * np.sin(2 * np.pi * 5800 * t) * env_exp(.12, .015, .002)
    return fade(norm(x, .6))

def arm():
    x = sine_glide(.4, 1600, 3600, 1.5) * env_exp(.4, .4, .01) * .5
    return fade(norm(mix((click(), 0), (x, .02))))

def bell():
    d = 2.6; base = 1046.5; out = []
    for k, at in enumerate((0, .45, .9)):
        tt = t_(d)
        b = sum(a * np.sin(2 * np.pi * base * r * tt) * np.exp(-tt / dd) for r, a, dd in ((1, 1, .9), (2.76, .5, .5), (5.4, .3, .3), (8.93, .15, .18), (.5, .3, 1.2)))
        out.append((b * (.85 ** k), at))
    return fade(norm(room(mix(*out), 1.2, .35, 7000)), 0, .2)

def static():
    d = .5; crackle = grains(d, 400, .003, (1500, 9000)); hiss = filt(noise(d), 'bp', (2000, 7000)) * .25
    am = (rng.random(int(d * SR) // 600 + 1).repeat(600)[:int(d * SR)] > .4) * .8 + .2
    return fade(norm((crackle + hiss) * am * np.sin(np.pi * t_(d) / d)))

def hum_elec():
    d = 1.0; t = t_(d)
    buzz = sum(np.sin(2 * np.pi * 60 * h * t) / h for h in range(1, 12)) * .5
    x = sat(buzz, 2) * np.sin(np.pi * t / d) ** .5 + grains(d, 30, .004, (2000, 8000)) * .3
    return fade(norm(filt(x, 'bp', (80, 5000)), .6))

def zap():
    d = .8; x = grains(.4, 700, .003, (1000, 10000)) * env_exp(.4, .12)
    pop = sat(sine_glide(.5, 300, 40) * env_exp(.5, .1), 2.5)
    down = sine_glide(.8, 2400, 80, .5) * env_exp(.8, .25) * .3
    return fade(norm(room(mix((x, 0), (pop, .02), (down, 0)), .5, .3)), 0, .1)

def disarm():
    a = modes(.06, [3200, 4900], [.01, .008], [1, .6], .05)
    b = np.sin(2 * np.pi * 1760 * t_(.3)) * env_exp(.3, .06, .002) * .5
    c = np.sin(2 * np.pi * 2349 * t_(.3)) * env_exp(.3, .08, .002) * .5
    return fade(norm(room(mix((a, 0), (b, .05), (c, .12)), .5, .3)))

def phantom():
    d = .9; t = t_(d); rise = (t / d) ** 1.8
    sh = sum(np.sin(2 * np.pi * f * t) for f in (740, 1108, 1480, 2217)) * rise * .2
    air = sweep_lp(filt(noise(d), 'hp', 1500), 2000, 12000, .7) * rise * .5
    return fade(norm(room(sh + air, 1.0, .5, 9000)), .02, .15)

def shatter():
    d = 1.2
    shards = grains(.6, 1500, .005, (2500, 14000)) * env_exp(.6, .15)
    ring = modes(d, [2093, 2637, 3136, 4186, 5274], [.5, .4, .35, .25, .2], [1, .8, .7, .5, .4], .01) * .35
    hit = filt(noise(.04), 'hp', 1000) * env_exp(.04, .006)
    return fade(norm(room(mix((hit, 0), (shards, 0), (ring, .01)), 1.0, .4, 9000)), 0, .2)

def cloth():
    d = .45; x = grains(d, 600, .02, (600, 5000), .008) * np.sin(np.pi * t_(d) / d) ** .7
    return fade(norm(x, .7))

def dog():
    out = []
    for at in (0, rng.uniform(.18, .24)):
        d = .16; t = t_(d); f = 520 * (1 - .4 * t / d)
        src = sat(np.sin(2 * np.pi * np.cumsum(f) / SR) + .5 * filt(noise(d), 'lp', 2000), 2)
        voc = sum(filt(src, 'bp', (fc * .85, fc * 1.15)) * g for fc, g in ((800, 1), (1400, .6), (2600, .3)))
        out.append((voc * env_exp(d, .05, .004), at))
    return fade(norm(room(mix(*out), .4, .25)))

def hammer():
    d = 2.0
    thud = sat(sine_glide(.8, 58, 30, .4) * env_exp(.8, .2), 2.5)
    clang_ = modes(d, [220, 517, 977, 1530, 2290, 3150], [.9, .6, .45, .3, .2, .12], [1, .8, .6, .45, .3, .2], .02) * .45
    crack = filt(noise(.03), 'hp', 1200) * env_exp(.03, .004)
    hiss = fade(filt(noise(1.0), 'hp', 3000) * env_exp(1.0, .3, .2) * .15, 0, .5)  # steam bleeds off, no hard edge
    return fade(norm(room(mix((crack, 0), (thud, 0), (clang_, 0), (hiss, .1)), 1.4, .35, 4000)), 0, .3)

def thunder():
    d = 6.0; t = t_(d)
    crack = sweep_lp(noise(.6), 9000, 1500, 1) * env_exp(.6, .12) * .7
    roll = filt(noise(d), 'lp', 260) * (np.exp(-t / 1.8)) * (.6 + .4 * filt(rng.uniform(0, 1, len(t)), 'lp', 3) * 30)
    sub = filt(noise(d), 'lp', 70) * np.exp(-t / 2.2) * 1.5
    return fade(norm(mix((crack, 0), (sat(roll, 1.5), .15), (sub, .1))), .005, .8)

def lena():
    """felt-piano take on her four notes (additive with hammer noise + inharmonic stretch)"""
    out = []
    for i, f in enumerate((440, 523.25, 659.25, 587.33)):
        d = 1.6; tt = t_(d)
        note = sum((1 / h ** 1.3) * np.sin(2 * np.pi * f * h * (1 + .0004 * h * h) * tt) * np.exp(-tt / (.9 / h ** .5)) for h in range(1, 9))
        note = add(note * env_exp(d, 2, .004), filt(noise(.02), 'bp', (f, f * 6)) * env_exp(.02, .004) * .2)
        out.append((note, i * .3))
    return fade(norm(room(mix(*out), 1.3, .4, 5000), .7), 0, .3)

def loop_room():
    d = 8.0; t = t_(d)
    x = filt(noise(d), 'lp', 220) * .6 + filt(noise(d), 'bp', (1800, 4000)) * .05
    x += sum(np.sin(2 * np.pi * f * t) * a for f, a in ((50, .08), (100, .04), (150, .02)))
    n = int(.5 * SR); x[:n] = x[:n] * np.linspace(0, 1, n) + x[-n:] * np.linspace(1, 0, n)   # seamless loop
    return norm(x[:-n], .5)

def loop_tension():
    d = 8.0; t = t_(d)
    drone = sum(np.sin(2 * np.pi * f * t + .3 * np.sin(2 * np.pi * .13 * t)) * a for f, a in ((36.7, .5), (55, .35), (73.4, .2), (110.2, .08), (164.8, .05)))
    pulse = (np.sin(2 * np.pi * .5 * t) * .5 + .5) ** 6
    hiss = filt(noise(d), 'bp', (300, 1200)) * .12 * (.5 + .5 * np.sin(2 * np.pi * .125 * t))
    x = sat(drone * (.7 + .3 * pulse) + hiss, 1.2)
    n = int(.5 * SR); x[:n] = x[:n] * np.linspace(0, 1, n) + x[-n:] * np.linspace(1, 0, n)
    return norm(x[:-n], .6)


BANK = {
    'shot_pistol': (lambda: gunshot('pistol'), 4), 'shot_smg': (lambda: gunshot('smg'), 4), 'shot_shotgun': (lambda: gunshot('shotgun'), 3),
    'shot_enemy': (lambda: gunshot('enemy'), 4), 'shot_heavy': (lambda: gunshot('heavy'), 3),
    'step': (lambda: step('walk'), 6), 'step_run': (lambda: step('run'), 6), 'step_boot': (lambda: step('boot'), 6),
    'step_heavy': (lambda: step('heavy'), 4), 'step_paw': (lambda: step('paw'), 4),
    'sonar': (sonar, 2), 'swish': (swish, 3), 'kill': (stab, 3), 'impact': (impact, 5), 'shell': (shell, 3),
    'door': (lambda: door(False), 3), 'door_slam': (lambda: door(True), 2), 'explosion': (explosion, 2),
    'reload': (reload, 2), 'pump': (pump, 2), 'click': (click, 3), 'ui': (lambda: ui('ui'), 1), 'pickup': (lambda: ui('pickup'), 1),
    'key': (lambda: ui('key'), 1), 'win': (lambda: ui('win'), 1), 'dash': (dash, 3), 'strike': (strike, 3), 'hurt': (hurt, 3),
    'death': (death, 1), 'heart': (lambda: heart(False), 2), 'heart_enemy': (lambda: heart(True), 2), 'clang': (clang, 2),
    'glass': (glass, 4), 'splash': (splash, 4), 'beep': (beep, 1), 'arm': (arm, 1), 'bell': (bell, 1), 'static': (static, 3),
    'hum_elec': (hum_elec, 1), 'zap': (zap, 2), 'disarm': (disarm, 1), 'phantom': (phantom, 1), 'shatter': (shatter, 2),
    'cloth': (cloth, 2), 'dog': (dog, 3), 'hammer': (hammer, 2), 'thunder': (thunder, 2), 'lena': (lena, 1),
    'loop_room': (loop_room, 1), 'loop_tension': (loop_tension, 1),
}


def encode(x):
    with tempfile.TemporaryDirectory() as d:
        wav = os.path.join(d, 'a.wav'); mp3 = os.path.join(d, 'a.mp3')
        from scipy.io import wavfile
        wavfile.write(wav, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', wav, '-ac', '1', '-b:a', '112k', mp3], check=True)
        return base64.b64encode(open(mp3, 'rb').read()).decode()


def main():
    out = {}
    for name, (fn, n) in BANK.items():
        out[name] = [encode(fn()) for _ in range(n)]
        print(f'  {name:14s} x{n}')
    js = '// generated by generate_sfx.py — ECHO sound design, base64 mp3 variants\nwindow.SFX_BANK = ' + json.dumps(out) + ';\n'
    open(os.path.join(HERE, 'sfx.js'), 'w', encoding='utf-8').write(js)
    print(f'sfx.js: {len(js) / 1e6:.2f} MB, {sum(len(v) for v in out.values())} samples')


if __name__ == '__main__':
    main()
