/**
 * Dveře komnaty U mistra (components/zkouska/Dvere.astro): zavřené provazem,
 * dokud v omamori není šest kami. Pak provaz spadne a za norenem je deska,
 * úrovně a síň mistra. Kdo už má aspoň jedno razítko (nebo je mistr), má
 * otevřeno napořád — jako lístek ve svatyni, i kdyby kami schoval znovu.
 *
 * U dveří čeká parta: vidět je každý kami, který je v omamori.
 *
 * Co je za dveřmi, má vlastní skript (vnitrek.ts) — stáhne se, až jsou
 * dveře otevřené: initDvere zavolá `poOtevreni` pokaždé, když zjistí, že je
 * otevřeno (hlavni.ts si pohlídá, aby se načítalo jen jednou).
 */
import { nacti, uloz } from "../parta2/stav";
import { KLIC_NALEZENI } from "../parta2/zaves";
import { SMAZANO } from "../parta2/omamori";
import { mistr } from "../parta2/mistr";
import { urovne } from "../../data/mistr";
import { nactiPostup, proslych, kdeStoji } from "./postup";

const PRAH = 6;
/** Provaz už jednou spadl — pak jsou dveře rovnou otevřené, bez pádu */
const KLIC_PROVAZ = "zkouska-provaz";
let otevreno = false;

export const jeOtevreno = () => otevreno;

const chybiSlovy = (n: number) => (n === 1 ? "Chybí ještě jeden." : `Chybí ještě ${n}.`);

export function initDvere(poOtevreni?: () => void) {
  const dvere = document.querySelector<HTMLElement>(".zk-dvere");
  if (!dvere) return;
  const noren = dvere.querySelector<HTMLAnchorElement>(".zk-noren");
  const za = document.querySelectorAll<HTMLElement>("[data-za-dvermi]");

  /* jen při vývoji: ?otevreno pustí dovnitř i bez kami */
  const vyvoj = import.meta.env.DEV && new URLSearchParams(location.search).has("otevreno");

  /* Při příchodu na stránku: kdo už provaz jednou viděl padat, má dveře otevřené hned */
  let prichod = true;
  const aktualizuj = () => {
    nactiPostup();
    const nalezeni = nacti<string[]>(KLIC_NALEZENI, []);
    const n = Math.min(nalezeni.length, PRAH);
    dvere.querySelectorAll<HTMLElement>(".zk-kami").forEach((k) => k.classList.toggle("je", nalezeni.includes(k.dataset.kami ?? "")));
    otevreno = vyvoj || n >= PRAH || proslych() > 0 || !!mistr();
    dvere.classList.toggle("hned", prichod && otevreno && nacti(KLIC_PROVAZ, false));
    prichod = false;
    if (otevreno && !dvere.classList.contains("je-otevreno")) uloz(KLIC_PROVAZ, true);
    dvere.classList.toggle("je-otevreno", otevreno);
    dvere.querySelector<HTMLElement>(".zk-zamceno")!.hidden = otevreno;
    dvere.querySelector<HTMLElement>(".zk-otevreno")!.hidden = !otevreno;
    za.forEach((el) => (el.hidden = !otevreno));
    dvere.querySelector(".zk-pocet")!.textContent = String(n);
    dvere.querySelector(".zk-chybi")!.textContent = n ? ` ${chybiSlovy(PRAH - n)}` : " Hledat se začíná na Partě 2.";
    const kde = kdeStoji();
    const postup = dvere.querySelector<HTMLElement>(".zk-postup")!;
    postup.hidden = proslych() === 0;
    postup.querySelector("b")!.textContent =
      kde >= urovne.length ? "všech devět razítek" : `${proslych()} z ${urovne.length} razítek, na řadě ${urovne[kde].cislo} ${urovne[kde].stanice}`;
    if (noren) noren.setAttribute("aria-label", otevreno ? "Projít norenem k desce" : "Dveře jsou zavřené provazem — otevřít omamori");
    if (otevreno) poOtevreni?.();
  };

  const otevriOmamori = () => document.querySelector<HTMLDialogElement>("[data-zaves-dialog]")?.showModal();
  dvere.querySelector(".zk-omamori")?.addEventListener("click", otevriOmamori);
  noren?.addEventListener("click", (e) => {
    if (otevreno) return;
    e.preventDefault();
    otevriOmamori();
  });
  /* Omamori se dá vyprázdnit i odsud a kami se dá najít v hlavičce — zkontroluje se po zavření */
  document.addEventListener(SMAZANO, aktualizuj);
  document.querySelector<HTMLDialogElement>("[data-zaves-dialog]")?.addEventListener("close", aktualizuj);

  aktualizuj();
}
