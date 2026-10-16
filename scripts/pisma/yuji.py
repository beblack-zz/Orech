"""
Japonské štětcové písmo Yuji Syuku jako vlastní soubory místo Google Fonts
(Google by dostal IP každého návštěvníka). Každá stránka používá jen pár
desítek znaků, tak dostane vlastní malý soubor jen s nimi — jako to dělal
Google. Znaky se berou ze sestaveného webu: z HTML stránky a ze všech
skriptů, které si stránka může načíst (i líně), protože část textů skládají
až skripty.

Použití:
  1. stáhni písmo (licence OFL):
     https://raw.githubusercontent.com/google/fonts/main/ofl/yujisyuku/YujiSyuku-Regular.ttf
  2. npx astro build --outDir <složka>
  3. python scripts/pisma/yuji.py <YujiSyuku-Regular.ttf> <složka buildu>
Výstup: public/fonts/web/yuji/spolecne.woff2 (znaky, které má každá stránka —
hlavička, patička, omamori) a <stránka>.woff2 se znaky jen té stránky (jméno =
adresa: index, dilna, obchod-2-futatsu, 404…), k tomu src/data/yuji.json
s unicode-range každého souboru. Načítá je components/Hlava.astro.
Když na stránku přibude nový japonský znak, postav web a pusť skript znovu —
do té doby se znak vykreslí náhradním písmem (Yu Mincho, Hiragino…).
"""
import pathlib, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

pismo, build = sys.argv[1], pathlib.Path(sys.argv[2])
CJK = re.compile(r"[　-ヾ㐀-䶿一-鿾豈-﫿＀-￯]")
IMPORT = re.compile(r"""(?:from\s*|import\s*\(?\s*)["'`](\./[^"'`]+\.js)["'`]""")
SKRIPT = re.compile(r'<script[^>]+src="(/_astro/[^"]+\.js)"')

cil = pathlib.Path(__file__).resolve().parents[2] / "public" / "fonts" / "web" / "yuji"
cil.mkdir(parents=True, exist_ok=True)
mapa = TTFont(pismo).getBestCmap()

def skripty(vstupy):
    """Všechny JS soubory, které stránka může načíst — statické i líné importy"""
    videno, fronta = set(), list(vstupy)
    while fronta:
        u = fronta.pop()
        if u in videno:
            continue
        videno.add(u)
        f = build / u.lstrip("/")
        if f.exists():
            for m in IMPORT.findall(f.read_text(encoding="utf-8", errors="ignore")):
                fronta.append("/_astro/" + m[2:])
    return videno

def podmnozina(znaky, soubor):
    font = TTFont(pismo)
    opt = subset.Options()
    opt.flavor = "woff2"
    opt.layout_features = ["*"]
    opt.notdef_outline = True
    s = subset.Subsetter(opt)
    s.populate(unicodes=[ord(z) for z in znaky])
    s.subset(font)
    subset.save_font(font, str(soubor), opt)
    return soubor.stat().st_size // 1024

rozsah = lambda znaky: ", ".join(f"U+{ord(z):04X}" for z in sorted(znaky))

stranky = {}
for html in sorted(build.rglob("*.html")):
    rel = html.relative_to(build).as_posix()
    klic = "index" if rel == "index.html" else rel.removesuffix("/index.html").removesuffix(".html").replace("/", "-")
    t = html.read_text(encoding="utf-8")
    znaky = set(CJK.findall(t))
    for u in skripty(SKRIPT.findall(t)):
        f = build / u.lstrip("/")
        if f.exists():
            znaky |= set(CJK.findall(f.read_text(encoding="utf-8", errors="ignore")))
    stranky[klic] = {z for z in znaky if ord(z) in mapa}

# Co je na všech stránkách (hlavička, patička, omamori, průvodce), jde do jednoho
# souboru, který si prohlížeč stáhne jednou; stránka má navíc jen své znaky.
spolecne = set.intersection(*stranky.values())
for f in cil.glob("*.woff2"):
    f.unlink()
manifest = {"spolecne": rozsah(spolecne)}
print(f"{'spolecne':20} {len(spolecne):4} znaků  {podmnozina(spolecne, cil / 'spolecne.woff2'):4} kB")
for klic, znaky in stranky.items():
    navic = znaky - spolecne
    if not navic:
        continue
    manifest[klic] = rozsah(navic)
    print(f"{klic:20} {len(navic):4} znaků  {podmnozina(navic, cil / f'{klic}.woff2'):4} kB")

import json
data = pathlib.Path(__file__).resolve().parents[2] / "src" / "data" / "yuji.json"
data.write_text(json.dumps(manifest, ensure_ascii=False, indent=1) + chr(10), encoding="utf-8", newline=chr(10))
print("rozsahy →", data)
