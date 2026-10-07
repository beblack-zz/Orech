/**
 * Kresba a fotka: táhlo mezi obkreslenou kresbou a fotkou, přepínač
 * ročních období a drobnosti na zahradě (visačka na stromku, zatřesení
 * sakurou). Táhlo se chytá myší i prstem, šipkami jde přes skrytý
 * posuvník (input range), který drží hodnotu pro čtečky.
 */
import * as zvuk from "../parta2/zvuk";
import { rekni } from "../parta2/kami";
import { omez } from "../parta2/stav";

export function porovnani() {
  const sekce = document.querySelector<HTMLElement>("#porovnani");
  if (!sekce) return;

  /* ——— Táhla ——— */
  sekce.querySelectorAll<HTMLElement>("[data-srovnani]").forEach((fig) => {
    const plocha = fig.querySelector<HTMLElement>(".srovnani-plocha")!;
    const tahlo = fig.querySelector<HTMLElement>(".srovnani-tahlo")!;
    const posuvnik = fig.querySelector<HTMLInputElement>(".srovnani-posuvnik")!;
    const nastav = (proc: number) => {
      const p = omez(proc, 0, 100);
      fig.style.setProperty("--deleni", `${p.toFixed(1)}%`);
      posuvnik.value = String(Math.round(p));
      fig.classList.toggle("jen-foto", p < 3);
      fig.classList.toggle("jen-kresba", p > 97);
    };
    posuvnik.addEventListener("input", () => nastav(Number(posuvnik.value)));
    let tahne = false;
    const zPozice = (e: PointerEvent) => {
      const r = plocha.getBoundingClientRect();
      if (r.width) nastav(((e.clientX - r.left) / r.width) * 100);
    };
    tahlo.addEventListener("pointerdown", (e) => {
      tahne = true;
      tahlo.setPointerCapture(e.pointerId);
      fig.classList.add("tahne");
      zPozice(e);
    });
    tahlo.addEventListener("pointermove", (e) => {
      if (tahne) zPozice(e);
    });
    const pust = () => {
      tahne = false;
      fig.classList.remove("tahne");
    };
    tahlo.addEventListener("pointerup", pust);
    tahlo.addEventListener("pointercancel", pust);
  });

  /* ——— Roční období ——— */
  const tlacitka = [...sekce.querySelectorAll<HTMLButtonElement>("[data-sezona-volba]")];
  const text = sekce.querySelector<HTMLElement>(".sezona-text");
  tlacitka.forEach((b) =>
    b.addEventListener("click", () => {
      const s = b.dataset.sezonaVolba ?? "leto";
      sekce.dataset.sezona = s;
      tlacitka.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      const t = sekce.querySelector<HTMLTemplateElement>(`template[data-sezona-text="${s}"]`)?.content.textContent?.trim();
      if (text && t) text.textContent = t;
      zvuk.furin(s === "zima" ? 2637 : s === "jaro" ? 1760 : 2093);
    }),
  );

  /* ——— Zahrada: visačka a zatřesení sakurou ——— */
  const zahrada = sekce.querySelector<HTMLElement>(".srovnani-zahrada");
  const sakura = zahrada?.querySelector<SVGGElement>(".z-sakura");
  zahrada?.addEventListener("click", (e) => {
    const el = (e.target as Element).closest<HTMLElement>("[data-akce]");
    if (!el) return;
    const hlinka = zahrada.querySelector<HTMLElement>('[data-kami="hlinka"]');
    if (el.dataset.akce === "visacka") {
      zvuk.papir();
      if (hlinka) rekni(hlinka, "hlinka", "Na visačce je, co je to za strom: převislá sakura. Kvete v dubnu.");
    } else if (el.dataset.akce === "sakura" && sakura) {
      sakura.classList.remove("trese");
      void sakura.getBoundingClientRect();
      sakura.classList.add("trese");
      zvuk.latka();
      if (sekce.dataset.sezona === "jaro" || sekce.dataset.sezona === "podzim") sekce.classList.add("pada-listi");
      window.setTimeout(() => sekce.classList.remove("pada-listi"), 2600);
    }
  });
}
