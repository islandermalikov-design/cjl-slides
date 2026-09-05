# -*- coding: utf-8 -*-
"""Проверка порядка дочерних элементов в тех узлах OOXML, которые мы правили вручную."""
import zipfile, sys
from lxml import etree
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
ORDER = {
 A+"spPr":  ["xfrm","custGeom","prstGeom","noFill","solidFill","gradFill","blipFill",
             "pattFill","grpFill","ln","effectLst","effectDag","scene3d","sp3d","extLst"],
 A+"pPr":   ["lnSpc","spcBef","spcAft","buClrTx","buClr","buSzTx","buSzPct","buSzPts",
             "buFontTx","buFont","buNone","buAutoNum","buChar","tabLst","defRPr","extLst"],
 A+"rPr":   ["ln","noFill","solidFill","gradFill","blipFill","pattFill","grpFill",
             "effectLst","effectDag","highlight","uLnTx","uLn","uFillTx","uFill","latin",
             "ea","cs","sym","hlinkClick","hlinkMouseOver","rtl","extLst"],
 A+"gradFill": ["gsLst","lin","path","tileRect"],
 A+"lnSpc": ["spcPct","spcPts"],
 A+"srgbClr": ["tint","shade","comp","inv","gray","alpha","alphaOff","alphaMod","hue",
               "hueOff","hueMod","sat","satOff","satMod","lum","lumOff","lumMod","red",
               "redOff","redMod","green","greenOff","greenMod","blue","blueOff","blueMod","gamma","invGamma"],
}
path = sys.argv[1]
bad = 0; checked = 0
z = zipfile.ZipFile(path)
for n in z.namelist():
    if not (n.startswith("ppt/slides/slide") and n.endswith(".xml")): continue
    root = etree.fromstring(z.read(n))
    for el in root.iter():
        seq = ORDER.get(el.tag)
        if seq is None: continue
        checked += 1
        idx = -1
        for ch in el:
            name = etree.QName(ch).localname
            if name not in seq:
                print(f"{n}: неизвестный узел <{name}> в <{etree.QName(el).localname}>"); bad += 1; continue
            i = seq.index(name)
            if i < idx:
                print(f"{n}: нарушен порядок — <{name}> после позиции {idx} в <{etree.QName(el).localname}>")
                bad += 1
            idx = i
print(f"проверено узлов: {checked}; нарушений: {bad}")
sys.exit(1 if bad else 0)
