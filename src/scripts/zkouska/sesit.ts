/**
 * Sešit razítek komnaty U mistra (components/zkouska/Sesit.astro): strany se
 * plní podle postupu — razítko, štětcem den, známka. Otevírá se z desky
 * i tlačítkem v hlavičce (Hlavicka.astro, sber="sesit") a ukáže stranu
 * s posledním razítkem.
 *
 * „Začít znovu od hroudy“ smaže postup — napoprvé se jen zeptá.
 */
import { urovne, znamky } from "../../data/mistr";
import { pecetSvg } from "../../components/zkouska/pecet";
import { nactiPostup, zaznam, proslych, smazPostup, nactiPecet, nactiJmeno, ZMENA } from "./postup";
import { datumJaponsky, datumCesky } from "./datum";
import { oznam } from "./oznameni";
import * as zvuk from "../parta2/zvuk";

let dialog: HTMLDialogElement | null = null;

function ukaz() {
  nactiPostup();
  const n = proslych();
  document.querySelectorAll(".mss-pocet").forEach((b) => (b.textContent = String(n)));
  document.documentElement.classList.toggle("je-cely-sesit", n === urovne.length);
  if (!dialog) return;
  for (const u of urovne) {
    const li = dialog.querySelector<HTMLElement>(`[data-strana="${u.id}"]`);
    if (!li) continue;
    const z = zaznam(u.id);
    li.classList.toggle("je", !!z);
    li.dataset.znamka = z?.znamka ?? "";
    li.querySelector(".mss-datum")!.textContent = z ? datumJaponsky(z.poprve) : "";
    li.querySelector(".mss-den")!.textContent = z ? `${datumCesky(z.poprve)} · ${znamky[z.znamka].znak} ${znamky[z.znamka].nazev}` : "";
    li.querySelector(".mss-znamka use")?.setAttribute("href", `#mrz-znamka-${z?.znamka ?? "ka"}`);
  }
  const pecet = nactiPecet();
  const jmeno = nactiJmeno();
  dialog.querySelector(".mss-pecet")!.innerHTML = pecet ? pecetSvg(pecet, { id: "mss-pecet", popis: "Tvoje pečeť" }) : "";
  dialog.querySelector(".mss-jmeno")!.textContent = jmeno;
}

export function otevriSesit() {
  if (!dialog) return;
  ukaz();
  if (!dialog.open) dialog.showModal();
  /* Na stranu s posledním razítkem (nebo na desky, když je sešit prázdný) */
  const posledni = [...dialog.querySelectorAll<HTMLElement>(".mss-strana.je")].pop();
  const kniha = dialog.querySelector<HTMLElement>(".mss-kniha")!;
  kniha.scrollLeft = posledni ? Math.max(0, posledni.offsetLeft - kniha.clientWidth / 2 + posledni.offsetWidth / 2) : 0;
  zvuk.papir();
}

export function initSesit() {
  dialog = document.querySelector<HTMLDialogElement>(".mss-dialog");
  ukaz();
  document.addEventListener(ZMENA, ukaz);
  if (!dialog) return;
  const d = dialog;
  d.querySelector(".omamori-zavrit")?.addEventListener("click", () => d.close());
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });

  const reset = d.querySelector<HTMLButtonElement>(".mss-reset")!;
  let ptat: number | undefined;
  reset.addEventListener("click", () => {
    if (!reset.classList.contains("ptam-se")) {
      reset.classList.add("ptam-se");
      reset.textContent = "Opravdu? Smaže všechna razítka";
      window.clearTimeout(ptat);
      ptat = window.setTimeout(() => {
        reset.classList.remove("ptam-se");
        reset.textContent = "Začít znovu od hroudy";
      }, 4000);
      return;
    }
    window.clearTimeout(ptat);
    reset.classList.remove("ptam-se");
    reset.textContent = "Začít znovu od hroudy";
    smazPostup();
    d.close();
    oznam("Nový sešit. Figurka je zpátky u dílny.");
  });
}
