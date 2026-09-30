"""Image toolkit for the GRANDRIMS x Mercedes-Benz deck (1080x1920 canvas)."""
import math, os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1080, 1920
SP = os.path.dirname(os.path.abspath(__file__))
AS = os.path.join(SP, 'assets')
OUT = os.path.join(SP, 'gen')
os.makedirs(OUT, exist_ok=True)

BG = (8, 9, 11)
GRAPH = (20, 23, 27)
SILVER = (196, 201, 206)
MILK = (236, 235, 231)
RED = (214, 20, 28)
FONT_MED = os.path.expanduser('~/.fonts/MontserratMedium.ttf')

rng = np.random.default_rng(7)


HD = os.path.join(SP, 'assets_hd')
USE_HD = os.environ.get('NO_HD') != '1'


def load(name):
    """Load a source photo; the enhanced 2x version if present. Box coordinates stay in ORIGINAL pixels
    (im.info['scale'] carries the factor, see crop_fill)."""
    hd = os.path.join(HD, name + '.png')
    if USE_HD and os.path.exists(hd):
        im = Image.open(hd).convert('RGB')
        im.info['scale'] = 2
        return im
    im = Image.open(os.path.join(AS, name + '.png')).convert('RGB')
    im.info['scale'] = 1
    return im


def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- photo work
def crop_fill(im, box, size):
    """Crop `box` (x0,y0,x1,y1) from im and resize (LANCZOS) to size, keeping the box aspect."""
    s = im.info.get('scale', 1)
    box = tuple(int(round(v * s)) for v in box)
    c = im.crop(box)
    if abs((c.width / c.height) - (size[0] / size[1])) > 0.01:
        # adjust box symmetrically to the target aspect
        tr = size[0] / size[1]
        cw, ch = c.size
        if cw / ch > tr:
            nw = int(ch * tr); x0 = (cw - nw) // 2; c = c.crop((x0, 0, x0 + nw, ch))
        else:
            nh = int(cw / tr); y0 = (ch - nh) // 2; c = c.crop((0, y0, cw, y0 + nh))
    c = c.resize(size, Image.LANCZOS)
    scale = size[0] / max(1, (box[2] - box[0]))
    if scale > 1.05:
        c = c.filter(ImageFilter.UnsharpMask(1.6, 70, 2))
    else:
        c = c.filter(ImageFilter.UnsharpMask(1.0, 40, 2))
    return c


def grade(im, sat=0.82, contrast=1.10, gamma=1.0, cool=0.035, vign=0.0, lift=0.0, grain=3.2, mult=1.0):
    a = np.asarray(im).astype(np.float32) / 255.0
    a = np.clip(a, 0, 1) ** gamma
    a = (a - 0.5) * contrast + 0.5
    lum = (a * np.array([0.299, 0.587, 0.114], np.float32)).sum(-1, keepdims=True)
    a = lum + (a - lum) * sat
    sh = (1 - lum)[..., 0]
    a[..., 2] += cool * sh
    a[..., 0] -= cool * 0.6 * sh
    a = a * mult + lift
    if vign > 0:
        h, w = a.shape[:2]
        yy, xx = np.mgrid[0:h, 0:w]
        d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
        a *= (1 - vign * smooth((d - 0.45) / 0.9))[..., None]
    if grain:
        a += rng.normal(0, grain / 255.0, a.shape[:2])[..., None]
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


# ---------------------------------------------------------------- backgrounds
def base_dark(w=W, h=H, hot=(0.85, 0.12), hot_amt=13, lines=True):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = yy / h
    c = np.zeros((h, w, 3), np.float32)
    top = np.array((19, 22, 26), np.float32); bot = np.array((6, 7, 9), np.float32)
    c += top * (1 - t)[..., None] + bot * t[..., None]
    d = np.sqrt(((xx - hot[0] * w) / w) ** 2 + ((yy - hot[1] * h) / h) ** 2)
    c += (hot_amt * np.exp(-(d / 0.42) ** 2))[..., None] * np.array((0.95, 1.0, 1.08), np.float32)
    if lines:
        for x in range(0, w, 135):
            c[:, max(0, x - 1):x + 1, :] += 2.2
    c += rng.normal(0, 1.6, (h, w))[..., None]
    return Image.fromarray(np.clip(c, 0, 255).astype(np.uint8))


def base_light(w=W, h=H):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = yy / h
    c = np.zeros((h, w, 3), np.float32)
    c += (np.array((240, 239, 236), np.float32) * (1 - t)[..., None] + np.array((229, 228, 224), np.float32) * t[..., None])
    for x in range(0, w, 135):
        c[:, max(0, x - 1):x + 1, :] -= 3
    c += rng.normal(0, 1.4, (h, w))[..., None]
    return Image.fromarray(np.clip(c, 0, 255).astype(np.uint8))


