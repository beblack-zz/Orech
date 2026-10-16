// Zkouška vystoupení pro divadlo na /parta bez prohlížeče: pustí choreografii
// (src/scripts/parta3/vystoupeni/<postava>.js) proti čisté simulaci scény — stejné
// generátory jako na webu —, vypíše, co se dělo, a umí uložit snímky do PNG.
// Když se změní scéna, tady se pozná, jestli na ni vystoupení pořád sedí.
//
//   node scripts/zkouska-vystoupeni.mjs <postava> <varianta> [volby]
//
//   --seed 3               náhoda (Math.random) se zaseje, ať jde běh zopakovat (výchozí 1)
//   --max 60               nejdelší běh ve vteřinách (výchozí delka vystoupení + 8)
//   --dojezd 4             kolik vteřin nechat scénu doběhnout po konci choreografie
//   --snimky 0,3,6.5       časy snímků (od začátku vystoupení), nebo kazdych=4
//   --png cesta.png        kam uložit arch se snímky (bez toho se snímky nedělají)
//   --sloupcu 4            kolik snímků vedle sebe
//   --sonda "výraz"        JS výraz nad (dyn, t, V, vstup, st), vypíše se po --po vteřinách
//   --po 1
//   --bez                  bez choreografie: scéna běží sama (na průzkum)
//   --kliky "1,90,90;2.5,40,60"   k tomu ručně kliky: čas,x,y
//   --mys "0.5,90,90;3,20,20"     a pohyby myši: čas,x,y (mezi body jede plynule)
//   --ticho                nevypisovat zvuky
//   --kolis                snímky různě dlouhé (8–50 ms) jako v prohlížeči, ne přesných 60 za vteřinu
//
// Souřadnice jsou v jednotkách kresby (0–180), čas ve vteřinách od začátku vystoupení.
import { createRequire } from "node:module";
import { pathToFileURL, fileURLToPath } from "node:url";

const KOREN = fileURLToPath(new URL("..", import.meta.url)).replaceAll("\\", "/").replace(/\/$/, "");
const require = createRequire(KOREN + "/package.json");

export const OBSAZENI = {
  vazicka: { slozka: "vazicka-gejsa", kusy: ["kvety", "tycinka", "destnik"] },
  kapka: { slozka: "kapka-hrom", kusy: ["kruh", "buben"], drzi: "ano" },
  stripek: { slozka: "stripek-zlato", kusy: ["prstenec", "noc"] },
  pecinka: { slozka: "pecinka-ohen", kusy: ["v1", "v2"] },
  bublinka: { slozka: "bublinka-strasidlo", kusy: ["ohen", "hrbitov"] },
  hlinka: { slozka: "hlinka-zeme", kusy: ["sakura", "ruce"] },
  cedulka: { slozka: "cedulka-ema", kusy: ["v1", "v2"] },
  kachlik: { slozka: "kachlik-rovina", kusy: ["v1", "v2", "v3"] },
  samotka: { slozka: "samotka-nese", kusy: ["v1", "v2", "v3"], drzi: "bod" },
};

const [postava, varianta, ...zbytek] = process.argv.slice(2);
const volby = {};
for (let i = 0; i < zbytek.length; i++) {
  const a = zbytek[i];
  if (!a.startsWith("--")) continue;
  const k = a.slice(2);
  const dalsi = zbytek[i + 1];
  if (dalsi === undefined || dalsi.startsWith("--")) volby[k] = true;
  else {
    volby[k] = dalsi;
    i++;
  }
}
const O = OBSAZENI[postava];
if (!O || !O.kusy.includes(varianta)) {
  console.error("Použití: node scripts/zkouska-vystoupeni.mjs <postava> <varianta> [volby]\n" + Object.entries(OBSAZENI).map(([p, o]) => `  ${p}: ${o.kusy.join(", ")}`).join("\n"));
  process.exit(1);
}

/* zasetá náhoda */
let seed = Number(volby.seed ?? 1) | 0;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const kresby = await import(pathToFileURL(`${KOREN}/src/scripts/${O.slozka}/kresby.js`).href);
const { novyHerec } = await import(pathToFileURL(`${KOREN}/src/scripts/parta3/herec.js`).href);
const V = kresby.kresby[varianta];

let vystoupeni = null;
if (!volby.bez) {
  try {
    const m = await import(pathToFileURL(`${KOREN}/src/scripts/parta3/vystoupeni/${postava}.js`).href);
    vystoupeni = m.default?.[varianta] ?? null;
  } catch (e) {
    console.error("Choreografie se nenačetla:", e.message);
    process.exit(1);
  }
  if (!vystoupeni) {
    console.error(`V ${postava}.js chybí vystoupení „${varianta}“ (export default { ${varianta}: { delka, *hraj(h) {…} } }).`);
    process.exit(1);
  }
}

