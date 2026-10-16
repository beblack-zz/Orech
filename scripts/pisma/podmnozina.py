"""Zúžená webová písma: z fontsource podmnožin latin + latin-ext jeden woff2 na řez.

Spuštění z kořene projektu:

    python scripts/pisma/podmnozina.py
    python scripts/pisma/podmnozina.py --sestaveni <složka buildu>

Pro každý řez (Fraunces full normal i italic, Newsreader wght normal,
Newsreader opsz italic, Caveat 400 a 600) vezme dva soubory z node_modules,
spojí je do jednoho písma a zúží ho na znaky v ZNAKY (plus znaky nalezené
v buildu, když se zadá --sestaveni). Výsledek jde do public/fonts/web/.

Proč vlastní spojování a ne fontTools.merge: merge neumí variabilní tabulky
(gvar, HVAR, VarStore v GDEF, FeatureVariations pro WONK). Spojení napodobuje
to, co dělal prohlížeč se dvěma soubory: glyfy z latin-ext, které mají stejné
jméno jako v latin, dostanou příponu a pravidla latin-ext (kerning, calt, rvrn)
působí jen na ně. Kerning mezi písmeny z obou souborů tedy nevznikne, stejně
jako dřív, kdy byla v různých souborech. Osy zůstávají celé, nic se nezamyká.
"""

import argparse
import copy
import glob
import io
import os
import re
import sys
import unicodedata

from fontTools import subset
from fontTools.ttLib import TTFont, newTable
from fontTools.ttLib.tables import otTables as ot
from fontTools.ttLib.tables.otBase import BaseTable, ValueRecord

KOREN = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
NM = os.path.join(KOREN, "node_modules")
VYSTUP = os.path.join(KOREN, "public", "fonts", "web")

# řez -> (css z fontsource, výstupní soubor)
REZY = [
    ("@fontsource-variable/fraunces/full.css", "fraunces-normal.woff2"),
    ("@fontsource-variable/fraunces/full-italic.css", "fraunces-italic.woff2"),
    ("@fontsource-variable/newsreader/index.css", "newsreader-normal.woff2"),
    ("@fontsource-variable/newsreader/opsz-italic.css", "newsreader-italic.woff2"),
    ("@fontsource/caveat/400.css", "caveat-400.woff2"),
    ("@fontsource/caveat/600.css", "caveat-600.woff2"),
]


def _rozsah(a, b):
    return "".join(chr(c) for c in range(a, b + 1))


ZNAKY = (
    _rozsah(0x20, 0x7E)  # základní latinka
    + _rozsah(0xA0, 0xFF)  # Latin-1 (nbsp, ©, °, ·, ×, ½, á é í ó ú ý, Ø, ±, ¼ ¾ …)
    + "ÁáČčĎďÉéĚěÍíŇňÓóŘřŠšŤťÚúŮůÝýŽž"  # čeština
    + "ĹĺĽľŔŕ"  # slovenština navíc (ô ä jsou v Latin-1)
    + "ĀāĒēĪīŌōŪū"  # japonské přepisy (Kōbō, ū v textech webu)
    + "–—‚‘’“”„…•′″‹›−€™"  # typografie
    + "→←↓↑№"  # chtěné, ale v žádném z písem nejsou: zůstává náhradní písmo jako dřív
)


def je_cjk(c):
    o = ord(c)
    return (
        0x2E80 <= o <= 0x9FFF
        or 0x3000 <= o <= 0x30FF
        or 0xF900 <= o <= 0xFAFF
        or 0xFF00 <= o <= 0xFFEF
        or 0x20000 <= o <= 0x2FFFF
    )


def znaky_ze_sestaveni(slozka):
    """Znaky mimo ASCII v HTML, JS a SVG buildu (bez japonských)."""
    pocty = {}
    for f in glob.glob(os.path.join(slozka, "**", "*"), recursive=True):
        if not f.endswith((".html", ".js", ".mjs", ".svg")):
            continue
        with open(f, "rb") as h:
            t = h.read().decode("utf-8", "replace")
        for c in t:
            if ord(c) > 0x7E and not je_cjk(c) and not unicodedata.category(c).startswith(("C", "M")):
                pocty[c] = pocty.get(c, 0) + 1
    return pocty