def star_layer(cx, cy, r, w=W, h=H, alpha=0.08, color=(214, 220, 226), lw=3, rings=True):
    """Fine-line three-pointed star inside a ring, drawn on a transparent layer (supersampled)."""
    S = 2
    L = Image.new('L', (w * S, h * S), 0)
    d = ImageDraw.Draw(L)
    cx, cy, r = cx * S, cy * S, r * S
    lwS = lw * S
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=255, width=lwS)
    if rings:
        r2 = r * 0.93
        d.ellipse((cx - r2, cy - r2, cx + r2, cy + r2), outline=255, width=max(1, lwS // 2))
    for ang in (-90, 30, 150):
        a = math.radians(ang)
        px, py = cx + math.cos(a) * r * 0.985, cy + math.sin(a) * r * 0.985
        # tapered arm: narrow kite from centre to the ring
        n = (-math.sin(a), math.cos(a))
        wd = r * 0.035
        pts = [(cx + n[0] * wd, cy + n[1] * wd), (px, py), (cx - n[0] * wd, cy - n[1] * wd)]
        d.polygon(pts, outline=255, fill=None)
        d.line([pts[0], pts[1], pts[2], pts[0]], fill=255, width=lwS)
    L = L.resize((w, h), Image.LANCZOS)
    arr = (np.asarray(L).astype(np.float32) / 255.0) * alpha
    return arr


def add_layer(base, arr, color):
    """Composite a flat colour through alpha array `arr` onto PIL image base."""
    b = np.asarray(base).astype(np.float32)
    col = np.array(color, np.float32)
    b = b * (1 - arr[..., None]) + col * arr[..., None]
    return Image.fromarray(np.clip(b, 0, 255).astype(np.uint8))


def vgrad(h, a0, a1, p0, p1):
    """Row-wise alpha ramp: a0 above p0, a1 below p1, smooth between (pixel rows)."""
    y = np.arange(h, dtype=np.float32)
    t = smooth((y - p0) / max(1, (p1 - p0)))
    return a0 + (a1 - a0) * t


def paste_faded(base, photo, x, y, fade_top=0, fade_bot=0, fade_l=0, fade_r=0):
    """Paste photo with soft alpha-faded edges (px lengths)."""
    ph, pw = photo.height, photo.width
    m = np.ones((ph, pw), np.float32)
    yy = np.arange(ph, dtype=np.float32)[:, None]; xx = np.arange(pw, dtype=np.float32)[None, :]
    if fade_top: m *= smooth(yy / fade_top)
    if fade_bot: m *= smooth((ph - 1 - yy) / fade_bot)
    if fade_l: m *= smooth(xx / fade_l)
    if fade_r: m *= smooth((pw - 1 - xx) / fade_r)
    base = base.copy()
    reg = base.crop((x, y, x + pw, y + ph))
    out = Image.composite(photo, reg, Image.fromarray((m * 255).astype(np.uint8)))
    base.paste(out, (x, y))
    return base


def overlay_png(arr_rgba, name):
    p = os.path.join(OUT, name)
    Image.fromarray(arr_rgba).save(p)
    return p


def grad_overlay(w, h, color, a_top, a_bot, p0=None, p1=None):
    """Vertical-gradient RGBA overlay (single colour, varying alpha)."""
    p0 = 0 if p0 is None else p0
    p1 = h if p1 is None else p1
    a = vgrad(h, a_top, a_bot, p0, p1)
    arr = np.zeros((h, w, 4), np.uint8)
    arr[..., 0], arr[..., 1], arr[..., 2] = color
    arr[..., 3] = (np.repeat(a[:, None], w, 1) * 255).astype(np.uint8)
    return arr


def save_jpg(im, name, q=90):
    p = os.path.join(OUT, name)
    im.convert('RGB').save(p, quality=q, subsampling=0)
    return p


# ---------------------------------------------------------------- logo
def make_logo():
    """Cut the GRANDRIMS wordmark out of the branded GLS photo (only available brand artwork)."""
    im = Image.open(os.path.join(AS, 'gls_black.png')).convert('RGB').crop((530, 672, 748, 720))  # original pixels, not enhanced
    a = np.asarray(im).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    white = (np.minimum(np.minimum(r, g), b) > 165)
    red = (r > 150) & (g < 95) & (b < 95)
    m = (white | red).astype(np.float32)
    Mimg = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.6))
    # black outline around glyphs (as in the source) keeps them crisp on any bg
    out = np.zeros((im.height, im.width, 4), np.uint8)
    out[..., :3] = a.astype(np.uint8)
    out[..., 3] = np.asarray(Mimg)
    lg = Image.fromarray(out, 'RGBA')
    bbox = lg.getbbox()
    lg = lg.crop(bbox)
    return lg


def logo_variants():
    lg = make_logo()
    k = 4
    big = lg.resize((lg.width * k, lg.height * k), Image.LANCZOS)
    p = os.path.join(OUT, 'logo.png'); big.save(p)
    return p, big.size


# ---------------------------------------------------------------- placeholders
def placeholder(name, w, h, label, sub='Заменить изображение (Изменить рисунок)'):
    im = base_dark(w, h, hot=(0.5, 0.45), hot_amt=16, lines=False)
    arr = star_layer(w / 2, h / 2, min(w, h) * 0.30, w=w, h=h, alpha=0.10)
    im = add_layer(im, arr, (214, 220, 226))
    d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(FONT_MED, 30); f2 = ImageFont.truetype(FONT_MED, 22)
    # corner marks
    m = 46; s = 52; col = (120, 126, 132)
    for (x, y, dx, dy) in ((m, m, 1, 1), (w - m, m, -1, 1), (m, h - m, 1, -1), (w - m, h - m, -1, -1)):
        d.line([(x, y), (x + dx * s, y)], fill=col, width=2); d.line([(x, y), (x, y + dy * s)], fill=col, width=2)
    tw = d.textlength(label, font=f1)
    d.text(((w - tw) / 2, h / 2 + min(w, h) * 0.30 + 8), label, font=f1, fill=(176, 182, 188))
    tw2 = d.textlength(sub, font=f2)
    d.text(((w - tw2) / 2, h / 2 + min(w, h) * 0.30 + 52), sub, font=f2, fill=(110, 116, 122))
    return save_jpg(im, name, 88)
