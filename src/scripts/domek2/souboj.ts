/**
 * Souboj o misku na úvodu (components/domek2/Parta.astro). Pecinka
 * a Bublinka mají své motory (scripts/pecinka-ohen, bublinka-strasidlo)
 * a klik je rozehraje po svém — tady se jen poslouchá týž klik a podle
 * něj se mění miska mezi nimi:
 *
 *   Pecinka   miska je o krok blíž výpalu (tři kroky); prasklinu zalije zlatem
 *   Bublinka  v syrové nebo pálené misce vystoupá bublina a miska praskne;
 *             vypálené už neublíží
 *
 * Hotová miska cinkne; klik na ni udělá novou, syrovou. Stav je jen
 * v data-atributech obalu, vzhled řeší CSS (styles/uvod-ochutnavky.css).
 */
const KROKU = 3;

export function souboj() {
  const sekce = document.querySelector<HTMLElement>("[data-souboj]");
  const obal = sekce?.querySelector<HTMLElement>("[data-miska]");
  if (!sekce || !obal) return;
  const stav = obal.querySelector<HTMLElement>(".uo-miska-stav")!;
  const pecinka = sekce.querySelector<HTMLElement>("[data-pecinka-ohen]");
  const bublinka = sekce.querySelector<HTMLElement>("[data-bublinka-strasidlo]");

  let pal = 0;
  let praskla = false;
  let zlato = false;
  const casy: number[] = [];

  const uloz = () => {
    obal.dataset.pal = String(pal);
    obal.dataset.praskla = praskla ? "1" : "0";
    obal.dataset.zlato = zlato ? "1" : "0";
    obal.classList.toggle("je-hotova", pal >= KROKU);
  };
  const rekni = (t: string) => (stav.textContent = t);
  /** Třída na chvíli — znovu spustí animaci, i když ještě běží */
  const blikni = (trida: string, ms: number) => {
    obal.classList.remove(trida);
    void obal.offsetWidth;
    obal.classList.add(trida);
    casy.push(window.setTimeout(() => obal.classList.remove(trida), ms));
  };

  const ohen = () => {
    blikni("hori", 1300);
    if (pal >= KROKU && (!praskla || zlato)) return rekni("Hotovo je hotovo. Pecinka se jen ohřívá.");
    if (praskla && !zlato) {
      zlato = true;
      pal = Math.min(KROKU, pal + 1);
      uloz();
      return rekni(pal >= KROKU ? "Vypáleno — i se zlatou prasklinou. Kintsugi: chyba se neschovává." : "Pecinka zalila prasklinu zlatem. Kintsugi: chyba se neschovává.");
    }
    pal = Math.min(KROKU, pal + 1);
    uloz();
    if (pal >= KROKU) {
      blikni("cinkla", 1600);
      return rekni("Vypáleno! Miska je hotová. (Klikni na ni a zkus to znovu.)");
    }
    rekni(pal === 1 ? "Pecinka přiložila. Hlína tvrdne…" : "Ještě žár. Glazura se taví…");
  };

  const vzduch = () => {
    blikni("fouka", 1100);
    if (pal >= KROKU && !praskla) return rekni("Pozdě, Bublinko. Vypálené misce už vzduch neublíží.");
    if (praskla) return rekni(zlato ? "Zlato se nefoukne. Bublinka se mračí." : "Už je prasklá. Bublinka se chechtá.");
    blikni("bubli", 1200);
    casy.push(
      window.setTimeout(() => {
        praskla = true;
        uloz();
        rekni("Bublinka našla vzduch v hlíně — a v peci to prasklo.");
      }, 850),
    );
  };

  const nova = () => {
    if (pal < KROKU) return;
    pal = 0;
    praskla = false;
    zlato = false;
    uloz();
    rekni("Nová hrouda, nová miska. Do pece, nebo do střepů?");
  };

  /* Na kresby se kliká myší, prstem i klávesnicí (Enter, mezerník) — jako v jejich motorech */
  const poslouchej = (el: HTMLElement | null, co: () => void) => {
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      if (e.button === 0) co();
    });
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") co();
    });
  };
  poslouchej(pecinka, ohen);
  poslouchej(bublinka, vzduch);
  obal.addEventListener("click", nova);

  document.addEventListener("astro:before-swap", () => casy.splice(0).forEach(clearTimeout), { once: true });
  uloz();
}
