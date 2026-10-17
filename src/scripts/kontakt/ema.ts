/**
 * Stojan ema 絵馬掛け na louce Kontaktu (components/kontakt/Otazky.astro,
 * kresba components/kontakt/kresba/ema.ts) ožije:
 *
 *   klid       destičky visí bez hnutí; rozhoupou se a klapnou o sousedky
 *              jen při zvonci a po kliknutí na kami
 *   čtení      klik na destičku ji sundá z provázku: přiletí doprostřed, zvětší
 *              se a otočí na rub s odpovědí. Klik na ni, na závoj nebo Escape
 *              ji zase pověsí. Ten z party, kdo odpovídá, poskočí.
 *   parta      klik na kami: poskočí a jeho destička se zhoupne
 *   zvonec     zatahání za provaz rozezní suzu, stojan se rozhoupe od zvonce
 *              do stran a parta se pokloní jako u svatyně: dvě úklony, dvakrát
 *              tlesknout, úklona (二礼二拍手一礼)
 *   prázdná    destička bez otázky otevře dopis z první obrazovky
 *   svátky     pod střechou visí ozdoby dne (kresba/svatky.ts)
 *   příchod    když stojan poprvé vjede do obrazovky, destičky se po jedné
 *              zavěsí a parta vyskočí z trávy
 *
 * Bez skriptu je všechno vidět rovnou: details se otevře nativně a rub je
 * karta (kontakt-ema.css). S omezeným pohybem se nic nehoupe ani nelétá,
 * čtení se jen přepne.
 */
import * as zvuk from "../parta2/zvuk";
import { ted } from "./cas";
import { svatekDne, zaves } from "../../components/kontakt/kresba/svatky";

interface Deska {
  li: HTMLElement;
  /** Box destičky: details (otázka) nebo odkaz (prázdná) */
  deska: HTMLElement;
  detail: HTMLDetailsElement | null;
  lic: HTMLElement;
  rub: HTMLElement | null;
  kdo: string;
  houpe: Animation | null;
}

/** Perspektiva otáčení na rub */
const OTOC = (uhel: number) => `perspective(1400px) rotateY(${uhel}deg)`;

