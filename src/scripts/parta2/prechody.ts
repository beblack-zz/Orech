/**
 * Přechody mezi stránkami nového vzhledu bez načtení celé stránky
 * (Astro <ClientRouter />). Hlavička se zvonkohrou zůstává, zvuk hraje dál
 * a mění se jen obsah.
 *
 * Skripty stránek jsou psané na čerstvé načtení: registrují posluchače,
 * časovače, snímkové smyčky a observery a nic po sobě neuklízejí. Aby se to
 * při přechodech nesčítalo, tenhle modul si pamatuje, co zaregistroval kód
 * stránky, a po výměně obsahu to vypne:
 *
 *   posluchače (na okně, dokumentu i prvcích)   už se nezavolají, z okna
 *                                               a dokumentu se odeberou
 *   setTimeout, requestAnimationFrame           už se nezavolají
 *   setInterval                                 zruší se
 *   Resize-, Intersection-, MutationObserver    odpojí se
 *
 * Za stránku se počítá kód, který spustila stranka(), a všechno, co
 * zaregistroval — i uvnitř zpětných volání, takže smyčka staré stránky
 * skončí sama. Ostatní (router Astra, zvonkohra, zvuk) je trvalé a běží
 * dál. Pozor: kód po `await` už stránce nepatří — intervaly, smyčky
 * a posluchače okna je potřeba zakládat synchronně.
 *
 * Vstupní skript se v prohlížeči vyhodnotí jen jednou, i když se na stránku
 * člověk vrátí. Proto ho každá stránka zabalí do stranka(klíč, init)
 * a <body> dostane data-stranka se stejným klíčem — init se spustí při
 * každé návštěvě.
 *
 * Musí se importovat jako první, dřív než cokoli, co něco registruje.
 */

/** Pořadí stránky od načtení */
let strana = 1;
/** Komu patří právě běžící kód: číslo stránky, 0 = trvalé */
let aktivni = 0;
const uklid: { strana: number; zrus: () => void }[] = [];
const odchody: (() => void)[] = [];
const inity = new Map<string, () => void>();
let spustena = 0;

const ziva = (s: number) => s === 0 || s === strana;
const jako = <T>(s: number, fn: () => T): T => {
  const predtim = aktivni;
  aktivni = s;
  try {
    return fn();
  } finally {
    aktivni = predtim;
  }
};
/** Zpětné volání poběží za toho, kdo ho zaregistroval — a jen dokud je naživu */
const obal = <A extends unknown[], R>(fn: (...a: A) => R) => {
  const s = aktivni;
  if (s === 0) return fn;
  return function (this: unknown, ...a: A) {
    if (ziva(s)) return jako(s, () => fn.apply(this, a));
  } as (...a: A) => R;
};
const zapamatuj = (zrus: () => void) => {
  if (aktivni !== 0) uklid.push({ strana: aktivni, zrus });
};

function spustStranku() {
  const klic = document.body.dataset.stranka;
  const init = klic ? inity.get(klic) : undefined;
  if (!init || spustena === strana) return;
  spustena = strana;
  jako(strana, init);
}

document.addEventListener("astro:after-swap", () => {
  const stara = strana;
  strana++;
  for (let i = uklid.length - 1; i >= 0; i--) {
    if (uklid[i].strana !== stara) continue;
    uklid[i].zrus();
    uklid.splice(i, 1);
  }
  odchody.forEach((fn) => fn());
});
document.addEventListener("astro:page-load", spustStranku);

const w = window as unknown as Record<string, unknown>;

const setTimeoutP = window.setTimeout.bind(window);
const setIntervalP = window.setInterval.bind(window);
const clearIntervalP = window.clearInterval.bind(window);
const rafP = window.requestAnimationFrame.bind(window);
w.setTimeout = (fn: TimerHandler, ms?: number, ...a: unknown[]) =>
  setTimeoutP(typeof fn === "function" ? obal(fn as () => void) : fn, ms, ...a);
w.setInterval = (fn: TimerHandler, ms?: number, ...a: unknown[]) => {
  const id = setIntervalP(typeof fn === "function" ? obal(fn as () => void) : fn, ms, ...a);
  zapamatuj(() => clearIntervalP(id));
  return id;
};
w.requestAnimationFrame = (fn: FrameRequestCallback) => rafP(obal(fn));

/* Posluchače: kód stránky dostane obalené zpětné volání. Okno, dokument
   a <html> přežívají přechod, takže se z nich posluchače i odeberou. */
const proto = EventTarget.prototype;
const pridejP = proto.addEventListener;
const odeberP = proto.removeEventListener;
const obalene = new WeakMap<object, EventListener>();
const trvaleCile = new Set<EventTarget>([window, document, document.documentElement]);
proto.addEventListener = function (this: EventTarget, typ: string, posl: EventListenerOrEventListenerObject | null, moznosti?: boolean | AddEventListenerOptions) {
  if (!posl || aktivni === 0) return pridejP.call(this, typ, posl, moznosti);
  const puvodni = posl;
  const fn = typeof puvodni === "function" ? puvodni : (e: Event) => puvodni.handleEvent(e);
  const o = obal(fn);
  obalene.set(puvodni, o);
  pridejP.call(this, typ, o, moznosti);
  if (trvaleCile.has(this)) {
    const cil = this;
    zapamatuj(() => odeberP.call(cil, typ, o, moznosti));
  }
};
proto.removeEventListener = function (this: EventTarget, typ: string, posl: EventListenerOrEventListenerObject | null, moznosti?: boolean | EventListenerOptions) {
  const o = posl && obalene.get(posl);
  if (o) odeberP.call(this, typ, o, moznosti);
  odeberP.call(this, typ, posl, moznosti);
};

for (const jmeno of ["ResizeObserver", "IntersectionObserver", "MutationObserver"]) {
  const Puvodni = w[jmeno] as (new (cb: (...a: unknown[]) => void, ...r: unknown[]) => { disconnect(): void }) | undefined;
  if (!Puvodni) continue;
  w[jmeno] = class extends Puvodni {
    constructor(cb: (...a: unknown[]) => void, ...r: unknown[]) {
      super(obal(cb), ...r);
      zapamatuj(() => this.disconnect());
    }
  };
}

/**
 * Vstup stránky: init se spustí hned (pokud je to tahle stránka) a znovu
 * při každém návratu na ni. Klíč musí sedět s data-stranka na <body>.
 */
export function stranka(klic: string, init: () => void) {
  inity.set(klic, init);
  spustStranku();
}

/** Spustí kód, jehož posluchače, časovače a smyčky mají přežít přechod */
export const trvale = <T>(fn: () => T): T => jako(0, fn);

/** Zavolá se po každém přechodu, když je stará stránka uklizená */
export const priOdchodu = (fn: () => void) => odchody.push(fn);
