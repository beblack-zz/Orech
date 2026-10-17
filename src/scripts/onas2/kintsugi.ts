/**
 * Kintsugi: šupinky zlata leží na šátku kolem misky. Klepnutá šupinka
 * doletí do své spáry a zalije ji; když je zalito všechno, přejede po
 * misce lesk a ozve se Střípek. „Zalij to za mě“ pošle zbylé šupinky
 * samo, „Rozbít znovu“ vrátí misku na začátek. Nic se nepamatuje.
 */
import * as zvuk from "../parta2/zvuk";
import { kintsugiReakce as R } from "../../data/onas2";

export function kintsugi() {
  const najdi = document.querySelector<HTMLElement>("[data-kintsugi]");
  if (!najdi) return;
  const koren: HTMLElement = najdi;
  const spary = [...koren.querySelectorAll<SVGGElement>(".ks-spara")];
  const supinky = [...koren.querySelectorAll<HTMLButtonElement>(".ks-supinka")];
  const pokyn = koren.querySelector<HTMLElement>(".kintsugi-pokyn")!;
  const odpoved = koren.querySelector<HTMLElement>(".kintsugi-odpoved")!;
  const veta = koren.querySelector<HTMLElement>(".kintsugi-odpoved-veta")!;
  const znovu = koren.querySelector<HTMLButtonElement>("[data-kintsugi-znovu]")!;
  const zaMe = koren.querySelector<HTMLButtonElement>("[data-kintsugi-zaMe]")!;
  const klid = window.matchMedia("(prefers-reduced-motion: reduce)");
  let zalito = 0;
  let casovace: number[] = [];

  const lezi = () => supinky.filter((b) => !b.hidden && !b.classList.contains("leti"));

  function rekni(text: string) {
    veta.textContent = text;
    odpoved.hidden = false;
    odpoved.classList.remove("nova");
    void odpoved.offsetWidth;
    odpoved.classList.add("nova");
    zvuk.reakce("stripek");
  }

  function stav() {
    const zbyva = spary.length - zalito;
    pokyn.textContent = zalito === 0 ? "Seber zlato do spár." : zbyva > 0 ? `Ještě ${zbyva}.` : "Celá ve zlatě.";
    znovu.disabled = zalito === 0 && lezi().length === supinky.length;
    zaMe.disabled = lezi().length === 0;
  }

  function dopadla(i: number, zaTebe: boolean) {
    spary[i]?.classList.add("je");
    zalito++;
    zvuk.cink();
    if (zalito === spary.length) {
      koren.classList.remove("zalito");
      void koren.offsetWidth;
      koren.classList.add("zalito");
      zvuk.zlato();
      casovace.push(window.setTimeout(() => rekni(zaTebe ? R.zaMe : R.hotovo), 700));
    } else if (!zaTebe && zalito === 1) rekni(R.prvni);
    else if (!zaTebe && zalito === Math.ceil(spary.length / 2)) rekni(R.pulka);
    stav();
  }

  function vrhni(b: HTMLButtonElement, zaTebe = false) {
    if (b.hidden || b.classList.contains("leti")) return;
    const i = Number(b.dataset.spara);
    const cara = spary[i]?.querySelector("path");
    b.classList.add("leti");
    /* Kdo měl šupinku pod klávesnicí, dostane další */
    if (document.activeElement === b) (lezi()[0] ?? zaMe).focus();
    const konec = () => {
      b.hidden = true;
      b.classList.remove("leti");
      dopadla(i, zaTebe);
    };
    if (klid.matches || !cara || typeof b.animate !== "function") return konec();
    const z = b.getBoundingClientRect();
    const c = cara.getBoundingClientRect();
    const dx = c.left + c.width / 2 - (z.left + z.width / 2);
    const dy = c.top + c.height / 2 - (z.top + z.height / 2);
    const u = parseFloat(b.style.getPropertyValue("--u")) || 0;
    b.animate(
      [
        { translate: "-50% -50%", rotate: `${u}deg`, scale: "1", opacity: 1 },
        { translate: `calc(-50% + ${dx * 0.5}px) calc(-50% + ${dy * 0.5 - 40}px)`, rotate: `${u + 120}deg`, scale: "1.15", opacity: 1, offset: 0.45 },
        { translate: `calc(-50% + ${dx}px) calc(-50% + ${dy}px)`, rotate: `${u + 260}deg`, scale: "0.3", opacity: 0.2 },
      ],
      { duration: 640, easing: "cubic-bezier(0.45, 0, 0.35, 1)" },
    ).onfinish = konec;
  }

  supinky.forEach((b) => b.addEventListener("click", () => vrhni(b)));

  zaMe.addEventListener("click", () => {
    lezi().forEach((b, k) => casovace.push(window.setTimeout(() => vrhni(b, true), k * 240)));
  });

  znovu.addEventListener("click", () => {
    casovace.forEach((t) => window.clearTimeout(t));
    casovace = [];
    const bylo = zalito > 0;
    zalito = 0;
    koren.classList.remove("zalito");
    spary.forEach((g) => g.classList.remove("je"));
    supinky.forEach((b) => {
      b.getAnimations().forEach((a) => a.cancel());
      b.classList.remove("leti", "vraci");
      b.hidden = false;
      void b.offsetWidth;
      b.classList.add("vraci");
    });
    zvuk.tres();
    if (bylo) rekni(R.znovu);
    else odpoved.hidden = true;
    stav();
    supinky[0]?.focus();
  });

  stav();
}
