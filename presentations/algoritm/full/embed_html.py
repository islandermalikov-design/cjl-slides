#!/usr/bin/env python3
"""Produce a standalone HTML deck with all assets/*.png|jpg inlined as base64 data URIs."""
import base64
import mimetypes
import re

SRC = "deck.template.html"
OUT = "../algoritm-predictive-maintenance-Swiss-full.html"

with open(SRC, encoding="utf-8") as f:
    html = f.read()

paths = sorted(set(re.findall(r'assets/[a-zA-Z0-9_.\-]+\.(?:png|jpg|jpeg)', html)))
print(f"found {len(paths)} unique asset refs")

cache = {}
for p in paths:
    if p not in cache:
        mime = mimetypes.guess_type(p)[0] or "image/jpeg"
        with open(p, "rb") as f:
            data = base64.b64encode(f.read()).decode("ascii")
        cache[p] = f"data:{mime};base64,{data}"

for p, data_uri in cache.items():
    html = html.replace(f'"{p}"', f'"{data_uri}"')

with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)

print(f"wrote {OUT} ({len(html)/1024:.0f} KB)")
