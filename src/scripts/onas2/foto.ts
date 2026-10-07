/**
 * Skupinové foto: odpočet, „hai, chīzu“, blesk a z foťáku vyjede papírek
 * s datem v rohu jako ze starého kompaktu. Na fotce se vždycky něco
 * stane — někdo mrkne, Bublinka uteče, všichni kromě Kachlíka stojí
 * nakřivo. Kopie skupiny je jen obrázek, nedá se na ni klikat.
 */
import { klid } from "../parta2/stav";
import { foto as texty } from "../../data/onas2";
import * as zvuk from "../parta2/zvuk";

export function foto() {
  const tlacitko = document.querySelector<HTMLButtonElement>("[data-foto]");
  const scena = document.querySelector<HTMLElement>("[data-foto-scena]");
  const vysledek = document.querySelector<HTMLElement>(".foto-vysledek");
  if (!tlacitko || !scena || !vysledek) return;
  const skupina = scena.querySelector<HTMLElement>(".foto-skupina")!;
  const odpocet = scena.querySelector<HTMLElement>(".foto-odpocet")!;
  const snimek = vysledek.querySelector<HTMLElement>(".foto-snimek")!;
  const datum = vysledek.querySelector<HTMLElement>(".foto-datum")!;
  const popisek = vysledek.querySelector<HTMLElement>(".foto-popisek")!;
  let bezi = false;
  let posledni = -1;

  const pockej = (ms: number) => new Promise((r) => window.setTimeout(r, klid ? 0 : ms));

  tlacitko.addEventListener("click", async () => {
    if (bezi) return;
    bezi = true;
    tlacitko.disabled = true;
    for (const n of texty.odpocet) {
      odpocet.textContent = n;
      odpocet.classList.remove("ted");
      void odpocet.offsetWidth;
      odpocet.classList.add("ted");
      zvuk.cink();
      await pockej(650);
    }
    odpocet.textContent = texty.cheese;
    odpocet.lang = "ja";
    zvuk.blesk();
    await pockej(700);
    odpocet.textContent = "";
    odpocet.removeAttribute("lang");
    scena.classList.remove("blesk");
    void scena.offsetWidth;
    scena.classList.add("blesk");
    zvuk.spoust();

    /* Co se na fotce stalo — pokaždé něco jiného než minule */
    let vyber = Math.floor(Math.random() * texty.vysledky.length);
    if (vyber === posledni) vyber = (vyber + 1) % texty.vysledky.length;
    posledni = vyber;
    const kopie = skupina.cloneNode(true) as HTMLElement;
    kopie.setAttribute("aria-hidden", "true");
    kopie.inert = true;
    kopie.querySelectorAll("button").forEach((b) => b.setAttribute("tabindex", "-1"));
    const kami = [...kopie.querySelectorAll<HTMLElement>(".kami")];
    if (vyber === 0) kami[Math.floor(Math.random() * kami.length)]?.classList.add("mrk");
    if (vyber === 1) kopie.querySelector('[data-kami="bublinka"]')?.classList.add("utekla");
    if (vyber === 2) kami.forEach((k) => k.dataset.kami !== "kachlik" && k.style.setProperty("--nakrivo", `${(Math.random() * 16 - 8).toFixed(1)}deg`));
    if (vyber === 3) kopie.querySelector('[data-kami="kapka"]')?.classList.add("rozmazana");
    snimek.textContent = "";
    snimek.append(kopie);
    const d = new Date();
    const dvoj = (x: number) => String(x).padStart(2, "0");
    datum.textContent = `'${String(d.getFullYear()).slice(2)} ${dvoj(d.getMonth() + 1)} ${dvoj(d.getDate())}`;
    popisek.textContent = texty.vysledky[vyber];
    skupina.querySelectorAll<HTMLElement>(".kami").forEach((k) => {
      k.classList.remove("reaguje");
      void k.offsetWidth;
      k.classList.add("reaguje");
      window.setTimeout(() => k.classList.remove("reaguje"), 1000);
    });
    await pockej(450);
    vysledek.hidden = false;
    vysledek.classList.remove("vyjizdi");
    void vysledek.offsetWidth;
    vysledek.classList.add("vyjizdi");
    zvuk.papir();
    tlacitko.textContent = "Vyfotit znovu";
    tlacitko.disabled = false;
    bezi = false;
  });
}