# ---------------------------------------------------------------- fontsource CSS


def nacti_css(css_rel):
    """Vrátí {'latin': (soubor, rozsahy), 'latin-ext': (soubor, rozsahy)}."""
    css_path = os.path.join(NM, css_rel)
    with open(css_path, "rb") as h:
        css = h.read().decode("utf-8")
    vysledek = {}
    for blok in re.findall(r"@font-face\s*\{([^}]*)\}", css):
        url = re.search(r"url\(\./files/([^)]+\.woff2)\)", blok).group(1)
        m = re.search(r"-(latin-ext|latin)-", url)
        if not m:
            continue
        rozsahy = []
        for kus in re.search(r"unicode-range:\s*([^;]+);", blok).group(1).split(","):
            kus = kus.strip()[2:]
            if "-" in kus:
                a, b = kus.split("-")
            else:
                a = b = kus
            rozsahy.append((int(a, 16), int(b, 16)))
        vysledek[m.group(1)] = (os.path.join(os.path.dirname(css_path), "files", url), rozsahy)
    assert set(vysledek) == {"latin", "latin-ext"}, (css_rel, vysledek.keys())
    return vysledek


def v_rozsahu(cp, rozsahy):
    return any(a <= cp <= b for a, b in rozsahy)


# ---------------------------------------------------------------- pomocné průchody


def projdi(obj, fn, videne=None):
    """Projde strom otTables a na každý objekt zavolá fn (každý jen jednou)."""
    if videne is None:
        videne = set()
    if isinstance(obj, list):
        for x in obj:
            projdi(x, fn, videne)
        return
    if not isinstance(obj, (BaseTable, ValueRecord)):
        return
    if id(obj) in videne:
        return
    videne.add(id(obj))
    fn(obj)
    for v in list(vars(obj).values()):
        projdi(v, fn, videne)


def prejmenovana_tabulka(font, tag, poradi):
    """Tabulku z fontu přeloží a znovu načte s jiným pořadím (jmény) glyfů."""
    data = font[tag].compile(font)
    fake = TTFont()
    fake.setGlyphOrder(poradi)
    t = newTable(tag)
    t.decompile(data, fake)
    if hasattr(t, "ensureDecompiled"):
        t.ensureDecompiled()
    return t


# ---------------------------------------------------------------- VarStore


def sloucit_varstore(vsA, vsB):
    """Připojí VarData z B k A, regiony sjednotí. Vrací posun vnějšího indexu."""
    def klic(r):
        return tuple((a.StartCoord, a.PeakCoord, a.EndCoord) for a in r.VarRegionAxis)

    assert vsA.VarRegionList.RegionAxisCount == vsB.VarRegionList.RegionAxisCount
    regiony = vsA.VarRegionList.Region
    index = {klic(r): i for i, r in enumerate(regiony)}
    mapa = []
    for r in vsB.VarRegionList.Region:
        k = klic(r)
        if k not in index:
            index[k] = len(regiony)
            regiony.append(copy.deepcopy(r))
        mapa.append(index[k])
    vsA.VarRegionList.RegionCount = len(regiony)
    posun = len(vsA.VarData)
    for vd in vsB.VarData:
        vd = copy.deepcopy(vd)
        vd.VarRegionIndex = [mapa[i] for i in vd.VarRegionIndex]
        vd.VarRegionCount = len(vd.VarRegionIndex)
        vsA.VarData.append(vd)
    vsA.VarDataCount = len(vsA.VarData)
    return posun


def posun_device(tabulka, posun):
    def fn(o):
        # 0xFFFF/0xFFFF je NO_VARIATION_INDEX, ten zůstává
        if type(o).__name__ == "Device" and getattr(o, "DeltaFormat", 0) == 0x8000 and o.StartSize != 0xFFFF:
            o.StartSize += posun

    projdi(tabulka, fn)


# ---------------------------------------------------------------- GSUB / GPOS


