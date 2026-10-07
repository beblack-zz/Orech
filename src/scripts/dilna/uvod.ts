/**
 * Úvod Dílny: dílna v řezu za dřevěným rámem a „Co chceš dělat?“.
 *
 * Volba přiveze kameru (scripts/uvod2/kamera.ts) k místu, kde se to
 * v dílně dělá — přejezd jde z toho, kde kamera zrovna je, takže se dá
 * přepínat i uprostřed jízdy. Na mobilu je výchozí záběr na vnitřek
 * dílny, celý dům by byl moc malý.
 *
 * Do kresby se dá klikat: roztočit kruh, plácnout do hroudy (po třetím
 * plácnutí z ní vyskočí Bublinka), zamíchat glazuru, nakouknout do pece,
 * postavit na kafe. Každé kliknutí zároveň vybere, co se tam dělá.
 * Na regálu stojí tvůj kus, jakmile nějaký máš.
 */
import { kamera, cil } from "../uvod2/kamera";
import type { Cil } from "../uvod2/kamera";
import { priMereni, klid, omez, hladce, mix } from "../parta2/stav";
import { rekni } from "../parta2/kami";
import * as zvuk from "../parta2/zvuk";
import { kamiInfo } from "../../data/kami";
import type { PostavaId } from "../../data/parta";
import { sezonaMesice } from "../../data/uvod2";
import { kusSvg } from "../../components/dilna/kus";
import { tvujKus, priZmeneKusu } from "./stav-kusu";
import type { Ulozeny } from "./stav-kusu";

const CELA: Cil = { x: 800, y: 560, w: 1680, h: 1040 };
const VNITREK: Cil = { x: 800, y: 668, w: 1330, h: 470 };
const PEC: Cil = { x: 1016, y: 764, w: 320, h: 260 };
const mobil = () => window.matchMedia("(max-width: 860px)").matches;
const logMix = (a: number, b: number, t: number) => Math.exp(mix(Math.log(a), Math.log(b), t));

