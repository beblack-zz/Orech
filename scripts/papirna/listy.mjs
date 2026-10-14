/**
 * Listy pilotu Kami z papíru (A4 nastojato, mm). Každý list vrací
 * `svg` (obsah stránky 210 × 297) a `texty` — ty se nekreslí do obrázku,
 * ale přímo do PDF písmem webu (Fraunces na nadpisy, Caveat na ruku).
 */
import { kvadr, miska, stojanek, INKOUST, CHLOPEN } from "./site.mjs";
import { R, kachlikSteny, getaSteny, vodovahaSteny, kapkaObrysy, kapkaLic, kapkaRub, KAPKA, dilna } from "./kresby.mjs";

const HNEDA = "#5C4A3E";
const RUMELKA = "#C4432B";

/** Hlavička listu: název balíčku, kdo je na listu, a jedna věta o něm */
const hlavicka = (kdo, veta) => [
  { x: 12, y: 18, t: "Kami z papíru", pismo: "f", vel: 20, barva: INKOUST },
  { x: 198, y: 17, t: kdo, pismo: "c", vel: 22, barva: RUMELKA, zarovnani: "r" },
  { x: 12, y: 26, t: veta, pismo: "c", vel: 13, barva: HNEDA },
];

/** Vysvětlivky čar: plná, čárkovaná, šedá */
function vysvetlivky(x, y, obrys) {
  const svg =
    `<path d="M${x} ${y} h12" stroke="${INKOUST}" stroke-width="0.32"/>` +
    `<path d="M${x} ${y + 8} h12" stroke="${INKOUST}" stroke-width="0.26" stroke-dasharray="1.8 1.2"/>` +
    `<rect x="${x}" y="${y + 13.5} " width="12" height="5" fill="${obrys ? CHLOPEN.obrys : CHLOPEN.barva}" stroke="${INKOUST}" stroke-width="0.32"/>`;
  const texty = [
    { x: x + 15, y: y + 1.4, t: "stříhej", pismo: "c", vel: 12, barva: INKOUST },
    { x: x + 15, y: y + 9.4, t: "ohni", pismo: "c", vel: 12, barva: INKOUST },
    { x: x + 15, y: y + 17.4, t: "sem lepidlo", pismo: "c", vel: 12, barva: INKOUST },
  ];
  return { svg, texty };
}

/** Postup v očíslovaných krocích; krok může mít víc řádků (pole) */
function postup(x, y, kroky) {
  const out = [];
  let radek = 0;
  kroky.forEach((k, i) => {
    const radky = Array.isArray(k) ? k : [k];
    out.push({ x, y: y + radek * 6.6, t: `${i + 1}.`, pismo: "f", vel: 10, barva: RUMELKA });
    radky.forEach((t) => out.push({ x: x + 5, y: y + radek++ * 6.6, t, pismo: "c", vel: 13, barva: INKOUST }));
    radek += 0.25;
  });
  return out;
}

/** List 1 — Kachlík: krabička, podstavec s getami a vodováha */
export function listKachlik(obrys) {
  const kostka = kvadr({ W: 38, D: 38, H: 38, x0: 8, y0: 36, steny: kachlikSteny(obrys, obrys ? "ko" : "kb"), obrys, id: obrys ? "kko" : "kkb" });
  const podstavec = miska({ W: 38, D: 38, H: 9, x0: 138, y0: 36, steny: getaSteny(obrys, "g"), obrys, id: obrys ? "gmo" : "gmb" });
  const vodovaha = kvadr({ W: 30, D: 6, H: 6, x0: 146, y0: 116, steny: vodovahaSteny(obrys), obrys, id: obrys ? "vvo" : "vvb", hloubka: 4.5 });
  const vys = vysvetlivky(142, 160, obrys);
  const texty = [
    ...hlavicka("Kachlík", obrys ? "Vybarvi ho, jak chceš — i kachle bývají modré, zelené nebo bílé." : "Kachel, co si zakládá na rovnosti. Na hlavě nosí vodováhu."),
    { x: 172, y: 112, t: "podstavec s getami", pismo: "c", vel: 11, barva: HNEDA, zarovnani: "c" },
    { x: 172, y: 151, t: "vodováha", pismo: "c", vel: 11, barva: HNEDA, zarovnani: "c" },
    ...vys.texty,
    { x: 12, y: 212, t: "Jak na to", pismo: "f", vel: 13, barva: INKOUST },
    ...postup(12, 221, [
      "Vystřihni všechny tři díly po plné čáře. Šedé chlopně nech na nich.",
      "Všechny čárkované čáry ohni dovnitř — přes hranu pravítka to jde nejlíp.",
      "Krabičku slep: lepidlo na šedé chlopně, přilož je zevnitř k sousední stěně.",
      "Podstavec slep jako misku a horní chlopně přilep Kachlíkovi zespodu.",
      "Vodováhu slep jako malou krabičku a přilep ji na světlé místo na hlavě.",
      "Hotovo. Kachlík teď pohlídá, jestli máš rovně knížky v poličce.",
    ]),
  ];
  return { svg: kostka.svg + podstavec.svg + vodovaha.svg + vys.svg, texty };
}

/** List 2 — Kapka: stojánek a postup */
export function listKapka(obrys) {
  const k = 0.64;
  const id = obrys ? "kpo" : "kpb";
  const st = stojanek({
    obrysy: kapkaObrysy,
    lic: kapkaLic(R(obrys, k, `${id}l`)),
    rub: kapkaRub(R(obrys, k, `${id}r`)),
    k, zem: KAPKA.zem, stred: KAPKA.stred, temeno: KAPKA.temeno, noha: KAPKA.noha,
    x0: 14, y0: 34, hloubka: 16, obrys, id,
  });
  const vys = vysvetlivky(128, 40, obrys);
  const texty = [
    ...hlavicka("Kapka", obrys ? "Vybarvi ji. Kapka může být i duhová, nikdo se nezlobí." : "Kami vody a hromu. Bubny má schované v mracích, paličky nosí s sebou."),
    ...vys.texty,
    { x: 128, y: 72, t: "Jak na to", pismo: "f", vel: 13, barva: INKOUST },
    ...postup(128, 81, [
      ["Vystřihni Kapku i s podstavou", "a šedou chlopní na špičce."],
      ["Ohni obě čárkované čáry", "u podstavy a tu u chlopně."],
      ["Obě Kapky zvedni proti sobě,", "až se jim sejdou špičky."],
      ["Chlopeň namaž lepidlem a přilep", "ji zevnitř k přední Kapce."],
      ["Postav ji na stůl. Stojí sama", "a z obou stran je to ona."],
    ]),
    { x: 12, y: st.yPodstava - 30, t: "zepředu", pismo: "c", vel: 11, barva: HNEDA },
    { x: 12, y: st.yPodstava + 50, t: "zezadu", pismo: "c", vel: 11, barva: HNEDA },
  ];
  return { svg: st.svg + vys.svg, texty };
}

/** List 3 — omalovánka: dílna */
export function listDilna() {
  const w = 190, h = 236;
  return {
    svg: `<g transform="translate(10 34)">${dilna(w, h)}</g>`,
    texty: [
      ...hlavicka("V dílně", "Kapka kape vodu na hlínu a Kachlík měří, jestli police visí rovně."),
      { x: 10 + 94, y: 34 + 76, t: "tady jsi ty", pismo: "c", vel: 13, barva: HNEDA, zarovnani: "c" },
      { x: 105, y: 282, t: "Kdo z party tu ještě chybí? Dokresli ho.", pismo: "c", vel: 15, barva: INKOUST, zarovnani: "c" },
    ],
  };
}