def sloucit_layout(tA, tB, posun_lookup_ms):
    """tA, tB: GSUB/GPOS .table. B se připojí za A."""
    if tA is None:
        return tB
    if tB is None:
        return tA
    nL = len(tA.LookupList.Lookup)
    nF = len(tA.FeatureList.FeatureRecord)

    # lookupy B: odkazy na jiné lookupy a sady značek posunout
    def fn(o):
        n = type(o).__name__
        if n in ("SubstLookupRecord", "PosLookupRecord"):
            o.LookupListIndex += nL

    for lk in tB.LookupList.Lookup:
        projdi(lk, fn)
        if lk.LookupFlag & 0x0010:
            lk.MarkFilteringSet += posun_lookup_ms
    tA.LookupList.Lookup.extend(tB.LookupList.Lookup)
    tA.LookupList.LookupCount = len(tA.LookupList.Lookup)

    for fr in tB.FeatureList.FeatureRecord:
        fr.Feature.LookupListIndex = [i + nL for i in fr.Feature.LookupListIndex]
        fr.Feature.LookupCount = len(fr.Feature.LookupListIndex)
        tA.FeatureList.FeatureRecord.append(fr)
    tA.FeatureList.FeatureCount = len(tA.FeatureList.FeatureRecord)

    # skripty a jazyky: co platilo pro A, plus co platilo pro B
    def skripty(t):
        return {sr.ScriptTag: sr.Script for sr in t.ScriptList.ScriptRecord}

    sA, sB = skripty(tA), skripty(tB)

    def jazyk(script, tag):
        if script is None:
            return None
        if tag is None:
            return script.DefaultLangSys
        for lr in script.LangSysRecord:
            if lr.LangSysTag == tag:
                return lr.LangSys
        return script.DefaultLangSys

    def rysy(ls, posun):
        if ls is None:
            return []
        assert ls.ReqFeatureIndex == 0xFFFF, "povinný rys nepodporuji"
        return [i + posun for i in ls.FeatureIndex]

    def novy_ls(fi):
        ls = ot.LangSys()
        ls.LookupOrder = None
        ls.ReqFeatureIndex = 0xFFFF
        ls.FeatureIndex = fi
        ls.FeatureCount = len(fi)
        return ls

    zaznamy = []
    for tag in sorted(set(sA) | set(sB)):
        scA = sA.get(tag) or sA.get("DFLT")
        scB = sB.get(tag) or sB.get("DFLT")
        jazyky = set()
        for sc in (sA.get(tag), sB.get(tag)):
            if sc:
                jazyky |= {lr.LangSysTag for lr in sc.LangSysRecord}
        script = ot.Script()
        script.DefaultLangSys = novy_ls(rysy(jazyk(scA, None), 0) + rysy(jazyk(scB, None), nF))
        script.LangSysRecord = []
        for j in sorted(jazyky):
            lr = ot.LangSysRecord()
            lr.LangSysTag = j
            lr.LangSys = novy_ls(rysy(jazyk(scA, j), 0) + rysy(jazyk(scB, j), nF))
            script.LangSysRecord.append(lr)
        script.LangSysCount = len(script.LangSysRecord)
        sr = ot.ScriptRecord()
        sr.ScriptTag = tag
        sr.Script = script
        zaznamy.append(sr)
    tA.ScriptList.ScriptRecord = zaznamy
    tA.ScriptList.ScriptCount = len(zaznamy)

    # FeatureVariations (rvrn pro WONK, opsz …)
    fvA = getattr(tA, "FeatureVariations", None)
    fvB = getattr(tB, "FeatureVariations", None)
    if fvB is not None:
        for rec in fvB.FeatureVariationRecord:
            for s in rec.FeatureTableSubstitution.SubstitutionRecord:
                s.FeatureIndex += nF
                s.Feature.LookupListIndex = [i + nL for i in s.Feature.LookupListIndex]
                s.Feature.LookupCount = len(s.Feature.LookupListIndex)
    if fvA is not None or fvB is not None:
        tA.Version = 0x00010001
        tA.FeatureVariations = sloucit_fv(fvA, fvB)
    sloucit_stejne_rysy(tA, nF)
    return tA