/* ——— scéna: totéž, co dělá beh.js, jen bez DOM ——— */
const t0 = V.zacatek || 0;
let t = t0;
let dyn = t0 > 0 ? kresby.pretoc(V, t0) : V.novaDynamika();
const vstup = { mys: null, rychlost: 0, kliky: [] };
if (O.drzi === "ano") vstup.drzi = false;
if (O.drzi === "bod") vstup.drzi = null;
let mysPred = null;
/* délka snímku: přesná, nebo kolísavá (vlastní zasetá náhoda, ať se neplete do té, kterou si bere scéna) */
let seedDt = 12345;
const dalsiDt = () => {
  if (!volby.kolis) return 1 / 60;
  seedDt = (seedDt * 1664525 + 1013904223) >>> 0;
  return 0.008 + (seedDt / 4294967296) * 0.042;
};

const zapis = [];
const pis = (text) => zapis.push(`${(t - t0).toFixed(2).padStart(6)}  ${text}`);
let posledniTitulek = "";
const ven = {
  ukaz(x, y) {
    const p = { x, y };
    if (mysPred) {
      const d = Math.hypot(p.x - mysPred.x, p.y - mysPred.y);
      const v = d / Math.max(0.008, t - mysPred.cas);
      vstup.rychlost = vstup.rychlost * 0.6 + v * 0.4;
    }
    mysPred = { ...p, cas: t };
    vstup.mys = p;
    if (O.drzi === "bod" && vstup.drzi) vstup.drzi = p;
  },
  stiskni(x, y) {
    const p = { x, y };
    vstup.mys = p;
    vstup.kliky.push(p);
    if (O.drzi === "ano") vstup.drzi = true;
    if (O.drzi === "bod") vstup.drzi = p;
    pis(`klik   ${x.toFixed(1)}, ${y.toFixed(1)}`);
  },
  pust() {
    if (O.drzi === "ano") vstup.drzi = false;
    if (O.drzi === "bod") vstup.drzi = null;
  },
  pryc() {
    if (O.drzi === "bod" && vstup.drzi) return;
    vstup.mys = null;
    mysPred = null;
    if (O.drzi === "ano") vstup.drzi = false;
    pis("pryč");
  },
  titulek(text) {
    posledniTitulek = text;
    pis(`TITULEK „${text}“`);
  },
  ohlas(typ) {
    pis(`ohlas  ${typ}`);
  },
};

const scena = { V, stav: () => ({ t: t - t0, dyn, vstup }) };
const herec = vystoupeni ? novyHerec(vystoupeni, scena, ven) : null;

