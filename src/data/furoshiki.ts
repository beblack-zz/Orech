/**
 * Vzory šátku furoshiki v Obchodě 2 (Satek.astro). Kdo nakupuje, vybere,
 * do jakého šátku mu kusy zabalíme; vzor odejde s objednávkou.
 *
 * ODHAD: že dílna má látky ve všech pěti vzorech a barvách — čeká na
 * klientku. Když některý mít nebude, stačí ho tu smazat.
 *
 * `dlazdice()` vrací jednu opakující se dlaždici vzoru jako SVG. Kreslí
 * se z ní vzorník pod šátkem, náhradní kresba šátku bez WebGL2, textura
 * látky ve 3D (scripts/obchod2/satek3d/textura-latky.ts) a uzlík, který
 * hostovi nese Vázička (scripts/vazicka-gejsa/kami-kvety.js).
 */
export interface VzorSatku {
  id: "seigaiha" | "asanoha" | "shippo" | "kikko" | "yagasuri";
  nazev: string;
  kanji: string;
  /** Co vzor přeje — jedna věta na účtenku a do mailu */
  vyznam: string;
  /** Látka, kresba vzoru a rub (bez vzoru, o kus světlejší) */
  barva: { latka: string; kresba: string; rub: string; lem: string };
  /** Rozměr dlaždice v jednotkách SVG */
  w: number;
  h: number;
}

export const vzory: VzorSatku[] = [
  {
    id: "seigaiha",
    nazev: "Seigaiha",
    kanji: "青海波",
    vyznam: "Vlny moře, které se opakují bez konce — klid a štěstí, co nepřestává.",
    barva: { latka: "#2E4A78", kresba: "#EFE4CC", rub: "#4C6A9C", lem: "#22375C" },
    w: 40,
    h: 20,
  },
  {
    id: "asanoha",
    nazev: "Asanoha",
    kanji: "麻の葉",
    vyznam: "Konopné listy rostou rovně a rychle — přání zdraví a síly, dávalo se dětem.",
    barva: { latka: "#2F5A4C", kresba: "#E6DCC0", rub: "#4D7A69", lem: "#1F3E34" },
    w: 40,
    h: 69.282,
  },
  {
    id: "shippo",
    nazev: "Šippó",
    kanji: "七宝",
    vyznam: "Kruhy do sebe zapadají bez konce — souznění a dobré vztahy.",
    barva: { latka: "#56406A", kresba: "#EADDC6", rub: "#76608A", lem: "#3A2A4A" },
    w: 36,
    h: 36,
  },
  {
    id: "kikko",
    nazev: "Kikkó",
    kanji: "亀甲",
    vyznam: "Želví krunýř — dlouhý život a ochrana toho, co je uvnitř.",
    barva: { latka: "#7A452A", kresba: "#F0DFC2", rub: "#97644A", lem: "#55301C" },
    w: 41.569,
    h: 24,
  },
  {
    id: "yagasuri",
    nazev: "Jagasuri",
    kanji: "矢絣",
    vyznam: "Vystřelený šíp letí jen dopředu — odhodlání a dobrý začátek.",
    barva: { latka: "#A3362B", kresba: "#F2E6D0", rub: "#BE5A4C", lem: "#6E2119" },
    w: 32,
    h: 40,
  },
];

export const VYCHOZI_VZOR: VzorSatku["id"] = "seigaiha";
export const vzorPodleId = (id: unknown) => vzory.find((v) => v.id === id);

const f = (n: number) => String(Math.round(n * 100) / 100);