def vsechny_ls(t):
    for sr in t.ScriptList.ScriptRecord:
        if sr.Script.DefaultLangSys is not None:
            yield sr.Script.DefaultLangSys
        for lr in sr.Script.LangSysRecord:
            yield lr.LangSys


def sloucit_stejne_rysy(t, nF):
    """Rys se stejnou značkou z A a z B spojí do jednoho (lookupy A + B).

    Jinak by subsetter dva stejné prázdné rysy (rvrn) sloučil sám a náhrady
    z FeatureVariations pro B by se ztratily. Spojuje se jen dvojice, která je
    v každém jazyce buď celá, nebo vůbec, takže se nic nepřidá jinam."""
    fr = t.FeatureList.FeatureRecord
    puvodni = [list(r.Feature.LookupListIndex) for r in fr]
    lss = list(vsechny_ls(t))
    pary = {}
    for ib in range(nF, len(fr)):
        ia_kandidati = [i for i in range(nF) if fr[i].FeatureTag == fr[ib].FeatureTag]
        ib_kandidati = [i for i in range(nF, len(fr)) if fr[i].FeatureTag == fr[ib].FeatureTag]
        if len(ia_kandidati) != 1 or len(ib_kandidati) != 1:
            continue
        ia = ia_kandidati[0]
        if all((ia in ls.FeatureIndex) == (ib in ls.FeatureIndex) for ls in lss):
            pary[ib] = ia
    if not pary:
        return
    # nové indexy rysů
    remap = {}
    nove = []
    for i, r in enumerate(fr):
        if i in pary:
            continue
        remap[i] = len(nove)
        nove.append(r)
    for ib, ia in pary.items():
        remap[ib] = remap[ia]
    clenove = {}
    for i in range(len(fr)):
        clenove.setdefault(remap[i], []).append(i)
    for novy, cl in clenove.items():
        lk = sorted({x for i in cl for x in puvodni[i]})
        nove[novy].Feature.LookupListIndex = lk
        nove[novy].Feature.LookupCount = len(lk)
    t.FeatureList.FeatureRecord = nove
    t.FeatureList.FeatureCount = len(nove)
    for ls in lss:
        ls.FeatureIndex = sorted({remap[i] for i in ls.FeatureIndex})
        ls.FeatureCount = len(ls.FeatureIndex)
    fv = getattr(t, "FeatureVariations", None)
    if fv is None:
        return
    for rec in fv.FeatureVariationRecord:
        fts = rec.FeatureTableSubstitution
        nahrady = {s.FeatureIndex: s for s in fts.SubstitutionRecord}
        zaznamy = {}
        for stary, s in nahrady.items():
            zaznamy.setdefault(remap[stary], None)
        vysl = []
        for novy in sorted(zaznamy):
            lk = set()
            for i in clenove[novy]:
                lk |= set(nahrady[i].Feature.LookupListIndex if i in nahrady else puvodni[i])
            s = ot.FeatureTableSubstitutionRecord()
            s.FeatureIndex = novy
            s.Feature = ot.Feature()
            s.Feature.FeatureParams = None
            s.Feature.LookupListIndex = sorted(lk)
            s.Feature.LookupCount = len(s.Feature.LookupListIndex)
            vysl.append(s)
        fts.SubstitutionRecord = vysl
        fts.SubstitutionCount = len(vysl)


def podminky(rec):
    return [(c.Format, c.AxisIndex, c.FilterRangeMinValue, c.FilterRangeMaxValue) for c in rec.ConditionSet.ConditionTable]


