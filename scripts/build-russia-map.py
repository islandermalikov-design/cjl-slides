# -*- coding: utf-8 -*-
"""SVG-пути России (силуэт + выделенный Юг) из ADM1 GeoJSON.
Внутренние границы регионов схлопываются: ребро, встречающееся у двух соседей,
выбрасывается, оставшиеся сшиваются в замкнутые контуры -> чистый силуэт.
Проекция — равновеликая коническая Альберса. Без внешних зависимостей."""
import json, math
from collections import defaultdict

SRC = "package/dist/assets/adm1/643.json"
SOUTH = {"RU-AD","RU-AST","RU-VGG","RU-KL","RU-KDA","RU-ROS",       # ЮФО
         "RU-DA","RU-IN","RU-KB","RU-KC","RU-SE","RU-CE","RU-STA",  # СКФО
         "UA-43","UA-40"}                                           # Крым, Севастополь

LON0, LAT0, LAT1, LAT2 = 100.0, 55.0, 50.0, 65.0
R = math.radians
n = (math.sin(R(LAT1)) + math.sin(R(LAT2))) / 2
C = math.cos(R(LAT1))**2 + 2*n*math.sin(R(LAT1))
rho0 = math.sqrt(C - 2*n*math.sin(R(LAT0))) / n

def project(lon, lat):
    if lon < -25: lon += 360
    th = n * R(lon - LON0)
    rho = math.sqrt(max(C - 2*n*math.sin(R(lat)), 0)) / n
    return (rho*math.sin(th), -(rho0 - rho*math.cos(th)))

def rings_of(g):
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"] if g["type"] == "MultiPolygon" else []

def outline(features):
    """границы, оставшиеся после взаимного уничтожения общих рёбер"""
    seen = defaultdict(list)
    for f in features:
        for poly in rings_of(f["geometry"]):
            for ring in poly:
                q = [(round(x, 6), round(y, 6)) for x, y in ring]
                for a, b in zip(q, q[1:]):
                    if a != b:
                        seen[(a, b) if a <= b else (b, a)].append((a, b))
    edges = [v[0] for v in seen.values() if len(v) == 1]
    inc = defaultdict(list)
    for i, (a, b) in enumerate(edges):
        inc[a].append(i); inc[b].append(i)
    used, rings = [False]*len(edges), []
    for start in range(len(edges)):
        if used[start]: continue
        used[start] = True
        a, b = edges[start]
        ring, cur = [a, b], b
        while True:
            nxt = None
            for i in inc[cur]:
                if not used[i]:
                    p, q = edges[i]
                    nxt, cur = i, (q if p == cur else p); break
            if nxt is None: break
            used[nxt] = True
            ring.append(cur)
            if cur == ring[0]: break
        if len(ring) > 3: rings.append(ring)
    return rings

def area(r):
    return sum(r[i][0]*r[i+1][1] - r[i+1][0]*r[i][1] for i in range(len(r)-1)) / 2

def simplify(pts, tol):
    if len(pts) < 4: return pts
    keep = [False]*len(pts); keep[0] = keep[-1] = True
    stack = [(0, len(pts)-1)]
    while stack:
        a, b = stack.pop()
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
            keep[bi] = True; stack += [(a, bi), (bi, b)]
    return [p for p, k in zip(pts, keep) if k]

def prepare(features, tol, min_area):
    out = []
    for ring in outline(features):
        pts = [project(x, y) for x, y in ring]
        if pts[0] != pts[-1]: pts.append(pts[0])
        if abs(area(pts)) < min_area: continue
        pts = simplify(pts, tol)
        if len(pts) < 4: continue
        if area(pts) < 0: pts.reverse()
        out.append(pts)
    return out

def to_d(rings, sx, sy, k):
    parts = []
    for r in rings:
        pr = [(round((x-sx)*k, 1), round((y-sy)*k, 1)) for x, y in r]
        seg, (px, py) = [f"M{pr[0][0]} {pr[0][1]}"], pr[0]
        for x, y in pr[1:-1]:
            if (x, y) != (px, py): seg.append(f"L{x} {y}"); px, py = x, y
        if len(seg) > 2: parts.append("".join(seg) + "Z")
    return "".join(parts)

feats = json.load(open(SRC, encoding="utf-8"))["features"]
south = [f for f in feats if f["properties"].get("iso") in SOUTH]

W = 1000.0
probe = prepare(feats, 0.0, 0.0)
xs = [p[0] for r in probe for p in r]
k = W / (max(xs) - min(xs))
tol, mina = 0.5/k, (2.2/k)**2
base_r, south_r = prepare(feats, tol, mina), prepare(south, tol, mina)
xs = [p[0] for r in base_r for p in r]; ys = [p[1] for r in base_r for p in r]
sx, sy, k = min(xs), min(ys), W/(max(xs)-min(xs))
H = round((max(ys)-min(ys))*k, 1)
db, ds = to_d(base_r, sx, sy, k), to_d(south_r, sx, sy, k)
mx, my = project(37.6173, 55.7558)
json.dump({"w": W, "h": H, "base": db, "south": ds,
           "moscow": [round((mx-sx)*k, 1), round((my-sy)*k, 1)]}, open("map.json", "w"))
print(f"viewBox 0 0 {W:.0f} {H}  | контуров: база {len(base_r)}, юг {len(south_r)}")
print(f"вес: база {len(db)/1024:.1f} КБ, юг {len(ds)/1024:.1f} КБ")
