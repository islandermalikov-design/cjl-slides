# -*- coding: utf-8 -*-
"""Страница-помощник: промт с кнопкой копирования + список фото-ссылок."""
import html
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
e = html.escape


def inline(s):
    s = e(s)
    s = re.sub(r'\[([^\]]+)\]\((https?://[^)\s]+)\)',
               r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    s = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = s.replace(' · ', ' <span class="dot">·</span> ')
    return s


def md_to_html(md):
    out, i, lines = [], 0, md.split("\n")
    while i < len(lines):
        ln = lines[i]
        if ln.startswith("## "):
            out.append("<h3>%s</h3>" % inline(ln[3:]))
        elif ln.startswith("# "):
            out.append('<h2 class="grp">%s</h2>' % inline(ln[2:]))
        elif ln.strip() == "---":
            out.append('<hr>')
        elif ln.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip("|").split("|")])
                i += 1
            i -= 1
            head, body = rows[0], [r for r in rows[2:]]
            th = "".join("<th>%s</th>" % inline(c) for c in head)
            tb = "".join("<tr>%s</tr>" % "".join("<td>%s</td>" % inline(c) for c in r)
                         for r in body)
            out.append('<div class="tw"><table><thead><tr>%s</tr></thead><tbody>%s</tbody></table></div>' % (th, tb))
        elif ln.strip():
            buf = []
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(("|", "#", "---")):
                buf.append(lines[i])
                i += 1
            i -= 1
            out.append("<p>%s</p>" % inline(" ".join(buf)))
        i += 1
    return "\n".join(out)