def sloucit_fv(fvA, fvB):
    """Platí první záznam, jehož podmínky sedí. Pro každou dvojici (záznam A,
    záznam B) vznikne záznam s oběma podmínkami a oběma náhradami; pořadí
    (i, j) lexikograficky, "žádný" je poslední. Když mají A i B stejné
    podmínky ve stejném pořadí, stačí je spárovat."""
    rA = list(fvA.FeatureVariationRecord) if fvA else []
    rB = list(fvB.FeatureVariationRecord) if fvB else []
    vysl = ot.FeatureVariations()
    vysl.Version = 0x00010000
    if rA and rB and len(rA) == len(rB) and all(podminky(a) == podminky(b) for a, b in zip(rA, rB)):
        for a, b in zip(rA, rB):
            a.FeatureTableSubstitution.SubstitutionRecord.extend(b.FeatureTableSubstitution.SubstitutionRecord)
            a.FeatureTableSubstitution.SubstitutionCount = len(a.FeatureTableSubstitution.SubstitutionRecord)
        vysl.FeatureVariationRecord = rA
    else:
        zaznamy = []
        for a in rA + [None]:
            for b in rB + [None]:
                if a is None and b is None:
                    continue
                rec = ot.FeatureVariationRecord()
                cs = ot.ConditionSet()
                cs.ConditionTable = [copy.deepcopy(c) for r in (a, b) if r for c in r.ConditionSet.ConditionTable]
                cs.ConditionCount = len(cs.ConditionTable)
                rec.ConditionSet = cs
                fts = ot.FeatureTableSubstitution()
                fts.Version = 0x00010000
                fts.SubstitutionRecord = [copy.deepcopy(s) for r in (a, b) if r for s in r.FeatureTableSubstitution.SubstitutionRecord]
                fts.SubstitutionCount = len(fts.SubstitutionRecord)
                rec.FeatureTableSubstitution = fts
                zaznamy.append(rec)
        vysl.FeatureVariationRecord = zaznamy
    vysl.FeatureVariationCount = len(vysl.FeatureVariationRecord)
    return vysl


# ---------------------------------------------------------------- spojení


def stejne_glyfy(A, B, n, pamet):
    """Glyf n z B je totožný s glyfem n z A (obrys, metrika, variace,
    u složených i všechny součástky)."""
    if n in pamet:
        return pamet[n]
    pamet[n] = False
    if n not in A["glyf"] or n not in B["glyf"]:
        return False
    if A["hmtx"][n] != B["hmtx"][n]:
        return False
    gA, gB = A["glyf"][n], B["glyf"][n]
    if gA.isComposite() != gB.isComposite():
        return False
    if gA.isComposite():
        if len(gA.components) != len(gB.components):
            return False
        for cA, cB in zip(gA.components, gB.components):
            if cA.glyphName != cB.glyphName or not stejne_glyfy(A, B, cA.glyphName, pamet):
                return False
            if (cA.x, cA.y, cA.flags, getattr(cA, "transform", None)) != (cB.x, cB.y, cB.flags, getattr(cB, "transform", None)):
                return False
    else:
        if getattr(gA, "numberOfContours", 0) != getattr(gB, "numberOfContours", 0):
            return False
        if gA.numberOfContours:
            if list(gA.coordinates) != list(gB.coordinates) or gA.endPtsOfContours != gB.endPtsOfContours:
                return False
            if [f & 1 for f in gA.flags] != [f & 1 for f in gB.flags]:
                return False
    if "gvar" in A:
        vA = A["gvar"].variations.get(n, [])
        vB = B["gvar"].variations.get(n, [])
        if vA != vB:
            return False
    pamet[n] = True
    return True


