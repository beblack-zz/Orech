/**
 * Ulice: kamera dojede k bráně, brána odjede doleva za zídku, kamera
 * sjede po rampě k proskleným dveřím a ty se rozsvítí. Sekce je vyšší
 * než okno a scéna v ní stojí (sticky); počítá se jen, kolik je projeto
 * (p od 0 do 1), a podle toho se nastaví posun a zvětšení domu,
 * odjetí brány a světlo ve dveřích.
 *
 *   p 0 – 0,22     text odjede, kamera se rozjede k bráně
 *   p 0,26 – 0,5   brána odjíždí za zídku
 *   p 0,45 – 0,86  kamera jede po rampě k dveřím, ty se rozsvítí
 *   p 0,8 – 1      světlo zaplaví obrazovku — a pod ním začíná prohlídka
 *
 * Amplion na lampě pustí hlášení obecního rozhlasu (znělka, bublina
 * a s puštěným zvukem i hlas, pokud prohlížeč umí česky).
 * S omezeným pohybem nic z toho nejezdí: brána je otevřená a dovnitř
 * se chodí kliknutím.
 */
import { priMereni, priScrollu, pozice, omez, hladce, mix, klid } from "../parta2/stav";
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";
import { hlaseni } from "../../data/domek2";

interface Cile {
  brana: { x: number; y: number };
  dvere: { x: number; y: number; h: number };
}

export function ulice() {
  const sekce = document.querySelector<HTMLElement>("#ulice");
  if (!sekce) return;
  const scena = sekce.querySelector<HTMLElement>(".ulice-scena")!;
  const svet = sekce.querySelector<HTMLElement>(".ulice-svet")!;
  const kridla = sekce.querySelector<SVGGElement>(".u-brana-kridla");
  const svetloDilny = sekce.querySelector<SVGGElement>(".u-dilna-svetlo");
  const cile = JSON.parse(sekce.dataset.cile ?? "{}") as Cile;

  initRozhlas(sekce);

  /* Brána: posun v jednotkách kresby — křídla zajedou za zídku */
  const posunBrany = (t: number) => {
    if (kridla) kridla.style.transform = `translateX(${(-712 * t).toFixed(1)}px)`;
  };

  if (klid) {
    posunBrany(1);
    sekce.classList.add("brana-otevrena");
    return;
  }

  let top = 0;
  let rozsah = 1;
  let vw = 0;
  let vh = 0;
  let sx = 0;
  let sy = 0;
  let sw = 1;
  let sh = 1;
  let posledni = "";
  let klidCas: number | undefined;
  let jelo = false;

  priMereni(() => {
    const p = pozice(sekce);
    vw = scena.clientWidth;
    vh = scena.clientHeight;
    top = p.top;
    rozsah = Math.max(1, p.height - vh);
    // offsetLeft/Top jsou bez transformace, takže se dají měřit i v půlce cesty
    sx = svet.offsetLeft;
    sy = svet.offsetTop;
    sw = svet.offsetWidth;
    sh = svet.offsetHeight;
    posledni = "";
  });

  priScrollu((y) => {
    if (!sw || !sh || !vw || !vh) return;
    const p = omez((y - top) / rozsah);
    // Dvě jízdy za sebou: nejdřív k bráně, pak k dveřím za ní
    const k1 = hladce(omez((p - 0.04) / 0.3));
    const k2 = hladce(omez((p - 0.45) / 0.41));
    const bx = sw * cile.brana.x;
    const by = sh * cile.brana.y;
    const dx = sw * cile.dvere.x;
    const dy = sh * cile.dvere.y;
    const dh = sh * cile.dvere.h;
    // Brána vyplní asi tři čtvrtiny šířky obrazovky, dveře pak výšku
    const zBrana = Math.max(1, Math.min((vw * 0.78) / (sw * 0.3), (vh * 0.7) / (sh * 0.22)));
    const zDvere = Math.max(zBrana, (vh * 1.05) / dh);
    const z = Math.exp(mix(0, Math.log(zBrana), k1) + mix(0, Math.log(zDvere / zBrana), k2));
    const tx = mix(mix(sx + bx, vw / 2, k1), vw / 2, k2);
    const ty = mix(mix(sy + by, vh * 0.56, k1), vh * 0.52, k2);
    const fx = mix(bx, dx, k2);
    const fy = mix(by, dy, k2);
    const t = `translate(${(tx - sx - z * fx).toFixed(1)}px, ${(ty - sy - z * fy).toFixed(1)}px) scale(${z.toFixed(4)})`;
    if (t !== posledni) {
      posledni = t;
      svet.style.transform = t;
      svet.classList.add("jede");
      window.clearTimeout(klidCas);
      klidCas = window.setTimeout(() => svet.classList.remove("jede"), 180);
    }

    const b = hladce(omez((p - 0.26) / 0.24));
    posunBrany(b);
    if (b > 0.04 && !jelo) {
      jelo = true;
      zvuk.brana();
    }
    if (b < 0.01) jelo = false;
    sekce.classList.toggle("brana-otevrena", b > 0.98);

    const s = omez((p - 0.6) / 0.24);
    if (svetloDilny) svetloDilny.style.opacity = s.toFixed(3);
    sekce.style.setProperty("--svetlo", s.toFixed(3));
    sekce.style.setProperty("--text-pryc", omez((p - 0.02) / 0.2).toFixed(3));
    sekce.style.setProperty("--zar", hladce(omez((p - 0.8) / 0.2)).toFixed(3));
    sekce.classList.toggle("uvnitr", p > 0.18);
  });
}

