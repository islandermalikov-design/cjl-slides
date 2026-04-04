---
languages:
  - en
  - zh
  - ja
---

# cjl-slides

创建视觉精美的 HTML 演示文稿，支持 24 种国际设计风格，可转换为 .pptx 格式。

[English](README.md) | [日本語](README_ja.md)

---

## 特性

- **零依赖** — 单个 HTML 文件，内联 CSS/JS，无需 npm 或构建工具
- **24 种设计风格** — Pitch、Linear、Swiss、Cyberpunk、Y2K、国风等
- **PPTX 导出** — 将生成的 HTML 幻灯片转换为 .pptx，便于在 PowerPoint 中调整
- **抗 AI 感** — 精选独特风格，避免千篇一律的 AI 美学
- **严格设计规范** — 字体白名单、配色变量、容器比例、图表标准

---

## 快速开始

### 安装

```bash
# Claude Code
mkdir -p ~/.claude/skills/cjl-slides
git clone https://github.com/0xcjl/cjl-slides.git ~/.claude/skills/cjl-slides

# 或手动复制所有文件到 ~/.claude/skills/cjl-slides/
```

### 使用

```
/cjl-slides
```

流程：
1. 从 24 种风格目录中选择
2. 提供内容或让 AI 生成
3. 收到 HTML 幻灯片文件
4. 可选导出为 .pptx

---

## 24 种设计风格

| 分类 | 风格 |
|------|------|
| 商业/融资 | Pitch.com, Bloomberg Businessweek, Startup VC Pitch |
| 产品/科技 | Linear App, Vercel, NASA, Glassmorphism |
| 创意/设计 | Framer, Figma, Duotone, Cyberpunk Neon |
| 文化/艺术 | Swiss Typography, Are.na, Wabi-Sabi, 国风 |
| 品牌/奢侈 | Teenage Engineering, Muji, Luxury Fashion House |
| 学术/政务 | Stripe Press, Apple Keynote Dark, Academic Scholarly |
| 娱乐/复古 | Memphis Revival, Brutalist Web, Y2K Retro Digital |

完整风格预览：[STYLE_PREVIEWS.md](STYLE_PREVIEWS.md)

---

## 设计规范

### 字体白名单

**展示字体（h1/h2）二选一：**
- 衬线组：Playfair Display、Fraunces、DM Serif Display、Cormorant Garamond
- 无衬线组：Syne、Bebas Neue

**正文字体（p）四选一：** DM Sans、Outfit、Figtree、Epilogue

**中文叠加：** 衬线 → Noto Serif SC | 无衬线 → Noto Sans SC

### 配色系统

```css
--color-primary: #xxx;   /* 60% */
--color-secondary: #xxx; /* 30% */
--color-accent: #xxx;    /* 10% */
```

### 容器比例（固定）

```css
.slide {
  width: min(100vw, 177.78vh);
  height: min(56.25vw, 100vh);
  overflow: hidden;
}
```

---

## PPTX 导出

生成 HTML 幻灯片后：

1. AI 会询问"是否需要 .pptx 格式文件？"
2. 运行转换：
   ```bash
   pip3 install python-pptx
   python3 ~/.claude/skills/cjl-slides/scripts/html-to-pptx.py output.html result.pptx
   ```

---

## 文件结构

```
cjl-slides/
├── SKILL.md              # 主技能文件
├── STYLE_PREVIEWS.md     # 24 风格预览
├── README.md              # English
├── README_zh.md           # 本文件
└── scripts/
    ├── html-to-pptx.py    # HTML → PPTX 转换器
    └── extract-pptx.py    # PPTX → JSON 提取器
```

---

## License

MIT