def spojit(cesta_latin, rozsah_latin, cesta_ext, rozsah_ext, znaky):
    A = TTFont(cesta_latin, recalcTimestamp=False)  # stejný vstup = stejné bajty
    B = TTFont(cesta_ext)
    A.flavor = None
    for f in (A, B):
        for tag in f.keys():
            if tag != "GlyphOrder":
                f[tag]
    variabilni = "fvar" in A
    assert A["head"].unitsPerEm == B["head"].unitsPerEm
    if variabilni:
        assert A["fvar"].compile(A) == B["fvar"].compile(B), "osy latin a latin-ext se liší"
        if "avar" in A:
            assert A["avar"].compile(A) == B["avar"].compile(B), "avar latin a latin-ext se liší"
    for tag, pole in (("hhea", ("ascent", "descent", "lineGap")), ("OS/2", ("sTypoAscender", "sTypoDescender", "sTypoLineGap", "usWinAscent", "usWinDescent"))):
        for p in pole:
            if getattr(A[tag], p) != getattr(B[tag], p):
                print(f"  pozor: {tag}.{p} latin {getattr(A[tag], p)} ≠ latin-ext {getattr(B[tag], p)}, beru latin")

    poradiA = A.getGlyphOrder()
    jmenaA = set(poradiA)
    poradiB = B.getGlyphOrder()
    novaB = []
    for n in poradiB:
        if n in jmenaA:
            nove = n + ".lx"
            while nove in jmenaA:
                nove += "x"
            novaB.append(nove)
        else:
            novaB.append(n)
    mapaB = dict(zip(poradiB, novaB))

    # glyfy z B, které jsou stejné jako v A: součástky složených glyfů z B
    # pak ukazují rovnou na glyf z A (vzhled stejný, soubor menší)
    pamet = {}
    stejne = {n: n for n in poradiB if n in jmenaA and n != ".notdef" and stejne_glyfy(A, B, n, pamet)}
    print(f"  glyfů: latin {len(poradiA)}, latin-ext {len(poradiB)}, společných {len(set(poradiB) & jmenaA)}, z toho totožných {len(stejne)}")

    def soucastka(n):
        return stejne.get(n, mapaB[n])

    nove_poradi = poradiA + [n for n in novaB if n not in jmenaA]
    # vrstvy rozvržení z B s novými jmény (před změnou pořadí v A)
    layoutB = {tag: prejmenovana_tabulka(B, tag, novaB) for tag in ("GDEF", "GSUB", "GPOS") if tag in B}
    hvarB = prejmenovana_tabulka(B, "HVAR", novaB) if "HVAR" in B else None

    A.setGlyphOrder(nove_poradi)
    A["glyf"].glyphOrder = nove_poradi
    for n, nove in zip(poradiB, novaB):
        g = copy.deepcopy(B["glyf"][n])
        if g.isComposite():
            for c in g.components:
                c.glyphName = soucastka(c.glyphName)
        A["glyf"][nove] = g
        A["hmtx"][nove] = B["hmtx"][n]
        if variabilni and n in B["gvar"].variations:
            A["gvar"].variations[nove] = copy.deepcopy(B["gvar"].variations[n])
    if "post" in A and hasattr(A["post"], "extraNames"):
        A["post"].extraNames = []
        A["post"].mapping = {}

    # cmap: latin má přednost (v CSS je deklarovaný později)
    cmA, cmB = A.getBestCmap(), B.getBestCmap()
    mapa = {}
    chybi = []
    for c in sorted(set(znaky)):
        cp = ord(c)
        if v_rozsahu(cp, rozsah_latin) and cp in cmA:
            mapa[cp] = cmA[cp]
        elif v_rozsahu(cp, rozsah_ext) and cp in cmB:
            mapa[cp] = mapaB[cmB[cp]]
        else:
            chybi.append(c)
    for st in A["cmap"].tables:
        if st.format in (4, 12):
            st.cmap = dict(mapa)
    A["cmap"].tables = [st for st in A["cmap"].tables if st.format in (4, 12)]

    # GDEF
    gA = A["GDEF"].table
    gB = layoutB["GDEF"].table
    for pole in ("GlyphClassDef", "MarkAttachClassDef"):
        cB = getattr(gB, pole, None)
        if cB is None:
            continue
        cA = getattr(gA, pole, None)
        if cA is None:
            cA = ot.ClassDef()
            cA.classDefs = {}
            setattr(gA, pole, cA)
        cA.classDefs.update(cB.classDefs)
    for pole in ("AttachList", "LigCaretList"):
        assert getattr(gB, pole, None) is None and getattr(gA, pole, None) is None, f"GDEF.{pole} nepodporuji"
    posun_ms = 0
    msB = getattr(gB, "MarkGlyphSetsDef", None)
    if msB is not None:
        msA = getattr(gA, "MarkGlyphSetsDef", None)
        if msA is None:
            msA = ot.MarkGlyphSetsDef()
            msA.MarkSetTableFormat = 1
            msA.Coverage = []
            gA.MarkGlyphSetsDef = msA
            gA.Version = max(gA.Version, 0x00010002)
        posun_ms = len(msA.Coverage)
        msA.Coverage.extend(msB.Coverage)
        msA.MarkSetCount = len(msA.Coverage)
    vsB = getattr(gB, "VarStore", None)
    if vsB is not None:
        vsA = getattr(gA, "VarStore", None)
        if vsA is None:
            gA.VarStore = vsB
            gA.Version = 0x00010003
            posun_vs = 0
        else:
            posun_vs = sloucit_varstore(vsA, vsB)
        if "GPOS" in layoutB:
            posun_device(layoutB["GPOS"].table, posun_vs)

    for tag in ("GSUB", "GPOS"):
        if tag not in layoutB:
            continue
        if tag not in A:
            A[tag] = layoutB[tag]
            continue
        A[tag].table = sloucit_layout(A[tag].table, layoutB[tag].table, posun_ms)

    # HVAR: obě mapy šířek, VarStore za sebou
    if hvarB is not None:
        hA, hB = A["HVAR"].table, hvarB.table
        assert hA.AdvWidthMap is not None and hB.AdvWidthMap is not None
        assert hA.LsbMap is None and hA.RsbMap is None and hB.LsbMap is None and hB.RsbMap is None
        posun = sloucit_varstore(hA.VarStore, hB.VarStore)
        for n, v in hB.AdvWidthMap.mapping.items():  # jména z B jsou už jedinečná
            hA.AdvWidthMap.mapping[n] = v if v == 0xFFFFFFFF else ((v >> 16) + posun) << 16 | (v & 0xFFFF)

    buf = io.BytesIO()
    A.save(buf)
    buf.seek(0)
    return TTFont(buf, recalcTimestamp=False), mapa, chybi