/** Kresba jedné dlaždice (bez podkladu) — tvary přesahují okraj a dlaždice je ořízne, takže navazuje */
function kresba(v: VzorSatku): string {
  const c = v.barva.kresba;
  const l = v.barva.latka;
  if (v.id === "seigaiha") {
    /* Vlny: soustředné oblouky v řadách přes sebe */
    const vlna = (cx: number, cy: number) =>
      `<path d="M${cx - 20} ${cy} A20 20 0 0 1 ${cx + 20} ${cy} Z" fill="${l}"/>` +
      `<path d="M${cx - 20} ${cy} A20 20 0 0 1 ${cx + 20} ${cy} M${cx - 14} ${cy} A14 14 0 0 1 ${cx + 14} ${cy} M${cx - 8} ${cy} A8 8 0 0 1 ${cx + 8} ${cy}" fill="none" stroke="${c}" stroke-width="1.3"/>`;
    /* Spodní půlřada (20, 30) patří dlaždici pod touhle, ale do téhle sahá horním obloukem — bez ní jsou mezi řadami rovné švy */
    return [vlna(0, 0), vlna(40, 0), vlna(20, 10), vlna(0, 20), vlna(40, 20), vlna(20, 30)].join("");
  }
  if (v.id === "asanoha") {
    /* Konopné listy: trojúhelníková síť a z těžiště každého trojúhelníku čáry do jeho vrcholů */
    const a = 40;
    const vy = (a * Math.sqrt(3)) / 2;
    const cary: string[] = [];
    for (let r = -1; r <= 2; r++) {
      for (let k = -2; k <= 2; k++) {
        const x0 = k * a + (r % 2 ? a / 2 : 0);
        const y0 = r * vy;
        /* trojúhelník špičkou nahoru a dolů */
        const tri: [number, number][][] = [
          [[x0, y0 + vy], [x0 + a, y0 + vy], [x0 + a / 2, y0]],
          [[x0 + a / 2, y0], [x0 + a * 1.5, y0], [x0 + a, y0 + vy]],
        ];
        for (const t of tri) {
          const cx = (t[0][0] + t[1][0] + t[2][0]) / 3;
          const cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
          cary.push(`M${f(t[0][0])} ${f(t[0][1])} L${f(t[1][0])} ${f(t[1][1])} L${f(t[2][0])} ${f(t[2][1])} Z`);
          for (const [x, y] of t) cary.push(`M${f(cx)} ${f(cy)} L${f(x)} ${f(y)}`);
        }
      }
    }
    return `<path d="${cary.join(" ")}" fill="none" stroke="${c}" stroke-width="1.1" stroke-linejoin="round"/>`;
  }
  if (v.id === "shippo") {
    /* Do sebe zapadající kruhy: střed v rozích a uprostřed dlaždice */
    const stredy = [[0, 0], [36, 0], [0, 36], [36, 36], [18, 18]];
    const kruhy = stredy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="18" />`).join("");
    /* Tečky ve středech čtyřlístků, kde se kruhy potkávají */
    const tecky = [[18, 0], [0, 18], [36, 18], [18, 36]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${c}" stroke="none"/>`).join("");
    return `<g fill="none" stroke="${c}" stroke-width="1.3">${kruhy}</g>${tecky}`;
  }
  if (v.id === "kikko") {
    /* Želví krunýř: šestiúhelníky s dvojitou linkou */
    const a = 13.856;
    const sest = (cx: number, cy: number, s: number) =>
      Array.from({ length: 6 }, (_, i) => {
        const u = (Math.PI / 3) * i;
        return `${i ? "L" : "M"}${f(cx + s * Math.cos(u))} ${f(cy + s * Math.sin(u))}`;
      }).join(" ") + " Z";
    const stredy = [[0, 0], [41.569, 0], [0, 24], [41.569, 24], [20.785, 12], [20.785, -12], [20.785, 36]];
    return `<path d="${stredy.map(([x, y]) => sest(x, y, a)).join(" ")}" fill="none" stroke="${c}" stroke-width="1.4"/>` +
      `<path d="${stredy.map(([x, y]) => sest(x, y, a * 0.62)).join(" ")}" fill="none" stroke="${c}" stroke-width="0.9" opacity="0.8"/>`;
  }
  /* Jagasuri: pera šípů — sloupce kostek ve tvaru krokve, střídavě světlé a tmavé; sousední sloupec posunutý o půl */
  const pero = (x: number, y: number) => `<path d="M${x} ${y} L${x + 8} ${y + 6} L${x + 16} ${y} L${x + 16} ${y + 20} L${x + 8} ${y + 26} L${x} ${y + 20} Z" fill="${c}"/>`;
  return [pero(0, -40), pero(0, 0), pero(0, 40), pero(16, -20), pero(16, 20)].join("") +
    `<path d="M8 0 V40 M24 0 V40" stroke="${l}" stroke-width="0.7" opacity="0.35"/><path d="M8 0 V40 M24 0 V40" stroke="${c}" stroke-width="0.7" opacity="0.25" stroke-dasharray="6 14"/>`;
}

/** Celá dlaždice i s podkladem jako samostatné SVG */
export function dlazdice(v: VzorSatku, meritko = 1): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${f(v.w * meritko)}" height="${f(v.h * meritko)}" viewBox="0 0 ${f(v.w)} ${f(v.h)}"><rect width="${f(v.w)}" height="${f(v.h)}" fill="${v.barva.latka}"/>${kresba(v)}</svg>`;
}

/** Obsah <pattern> pro vložení do stránky (podklad + kresba) */
export const vzorPattern = (v: VzorSatku) => `<rect width="${f(v.w)}" height="${f(v.h)}" fill="${v.barva.latka}"/>${kresba(v)}`;
