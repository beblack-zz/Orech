/**
 * Odjezdová tabule. Každá klapka umí překlapnout na nový nápis přes pár
 * mezikroků — číslice jdou po řadě (3, 4, 5…), nápisy přeskakují přes
 * jiné kurzy a jména, jako buben se jmény stanic. Jeden krok jsou dvě
 * půlky: horní padá, dolní vstává (animace v uvod2.css). Animace se
 * restartuje přepnutím třídy .liche, ne vynuceným přepočtem stránky.
 *
 * Při prvním pohledu tabule jednou zaklape a ustálí se na stejných
 * hodnotách, filtr ji překlapne na jiné termíny. Vpravo nahoře běží
 * hodiny. S omezeným pohybem se nápisy mění rovnou.
 */
import { priMereni, priScrollu, pozice, klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { orazitkuj } from "./razitka";

interface Radek {
  i: number;
  den: string;
  datum: string;
  cas: string;
  kurz: string;
  lektor: string;
  stav: string;
  cedulka: string;
  zacatek: boolean;
  popis: string;
  href: string;
}

const KLAP = 64;
const CISLICE = "0123456789";
const nahodne = <T,>(pole: T[]) => pole[Math.floor(Math.random() * pole.length)];

class Klapka {
  readonly cislice: boolean;
  hodnota: string;
  private readonly el: HTMLElement;
  private readonly hore: HTMLElement;
  private readonly dole: HTMLElement;
  private readonly pada: HTMLElement;
  private readonly vstava: HTMLElement;
  private fronta: string[] = [];
  private bezi = false;
  private krok = 0;

  constructor(el: HTMLElement) {
    this.el = el;
    this.cislice = el.classList.contains("flap-cislice");
    this.hore = el.querySelector<HTMLElement>(".flap-hore .flap-t")!;
    this.dole = el.querySelector<HTMLElement>(".flap-dole .flap-t")!;
    this.hodnota = this.hore.textContent ?? "";
    const pul = (trida: string) => {
      const p = document.createElement("span");
      p.className = `flap-p ${trida}`;
      p.hidden = true;
      const t = document.createElement("span");
      t.className = "flap-t";
      p.append(t);
      el.append(p);
      return t;
    };
    this.pada = pul("flap-pada");
    this.vstava = pul("flap-vstava");
  }

  okamzite(t: string) {
    this.fronta = [];
    this.hodnota = t;
    this.hore.textContent = t;
    this.dole.textContent = t;
    this.pada.parentElement!.hidden = true;
    this.vstava.parentElement!.hidden = true;
  }

  nastav(cilova: string, mezikroky: string[]) {
    if (klid) return this.okamzite(cilova);
    this.fronta = [...mezikroky, cilova];
    if (!this.bezi) this.dalsi();
  }

  private dalsi() {
    const nova = this.fronta.shift();
    if (nova === undefined) {
      this.bezi = false;
      this.pada.parentElement!.hidden = true;
      this.vstava.parentElement!.hidden = true;
      return;
    }
    this.bezi = true;
    const stara = this.hodnota;
    this.hodnota = nova;
    this.hore.textContent = nova;
    this.dole.textContent = stara;
    this.pada.textContent = stara;
    this.vstava.textContent = nova;
    this.pada.parentElement!.hidden = false;
    this.vstava.parentElement!.hidden = false;
    this.krok++;
    this.el.classList.toggle("liche", this.krok % 2 === 1);
    window.setTimeout(() => {
      this.dole.textContent = nova;
      this.dalsi();
    }, KLAP * 2 + 8);
  }
}

/** Číslice jdou po řadě od staré k nové, aspoň tři kroky */
const cesta = (od: string, kam: string) => {
  const a = CISLICE.indexOf(od);
  const b = CISLICE.indexOf(kam);
  if (a < 0 || b < 0) return Array.from({ length: 4 }, () => nahodne([...CISLICE]));
  const kroky: string[] = [];
  let i = a;
  do {
    i = (i + 1) % 10;
    if (i !== b) kroky.push(CISLICE[i]);
  } while (i !== b && kroky.length < 9);
  while (kroky.length < 3) kroky.unshift(CISLICE[(b + 7 + kroky.length) % 10]);
  return kroky;
};

export function tabule() {
  const t = document.querySelector<HTMLElement>("[data-tabule]");
  if (!t) return;
  let data: { radky?: Radek[] } = {};
  try {
    data = JSON.parse(document.getElementById("tabule-data")?.textContent ?? "{}");
  } catch {}
  const radky = data.radky ?? [];

  const sloty = [...t.querySelectorAll<HTMLElement>(".tabule-radek")].map((li) => ({
    a: li.querySelector<HTMLAnchorElement>(".tabule-odkaz")!,
    klapky: [...li.querySelectorAll<HTMLElement>("[data-flap]")].map((el) => new Klapka(el)),
    cedulka: li.querySelector<HTMLElement>(".tb-cedulka"),
  }));
  /* Bubny se slovy: co na které klapce může proletět, než se ustálí */
  const buben = [
    [...new Set(radky.map((r) => r.den)), "Po", "St", "Čt", "Pá"],
    [...new Set(radky.map((r) => r.kurz))],
    [...new Set(radky.map((r) => r.lektor))],
    [...new Set(radky.map((r) => r.stav))],
  ];
  const hlaseni = t.querySelector<HTMLElement>(".tabule-hlaseni");

  /** Hodnoty klapek v pořadí, jak jsou v řádku: den, 4× datum, 4× čas, kurz, lektor, stav */
  const hodnoty = (r?: Radek) =>
    r ? [r.den, ...r.datum.split(""), ...r.cas.split(""), r.kurz, r.lektor, r.stav] : Array(12).fill("");
  const slovniBuben = (j: number) => (j === 0 ? buben[0] : j === 9 ? buben[1] : j === 10 ? buben[2] : buben[3]);

  const zobraz = (seznam: Radek[], zaklapat: boolean) => {
    sloty.forEach((s, i) => {
      const r = seznam[i];
      const h = hodnoty(r);
      s.klapky.forEach((kl, j) => {
        const cilova = h[j] ?? "";
        if (!zaklapat || klid) return kl.okamzite(cilova);
        const mezi = kl.cislice
          ? cesta(kl.hodnota, cilova)
          : Array.from({ length: 2 + Math.floor(Math.random() * 3) }, () => nahodne(slovniBuben(j).filter((x) => x !== cilova).concat(""))).filter((x, n, p) => n === 0 || x !== p[n - 1]);
        window.setTimeout(() => kl.nastav(cilova, mezi), i * 90 + j * 24);
      });
      if (r) {
        s.a.href = r.href;
        s.a.setAttribute("aria-label", r.popis);
        s.a.removeAttribute("tabindex");
        s.a.removeAttribute("aria-hidden");
      } else {
        s.a.removeAttribute("href");
        s.a.removeAttribute("aria-label");
        s.a.setAttribute("tabindex", "-1");
        s.a.setAttribute("aria-hidden", "true");
      }
      if (s.cedulka) s.cedulka.textContent = r?.cedulka ?? "";
    });
    if (zaklapat && !klid) zvuk.klapky(16);
  };

  /* ——— Filtr ——— */
  const filtry = [...t.querySelectorAll<HTMLButtonElement>(".tabule-filtr")];
  const vyber = (f: string) =>
    radky.filter((r) => (f === "zacatek" ? r.zacatek : f.startsWith("lektor:") ? r.lektor === f.slice(7) : true));
  let aktualni = "vse";
  let odhaleno = false;
  const prepni = (f: string) => {
    if (!filtry.some((b) => b.dataset.filtr === f)) return;
    aktualni = f;
    odhaleno = true;
    filtry.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filtr === f)));
    const seznam = vyber(f);
    zobraz(seznam, true);
    if (hlaseni) {
      const n = Math.min(seznam.length, sloty.length);
      hlaseni.textContent = n
        ? `Na tabuli ${n === 1 ? "je jeden odjezd" : n <= 4 ? `jsou ${n} odjezdy` : `je ${n} odjezdů`}: ${seznam.slice(0, n).map((r) => r.popis).join("; ")}.`
        : "Takový odjezd teď na tabuli není.";
    }
    orazitkuj("odjezdy");
  };
  filtry.forEach((b) => b.addEventListener("click", () => prepni(b.dataset.filtr ?? "vse")));
  /* Odkaz „Ukázat na tabuli“ u lektorů */
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLElement>("[data-filtr-tabule]");
    if (a?.dataset.filtrTabule) prepni(a.dataset.filtrTabule);
  });

  /* ——— Hodiny ——— */
  const hodiny = [...t.querySelectorAll<HTMLElement>(".tabule-hodiny [data-flap]")].map((el) => new Klapka(el));
  let nyni = "";
  const tik = (zaklapat: boolean) => {
    const d = new Date();
    const s = `${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
    if (s === nyni) return;
    nyni = s;
    hodiny.forEach((kl, i) => {
      if (kl.hodnota === s[i]) return;
      if (zaklapat) kl.nastav(s[i], cesta(kl.hodnota, s[i]));
      else kl.okamzite(s[i]);
    });
  };
  if (hodiny.length === 4) {
    t.classList.add("js-hodiny");
    tik(false);
    window.setInterval(() => tik(true), 10000);
  }

  /* ——— Při prvním pohledu jednou zaklapat ——— */
  let horni = 0;
  priMereni(() => {
    horni = pozice(t).top;
  });
  priScrollu((y, vh) => {
    if (odhaleno || !horni || y + vh * 0.72 < horni) return;
    odhaleno = true;
    zobraz(vyber(aktualni), true);
  });
}
