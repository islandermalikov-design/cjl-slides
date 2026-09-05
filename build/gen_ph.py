# -*- coding: utf-8 -*-
import json, pathlib, sys
sys.path.insert(0, "build")
from placeholders import render
ROOT = pathlib.Path(".").resolve()
layout = json.loads(pathlib.Path("build/layout.json").read_text(encoding="utf-8"))
FONT = "build/ttf/NotoSans_0.ttf"
CAP = "ФОТОСЪЁМКА В ПРОЦЕССЕ"
done = {}
for s in layout:
    for f in s["frames"]:
        if not f["ph"]: continue
        slot = f["slot"]
        if slot in done: continue
        small = slot.startswith("final-")
        img = render(f["w"], f["h"], scale=2 if not small else 3,
                     inner_frame=not small, caption=None if small else CAP,
                     mark_u=1.3 if small else 2.4, font=FONT)
        p = f"build/ph/{slot}.png"
        img.save(p, optimize=True)
        done[slot] = p
        print(p, img.size, round(pathlib.Path(p).stat().st_size/1024), "KB")
print("итого placeholder-ов:", len(done))