export function uvod() {
  const sekce = document.querySelector<HTMLElement>("#dilna-uvod");
  if (!sekce) return;
  sekce.dataset.sezona = sezonaMesice(new Date().getMonth() + 1);
  const okno = sekce.querySelector<HTMLElement>(".d-okno")!;
  const svet = sekce.querySelector<HTMLElement>("[data-kamera-svet]")!;
  const rez = svet.querySelector<HTMLElement>(".rez")!;
  const k = kamera(okno, svet);
  const volby = [...sekce.querySelectorAll<HTMLButtonElement>("[data-volba]")];
  const text = sekce.querySelector<HTMLElement>(".d-volba-text")!;
  const odkazy = [...sekce.querySelectorAll<HTMLAnchorElement>(".d-volba-odkaz")];
  const zpet = sekce.querySelector<HTMLButtonElement>(".d-okno-zpet")!;
  const vychoziText = text.textContent ?? "";
  const zakladni = () => (mobil() ? VNITREK : CELA);

  /* ——— Kamera ——— */
  let cilKamery: Cil | null = null;
  let ted: Cil = zakladni();
  let jizda = 0;

  const jed = (kam: Cil) => {
    cilKamery = kam;
    const od = { ...ted };
    const moje = ++jizda;
    if (klid) {
      ted = kam;
      k.na(kam);
      return;
    }
    const start = performance.now();
    const doba = 950;
    const krok = (t: number) => {
      if (moje !== jizda) return;
      const p = hladce(omez((t - start) / doba));
      ted = { x: mix(od.x, kam.x, p), y: mix(od.y, kam.y, p), w: logMix(od.w, kam.w, p), h: logMix(od.h, kam.h, p) };
      k.na(ted);
      if (p < 1) requestAnimationFrame(krok);
    };
    requestAnimationFrame(krok);
  };

  priMereni(() => {
    k.zmer();
    ted = cilKamery ?? zakladni();
    k.na(ted);
  });

  /* ——— Co chceš dělat ——— */
  let volba = "";
  const textVolby = (id: string) => sekce.querySelector<HTMLTemplateElement>(`template[data-text="${id}"]`)?.content.textContent?.trim() ?? "";

  const vyber = (id: string, prepnout = true, vlastniText?: string, vlastniCil?: Cil) => {
    volba = prepnout && volba === id ? "" : id;
    volby.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.volba === volba)));
    text.textContent = vlastniText ?? (volba ? textVolby(volba) : vychoziText);
    odkazy.forEach((a) => (a.hidden = a.dataset.pro !== volba));
    zpet.hidden = !volba && !vlastniCil;
    const b = volby.find((x) => x.dataset.volba === volba);
    jed(vlastniCil ?? ((b && cil(b.dataset.kamera)) || zakladni()));
  };

  volby.forEach((b) => b.addEventListener("click", () => vyber(b.dataset.volba ?? "")));
  zpet.addEventListener("click", () => vyber("", false));

  /* ——— Parta v kresbě ——— */
  const kamiEl = (id: PostavaId) =>
    rez.querySelector<HTMLElement>(`.rez-kami-${id}`) ?? rez.querySelector<HTMLElement>(id === "bublinka" ? ".rez-bublinka" : id === "samotka" ? ".rez-samotka" : `[data-kami="${id}"]`);
  const rekl = new Set<string>();
  const replika = (klic: string, id: PostavaId, t: string | number) => {
    if (rekl.has(klic)) return;
    const el = kamiEl(id);
    const veta = typeof t === "number" ? kamiInfo[id]?.repliky[t] : t;
    if (!el || !veta) return;
    rekl.add(klic);
    rekni(el, id, veta);
  };

  /* ——— Kruhy ——— */
  const kruhy = [...rez.querySelectorAll<SVGGElement>(".kruh")];
  const kruhCas: (number | undefined)[] = [];
  const roztoc = (i: number) => {
    const kr = kruhy[i];
    if (!kr) return;
    window.clearTimeout(kruhCas[i]);
    kr.classList.add("toci");
    zvuk.nastavKruh(0.7, true);
    window.setTimeout(() => {
      kr.dataset.faze = String((Number(kr.dataset.faze ?? 0) + 1) % 4);
      kr.classList.remove("roste");
      void kr.getBoundingClientRect();
      kr.classList.add("roste");
    }, klid ? 0 : 420);
    kruhCas[i] = window.setTimeout(() => {
      kr.classList.remove("toci", "roste");
      if (!kruhy.some((x) => x.classList.contains("toci"))) zvuk.nastavKruh(0, false);
    }, 1500);
    replika("kruh", "vazicka", 3);
  };

  /* ——— Hrouda: po třetím plácnutí vyskočí Bublinka ——— */
  const hrouda = rez.querySelector<SVGGElement>(".hrouda");
  let placnuti = 0;
  const placni = () => {
    if (hrouda) {
      hrouda.classList.remove("hnete");
      void hrouda.getBoundingClientRect();
      hrouda.classList.add("hnete");
    }
    zvuk.hnet();
    placnuti++;
    if (placnuti >= 2) rez.classList.add("kiku");
    if (placnuti === 3) {
      rez.classList.add("bublinka-venku");
      zvuk.pop();
      window.setTimeout(() => replika("hrouda", "bublinka", 1), 380);
    }
  };

  /* ——— Kbelíky: glazura si sedá ke dnu, musí se míchat ——— */
  const kbeliky = rez.querySelector<SVGGElement>(".rez-kbeliky");
  const michej = () => {
    if (!kbeliky) return;
    kbeliky.classList.remove("micha");
    void kbeliky.getBoundingClientRect();
    kbeliky.classList.add("micha");
    zvuk.kapka();
    window.setTimeout(() => zvuk.kapka(), 260);
    replika("kbeliky", "kapka", "Míchat! Glazura si za noc sedne ke dnu.");
  };

  /* ——— Pec: víko nahoru a dolů ——— */
  const pec = () => {
    const otevrena = rez.dataset.pec === "otevrena";
    rez.dataset.pec = otevrena ? "studena" : "otevrena";
    zvuk.vicko();
    if (!otevrena) window.setTimeout(() => replika("pec", "samotka", 1), 500);
  };

  /* ——— Kafe ——— */
  const kavovar = rez.querySelector<SVGGElement>(".kavovar");
  let kafeCas: number | undefined;
  const kafe = () => {
    kavovar?.classList.add("vari");
    zvuk.para();
    window.clearTimeout(kafeCas);
    kafeCas = window.setTimeout(() => kavovar?.classList.remove("vari"), 3200);
    replika("kafe", "kapka", "Kafe je samozřejmost. Já jsem tu stejně kvůli vodě.");
  };

  rez.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-akce]");
    if (!el) return;
    const c = el.dataset.cinnost ?? "";
    if (c === "pec") vyber("", false, "Pec. Pálí se v ní dvakrát: přežah a ostrý výpal.", PEC);
    else if (c && volba !== c) vyber(c, false);
    switch (el.dataset.akce) {
      case "kruh": roztoc(Number(el.dataset.kruh ?? 1)); break;
      case "hrouda": placni(); break;
      case "kbeliky": michej(); break;
      case "pec": pec(); break;
      case "kafe": kafe(); break;
    }
  });

  /* ——— Tvůj kus na regálu ——— */
  const misto = rez.querySelector<SVGGElement>(".rez-tvuj-kus");
  const puvodni = misto?.innerHTML ?? "";
  const naRegal = (u: Ulozeny | null) => {
    if (!misto) return;
    if (!u) {
      misto.innerHTML = puvodni;
      return;
    }
    /* Kresba kusu je 200 × 200 a pata stojí 10 nad spodní hranou — tady čtvrtinová, patou na prkně */
    const svg = kusSvg(u.kus, u.stav, { id: "rez-kus", stekla: u.stekla, popis: `Tvůj kus na regálu: ${u.kus.nazev}` });
    misto.innerHTML = svg.replace("<svg ", '<svg x="-20" y="-38" width="40" height="40" ');
  };
  naRegal(tvujKus());
  priZmeneKusu(naRegal);
}