def zuzit(font, unicodes, cil):
    o = subset.Options()
    o.layout_features = ["*"]
    o.layout_scripts = ["*"]
    o.name_IDs = ["*"]
    o.name_languages = ["*"]
    o.name_legacy = True
    o.notdef_outline = True
    o.glyph_names = False
    o.hinting = True
    o.legacy_kern = True
    o.ignore_missing_unicodes = True
    o.flavor = "woff2"
    s = subset.Subsetter(options=o)
    s.populate(unicodes=unicodes)
    s.subset(font)
    font.flavor = "woff2"
    font.save(cil)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--sestaveni", help="složka buildu: vypíše znaky mimo latinku a přidá je")
    ap.add_argument("--vystup", default=VYSTUP)
    ap.add_argument("--ttf", help="složka, kam uložit i TTF (pro náhledy)")
    a = ap.parse_args()

    znaky = set(ZNAKY)
    if a.sestaveni:
        nalezene = znaky_ze_sestaveni(a.sestaveni)
        print("Znaky mimo ASCII v buildu (bez japonských):")
        for c in sorted(nalezene, key=ord):
            try:
                jm = unicodedata.name(c)
            except ValueError:
                jm = "?"
            znacka = " " if c in znaky else "+"
            print(f"  {znacka} U+{ord(c):04X} {c}  {nalezene[c]:5d}×  {jm}")
        znaky |= set(nalezene)

    os.makedirs(a.vystup, exist_ok=True)
    celkem = 0
    for css, jmeno in REZY:
        zdroj = nacti_css(css)
        (cl, rl), (ce, re_) = zdroj["latin"], zdroj["latin-ext"]
        print(f"{jmeno}  <-  {os.path.basename(cl)} + {os.path.basename(ce)}")
        font, mapa, chybi = spojit(cl, rl, ce, re_, znaky)
        cil = os.path.join(a.vystup, jmeno)
        zuzit(font, list(mapa), cil)
        if a.ttf:
            os.makedirs(a.ttf, exist_ok=True)
            t = TTFont(cil)
            t.flavor = None
            t.save(os.path.join(a.ttf, jmeno.replace(".woff2", ".ttf")))
        vel = os.path.getsize(cil)
        celkem += vel
        pred = os.path.getsize(cl) + os.path.getsize(ce)
        chybi_ne_ascii = "".join(c for c in chybi if ord(c) > 0x7E)
        print(f"  {pred / 1024:.1f} kB -> {vel / 1024:.1f} kB, znaků {len(mapa)}; v písmu nejsou: {chybi_ne_ascii or '-'}")
    print(f"Celkem {celkem / 1024:.1f} kB v {a.vystup}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