/* ruční vstup pro průzkum */
const rada = (s) => String(s || "").split(";").map((k) => k.split(",").map(Number)).filter((k) => k.length === 3 && k.every(Number.isFinite)).sort((a, b) => a[0] - b[0]);
const rucniKliky = rada(volby.kliky);
const rucniMys = rada(volby.mys);
const mysV = (cas) => {
  if (!rucniMys.length || cas < rucniMys[0][0]) return null;
  for (let i = 0; i < rucniMys.length - 1; i++) {
    const [a, b] = [rucniMys[i], rucniMys[i + 1]];
    if (cas >= a[0] && cas < b[0]) {
      const k = (cas - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }
  }
  const z = rucniMys[rucniMys.length - 1];
  return [z[1], z[2]];
};

/* snímky */
const delka = vystoupeni?.delka ?? 20;
const max = Number(volby.max ?? delka + 8);
const dojezd = Number(volby.dojezd ?? 4);
let casySnimku = [];
if (volby.png) {
  const s = String(volby.snimky ?? "kazdych=4");
  if (s.startsWith("kazdych=")) {
    const po = Number(s.slice(8)) || 4;
    for (let q = 0; q <= max + 0.001; q += po) casySnimku.push(q);
  } else casySnimku = s.split(",").map(Number).filter(Number.isFinite);
}
casySnimku.sort((a, b) => a - b);
const snimky = [];

const sonda = volby.sonda ? new Function("dyn", "t", "V", "vstup", "st", `return (${volby.sonda});`) : null;
const po = Number(volby.po ?? 1);
let dalsiSonda = 0;
const zvuky = new Map();
const zkrat = (x) => {
  let s;
  try {
    s = JSON.stringify(x, (k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v));
  } catch {
    s = String(x);
  }
  return s && s.length > 600 ? s.slice(0, 600) + "…" : s;
};

let konecHerce = null;
let chyba = null;
try {
  for (let i = 0; ; i++) {
    const rel = t - t0;
    if (rel > max) break;
    if (konecHerce != null && rel > konecHerce + dojezd) break;
    /* vstup: choreografie, nebo ruční body */
    if (herec) {
      if (!herec.krok(rel) && konecHerce == null) {
        konecHerce = rel;
        pis("— konec choreografie —");
      }
    } else {
      const m = mysV(rel);
      if (m) ven.ukaz(m[0], m[1]);
      while (rucniKliky.length && rucniKliky[0][0] <= rel) {
        const [, x, y] = rucniKliky.shift();
        ven.ukaz(x, y);
        ven.stiskni(x, y);
        ven.pust(x, y);
      }
      if (!rucniKliky.length && !rucniMys.length && rel > max) break;
    }
    /* snímek před krokem, ať je vidět stav v daný čas */
    while (casySnimku.length && casySnimku[0] <= rel + 1e-6) {
      const cas = casySnimku.shift();
      const svg = kresby.celeSvg(V, t, dyn, vstup, { sirka: 360, pozadi: "#F7F1E3" });
      if (svg.includes("NaN")) pis("!!! v kresbě je NaN");
      snimky.push({ cas, svg, kurzor: herec?.kurzor ?? (vstup.mys ? { ...vstup.mys } : null), titulek: posledniTitulek });
    }
    if (sonda && rel >= dalsiSonda - 1e-6) {
      dalsiSonda += po;
      let v;
      try {
        v = sonda(dyn, rel, V, vstup, V.stav(t, vstup, dyn));
      } catch (e) {
        v = "chyba sondy: " + e.message;
      }
      pis(`sonda  ${zkrat(v)}`);
    }
    const DT = dalsiDt();
    t += DT;
    vstup.rychlost *= Math.exp(-DT / 0.15);
    V.krok(dyn, t, DT, vstup);
    V.stav(t, vstup, dyn);
    if (dyn.zvuk?.length) {
      for (const z of dyn.zvuk) {
        const k = Math.floor((t - t0) * 2) / 2;
        if (!zvuky.has(k)) zvuky.set(k, new Map());
        const m = zvuky.get(k);
        m.set(z.druh, (m.get(z.druh) || 0) + 1);
      }
      dyn.zvuk.length = 0;
    }
  }
} catch (e) {
  chyba = e;
}

console.log(`\n${postava} / ${varianta}   seed ${volby.seed ?? 1}   ${vystoupeni ? `délka podle zápisu ${delka} s` : "bez choreografie"}`);
console.log("—— co se dělo ——");
if (!volby.ticho) {
  for (const [k, m] of zvuky) zapis.push(`${k.toFixed(2).padStart(6)}  zvuk   ${[...m].map(([d, n]) => (n > 1 ? `${d}×${n}` : d)).join(", ")}`);
}
zapis.sort((a, b) => parseFloat(a) - parseFloat(b));
console.log(zapis.join("\n"));
if (herec) {
  console.log(`\nchoreografie ${konecHerce == null ? `NEDOHRÁLA do ${max} s` : `dohrála v ${konecHerce.toFixed(1)} s`}`);
  if (herec.vyprsela.length) console.log(`!!! podmínky az(), které se nedočkaly (čas): ${herec.vyprsela.map((x) => x.toFixed(1)).join(", ")}`);
}
if (chyba) {
  console.log("\n!!! CHYBA za běhu:", chyba.stack || chyba);
  process.exitCode = 2;
}

if (volby.png && snimky.length) {
  const sharp = require("sharp");
  const D = 360, POPIS = 46;
  const sl = Math.max(1, Number(volby.sloupcu ?? 4));
  const radku = Math.ceil(snimky.length / sl);
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const bunky = [];
  for (let i = 0; i < snimky.length; i++) {
    const s = snimky[i];
    const x = (i % sl) * D, y = Math.floor(i / sl) * (D + POPIS);
    let png;
    try {
      png = await sharp(Buffer.from(s.svg)).resize(D, D).png().toBuffer();
    } catch (e) {
      console.log(`!!! snímek ${s.cas} s se nevykreslil: ${e.message}`);
      continue;
    }
    bunky.push({ input: png, left: x, top: y });
    const k = s.kurzor;
    const kriz = k ? `<g transform="translate(${(k.x / 180) * D} ${(k.y / 180) * D})" stroke="#00B7FF" stroke-width="2" fill="none"><circle r="9"/><path d="M-15 0H15M0 -15V15"/></g>` : "";
    const popis = `<svg xmlns="http://www.w3.org/2000/svg" width="${D}" height="${D + POPIS}"><rect x="0" y="${D}" width="${D}" height="${POPIS}" fill="#2B2420"/>${kriz}<text x="8" y="${D + 18}" font-family="Arial" font-size="15" font-weight="bold" fill="#FFE7A3">${s.cas.toFixed(1)} s</text><text x="8" y="${D + 37}" font-family="Arial" font-size="12" fill="#F7F1E3">${esc((s.titulek || "").slice(0, 58))}</text></svg>`;
    bunky.push({ input: Buffer.from(popis), left: x, top: y });
  }
  await sharp({ create: { width: sl * D, height: radku * (D + POPIS), channels: 3, background: "#777" } }).composite(bunky).png().toFile(String(volby.png));
  console.log(`\nsnímky: ${volby.png} (${snimky.length} ks, modrý kříž = ukazatel)`);
}