/* ——— Obecní rozhlas ——— */
function initRozhlas(sekce: HTMLElement) {
  const amplion = sekce.querySelector<HTMLButtonElement>(".ulice-rozhlas");
  const bublina = sekce.querySelector<HTMLElement>(".rozhlas-bublina");
  const vlny = sekce.querySelector<SVGGElement>(".u-rozhlas-vlny");
  if (!amplion || !bublina) return;
  let casovac: number | undefined;
  let hraje = false;

  const hlas = (): SpeechSynthesisVoice | null => {
    const s = window.speechSynthesis;
    if (!s) return null;
    return s.getVoices().find((v) => v.lang?.toLowerCase().startsWith("cs")) ?? null;
  };
  // Seznam hlasů se v některých prohlížečích načte až po chvíli
  window.speechSynthesis?.getVoices();

  const konec = () => {
    hraje = false;
    amplion.setAttribute("aria-expanded", "false");
    sekce.classList.remove("rozhlas-hraje");
    vlny?.classList.remove("hraje");
    window.clearTimeout(casovac);
    casovac = window.setTimeout(() => (bublina.hidden = true), 600);
  };

  amplion.addEventListener("click", () => {
    if (hraje) {
      window.speechSynthesis?.cancel();
      konec();
      return;
    }
    hraje = true;
    window.clearTimeout(casovac);
    bublina.hidden = false;
    amplion.setAttribute("aria-expanded", "true");
    sekce.classList.add("rozhlas-hraje");
    vlny?.classList.add("hraje");
    zvuk.rozhlas();
    const v = zvuk.hraje() ? hlas() : null;
    if (v && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(`${hlaseni.uvod} ${hlaseni.text} ${hlaseni.zaver}`);
      u.voice = v;
      u.lang = v.lang;
      u.rate = 0.94;
      u.pitch = 0.9;
      u.onend = () => {
        zvuk.rozhlas(true);
        window.setTimeout(konec, 1800);
      };
      u.onerror = () => konec();
      window.setTimeout(() => window.speechSynthesis.speak(u), 1700);
    } else {
      // Bez hlasu: znělka, chvíli na přečtení, znělka na konec
      casovac = window.setTimeout(() => {
        zvuk.rozhlas(true);
        window.setTimeout(konec, 1800);
      }, 6500);
      const kapka = sekce.querySelector<HTMLElement>('[data-kami="kapka"]');
      if (kapka) window.setTimeout(() => rekni(kapka, "kapka", "Zase rozhlas. Prý máme otevřeno."), 2600);
    }
  });
}
