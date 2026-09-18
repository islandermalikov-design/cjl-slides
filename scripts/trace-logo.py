# -*- coding: utf-8 -*-
"""Обводка бинарной маски логотипа в SVG-контуры (marching squares по рёбрам пикселей),
сглаживание лестницы и упрощение Дугласа-Пекера."""
import json
from collections import defaultdict

meta = json.load(open("mask.json"))
W, H = meta["w"], meta["h"]
m = open("mask.bin", "rb").read()
inside = lambda x, y: 0 <= x < W and 0 <= y < H and m[y*W + x]

# 1) направленные граничные рёбра (обход по часовой в экранных координатах)
edges = {}
for y in range(H):
    row = y*W
    for x in range(W):
        if not m[row + x]: continue
        if not inside(x, y-1): edges[(x, y)]     = (x+1, y)
        if not inside(x+1, y): edges[(x+1, y)]   = (x+1, y+1)
        if not inside(x, y+1): edges[(x+1, y+1)] = (x, y+1)
        if not inside(x-1, y): edges[(x, y+1)]   = (x, y)

# 2) сшивание в замкнутые контуры
loops, used = [], set()
for start in list(edges):
    if start in used: continue
    pt, loop = start, [start]
    while True:
        used.add(pt)
        nxt = edges.get(pt)
        if nxt is None or nxt == start: break
        if nxt in used: break
        loop.append(nxt); pt = nxt
    if len(loop) > 12: loops.append(loop)

def smooth(pts, passes=2, win=2):
    n = len(pts)
    for _ in range(passes):
        out = []
        for i in range(n):
            sx = sy = 0.0
            for k in range(-win, win+1):
                p = pts[(i+k) % n]; sx += p[0]; sy += p[1]
            out.append((sx/(2*win+1), sy/(2*win+1)))
        pts = out
    return pts

def dp(pts, tol):
    if len(pts) < 4: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    st = [(0, len(pts)-1)]
    while st:
        a, b = st.pop()
        if b <= a+1: continue
        ax, ay = pts[a]; bx, by = pts[b]
        dx, dy = bx-ax, by-ay; d2 = dx*dx + dy*dy
        best, bi = -1.0, -1
        for i in range(a+1, b):
            px, py = pts[i]
            if d2 == 0: dd = (px-ax)**2 + (py-ay)**2
            else:
                t = max(0.0, min(1.0, ((px-ax)*dx + (py-ay)*dy)/d2))
                dd = (px-ax-t*dx)**2 + (py-ay-t*dy)**2
            if dd > best: best, bi = dd, i
        if best > tol*tol:
            keep[bi] = True; st += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def area(r):
    return abs(sum(r[i][0]*r[(i+1) % len(r)][1] - r[(i+1) % len(r)][0]*r[i][1]
                   for i in range(len(r)))) / 2

K = 1000.0 / W
parts, kept = [], 0
for loop in sorted(loops, key=area, reverse=True):
    if area(loop) < 30: continue              # мусорные точки
    pts = dp(smooth(loop) + [None][:0], 1.15)
    if len(pts) < 4: continue
    kept += 1
    pr = [(round(x*K, 1), round(y*K, 1)) for x, y in pts]
    seg, prev = [f"M{pr[0][0]} {pr[0][1]}"], pr[0]
    for q in pr[1:]:
        if q != prev: seg.append(f"L{q[0]} {q[1]}"); prev = q
    parts.append("".join(seg) + "Z")

d = "".join(parts)
vb_h = round(H * K, 1)
json.dump({"d": d, "w": 1000, "h": vb_h}, open("logo_path.json", "w"))
print(f"контуров: найдено {len(loops)}, оставлено {kept} | viewBox 0 0 1000 {vb_h}")
print(f"вес пути: {len(d)/1024:.1f} КБ")
