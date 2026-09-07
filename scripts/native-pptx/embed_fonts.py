#!/usr/bin/env python3
"""Встраивает TTF в PPTX (p:embeddedFontLst), чтобы файл открывался с нужными
шрифтами даже там, где они не установлены."""
import sys, zipfile, shutil, os
from lxml import etree

P = 'http://schemas.openxmlformats.org/presentationml/2006/main'
R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
RT_FONT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/font'

# (typeface, {слот: файл}) — слоты: regular / bold
FONTS = [
    ('Playfair Display',        {'regular': 'ttf/PlayfairDisplay-Regular.ttf',
                                 'bold':    'ttf/PlayfairDisplay-Bold.ttf'}),
    ('Playfair Display Black',  {'regular': 'ttf/PlayfairDisplay-Black.ttf'}),
    ('Noto Sans',               {'regular': 'ttf/NotoSans-Regular.ttf',
                                 'bold':    'ttf/NotoSans-Bold.ttf'}),
    ('Noto Sans SemiBold',      {'regular': 'ttf/NotoSansSemiBold.ttf'}),
]

src, dst = sys.argv[1], sys.argv[2]
zin = zipfile.ZipFile(src)
items = {n: zin.read(n) for n in zin.namelist()}
zin.close()

pres = etree.fromstring(items['ppt/presentation.xml'])
rels = etree.fromstring(items['ppt/_rels/presentation.xml.rels'])
ctypes = etree.fromstring(items['[Content_Types].xml'])

used = {e.get('Id') for e in rels}
def new_rid():
    i = 1
    while f'rId{i}' in used: i += 1
    used.add(f'rId{i}')
    return f'rId{i}'

lst = etree.SubElement(pres, f'{{{P}}}embeddedFontLst')
idx = 0
for typeface, slots in FONTS:
    ef = etree.SubElement(lst, f'{{{P}}}embeddedFont')
    fnt = etree.SubElement(ef, f'{{{P}}}font')
    fnt.set('typeface', typeface); fnt.set('pitchFamily', '18'); fnt.set('charset', '0')
    for slot, path in slots.items():
        if not os.path.exists(path): continue
        idx += 1
        part = f'ppt/fonts/font{idx}.fntdata'
        items[part] = open(path, 'rb').read()
        rid = new_rid()
        rel = etree.SubElement(rels, '{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')
        rel.set('Id', rid); rel.set('Type', RT_FONT); rel.set('Target', f'fonts/font{idx}.fntdata')
        el = etree.SubElement(ef, f'{{{P}}}{slot}')
        el.set(f'{{{R}}}id', rid)
        ov = etree.SubElement(ctypes, f'{{{CT}}}Override')
        ov.set('PartName', f'/{part}'); ov.set('ContentType', 'application/x-fontdata')

# embeddedFontLst обязан идти после notesSz — переставляем
order = ['sldMasterIdLst','notesMasterIdLst','handoutMasterIdLst','sldIdLst','sldSz','notesSz',
         'smartTags','embeddedFontLst','custShowLst','photoAlbum','custDataLst','kinsoku',
         'defaultTextStyle','modifyVerifier','extLst']
children = list(pres)
children.sort(key=lambda e: order.index(etree.QName(e).localname) if etree.QName(e).localname in order else 99)
for c in children: pres.append(c)

items['ppt/presentation.xml'] = etree.tostring(pres, xml_declaration=True, encoding='UTF-8', standalone=True)
items['ppt/_rels/presentation.xml.rels'] = etree.tostring(rels, xml_declaration=True, encoding='UTF-8', standalone=True)
items['[Content_Types].xml'] = etree.tostring(ctypes, xml_declaration=True, encoding='UTF-8', standalone=True)

with zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zo:
    for n, d in items.items(): zo.writestr(n, d)
print('embedded', idx, 'font files ->', dst, os.path.getsize(dst)//1024, 'KB')
