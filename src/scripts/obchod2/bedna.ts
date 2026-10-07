/**
 * Balík z Japonska: krabice z paulovnie se rozvazují. Šňůrka sklouzne,
 * víko se odsune, rozbalí se látka a pod ní je fotka; pod krabicí se
 * ukáže, co o kusu víme. U kusů s víc fotkami se dá přepnout pohled.
 *
 * Bez skriptu jsou krabice otevřené — třída ma-skript je zavře.
 */
import * as zvuk from "../parta2/zvuk";

export function bedna() {
  const krabice = [...document.querySelectorAll<HTMLElement>("[data-krabice]")];
  if (!krabice.length) return;
  document.querySelector(".o2-bedna")?.classList.add("ma-skript");

  for (const k of krabice) {
    const tlacitko = k.querySelector<HTMLButtonElement>("[data-krabice-otevrit]");
    const vic = k.querySelector<HTMLElement>(".o2-krabice-vic");
    if (vic) vic.hidden = true;
    tlacitko?.addEventListener("click", () => {
      const otevrit = !k.classList.contains("otevrena");
      k.classList.toggle("otevrena", otevrit);
      tlacitko.setAttribute("aria-expanded", String(otevrit));
      tlacitko.textContent = otevrit ? "Zavřít krabici" : "Rozvázat";
      if (vic) vic.hidden = !otevrit;
      if (otevrit) {
        zvuk.latka();
        window.setTimeout(zvuk.vicko, 260);
      } else zvuk.drevo(0.8);
    });

    const pohledy = [...k.querySelectorAll<HTMLElement>("[data-pohled]")];
    const prepinace = [...k.querySelectorAll<HTMLButtonElement>("[data-ukaz-pohled]")];
    prepinace.forEach((b) =>
      b.addEventListener("click", () => {
        const j = Number(b.dataset.ukazPohled);
        pohledy.forEach((p) => p.classList.toggle("je", Number(p.dataset.pohled) === j));
        prepinace.forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        zvuk.papir();
      }),
    );
  }
}
