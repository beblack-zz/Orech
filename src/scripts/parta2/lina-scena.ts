/**
 * Líné scény: motor přehnané podoby (scripts/<postava>-<téma>/beh.js) se
 * stáhne, až je ho potřeba. Komponenta v characters/kami-buh ho jen
 * přihlásí:
 *
 *   linaScena("kapka-hrom", () => import("../../../scripts/kapka-hrom/beh.js"));
 *
 * Motor se načte, když se některá scéna té postavičky přiblíží k oknu
 * (600 px nad ním nebo pod ním), nebo když s ní člověk něco udělá — najede
 * na ni myší, sáhne na ni, přejde na ni klávesnicí. Schovaná scéna (list
 * obsazení s `hidden`) se k oknu nepřibližuje, takže čeká, až se ukáže.
 * Do té doby je vidět první snímek z buildu.
 *
 * Motor po načtení sám spustí všechny scény své postavičky na stránce
 * (spustVse v beh.js; ty mimo okno spí přes jeho IntersectionObserver).
 * Co člověk se scénou udělal, než motor doběhl (stisk, puštění, Enter
 * nebo mezerník), se jí po spuštění zopakuje, ať se první klepnutí neztratí.
 * Motor dřív hned při načtení odemykal zvuk prvním gestem kdekoli na
 * stránce — když to gesto přišlo dřív než on, odemkne se hned po načtení.
 *
 *   data-sceny-spolu   na obalu: scény uvnitř se načítají spolu, když se
 *                      k oknu přiblíží obal (průvod na svitku, který se na
 *                      úzkém okně posouvá do stran — scéna mimo jeho výřez
 *                      by se jinak k oknu „nepřiblížila“ nikdy)
 *   nactiSceny(koren)  načte motory všech scén uvnitř hned (obsazení na
 *                      /parta při najetí na lampion)
 *
 * Tušový flek (scripts/flek/flek.ts) si stejné motory stahuje sám; je to
 * tentýž modul, takže se nenačte dvakrát, a háček el.__scena zůstává
 * v beh.js beze změny.
 */

interface Motor { spustVse?: () => void; odemkni?: () => void }
interface Postava { znacka: string; nacti: () => Promise<Motor>; motor: Promise<Motor> | null; hotovo: boolean }

const OKRAJ = "600px 0px";
const postavy = new Map<string, Postava>();
/** Prvky, které už mají posluchače (jen jednou za život prvku) */
const zapojene = new WeakSet<Element>();
/** Co člověk se scénou udělal, než doběhl její motor */
const fronty = new WeakMap<Element, Event[]>();
let gesto = false;

const pozorovatel = () =>
  typeof IntersectionObserver === "function"
    ? new IntersectionObserver(
        (zaznamy) => {
          for (const z of zaznamy) {
            if (!z.isIntersecting) continue;
            io?.unobserve(z.target);
            nactiSceny(z.target);
          }
        },
        { rootMargin: OKRAJ },
      )
    : null;
let io: IntersectionObserver | null = null;

const selektor = (p: Postava) => `[data-${p.znacka}]`;

/** Zopakuje scéně, co se s ní dělo před spuštěním; nebublá, okolí to už jednou vidělo. */
const zopakuj = (el: Element) => {
  const fronta = fronty.get(el);
  fronty.delete(el);
  if (!fronta || !(el as HTMLElement).dataset.bezi) return;
  const PE = typeof PointerEvent === "function" ? PointerEvent : MouseEvent;
  for (const e of fronta) {
    if (e instanceof KeyboardEvent) {
      el.dispatchEvent(new KeyboardEvent(e.type, { key: e.key, code: e.code, bubbles: false, cancelable: true }));
    } else {
      const p = e as PointerEvent;
      el.dispatchEvent(new PE(p.type, { bubbles: false, cancelable: true, clientX: p.clientX, clientY: p.clientY, button: p.button, buttons: p.buttons, pointerId: p.pointerId, pointerType: p.pointerType, isPrimary: p.isPrimary } as PointerEventInit));
    }
  }
};

const nactiPostavu = (p: Postava) => {
  if (!p.motor) {
    p.motor = p.nacti();
    p.motor.then(
      () => {
        p.hotovo = true;
      },
      () => {
        /* nepovedlo se (výpadek sítě) — zkusí se znovu při dalším přiblížení nebo doteku */
        p.motor = null;
      },
    );
  }
  p.motor.then((m) => {
    /* spustVse je v beh.js idempotentní (data-bezi); motory bez exportu se spustily samy při vyhodnocení */
    m.spustVse?.();
    if (gesto) m.odemkni?.();
    document.querySelectorAll(selektor(p)).forEach(zopakuj);
  }, () => {});
};

/** Načte motory všech přihlášených scén uvnitř `koren` (včetně něj). */
export function nactiSceny(koren: Element) {
  for (const p of postavy.values()) {
    const s = selektor(p);
    if (koren.matches(s) || koren.querySelector(s)) nactiPostavu(p);
  }
}

const zapoj = (p: Postava, el: HTMLElement) => {
  if (zapojene.has(el)) return;
  zapojene.add(el);
  const zaznamenej = (e: Event) => {
    if (el.dataset.bezi) return;
    let fronta = fronty.get(el);
    if (!fronta) fronty.set(el, (fronta = []));
    fronta.push(e);
  };
  el.addEventListener("pointerenter", () => {
    if (!el.dataset.bezi) nactiPostavu(p);
  });
  el.addEventListener("focusin", () => {
    if (!el.dataset.bezi) nactiPostavu(p);
  });
  for (const typ of ["pointerdown", "pointerup", "pointercancel"]) {
    el.addEventListener(typ, (e) => {
      if (el.dataset.bezi) return;
      zaznamenej(e);
      nactiPostavu(p);
    });
  }
  el.addEventListener("keydown", (e) => {
    if (el.dataset.bezi || (e.key !== "Enter" && e.key !== " ")) return;
    /* jako v beh.js: mezerník nad scénou neposouvá stránkou */
    e.preventDefault();
    zaznamenej(e);
    nactiPostavu(p);
  });
};

/** Najde scény přihlášené postavičky na stránce a pohlídá je. */
const hlidej = (p: Postava) => {
  for (const el of document.querySelectorAll<HTMLElement>(selektor(p))) {
    if (el.dataset.bezi) continue;
    zapoj(p, el);
    if (p.hotovo) {
      nactiPostavu(p);
      continue;
    }
    io ??= pozorovatel();
    if (!io) {
      /* bez IntersectionObserveru (velmi starý prohlížeč) se motor načte hned, jako dřív */
      nactiPostavu(p);
      continue;
    }
    io.observe(el.closest("[data-sceny-spolu]") ?? el);
  }
};

/** Přihlásí motor postavičky: `znacka` je data-atribut scény (data-kapka-hrom → "kapka-hrom"). */
export function linaScena(znacka: string, nacti: () => Promise<Motor>) {
  let p = postavy.get(znacka);
  if (!p) postavy.set(znacka, (p = { znacka, nacti, motor: null, hotovo: false }));
  hlidej(p);
}

/* Jednou za život dokumentu: gesto kdekoli (jako v beh.js), nová stránka po přechodu a úklid před ním */
for (const g of ["pointerup", "keydown", "touchend"]) {
  document.addEventListener(
    g,
    () => {
      gesto = true;
    },
    { capture: true, passive: true },
  );
}
document.addEventListener("astro:page-load", () => postavy.forEach(hlidej));
document.addEventListener("astro:before-swap", () => {
  io?.disconnect();
  io = null;
});