def build():
    raw = open(os.path.join(HERE, "ПРОМТ_для_ChatGPT.md"), encoding="utf-8").read()
    prompt = raw.split("---\n", 1)[1].strip()          # без служебной шапки
    links = open(os.path.join(HERE, "ФОТО_ссылки.md"), encoding="utf-8").read()
    links = links.split("\n", 1)[1].strip()            # без первого заголовка

    n_lines = prompt.count("\n") + 1
    n_chars = len(prompt)

    css = """
:root{--paper:#F1F3EF;--surface:#FFF;--sunk:#E7EAE3;--ink:#12181D;--ink2:#5B666E;
 --line:#D3D8D0;--line2:#BEC5BA;--accent:#A6461A;--accent2:#8E3C15;--steel:#2B4757;--ok:#2F6B3D;--r:3px}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#0E1317;--surface:#161D23;
 --sunk:#1C252C;--ink:#E3E9EC;--ink2:#8E9BA4;--line:#28323A;--line2:#3A4852;--accent:#E07B44;
 --accent2:#EE9257;--steel:#8AAFC5;--ok:#63B076}}
:root[data-theme="dark"]{--paper:#0E1317;--surface:#161D23;--sunk:#1C252C;--ink:#E3E9EC;--ink2:#8E9BA4;
 --line:#28323A;--line2:#3A4852;--accent:#E07B44;--accent2:#EE9257;--steel:#8AAFC5;--ok:#63B076}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 "PT Sans","Segoe UI",Roboto,sans-serif}
h1,h2,h3{font-family:"Oswald","Arial Narrow",sans-serif;font-weight:500;margin:0;text-wrap:balance}
a{color:var(--accent2)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.page{max-width:1240px;margin:0 auto;padding-inline:20px;padding-block:0 60px}
.top{padding-block:40px 22px;border-bottom:2px solid var(--ink)}
.eyebrow{font-family:"Oswald",sans-serif;font-size:12px;letter-spacing:.32em;text-transform:uppercase;
 color:var(--accent);margin:0 0 10px}
.top h1{font-size:clamp(30px,5vw,50px);text-transform:uppercase;line-height:1.04}
.top p{max-width:62ch;color:var(--ink2);margin:12px 0 0}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:34px;margin-top:32px;align-items:start}
@media (max-width:900px){.cols{grid-template-columns:1fr;gap:44px}}
.panel h2{font-size:23px;text-transform:uppercase;margin-bottom:4px}
.panel>p.sub{color:var(--ink2);margin:0 0 16px}
.bar{position:sticky;top:0;z-index:5;background:var(--paper);padding-block:10px;display:flex;gap:10px;
 align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line);margin-bottom:12px}
button.copy{font:500 13px/1 "Oswald",sans-serif;letter-spacing:.1em;text-transform:uppercase;
 background:var(--accent);color:#fff;border:0;border-radius:var(--r);padding:13px 20px;cursor:pointer}
button.copy:hover{background:var(--accent2)}
button.copy.done{background:var(--ok)}
.meta{font-family:"IBM Plex Mono",monospace;font-size:11px;color:var(--ink2)}
pre.prompt{margin:0;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);
 padding:16px;max-height:60vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;
 font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11.5px;line-height:1.6;color:var(--ink)}
.steps{margin:0 0 18px;padding:0;list-style:none;counter-reset:s;display:grid;gap:9px}
.steps li{counter-increment:s;display:grid;grid-template-columns:auto minmax(0,1fr);gap:11px;
 font-size:13.5px;color:var(--ink2)}
.steps li::before{content:counter(s);font-family:"IBM Plex Mono",monospace;font-size:11px;
 color:var(--accent);border:1px solid var(--line2);border-radius:2px;width:20px;height:20px;
 display:grid;place-items:center;margin-top:1px}
.links{border-top:1px solid var(--line)}
.links h2.grp{font-size:20px;text-transform:uppercase;margin:26px 0 4px;padding-top:18px;
 border-top:2px solid var(--ink)}
.links h3{font-size:15px;text-transform:uppercase;margin:22px 0 8px;color:var(--steel);
 letter-spacing:.04em}
.links p{font-size:13.5px;color:var(--ink2);margin:8px 0}
.links hr{border:0;border-top:1px solid var(--line);margin:26px 0}
.tw{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r);background:var(--surface)}
table{border-collapse:collapse;width:100%;font-size:12.5px}
th{text-align:left;font:500 10px/1.3 "Oswald",sans-serif;letter-spacing:.12em;text-transform:uppercase;
 color:var(--ink2);padding:9px 11px;border-bottom:1px solid var(--line2);white-space:nowrap}
td{padding:9px 11px;border-bottom:1px solid var(--line);vertical-align:top}
tr:last-child td{border-bottom:0}
td:first-child{font-weight:700;white-space:nowrap}
code{font-family:"IBM Plex Mono",monospace;font-size:11.5px;background:var(--sunk);padding:2px 5px;border-radius:2px}
.dot{color:var(--line2);padding:0 2px}
.foot{margin-top:40px;padding-top:16px;border-top:2px solid var(--ink);font-size:12.5px;color:var(--ink2)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
"""

    js = """
var btn=document.getElementById('copy'),src=document.getElementById('prompt');
btn.addEventListener('click',function(){
  var t=src.textContent;
  function done(){btn.textContent='Скопировано \\u2713';btn.classList.add('done');
    setTimeout(function(){btn.textContent='Скопировать промт';btn.classList.remove('done');},2200);}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(t).then(done,fallback);
  } else {fallback();}
  function fallback(){
    var ta=document.createElement('textarea');ta.value=t;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.select();
    try{document.execCommand('copy');done();}catch(err){
      var r=document.createRange();r.selectNodeContents(src);
      var s=window.getSelection();s.removeAllRanges();s.addRange(r);
      btn.textContent='Выделено — нажмите Ctrl+C';}
    ta.remove();}
});
"""

    return (
        '<meta charset="utf-8">\n<title>Доработка каталога Irbis</title>\n'
        '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
        'family=Oswald:wght@400;500&family=PT+Sans:wght@400;700&'
        'family=IBM+Plex+Mono:wght@400;500&display=swap">\n'
        '<style>%s</style>\n'
        '<div class="page">\n'
        '<header class="top"><p class="eyebrow">Irbis · рабочие материалы</p>'
        '<h1>Доработка<br>каталога</h1>'
        '<p>Слева — готовый промт для ChatGPT: в нём все данные каталога, список дефектов, '
        'пропуски и техзадание на восьмую группу — навесное оборудование. Справа — страницы, '
        'с которых снимаются фотографии.</p></header>\n'
        '<div class="cols">\n'
        '<section class="panel"><h2>Промт для ChatGPT</h2>'
        '<p class="sub">Полностью самодостаточный: данные внутри, ничего дополнительно прикреплять не нужно.</p>'
        '<ol class="steps">'
        '<li>Нажмите «Скопировать промт».</li>'
        '<li>Откройте новый чат в ChatGPT и вставьте текст одним сообщением.</li>'
        '<li>Модель вернёт отчёт по дефектам, заполненные пропуски и готовый HTML-каталог.</li>'
        '<li>Значения, помеченные как ненайденные, подтвердите у поставщика — не публикуйте вслепую.</li>'
        '</ol>'
        '<div class="bar"><button class="copy" id="copy" type="button">Скопировать промт</button>'
        '<span class="meta">%d строк · %s знаков</span></div>'
        '<pre class="prompt" id="prompt">%s</pre></section>\n'
        '<section class="panel links"><h2>Фотографии: откуда брать</h2>%s</section>\n'
        '</div>\n'
        '<p class="foot">Промт и список ссылок лежат в репозитории: '
        '<code>catalog/ПРОМТ_для_ChatGPT.md</code> и <code>catalog/ФОТО_ссылки.md</code>.</p>\n'
        '</div>\n<script>%s</script>\n'
        % (css, n_lines, "{:,}".format(n_chars).replace(",", " "), e(prompt), md_to_html(links), js))


if __name__ == "__main__":
    page = build()
    out = os.path.join(HERE, "prompt.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(page)
    print("  →", out, "(%.1f КБ)" % (len(page.encode()) / 1024))
