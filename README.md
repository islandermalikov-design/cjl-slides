---
languages:
  - en
  - zh
  - ja
---

# cjl-slides

Create stunning HTML presentations with 24 international design styles, convertable to .pptx format.

[简体中文](README_zh.md) | [日本語](README_ja.md)

---

## Features

- **Zero Dependency** — Single HTML files with inline CSS/JS, no npm/build tools
- **24 Design Styles** — Pitch, Linear, Swiss, Cyberpunk, Y2K, 国风, and more
- **PPTX Export** — Convert generated HTML slides to .pptx for further editing in PowerPoint
- **Anti-AI-Slop** — Curated distinctive styles avoiding generic AI aesthetics
- **Strict Design Rules** — Font whitelist, color variables, container ratios, chart standards

---

## Quick Start

### Install

```bash
# Claude Code
mkdir -p ~/.claude/skills/cjl-slides
git clone https://github.com/0xcjl/cjl-slides.git ~/.claude/skills/cjl-slides

# Or manually copy all files to ~/.claude/skills/cjl-slides/
```

### Usage

```
/cjl-slides
```

Then:
1. Select style(s) from the 24 style directory
2. Provide content or have AI generate it
3. Receive HTML slides file
4. Optionally export to .pptx

---

## 24 Design Styles

| Category | Styles |
|----------|--------|
| Business/VC | Pitch.com, Bloomberg Businessweek, Startup VC Pitch |
| Product/Tech | Linear App, Vercel, NASA, Glassmorphism |
| Creative | Framer, Figma, Duotone, Cyberpunk Neon |
| Culture/Art | Swiss Typography, Are.na, Wabi-Sabi, Chinese Ink |
| Brand/Luxury | Teenage Engineering, Muji, Luxury Fashion House |
| Academic | Stripe Press, Apple Keynote Dark, Academic Scholarly |
| Retro/Playful | Memphis Revival, Brutalist Web, Y2K Retro Digital |

Full style previews: [STYLE_PREVIEWS.md](STYLE_PREVIEWS.md)

---

## Design Rules

### Font Whitelist

**Display fonts (h1/h2) — choose one group:**
- Serif: Playfair Display, Fraunces, DM Serif Display, Cormorant Garamond
- Sans: Syne, Bebas Neue

**Body fonts (p) — choose one:** DM Sans, Outfit, Figtree, Epilogue

**Chinese overlay:** Serif → Noto Serif SC | Sans → Noto Sans SC

### Color System

```css
--color-primary: #xxx;   /* 60% */
--color-secondary: #xxx; /* 30% */
--color-accent: #xxx;    /* 10% */
```

### Container Ratio (fixed)

```css
.slide {
  width: min(100vw, 177.78vh);
  height: min(56.25vw, 100vh);
  overflow: hidden;
}
```

---

## PPTX Export

After generating HTML slides:

1. AI asks: "是否需要 .pptx 格式文件？"
2. Run the conversion:
   ```bash
   pip3 install python-pptx
   python3 ~/.claude/skills/cjl-slides/scripts/html-to-pptx.py output.html result.pptx
   ```

---

## File Structure

```
cjl-slides/
├── SKILL.md              # Main skill file
├── STYLE_PREVIEWS.md     # 24 style preview descriptions
├── README.md              # This file
├── README_zh.md           # 简体中文版
└── scripts/
    ├── html-to-pptx.py    # HTML → PPTX converter
    └── extract-pptx.py    # PPTX → JSON extractor
```

---

## License

MIT
