"""Conservative AI upscale (Real-ESRGAN animevideo-x4, CPU) of every source photo -> assets_hd/<name>.png at 2x.
Blend 70% network / 30% plain Lanczos so real texture is kept and geometry is not repainted."""
import os, sys, time
import numpy as np
from PIL import Image
from realesrgan_ncnn_py import Realesrgan

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'assets')
DST = os.path.join(HERE, 'assets_hd')
os.makedirs(DST, exist_ok=True)
names = ['gls_black', 's_white', 'maybach', 'vclass', 'g_class', 'brake_set', 'brake_single',
         'wheels_star', 'wheels_maybach', 'e63', 'g_wheels', 'amg_wheels']
rg = Realesrgan(gpuid=-1, model=2, tilesize=256)
for n in names:
    out = os.path.join(DST, n + '.png')
    if os.path.exists(out):
        continue
    t = time.time()
    im = Image.open(os.path.join(SRC, n + '.png')).convert('RGB')
    esr = rg.process_pil(im)
    base = im.resize(esr.size, Image.LANCZOS)
    a = 0.7 * np.asarray(esr).astype(np.float32) + 0.3 * np.asarray(base).astype(np.float32)
    hd = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    hd = hd.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    hd.save(out)
    print(n, im.size, '->', hd.size, round(time.time() - t, 1), 's', flush=True)
print('DONE', flush=True)
