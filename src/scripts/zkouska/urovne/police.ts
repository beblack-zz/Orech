/**
 * Úroveň 七 Police — Skládání pece (components/zkouska/urovne/Police.astro).
 *
 * Vlevo regál se syrovými kusy, vpravo pec v řezu. Kusy se přetahují do
 * pece: při tahu se kus přichytí k povrchu patra pod svou patou (Šamotka,
 * první police, horní police) a vodorovně jde za ukazatelem — sousedé na
 * polici mu uhnou, pokud je místo. Když není, kus se nepoloží a vrátí se.
 * Sloupky se přepínají kliknutím (6 → 9 → 12 → 15 cm) a police nad nimi
 * jede i se vším, co nese. Pravidla a čísla jsou v police-pravidla.ts:
 * odstup od stěn, mezery, místo nad kusem, nosnost a otřené dno.
 *
 * Kusy s glazurou na dně se otírají o houbičku v misce s vodou — stačí je
 * na ni přetáhnout. Víko jde zavřít, až je v peci všech sedm povinných
 * kusů a nic nemá potíž. Na skládání jsou tři minuty.
 *
 * Body: 70 za zavřené víko, 12 za každý ze dvou kusů navíc, za rychlost
 * až 6 (do minuty), po 150 s se ubírá až 14 (body() v pravidlech).
 * 優 tedy chce aspoň jeden kus navíc a víko do 105 s, nebo všech devět.
 *
 * Ovládání: tah myší nebo prstem; klepnutí kus zvedne a další klepnutí do
 * scény ho položí tam, kam se klepne. Z klávesnice Tab na kus, Enter ho
 * zvedne, šipky nahoru a dolů vybírají patro (pod Šamotkou houbičku
 * a regál), doleva a doprava místo, Enter položí, Escape vrátí. Na
 * sloupcích Enter přepne výšku dokola, šipky ji zvednou nebo sníží.
 */
import type { Uroven, Vysledek } from "../hra";
import { casText } from "../hra";
import * as zvuk from "../../parta2/zvuk";
import { G, REGAL, MISTA_REGAL, kusKresba, tvarSamotky, yPatra, popisKusu, scena, vyskaText } from "../../../components/zkouska/urovne/police-kresba";
import type { Nalada } from "../../../components/zkouska/urovne/police-kresba";
import {
  KUSY, PEC, NOSNOST, LIMIT, POVINNYCH, VLEVO, VPRAVO, NAZEV_PATRA, SLOUPKY,
  kusPodleId, rozmisti, zkontroluj, body, dalsiVyska, prvniVolne, chybiMista, kusu, kg, cm, vychoziStav,
} from "./police-pravidla";
import type { Patro, Umisteni, Kontrola, Misto, Potiz } from "./police-pravidla";

type Cil =
  | { druh: "patro"; patro: Patro; x: number; mista: Map<string, number> | null }
  | { druh: "houba" }
  | { druh: "regal" };

interface Drzeni {
  id: string;
  /** tah = táhne se, ruka = zvednuto klepnutím, klavesy = z klávesnice */
  rezim: "tah" | "ruka" | "klavesy";
  puvod: Umisteni | null;
  pointerId: number | null;
  /** Kde tah začal (px) a jestli se už kus pohnul o víc než pár pixelů */
  start: { x: number; y: number };
  posunuto: boolean;
  /** Úchop: kde je pata kusu vůči ukazateli, v jednotkách scény při měřítku 1 */
  chyt: { dx: number; dy: number };
  /** Poslední bod ukazatele ve scéně — dokud ho není, kus visí nad svým místem */
  bod: { x: number; y: number } | null;
  cil: Cil;
}

interface Pohyb {
  x: number; y: number; s: number; r: number;
  vx: number; vy: number; vs: number; vr: number;
}

const VETY = {
  start: "Ještě jeden hrnek? Jasně. Klidně dva.",
  prvni: "Zvládnu to. Vždycky to zvládnu.",
  tize: "Tisíc stupňů zespodu, cizí misky shora. Normální den.",
  dotek: "Ty dva se dotýkají. V peci by se slepily.",
  dno: "Kdyby glazura stekla až na mě… ne, nebudu na to myslet.",
  vysoko: "Tohle pod polici neprojde. Zvedni ji — klikni na sloupky.",
  nizko: "Teď to narazí. Police je moc nízko.",
  viko: "S tímhle víko nezavřeš. Pod víkem musí zbýt centimetr a půl.",
  police: "Tahle police tolik neunese. Já bych to unesla. Ale mě se nikdo neptá.",
  samotka: "Uf. Tohle je moc i na mě.",
  otreno: "Čisté dno. Děkuju. Fakt.",
  pripraveno: "Sedm kusů a nic se nedotýká. Víko může dolů. Nebo ještě jeden?",
  vsechno: "Všech devět? Tak to je den.",
};

const PRAH_TAHU = 6;
const SLOVY = ["žádný", "jeden", "dva", "tři", "čtyři", "pět", "šest", "sedm"];
const PORADI_KLAVES: ("regal" | "houba" | Patro)[] = ["regal", "houba", 0, 1, 2];