export function emaStojan() {
  const sekce = document.querySelector<HTMLElement>(".ko-ema-sekce");
  const stojan = sekce?.querySelector<HTMLElement>(".ko-ema-stojan");
  if (!sekce || !stojan) return;
  const klidne = matchMedia("(prefers-reduced-motion: reduce)").matches;
  sekce.classList.add("js");

  const desky: Deska[] = [...stojan.querySelectorAll<HTMLElement>(".ko-ema")].map((li, i) => {
    li.style.setProperty("--i", String(i));
    const deska = li.querySelector<HTMLElement>(".ko-ema-deska")!;
    return {
      li,
      deska,
      detail: deska instanceof HTMLDetailsElement ? deska : null,
      lic: li.querySelector<HTMLElement>(".ko-ema-lic")!,
      rub: li.querySelector<HTMLElement>(".ko-ema-rub"),
      kdo: li.dataset.kdo ?? "",
      houpe: null,
    };
  }).filter((d) => d.deska && d.lic);
  const parta = [...stojan.querySelectorAll<HTMLElement>(".ko-ema-kami")];
  parta.forEach((p, k) => p.style.setProperty("--k", String(k)));
  const zavoj = document.createElement("div");
  zavoj.className = "ko-ema-zavoj";
  zavoj.setAttribute("aria-hidden", "true");
  stojan.append(zavoj);

  let otevrena: Deska | null = null;
  /** Běží sundávání nebo věšení — další klik počká */
  let bezi = false;

  /* ——— zvuky: klapnutí dřeva o dřevo, rolničky suzu, tlesknutí ——— */
  let posledniKlap = 0;
  const klap = (vyska = 1, sila = 1) => {
    const t = performance.now();
    if (t - posledniKlap < 45) return;
    posledniKlap = t;
    zvuk.ton(430 * vyska, 250 * vyska, 0.08, "triangle", 0.11 * sila);
    zvuk.sumik(0.04, 1400 * vyska, 3, 0.1 * sila);
  };
  const suzu = () => {
    let t = 0;
    for (let i = 0; i < 18; i++) {
      t += 22 + Math.random() * 40;
      window.setTimeout(() => {
        const fr = 2500 + Math.random() * 1900;
        zvuk.ton(fr, fr * 0.992, 0.2 + Math.random() * 0.25, "triangle", 0.026 * (1 - i / 24));
      }, t);
    }
  };
  const tlesk = () => zvuk.sumik(0.05, 1500, 1.3, 0.32);

  /* ——— houpání: tlumený kmit kolem klidového náklonu ——— */
  const naklon = (d: Deska) => parseFloat(getComputedStyle(d.deska).getPropertyValue("--r")) || 0;
  function zhoupni(d: Deska, sila = 1, zpozdeni = 0) {
    if (klidne || d === otevrena || d.li.classList.contains("leti")) return;
    const r = naklon(d);
    const a = 9 * sila * (Math.random() < 0.5 ? -1 : 1);
    d.houpe?.cancel();
    d.houpe = d.deska.animate(
      [0, 1, -0.62, 0.38, -0.2, 0.08, 0].map((k) => ({ rotate: `${(r + a * k).toFixed(2)}deg` })),
      { duration: 1400 + 500 * sila, delay: zpozdeni, easing: "ease-in-out" },
    );
  }
  /** Sousedky na témže trámu, o které rozhoupaná destička klapne */
  function sousedky(d: Deska) {
    const a = d.li.getBoundingClientRect();
    return desky.filter((o) => {
      if (o === d || o === otevrena) return false;
      const b = o.li.getBoundingClientRect();
      return Math.abs(a.top - b.top) < a.height * 0.5 && Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)) < a.width * 1.35;
    });
  }
  function rozhoupej(d: Deska, sila = 1) {
    zhoupni(d, sila);
    klap(0.9 + Math.random() * 0.5, 0.7 * sila);
    sousedky(d).forEach((o) => {
      zhoupni(o, sila * 0.45, 130 + Math.random() * 90);
      window.setTimeout(() => klap(1.1 + Math.random() * 0.4, 0.4 * sila), 150 + Math.random() * 60);
    });
  }

  /* ——— parta: skok, úklona, tlesknutí (třídy pro kontakt-ema-hra.css) ——— */
  const casovace = new Map<string, number>();
  function trida(el: HTMLElement, jmeno: string, doba: number) {
    if (klidne) return;
    el.classList.remove(jmeno);
    void el.offsetWidth;
    el.classList.add(jmeno);
    /* starší časovač téže třídy by ji ubral uprostřed nového skoku */
    const klic = `${parta.indexOf(el)}:${jmeno}`;
    window.clearTimeout(casovace.get(klic));
    casovace.set(klic, window.setTimeout(() => el.classList.remove(jmeno), doba));
  }
  const skok = (kdo: string) => parta.filter((p) => p.dataset.kdo === kdo).forEach((p) => trida(p, "skok", 700));

  /* ——— čtení: sundat z provázku, přiletět doprostřed, otočit na rub ——— */
  /** Kam destička při čtení přiletí: doprostřed viditelné části stojanu (px ve stojanu) */
  function cil(d: Deska) {
    const S = stojan!.getBoundingClientRect();
    const pomer = d.deska.offsetHeight / Math.max(1, d.deska.offsetWidth) || 0.78;
    const w = Math.min(560, window.innerWidth * 0.92, S.width * 0.94);
    const h = w * pomer;
    const nahore = Math.max(S.top, 0), dole = Math.min(S.bottom, window.innerHeight);
    const stred = Math.max(h / 2 + 8, Math.min(S.height - h / 2 - 8, (nahore + dole) / 2 - S.top));
    return { l: (S.width - w) / 2, t: stred - h / 2, w };
  }
  function nastavCil(d: Deska) {
    const c = cil(d);
    d.li.style.setProperty("--cte-l", `${c.l.toFixed(1)}px`);
    d.li.style.setProperty("--cte-t", `${c.t.toFixed(1)}px`);
    d.li.style.setProperty("--cte-w", `${c.w.toFixed(1)}px`);
  }
  /** Přelet mezi dvěma polohami téhož prvku (FLIP): z obdélníku `pred` do současného */
  function prelet(d: Deska, pred: DOMRect, doba: number, nadzvednout: boolean) {
    const po = d.li.getBoundingClientRect();
    const s = pred.width / Math.max(1, po.width);
    const dx = pred.left - po.left, dy = pred.top - po.top;
    d.li.style.transformOrigin = "0 0";
    const snimky: Keyframe[] = [{ transform: `translate(${dx}px, ${dy}px) scale(${s})`, offset: 0 }];
    if (nadzvednout) snimky.push({ transform: `translate(${dx}px, ${dy - 16 * s}px) scale(${s})`, offset: 0.14 });
    snimky.push({ transform: "none", offset: 1 });
    return d.li.animate(snimky, { duration: doba, easing: "cubic-bezier(0.5, 0, 0.2, 1)" });
  }

  async function otevri(d: Deska) {
    if (!d.detail || bezi) return;
    bezi = true;
    d.houpe?.cancel();
    const pred = d.li.getBoundingClientRect();
    nastavCil(d);
    d.detail.open = true;
    d.li.classList.add("cte", "leti");
    otevrena = d;
    zavoj.classList.add("je");
    skok(d.kdo);
    if (klidne) {
      d.li.classList.add("otocena");
      d.li.classList.remove("leti");
      bezi = false;
      return;
    }
    klap(1.15, 0.8);
    window.setTimeout(() => zvuk.sumik(0.3, 2600, 0.6, 0.06), 320);
    const let_ = prelet(d, pred, 620, true);
    const otoc = d.deska.animate([{ transform: OTOC(0) }, { transform: OTOC(0), offset: 0.55 }, { transform: OTOC(90) }], { duration: 620, easing: "ease-in" });
    await Promise.all([let_.finished, otoc.finished]).catch(() => {});
    d.li.classList.add("otocena");
    const dootoc = d.deska.animate([{ transform: OTOC(-90) }, { transform: OTOC(0) }], { duration: 320, easing: "cubic-bezier(0.2, 0.9, 0.3, 1.15)" });
    await dootoc.finished.catch(() => {});
    d.li.style.transformOrigin = "";
    d.li.classList.remove("leti");
    bezi = false;
  }

  /** Pověsit zpátky; `hned` bez letu (když se mezitím otevírá jiná) */
  async function zavri(d: Deska, hned = false) {
    if (bezi && !hned) return;
    if (otevrena === d) otevrena = null;
    zavoj.classList.toggle("je", otevrena !== null);
    if (klidne || hned) {
      d.li.classList.remove("otocena", "cte", "leti");
      if (d.detail) d.detail.open = false;
      return;
    }
    bezi = true;
    d.li.classList.add("leti");
    const otoc = d.deska.animate([{ transform: OTOC(0) }, { transform: OTOC(90) }], { duration: 240, easing: "ease-in" });
    await otoc.finished.catch(() => {});
    d.li.classList.remove("otocena");
    const pred = d.li.getBoundingClientRect();
    d.li.classList.remove("cte");
    const let_ = prelet(d, pred, 560, false);
    d.deska.animate([{ transform: OTOC(-90) }, { transform: OTOC(0), offset: 0.5 }, { transform: OTOC(0) }], { duration: 560, easing: "ease-out" });
    window.setTimeout(() => zvuk.sumik(0.25, 2400, 0.6, 0.05), 80);
    await let_.finished.catch(() => {});
    d.li.style.transformOrigin = "";
    d.li.classList.remove("leti");
    if (d.detail) d.detail.open = false;
    bezi = false;
    /* dosedla na provázek: jen klapne, nehoupe se */
    klap(0.85, 1);
  }

  desky.forEach((d) => {
    if (d.detail) {
      d.lic.addEventListener("click", (e) => {
        e.preventDefault();
        if (bezi) return;
        if (otevrena === d) return void zavri(d);
        if (otevrena) zavri(otevrena, true);
        otevri(d);
      });
      /* rub: klik pověsí zpátky (ne když si host označuje text) */
      d.rub?.addEventListener("click", () => {
        if (otevrena !== d || String(window.getSelection?.() ?? "").trim()) return;
        zavri(d);
      });
      /* details otevřené odjinud (hledání na stránce) — srovnat stav */
      d.detail.addEventListener("toggle", () => {
        if (d.detail!.open && otevrena !== d && !bezi) {
          if (otevrena) zavri(otevrena, true);
          otevri(d);
        }
      });
    } else {
      /* prázdná destička: dopis z první obrazovky; bez dialogu zůstane mailto */
      d.deska.addEventListener("click", (e) => {
        rozhoupej(d, 0.8);
        skok(d.kdo);
        const dlg = document.querySelector<HTMLDialogElement>(".ko-dopis");
        if (!dlg?.showModal) return;
        e.preventDefault();
        dlg.showModal();
        dlg.querySelector("textarea")?.focus();
      });
    }
  });
  zavoj.addEventListener("click", () => otevrena && zavri(otevrena));
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !otevrena || document.querySelector("dialog[open]")) return;
    const d = otevrena;
    zavri(d).then(() => d.lic.focus({ preventScroll: true }));
  });

  /* ——— parta: klik = skok a jeho destička se zhoupne ——— */
  parta.forEach((p) => {
    p.addEventListener("click", () => {
      trida(p, "skok", 700);
      zvuk.pop();
      desky.filter((d) => d.kdo === p.dataset.kdo).forEach((d, k) => window.setTimeout(() => rozhoupej(d, 0.9), 160 + k * 140));
    });
  });

  /* ——— zvonec: suzu, stojan se rozhoupe od zvonce do stran, parta se pokloní ——— */
  const zvonec = stojan.querySelector<HTMLElement>(".ko-ema-zvonec");
  let zvoni = false;
  zvonec?.addEventListener("click", () => {
    if (zvoni) return;
    zvoni = true;
    stojan.classList.add("zvoni");
    suzu();
    const z = zvonec.getBoundingClientRect();
    const zx = z.left + z.width / 2;
    desky.forEach((d) => {
      if (d === otevrena) return;
      const r = d.li.getBoundingClientRect();
      const daleko = Math.abs(r.left + r.width / 2 - zx);
      window.setTimeout(() => {
        zhoupni(d, 0.85);
        klap(1 + Math.random() * 0.5, 0.35);
      }, 90 + daleko * 0.8);
    });
    const uklona = () => parta.forEach((p, k) => window.setTimeout(() => trida(p, "uklona", 820), k * 40));
    const tleskni = () => {
      tlesk();
      parta.forEach((p) => trida(p, "tleska", 260));
    };
    window.setTimeout(uklona, 1100);
    window.setTimeout(uklona, 2000);
    window.setTimeout(tleskni, 2850);
    window.setTimeout(tleskni, 3250);
    window.setTimeout(uklona, 3750);
    window.setTimeout(() => {
      stojan.classList.remove("zvoni");
      zvoni = false;
    }, 4700);
  });

  /* ——— svátky: ozdoby pod střechou ——— */
  const sv = svatekDne(ted());
  if (sv) {
    stojan.querySelectorAll<HTMLElement>(".ko-ema-zaves").forEach((m, i) => {
      m.innerHTML = `<svg viewBox="-34 -2 68 92" aria-hidden="true" focusable="false">${zaves(sv.id, i, 1)}</svg>`;
      m.classList.add("ma");
    });
  }

  /* ——— příchod: destičky se po jedné zavěsí, parta vyskočí ——— */
  if (!klidne && "IntersectionObserver" in window) {
    sekce.classList.add("ceka");
    const pozor = new IntersectionObserver(
      ([z]) => {
        if (!z?.isIntersecting) return;
        pozor.disconnect();
        prichod();
      },
      { threshold: 0.2 },
    );
    pozor.observe(stojan);
  }
  function prichod() {
    const poradi = [...desky].sort((a, b) => a.li.offsetTop - b.li.offsetTop || a.li.offsetLeft - b.li.offsetLeft);
    poradi.forEach((d, k) =>
      window.setTimeout(() => {
        d.li.classList.add("visi");
        window.setTimeout(() => {
          zhoupni(d, 0.7);
          klap(0.9 + (k % 3) * 0.15, 0.45);
        }, 330);
      }, 120 + k * 105),
    );
    parta.forEach((p, k) => window.setTimeout(() => p.classList.add("visi"), 380 + k * 85));
    window.setTimeout(() => sekce!.classList.remove("ceka"), 160 + poradi.length * 105 + parta.length * 85 + 900);
  }

  /* ——— v DOM je jen kresba režimu, který je vidět (siroka / stredni / uzka podle
     stejných hranic jako kontakt-ema.css); ostatní se odpojí a vrátí při změně šířky ——— */
  const dole = document.querySelector<HTMLElement>(".ko-dole");
  const varianty = [...stojan.querySelectorAll<SVGSVGElement>(".ko-ema-v")].map((el) => {
    const misto = document.createComment("ko-ema-v");
    el.before(misto);
    return { el, misto, rezim: [...el.classList].find((c) => c.startsWith("ko-ema-v-"))?.slice(9) ?? "" };
  });
  const mqUzka = matchMedia("(max-width: 699px)"), mqStredni = matchMedia("(max-width: 1079px)");
  const jenViditelna = () => {
    const rezim = mqUzka.matches ? "uzka" : mqStredni.matches ? "stredni" : "siroka";
    for (const v of varianty) {
      if (v.rezim !== rezim) v.el.remove();
      else if (!v.el.isConnected) {
        /* roční období mezitím mohlo přepnout scena.ts */
        if (dole?.dataset.sezona && v.el.dataset.sezona) v.el.dataset.sezona = dole.dataset.sezona;
        v.misto.after(v.el);
      }
    }
  };
  jenViditelna();
  mqUzka.addEventListener?.("change", jenViditelna);
  mqStredni.addEventListener?.("change", jenViditelna);
  /* některé prohlížeče (a emulace zařízení) změnu media query neohlásí — pojistka */
  window.addEventListener("resize", jenViditelna, { passive: true });

  /* ——— mimo obrazovku se dech zastaví; změna velikosti přesune čtenou destičku ——— */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([z]) => sekce.classList.toggle("mimo", !z?.isIntersecting), { threshold: 0 }).observe(stojan);
  }
  new ResizeObserver(() => {
    if (otevrena && !bezi) nastavCil(otevrena);
  }).observe(stojan);
}