export const police: Uroven = (p) => {
  const ac = new AbortController();
  const sig = { signal: ac.signal };
  const koren = p.koren;
  /* Výchozí stav: scéna se vykreslí znovu celá — DOM po minulém pokusu se zahodí */
  koren.innerHTML = scena();
  koren.classList.remove("hraje", "zaviram", "dosedlo");
  const q = <T extends Element>(s: string) => koren.querySelector<T>(s)!;

  const svg = q<SVGSVGElement>(".mp7-kresba");
  const plocha = q<HTMLElement>(".mp7-plocha");
  const vrstvy = ([0, 1, 2] as Patro[]).map((pat) => q<SVGGElement>(`.mp7-vrstva[data-patro="${pat}"]`));
  const vrstvaRegal = q<SVGGElement>(".mp7-vrstva-regal");
  const vrstvaTah = q<SVGGElement>(".mp7-tazeny");
  const policeEl = [q<SVGGElement>('.mp7-police[data-police="1"]'), q<SVGGElement>('.mp7-police[data-police="2"]')];
  const stinyEl = [q<SVGRectElement>('.mp7-stin-police[data-police="1"]'), q<SVGRectElement>('.mp7-stin-police[data-police="2"]')];
  const sloupkyEl = [q<SVGGElement>('.mp7-sloupky[data-patro="0"]'), q<SVGGElement>('.mp7-sloupky[data-patro="1"]')];
  const vodidla = q<SVGGElement>(".mp7-vodidla");
  const pasy = [q<SVGRectElement>('.mp7-vodidlo-pas[data-pod="1"]'), q<SVGRectElement>('.mp7-vodidlo-pas[data-pod="2"]')];
  const tvar = q<SVGGElement>(".mp7-tvar");
  const samotkaTelo = q<SVGGElement>(".mp7-samotka-telo");
  const nahled = q<SVGGElement>(".mp7-nahled");
  const nahledStin = q<SVGEllipseElement>(".mp7-nahled-stin");
  const houba = q<SVGGElement>(".mp7-houba-telo");
  const viko = q<SVGGElement>(".mp7-viko");
  const zarPec = q<SVGGElement>(".mp7-zar-pec");
  const displej = q<SVGTextElement>(".mp7-displej");
  const kontrolka = q<SVGCircleElement>(".mp7-kontrolka");
  const kusyEl = new Map<string, SVGGElement>(KUSY.map((k) => [k.id, q<SVGGElement>(`.mp7-kus[data-kus="${k.id}"]`)]));
  const tlacitka = new Map<string, HTMLButtonElement>(KUSY.map((k) => [k.id, q<HTMLButtonElement>(`.mp7-kus-tl[data-kus="${k.id}"]`)]));
  const sloupkyTl = [q<HTMLButtonElement>('.mp7-sloupky-tl[data-patro="0"]'), q<HTMLButtonElement>('.mp7-sloupky-tl[data-patro="1"]')];
  const sloupkyPrave = [q<HTMLElement>('.mp7-sloupky-pravy[data-patro="0"]'), q<HTMLElement>('.mp7-sloupky-pravy[data-patro="1"]')];
  const houbaTl = q<HTMLButtonElement>(".mp7-houba-tl");
  const zateze = ([0, 1, 2] as Patro[]).map((pat) => q<HTMLElement>(`.mp7-zatez[data-patro="${pat}"]`));
  const kotva = q<HTMLElement>(".mp7-kotva");
  const uf = q<HTMLElement>(".mp7-uf");
  const duvodyEl = q<HTMLElement>(".mp7-duvody");
  const info = q<HTMLElement>(".mp7-info");
  const btZavrit = q<HTMLButtonElement>(".mp7-zavrit");

  /* ——— Stav ——— */
  const st = vychoziStav();
  let kontrola: Kontrola = zkontroluj(st);
  let drzeni: Drzeni | null = null;
  /** Kus, kterému se zrovna otírá dno */
  let myti: { id: string; od: number } | null = null;
  let bezi = false;
  /** Víko se zavírá, nebo vypršel čas — vstup se už nebere */
  let konci = false;
  let skonceno = false;
  let vysledekKonce: "uspech" | "neuspech" | null = null;
  let t0 = 0;
  let ted = 0;
  let raf = 0;
  let posledniSnimek = 0;
  let animaceKonce: ((t: number) => void) | null = null;
  const casovace = new Set<number>();
  const pozdeji = (fn: () => void, ms: number) => {
    const id = window.setTimeout(() => {
      casovace.delete(id);
      fn();
    }, ms);
    casovace.add(id);
  };
  const klid = p.klid;

  /** Zobrazená výška sloupků — pruží za skutečnou, police s nákladem jedou za ní */
  const zobr = [st.sloupky[0], st.sloupky[1]];
  const zobrV = [0, 0];
  const pohyb = new Map<string, Pohyb>();

  /* ——— Šamotka mluví ——— */
  let mluvila = -1e9;
  const rekla = new Set<string>();
  /** Věta, která se jednou říct má, ale zrovna by skočila do řeči — počká chvíli */
  let odlozena: { text: string; do: number } | null = null;
  const rikej = (text: string, jednou = false, prednost = false) => {
    if (konci || skonceno || !bezi) return;
    if (jednou && rekla.has(text)) return;
    if (!prednost && performance.now() - mluvila < 3800) {
      if (jednou) odlozena = { text, do: performance.now() + 7000 };
      return;
    }
    rekla.add(text);
    mluvila = performance.now();
    p.rekni(text, kotva);
    zvuk.reakce("samotka");
  };
  let chvilkova: { n: Nalada; do: number } | null = null;
  const chvilku = (n: Nalada, ms = 900) => {
    chvilkova = { n, do: performance.now() + ms };
  };

  /* ——— Pomocníci ——— */
  const def = kusPodleId;
  const naPatre = (pat: Patro, krome?: string): Misto[] =>
    KUSY.filter((k) => k.id !== krome && st.kde[k.id]?.patro === pat).map((k) => ({ id: k.id, x: st.kde[k.id]!.x, w: k.sirka }));
  const bodScene = (e: PointerEvent) => {
    const b = svg.getBoundingClientRect();
    return { x: ((e.clientX - b.left) / Math.max(1, b.width)) * G.W, y: ((e.clientY - b.top) / Math.max(1, b.height)) * G.H };
  };
  /** Má držený kus živý cíl (táhne se, nebo se míří klávesnicí)? Jinak jen visí nad svým místem. */
  const zivy = (d: Drzeni) => d.rezim === "klavesy" || d.bod !== null;

  let posledniUkazatel = "";
  const obnovUkazatel = () => {
    const n = kontrola.vPeci.length;
    const pocet = n <= POVINNYCH ? `${n}/${POVINNYCH}` : `${POVINNYCH}/${POVINNYCH} + ${n - POVINNYCH}`;
    const t = `V peci ${pocet} · ${casText(Math.min(LIMIT, ted))}`;
    if (t !== posledniUkazatel) {
      posledniUkazatel = t;
      p.ukazatel(t);
    }
  };

  const xNaCili = (id: string, c: Extract<Cil, { druh: "patro" }>) => c.mista?.get(id) ?? Math.min(Math.max(c.x, VLEVO), VPRAVO - def(id).sirka);

  /** Kde kus stojí, když ho nikdo nedrží: v peci (i s uhýbáním před drženým kusem), nebo na regálu */
  const zakladniCil = (id: string, u: Umisteni | null) => {
    const k = def(id);
    if (u) {
      let x = u.x;
      const d = drzeni;
      if (d && zivy(d) && d.cil.druh === "patro" && d.cil.patro === u.patro && d.cil.mista) x = d.cil.mista.get(id) ?? x;
      return { x: G.ix0 + (x + k.sirka / 2) * G.k, y: yPatra([zobr[0], zobr[1]], u.patro), s: 1, r: 0 };
    }
    const m = MISTA_REGAL[id];
    return { x: m.x, y: REGAL.desky[m.deska], s: G.regal, r: 0 };
  };
  const kotvaTahu = (d: Drzeni) => {
    const b = d.bod!;
    return d.rezim === "ruka" ? { x: b.x, y: b.y } : { x: b.x + d.chyt.dx, y: b.y + d.chyt.dy };
  };
  const cilKusu = (id: string): { x: number; y: number; s: number; r: number } => {
    if (myti?.id === id) {
      const h = REGAL.houba;
      const t = (performance.now() - myti.od) / 1000;
      const kyv = klid ? 0 : Math.sin(t * 22);
      return { x: h.x + kyv * 6, y: h.y - 36, s: 0.72, r: kyv * 7 };
    }
    const d = drzeni;
    if (d?.id === id) {
      if (!zivy(d)) {
        const z = zakladniCil(id, d.puvod);
        return { ...z, y: z.y - 10 * z.s, s: z.s * 1.04 };
      }
      const c = d.cil;
      if (c.druh === "patro") return { x: G.ix0 + (xNaCili(id, c) + def(id).sirka / 2) * G.k, y: yPatra(st.sloupky, c.patro) - 5, s: 1, r: 0 };
      if (d.rezim === "klavesy") {
        if (c.druh === "houba") return { x: REGAL.houba.x, y: REGAL.houba.y - 42, s: 0.8, r: 0 };
        const z = zakladniCil(id, null);
        return { ...z, y: z.y - 12 * z.s, s: z.s * 1.04 };
      }
      const a = kotvaTahu(d);
      return { x: a.x, y: a.y, s: c.druh === "regal" && a.x < REGAL.x1 ? 0.75 : 1, r: -3 };
    }
    return zakladniCil(id, st.kde[id]);
  };

  /** Patro podle paty kusu: první povrch pod ní (kousek pod povrchem se ještě přichytí nahoru) */
  const patroPodY = (y: number): Patro => {
    for (const pat of [2, 1] as Patro[]) if (yPatra(st.sloupky, pat) >= y - 16) return pat;
    return 0;
  };
  const cilNaPatre = (id: string, pat: Patro, x: number): Cil => ({ druh: "patro", patro: pat, x, mista: rozmisti(naPatre(pat, id), { id, x, w: def(id).sirka }) });
  const cilZBodu = (d: Drzeni): Cil => {
    const b = d.bod!;
    const h = REGAL.houba;
    if (b.x > h.x - h.w / 2 - 8 && b.x < h.x + h.w / 2 + 8 && b.y > h.y - 58 && b.y < h.y + 16) return { druh: "houba" };
    const a = kotvaTahu(d);
    if (a.x >= G.ix0 - 34 && a.x <= G.ix1 + 34 && a.y >= G.yViko - 80) return cilNaPatre(d.id, patroPodY(a.y), (a.x - G.ix0) / G.k - def(d.id).sirka / 2);
    return { druh: "regal" };
  };

  /** Potíže, které by držený kus měl na svém cíli */
  const potizeNaCili = (id: string, c: Cil): Potiz[] => {
    if (c.druh !== "patro") return [];
    if (!c.mista) {
      const chybi = cm(chybiMista(naPatre(c.patro, id), def(id).sirka));
      return [{ druh: "dotek", text: `Nevejde se — chybí ${chybi}`, kratce: `Chybí ${chybi}` }];
    }
    const zkus = { sloupky: st.sloupky, otreno: st.otreno, kde: { ...st.kde } };
    for (const [kid, x] of c.mista) zkus.kde[kid] = { patro: c.patro, x };
    return zkontroluj(zkus).potize[id];
  };

  /* ——— Kresba kusů a jejich tlačítek ——— */
  /** Co se naposledy zapsalo — ať se DOM nepřepisuje, když se nic nehýbe */
  const zapsano = new Map<string, string>();
  const zapisKus = (id: string, m: Pohyb) => {
    const t = `translate(${m.x.toFixed(2)} ${m.y.toFixed(2)}) rotate(${m.r.toFixed(2)}) scale(${m.s.toFixed(4)})`;
    if (zapsano.get(id) === t) return;
    zapsano.set(id, t);
    kusyEl.get(id)!.setAttribute("transform", t);
    const k = def(id);
    const w = k.sirka * G.k * m.s;
    const h = k.vyska * G.k * m.s;
    /* Tlačítko je větší než kus — na telefonu je jednotka scény menší než půl pixelu */
    const okraj = 9;
    const vyska = Math.max(h + okraj * 2, 54);
    const sirka = Math.max(w + okraj * 2, 54);
    const tl = tlacitka.get(id)!.style;
    tl.left = `${(((m.x - sirka / 2) / G.W) * 100).toFixed(3)}%`;
    tl.top = `${(((m.y + okraj - vyska) / G.H) * 100).toFixed(3)}%`;
    tl.width = `${((sirka / G.W) * 100).toFixed(3)}%`;
    tl.height = `${((vyska / G.H) * 100).toFixed(3)}%`;
  };
  /** Do které vrstvy kus patří: kus na patře zakrývá police nad ním, držený je nad vším */
  const zarad = (id: string) => {
    const el = kusyEl.get(id)!;
    const u = st.kde[id];
    const rodic = drzeni?.id === id || myti?.id === id ? vrstvaTah : u ? vrstvy[u.patro] : vrstvaRegal;
    if (el.parentNode !== rodic) rodic.append(el);
  };

  /* ——— Police, sloupky, štítky ——— */
  const zapisPolice = () => {
    const klic = `${zobr[0].toFixed(2)}/${zobr[1].toFixed(2)}`;
    if (zapsano.get("·police") === klic) return;
    zapsano.set("·police", klic);
    const s: [number, number] = [zobr[0], zobr[1]];
    const y1 = yPatra(s, 1);
    const y2 = yPatra(s, 2);
    const hrana = PEC.deska * G.k;
    policeEl[0].setAttribute("transform", `translate(0 ${y1.toFixed(2)})`);
    policeEl[1].setAttribute("transform", `translate(0 ${y2.toFixed(2)})`);
    stinyEl[0].setAttribute("transform", `translate(0 ${(y1 + hrana - 4).toFixed(2)})`);
    stinyEl[1].setAttribute("transform", `translate(0 ${(y2 + hrana - 4).toFixed(2)})`);
    pasy[0].setAttribute("y", (y1 + hrana).toFixed(2));
    pasy[1].setAttribute("y", (y2 + hrana).toFixed(2));
    ([0, 1] as const).forEach((i) => {
      const yd = yPatra(s, i);
      const v = s[i] * G.k;
      sloupkyEl[i].setAttribute("transform", `translate(0 ${yd.toFixed(2)})`);
      sloupkyEl[i].querySelectorAll(".mp7-sloupek").forEach((r) => {
        r.setAttribute("y", (-v - 4).toFixed(2));
        r.setAttribute("height", Math.max(1, v - 1).toFixed(2));
      });
      const yh = yd - v;
      for (const el of [sloupkyTl[i], sloupkyPrave[i]]) {
        el.style.top = `${((yh / G.H) * 100).toFixed(3)}%`;
        el.style.height = `${((v / G.H) * 100).toFixed(3)}%`;
      }
    });
    zateze[1].style.top = `${(((y1 + 1) / G.H) * 100).toFixed(3)}%`;
    zateze[2].style.top = `${(((y2 + 1) / G.H) * 100).toFixed(3)}%`;
  };

  /* ——— Šamotčina nálada ——— */
  let naladaTed: Nalada = "klid";
  const nalada = (): Nalada => {
    if (vysledekKonce === "uspech") return "blaho";
    if (vysledekKonce === "neuspech") return "smutek";
    if (chvilkova && performance.now() < chvilkova.do) return chvilkova.n;
    if (kontrola.pretizeno[0]) return "au";
    if (kontrola.zatez[0] >= NOSNOST[0] * 0.75) return "uf";
    if (kontrola.vPeci.some((id) => !st.otreno[id])) return "strach";
    if (drzeni && !st.otreno[drzeni.id] && zivy(drzeni) && drzeni.cil.druh === "patro") return "strach";
    if (kontrola.zatez[0] >= NOSNOST[0] * 0.5) return "napeti";
    return "klid";
  };
  const obnovNaladu = () => {
    const n = nalada();
    if (n === naladaTed) return;
    naladaTed = n;
    tvar.innerHTML = tvarSamotky(n);
    uf.classList.toggle("je", n === "uf" || n === "au");
  };

  const textMista = (u: Umisteni | null) => (u ? (u.patro === 0 ? "Na Šamotce" : u.patro === 1 ? "Na první polici" : "Na horní polici") : "Na regálu");

  /** Po každé změně stavu: kontrola, kusy, štítky, tlačítka */
  const obnov = () => {
    kontrola = zkontroluj(st);
    for (const k of KUSY) {
      const pz = kontrola.potize[k.id];
      const vPeci = !!st.kde[k.id];
      const drzeny = drzeni?.id === k.id;
      kusyEl.get(k.id)!.classList.toggle("spatne", vPeci && pz.length > 0);
      kusyEl.get(k.id)!.classList.toggle("drzeny", drzeny);
      const tl = tlacitka.get(k.id)!;
      tl.classList.toggle("mimo-regal", vPeci || drzeny || myti?.id === k.id);
      tl.classList.toggle("spatne", vPeci && pz.length > 0);
      /* Zvednutý kus nechá klepnutí projít do scény — tam se položí */
      tl.classList.toggle("v-ruce", drzeny && drzeni!.rezim !== "tah");
      tl.querySelector<HTMLElement>(".mp7-dno")!.hidden = st.otreno[k.id];
      tl.setAttribute(
        "aria-label",
        `${popisKusu(k.id)}${st.otreno[k.id] ? "" : ", glazura na dně"}. ${drzeny ? "V ruce" : textMista(st.kde[k.id])}${vPeci && pz.length ? ` — ${pz.map((x) => x.text.toLowerCase()).join(", ")}` : ""}.`,
      );
      tl.setAttribute("aria-pressed", String(drzeny));
    }
    ([0, 1, 2] as Patro[]).forEach((pat) => {
      const z = zateze[pat];
      z.querySelector(".mp7-zatez-cislo")!.textContent = (Math.round(kontrola.zatez[pat] / 100) / 10).toLocaleString("cs-CZ", { minimumFractionDigits: 1 });
      z.classList.toggle("plno", kontrola.zatez[pat] >= NOSNOST[pat] * 0.85 && !kontrola.pretizeno[pat]);
      z.classList.toggle("pretizeno", kontrola.pretizeno[pat]);
    });
    ([0, 1] as const).forEach((i) => {
      sloupkyTl[i].querySelector(".mp7-vyska")!.textContent = vyskaText(st.sloupky[i]);
      sloupkyTl[i].setAttribute("aria-label", `Sloupky ${i === 0 ? "na Šamotce" : "na první polici"}: ${vyskaText(st.sloupky[i])}. Enter přepne výšku, šipky ji zvednou nebo sníží.`);
    });
    btZavrit.disabled = !(bezi && !konci && kontrola.pripraveno && !drzeni && !myti);
    btZavrit.classList.toggle("pripraveno", !btZavrit.disabled);
    obnovTah();
    obnovUkazatel();
  };
  /** Lehčí obnova při pohybu drženého kusu */
  const obnovTah = () => {
    const d = drzeni;
    vodidla.classList.toggle("je", !!d);
    nahled.classList.toggle("je", !!d && zivy(d) && d.cil.druh === "patro");
    houbaTl.classList.toggle("cil", !!d && zivy(d) && d.cil.druh === "houba");
    obnovDuvody();
    obnovInfo();
    obnovNaladu();
  };

  /** Krátké štítky s důvodem nad kusy, které v peci nesedí, a nad drženým kusem */
  const obnovDuvody = () => {
    const chci: [string, string][] = [];
    for (const id of kontrola.vPeci) {
      const pz = kontrola.potize[id].filter((x) => x.druh !== "vaha");
      if (pz.length) chci.push([id, pz[0].kratce]);
    }
    const d = drzeni;
    if (d && zivy(d) && d.cil.druh === "patro") {
      const pz = potizeNaCili(d.id, d.cil);
      if (pz.length) chci.push([d.id, pz[0].kratce]);
      nahledStin.classList.toggle("spatne", pz.length > 0);
    }
    const mam = new Map<string, HTMLElement>();
    for (const el of Array.from(duvodyEl.children) as HTMLElement[]) mam.set(el.dataset.kus ?? "", el);
    for (const [id, text] of chci) {
      let el = mam.get(id);
      if (!el) {
        el = document.createElement("span");
        el.className = "mp7-duvod";
        el.dataset.kus = id;
        duvodyEl.append(el);
      }
      if (el.textContent !== text) el.textContent = text;
      mam.delete(id);
    }
    for (const el of mam.values()) el.remove();
  };
  const zapisDuvody = () => {
    for (const el of Array.from(duvodyEl.children) as HTMLElement[]) {
      const m = pohyb.get(el.dataset.kus ?? "");
      if (!m) continue;
      /* Štítek sedí uprostřed kusu: nad vysokým kusem by ležel na polici a patřil by jinam */
      const h = def(el.dataset.kus!).vyska * G.k * m.s;
      el.style.left = `${((m.x / G.W) * 100).toFixed(3)}%`;
      el.style.top = `${(((m.y - h / 2) / G.H) * 100).toFixed(3)}%`;
    }
  };

  let posledniInfo = "";
  const obnovInfo = () => {
    let t = posledniInfo;
    if (vysledekKonce === "uspech") t = "Víko je dole. Pec se rozehřívá.";
    else if (konci || skonceno) t = posledniInfo;
    else if (myti) t = "Houbička otírá dno…";
    else if (drzeni) {
      const d = drzeni;
      const zaklad = `${popisKusu(d.id)}${st.otreno[d.id] ? "" : ", glazura na dně!"}`;
      const c = d.cil;
      if (!zivy(d)) t = `${zaklad}. ${d.rezim === "ruka" ? "Klepni, kam ho dát." : ""}`.trim();
      else if (c.druh === "patro") {
        const pz = potizeNaCili(d.id, c);
        t = `${zaklad} → ${NAZEV_PATRA[c.patro]}: ${pz.length ? pz[0].text.charAt(0).toLowerCase() + pz[0].text.slice(1) : "vejde se"}.`;
      } else if (c.druh === "houba") t = `${zaklad} → houbička: ${st.otreno[d.id] ? "dno už je čisté" : "otřít dno"}.`;
      else t = `${zaklad} → zpátky na regál.`;
    } else if (!bezi) t = "Přetahuj kusy do pece. Sedm jich musí dovnitř, dva se zlatou cedulkou jsou navíc.";
    else if (kontrola.pripraveno) t = kontrola.navic === 2 ? "Všech devět sedí. Víko může dolů." : `Sedí to. Víko může dolů${kontrola.navic ? " — nebo ještě ten druhý kus navíc?" : " — nebo se vejde i kus navíc?"}`;
    else t = kontrola.proc ?? "";
    if (t !== posledniInfo) {
      posledniInfo = t;
      info.textContent = t;
    }
  };

  /* ——— Zvednout, položit, vrátit ——— */
  const zvedni = (id: string, rezim: Drzeni["rezim"], e?: PointerEvent) => {
    if (!bezi || konci || myti?.id === id) return false;
    if (drzeni) {
      if (drzeni.id === id) return false;
      vrat();
    }
    const puvod = st.kde[id];
    const m = pohyb.get(id)!;
    let chyt = { dx: 0, dy: 0 };
    if (e) {
      const b = bodScene(e);
      /* Prst by kus zakrýval — na dotyku se kus zvedne kousek nad něj */
      chyt = { dx: (m.x - b.x) / m.s, dy: (m.y - b.y) / m.s - (e.pointerType === "touch" ? 26 : 0) };
    }
    const cil: Cil = puvod ? cilNaPatre(id, puvod.patro, puvod.x) : rezim === "klavesy" ? cilNaPatre(id, 0, prvniVolne(naPatre(0, id), def(id).sirka)) : { druh: "regal" };
    drzeni = { id, rezim, puvod, pointerId: e?.pointerId ?? null, start: { x: e?.clientX ?? 0, y: e?.clientY ?? 0 }, posunuto: false, chyt, bod: null, cil };
    st.kde[id] = null;
    zarad(id);
    zvuk.cink();
    obnov();
    return true;
  };
  /** Vrátit držený kus tam, odkud ho člověk vzal */
  const vrat = () => {
    const d = drzeni;
    if (!d) return;
    st.kde[d.id] = d.puvod;
    drzeni = null;
    zarad(d.id);
    obnov();
  };

  const poloz = () => {
    const d = drzeni;
    if (!d) return;
    const id = d.id;
    const c = d.cil;
    drzeni = null;
    if (c.druh === "patro") {
      if (c.mista) {
        for (const [kid, x] of c.mista) st.kde[kid] = { patro: c.patro, x };
        zarad(id);
        dopad(id, c.patro);
        return;
      }
      /* Nevejde se: kus se vrátí, kde byl */
      st.kde[id] = d.puvod;
      zarad(id);
      zvuk.ton(2650, 2500, 0.06, "triangle", 0.07);
      pozdeji(() => zvuk.ton(2950, 2800, 0.06, "triangle", 0.06), 90);
      chvilku("strach", 1100);
      obnov();
      rikej(VETY.dotek, false, true);
      return;
    }
    st.kde[id] = null;
    zarad(id);
    if (c.druh === "houba") umyj(id);
    else zvuk.drevo(1.3);
    obnov();
  };

  /** Kus dosedl do pece: cvaknutí, Šamotka, případně věta */
  const dopad = (id: string, pat: Patro) => {
    const m = pohyb.get(id);
    if (m && !klid) m.vs += 0.9;
    zvuk.ton(860, 660, 0.07, "triangle", 0.13);
    zvuk.sumik(0.05, 2300, 2, 0.05);
    const pred = kontrola;
    obnov();
    const pz = kontrola.potize[id];
    if (pat === 0 && !klid) {
      samotkaTelo.classList.remove("zhupne");
      void samotkaTelo.getBoundingClientRect();
      samotkaTelo.classList.add("zhupne");
    }
    if (pat === 0) chvilku(kontrola.pretizeno[0] ? "au" : kontrola.zatez[0] >= NOSNOST[0] * 0.75 ? "uf" : "rada", 800);
    if (pz.some((x) => x.druh === "vaha") && !pred.pretizeno[pat]) rikej(pat === 0 ? VETY.samotka : VETY.police, false, true);
    else if (pz.some((x) => x.druh === "dno")) rikej(VETY.dno, true, true);
    else if (pz.some((x) => x.druh === "vyska")) rikej(pat === 2 ? VETY.viko : VETY.vysoko, true);
    else if (kontrola.pripraveno && !pred.pripraveno) rikej(kontrola.navic === 2 ? VETY.vsechno : VETY.pripraveno, true, true);
    else if (pat === 0 && kontrola.zatez[0] >= NOSNOST[0] * 0.75) rikej(VETY.tize, true);
    else if (pat === 0 && pred.zatez[0] === 0) rikej(VETY.prvni, true);
    obnovNaladu();
  };

  /** Otřít dno o houbičku: kus se na ní otře a vrátí na regál */
  const umyj = (id: string) => {
    if (st.otreno[id]) {
      p.zprava("Tohle dno už je čisté.");
      zvuk.drevo(1.3);
      return;
    }
    myti = { id, od: performance.now() };
    zarad(id);
    zvuk.kapka();
    zvuk.hnet();
    if (!klid) {
      houba.classList.remove("otira");
      void houba.getBoundingClientRect();
      houba.classList.add("otira");
    }
    const hotovo = () => {
      if (skonceno) return;
      st.otreno[id] = true;
      const telo = kusyEl.get(id)!.querySelector(".mp7-kus-telo");
      if (telo) telo.innerHTML = kusKresba(id, true);
      myti = null;
      zarad(id);
      zvuk.hnet();
      zvuk.kapka();
      chvilku("rada", 900);
      obnov();
      rikej(VETY.otreno, true);
    };
    if (klid) hotovo();
    else pozdeji(hotovo, 760);
  };

  /* ——— Sloupky ——— */
  const zmenSloupky = (i: 0 | 1, smer: 1 | -1, dokola: boolean) => {
    if (!bezi || konci) return;
    const v = st.sloupky[i];
    const n = dokola ? dalsiVyska(v, smer) : SLOUPKY[Math.min(SLOUPKY.length - 1, Math.max(0, SLOUPKY.indexOf(v) + smer))];
    if (n === v) return;
    st.sloupky[i] = n;
    zvuk.ton(520, 400, 0.05, "triangle", 0.12);
    pozdeji(() => {
      zvuk.ton(300, 190, 0.09, "triangle", 0.12);
      zvuk.sumik(0.07, 900, 1.5, 0.1);
    }, klid ? 0 : 150);
    if (drzeni && drzeni.cil.druh === "patro") drzeni.cil = cilNaPatre(drzeni.id, drzeni.cil.patro, drzeni.cil.x);
    const pred = kontrola;
    obnov();
    const nove = kontrola.vPeci.filter((id) => kontrola.potize[id].some((x) => x.druh === "vyska") && !pred.potize[id].some((x) => x.druh === "vyska"));
    if (nove.length) rikej(st.kde[nove[0]]!.patro === 2 ? VETY.viko : VETY.nizko);
  };

  /* ——— Klávesnice nad drženým kusem ——— */
  const posunKlavesami = (svisle: number, vodorovne: number) => {
    const d = drzeni;
    if (!d) return;
    const k = def(d.id);
    const c = d.cil;
    const kde = c.druh === "patro" ? c.patro : c.druh;
    const i = Math.min(PORADI_KLAVES.length - 1, Math.max(0, PORADI_KLAVES.indexOf(kde) + svisle));
    const kam = PORADI_KLAVES[i];
    if (kam === "regal") d.cil = { druh: "regal" };
    else if (kam === "houba") d.cil = { druh: "houba" };
    else {
      const x0 = c.druh === "patro" ? xNaCili(d.id, c) : prvniVolne(naPatre(kam, d.id), k.sirka);
      d.cil = cilNaPatre(d.id, kam, Math.min(VPRAVO - k.sirka, Math.max(VLEVO, x0 + vodorovne)));
    }
    if (d.cil.druh === "patro") zvuk.ton(1500, 1400, 0.03, "sine", 0.05);
    obnovTah();
  };

  /* ——— Ukazatel ——— */
  const tah = (e: PointerEvent) => {
    const d = drzeni;
    if (!d || d.rezim === "klavesy") return;
    if (d.pointerId !== null ? e.pointerId !== d.pointerId : !(d.rezim === "ruka" && e.pointerType === "mouse")) return;
    if (d.rezim === "tah" && !d.posunuto) {
      if (Math.hypot(e.clientX - d.start.x, e.clientY - d.start.y) < PRAH_TAHU) return;
      d.posunuto = true;
    }
    d.bod = bodScene(e);
    d.cil = cilZBodu(d);
    obnovTah();
  };
  const pust = (e: PointerEvent) => {
    const d = drzeni;
    if (!d || d.pointerId === null || e.pointerId !== d.pointerId) return;
    if (d.rezim === "tah" && !d.posunuto) {
      /* Klepnutí bez tahu: kus zůstane v ruce a položí se dalším klepnutím do scény */
      d.rezim = "ruka";
      d.pointerId = null;
      d.bod = null;
      if (e.pointerType !== "mouse") p.zprava("Teď klepni, kam ho dát.");
      obnov();
      return;
    }
    d.bod = bodScene(e);
    d.cil = cilZBodu(d);
    poloz();
  };
  window.addEventListener("pointermove", tah, sig);
  window.addEventListener("pointerup", pust, sig);
  window.addEventListener(
    "pointercancel",
    (e) => {
      if (drzeni && drzeni.pointerId === e.pointerId) vrat();
    },
    sig,
  );

  for (const k of KUSY) {
    const tl = tlacitka.get(k.id)!;
    tl.addEventListener(
      "pointerdown",
      (e) => {
        if (e.button !== 0) return;
        zvuk.odemkni();
        if (!bezi || konci) return;
        e.preventDefault();
        if (zvedni(k.id, "tah", e)) {
          try {
            tl.setPointerCapture(e.pointerId);
          } catch {}
        }
      },
      sig,
    );
    /* Myš i prst vyřizují pointer události — tohle je Enter a mezerník */
    tl.addEventListener(
      "click",
      (e) => {
        if (e.detail !== 0 || !bezi || konci) return;
        if (drzeni?.id === k.id) poloz();
        else if (zvedni(k.id, "klavesy")) tl.focus();
      },
      sig,
    );
    tl.addEventListener(
      "keydown",
      (e) => {
        const d = drzeni;
        if (!d || d.id !== k.id) return;
        const smer: Record<string, [number, number]> = { ArrowUp: [1, 0], ArrowDown: [-1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] };
        if (e.key in smer) {
          e.preventDefault();
          d.rezim = "klavesy";
          d.pointerId = null;
          const [sv, vo] = smer[e.key];
          posunKlavesami(sv, vo * (e.shiftKey ? 50 : 10));
        } else if (e.key === "Escape") {
          /* Escape vrátí kus — a nezavře přitom okno úrovně */
          e.preventDefault();
          e.stopPropagation();
          vrat();
          zvuk.drevo(1.2);
        }
      },
      sig,
    );
    tl.addEventListener(
      "blur",
      () => {
        if (drzeni?.id === k.id && drzeni.rezim === "klavesy") vrat();
      },
      sig,
    );
  }

  /* Klepnutí do scény, když je kus v ruce: tam se položí (při stisku se ukáže kam, při puštění položí) */
  plocha.addEventListener(
    "pointerdown",
    (e) => {
      zvuk.odemkni();
      const d = drzeni;
      if (!d || d.rezim === "tah" || !bezi || konci || e.button !== 0) return;
      e.preventDefault();
      d.rezim = "ruka";
      d.pointerId = e.pointerId;
      d.posunuto = true;
      d.bod = bodScene(e);
      d.cil = cilZBodu(d);
      try {
        plocha.setPointerCapture(e.pointerId);
      } catch {}
      obnovTah();
    },
    sig,
  );

  houbaTl.addEventListener(
    "click",
    () => {
      if (!bezi || konci || myti) return;
      if (drzeni) {
        drzeni.cil = { druh: "houba" };
        poloz();
      } else p.zprava("Kus s glazurou na dně sem přetáhni — houbička ho otře.");
    },
    sig,
  );

  ([0, 1] as const).forEach((i) => {
    sloupkyTl[i].addEventListener("click", () => zmenSloupky(i, 1, true), sig);
    sloupkyPrave[i].addEventListener("click", () => zmenSloupky(i, 1, true), sig);
    sloupkyTl[i].addEventListener(
      "keydown",
      (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowRight") {
          e.preventDefault();
          zmenSloupky(i, 1, false);
        } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
          e.preventDefault();
          zmenSloupky(i, -1, false);
        }
      },
      sig,
    );
  });

  btZavrit.addEventListener("click", () => zavri(), sig);

  /* ——— Konec ——— */
  const kratce = (k: Kontrola) => {
    if (k.povinnych < POVINNYCH) {
      const n = POVINNYCH - k.povinnych;
      return n === 1 ? "jeden povinný kus" : n <= 4 ? `${SLOVY[n]} povinné kusy` : `${SLOVY[n]} povinných kusů`;
    }
    const vse = k.vPeci.flatMap((id) => k.potize[id]);
    if (vse.some((x) => x.druh === "dno")) return "otřít dno";
    if (vse.some((x) => x.druh === "vyska")) return "výška polic";
    if (vse.some((x) => x.druh === "vaha")) return "přetížená police";
    return "zavřít víko";
  };

  const dokonci = (v: Vysledek) => {
    if (skonceno) return;
    skonceno = true;
    bezi = false;
    obnov();
    p.konec(v);
  };

  const zavri = () => {
    if (!bezi || konci || !kontrola.pripraveno || drzeni || myti) return;
    konci = true;
    const casKonce = ted;
    vysledekKonce = "uspech";
    obnov();
    const n = kontrola.vPeci.length;
    const b = body(kontrola.navic, casKonce);
    const v: Vysledek = {
      body: b,
      proslo: true,
      veta:
        n === KUSY.length
          ? b >= 85
            ? "Všechno. Do posledního hrnku. Unesu to."
            : "Všechno. Do posledního hrnku. Jen to trvalo."
          : b >= 85
            ? "Skoro všechno — a jak rychle. Unesu to."
            : b >= 65
              ? "Skoro všechno. Zbytek počká na další výpal."
              : "Pec je plná. Teda… dost plná.",
      udaje: [
        ["V peci", kusu(n)],
        ["Čas", casText(casKonce)],
        ["Nejtěžší police", kg(Math.max(...kontrola.zatez))],
      ],
    };
    zvuk.vicko();
    koren.classList.add("zaviram");
    if (klid) {
      viko.setAttribute("transform", "translate(0 0)");
      viko.setAttribute("opacity", "1");
      zarPec.setAttribute("opacity", "0.5");
      displej.textContent = "200°";
      dokonci(v);
      return;
    }
    /* Víko sjede dolů, pec se rozsvítí, displej se rozběhne */
    const od = performance.now();
    let dosedlo = false;
    animaceKonce = (t) => {
      const u = Math.min(1, Math.max(0, (t - od) / 520));
      viko.setAttribute("transform", `translate(0 ${(-120 * (1 - u * u)).toFixed(2)})`);
      viko.setAttribute("opacity", Math.min(1, u * 3).toFixed(2));
      if (u >= 1 && !dosedlo) {
        dosedlo = true;
        zvuk.zuch();
        koren.classList.add("dosedlo");
      }
      const z = Math.min(1, Math.max(0, (t - od - 560) / 1100));
      zarPec.setAttribute("opacity", (z * 0.55).toFixed(3));
      koren.style.setProperty("--mp7-zar", z.toFixed(3));
      displej.textContent = `${Math.round(20 + z * z * 180)}°`;
      kontrolka.setAttribute("fill", z > 0 ? "#E0501E" : "#5C5047");
      zvuk.nastavPec(z * 0.35);
      if (t - od > 1900) {
        animaceKonce = null;
        zvuk.nastavPec(0);
        dokonci(v);
      }
    };
  };

  const vyprselo = () => {
    if (konci) return;
    if (drzeni) vrat();
    konci = true;
    vysledekKonce = "neuspech";
    ted = LIMIT;
    obnov();
    dokonci({
      body: 0,
      proslo: false,
      veta: kontrola.pripraveno ? "Všechno sedělo — jen víko zůstalo nahoře. A já to nesu pořád." : "Víko nejde zavřít. A já to nesu pořád.",
      udaje: [
        ["V peci", `${kontrola.povinnych} ze ${POVINNYCH} povinných`],
        ["Čas", casText(LIMIT)],
        ["Chybělo", kratce(kontrola)],
      ],
    });
  };

  /* ——— Smyčka ——— */
  const pruz = (m: Pohyb, cil: { x: number; y: number; s: number; r: number }, dt: number, rychle: boolean) => {
    if (klid) {
      const a = 1 - Math.exp(-dt * (rychle ? 40 : 16));
      m.x += (cil.x - m.x) * a;
      m.y += (cil.y - m.y) * a;
      m.s += (cil.s - m.s) * a;
      m.r += (cil.r - m.r) * a;
      return;
    }
    const k = rychle ? 900 : 260;
    const c = rychle ? 52 : 23;
    m.vx += (k * (cil.x - m.x) - c * m.vx) * dt;
    m.vy += (k * (cil.y - m.y) - c * m.vy) * dt;
    m.vs += (k * (cil.s - m.s) - c * m.vs) * dt;
    m.vr += (k * (cil.r - m.r) - c * m.vr) * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.s += m.vs * dt;
    m.r += m.vr * dt;
  };

  const krok = (t: number) => {
    raf = 0;
    const dt = Math.min(1 / 30, Math.max(0, (t - (posledniSnimek || t)) / 1000));
    posledniSnimek = t;
    if (bezi && !konci) {
      ted = t - t0;
      if (ted >= LIMIT) vyprselo();
      else {
        const zbyva = LIMIT - ted;
        if (zbyva < 60_000 && !rekla.has("·minuta")) {
          rekla.add("·minuta");
          p.zprava("Ještě minuta.");
        }
        if (zbyva < 20_000 && !rekla.has("·dvacet")) {
          rekla.add("·dvacet");
          p.zprava("Dvacet vteřin!");
        }
        obnovUkazatel();
      }
    }
    for (const i of [0, 1]) {
      if (klid) zobr[i] += (st.sloupky[i] - zobr[i]) * (1 - Math.exp(-dt * 18));
      else {
        zobrV[i] += (220 * (st.sloupky[i] - zobr[i]) - 15 * zobrV[i]) * dt;
        zobr[i] += zobrV[i] * dt;
      }
    }
    zapisPolice();
    const d = drzeni;
    for (const k of KUSY) {
      const m = pohyb.get(k.id)!;
      pruz(m, cilKusu(k.id), dt, d?.id === k.id && zivy(d));
      zapisKus(k.id, m);
    }
    if (d && zivy(d) && d.cil.druh === "patro") {
      const kd = def(d.id);
      nahled.setAttribute("transform", `translate(${(G.ix0 + (xNaCili(d.id, d.cil) + kd.sirka / 2) * G.k).toFixed(2)} ${yPatra(st.sloupky, d.cil.patro).toFixed(2)})`);
      nahledStin.setAttribute("rx", (kd.sirka * G.k * 0.5 + 3).toFixed(2));
    }
    zapisDuvody();
    if (odlozena && bezi && !konci) {
      const o = odlozena;
      if (performance.now() > o.do) odlozena = null;
      else if (performance.now() - mluvila >= 3800) {
        odlozena = null;
        rikej(o.text, true);
      }
    }
    if (chvilkova && performance.now() >= chvilkova.do) {
      chvilkova = null;
      obnovNaladu();
    }
    if (animaceKonce) animaceKonce(t);
    if ((bezi || animaceKonce) && !skonceno) raf = requestAnimationFrame(krok);
  };

  /* Výchozí rozestavení — bez pružin; scéna stojí pod úvodní kartou */
  for (const k of KUSY) {
    const c = zakladniCil(k.id, null);
    const m: Pohyb = { ...c, vx: 0, vy: 0, vs: 0, vr: 0 };
    pohyb.set(k.id, m);
    zapisKus(k.id, m);
  }
  zapisPolice();
  obnov();

  return {
    start() {
      if (bezi || skonceno) return;
      bezi = true;
      t0 = performance.now();
      ted = 0;
      posledniSnimek = 0;
      koren.classList.add("hraje");
      obnov();
      rikej(VETY.start, true, true);
      raf = requestAnimationFrame(krok);
    },
    stop() {
      bezi = false;
      konci = true;
      skonceno = true;
      drzeni = null;
      myti = null;
      ac.abort();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      animaceKonce = null;
      for (const id of casovace) window.clearTimeout(id);
      casovace.clear();
      zvuk.nastavPec(0);
    },
  };
};
