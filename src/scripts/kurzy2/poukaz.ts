/**
 * Poukaz na míru: náhled se přepisuje při psaní, kliknutím se otočí,
 * „Objednat“ sestaví e-mail s tím, co člověk vyplnil. Nic se neodesílá
 * ze stránky — otevře se jen poštovní program.
 */
import { parta } from "../../data/parta";
import * as zvuk from "../parta2/zvuk";

const jmena = Object.fromEntries(parta.map((p) => [p.id, p.name]));

export function poukaz() {
  const form = document.querySelector<HTMLFormElement>(".poukaz-form");
  if (!form) return;
  const karta = document.querySelector<HTMLButtonElement>(".poukaz-karta")!;
  const castkaEl = karta.querySelector(".poukaz-castka b")!;
  const proEl = karta.querySelector(".poukaz-pro b")!;
  const vzkazEl = karta.querySelector(".poukaz-vzkaz")!;
  const odObal = karta.querySelector<HTMLElement>(".poukaz-od")!;
  const odEl = odObal.querySelector("b")!;
  const postavy = [...karta.querySelectorAll<HTMLElement>("[data-postava]")];
  const vlastni = form.querySelector<HTMLInputElement>(".poukaz-vlastni")!;
  const objednat = form.querySelector<HTMLAnchorElement>(".poukaz-objednat")!;

  const castka = () => {
    const v = (form.elements.namedItem("castka") as RadioNodeList).value;
    if (v !== "vlastni") return v;
    const n = Math.max(0, Math.round(Number(vlastni.value) || 0));
    return n ? n.toLocaleString("cs-CZ") : "…";
  };

  const prekresli = () => {
    const data = new FormData(form);
    const kami = String(data.get("kami") ?? "kachlik");
    const pro = String(data.get("pro") ?? "").trim();
    const vzkaz = String(data.get("vzkaz") ?? "").trim();
    const od = String(data.get("od") ?? "").trim();
    vlastni.hidden = data.get("castka") !== "vlastni";

    castkaEl.textContent = castka();
    proEl.textContent = pro || "někoho milého";
    vzkazEl.textContent = `„${vzkaz || "Ať se ti točí."}“`;
    odObal.hidden = !od;
    odEl.textContent = od;
    postavy.forEach((p) => (p.hidden = p.dataset.postava !== kami));

    const telo = [
      "Ahoj, chci objednat dárkový poukaz.",
      "",
      `Hodnota: ${castka()} Kč`,
      `Pro: ${pro || "—"}`,
      `Vzkaz: ${vzkaz || "—"}`,
      `Od: ${od || "—"}`,
      `Na poukazu: ${jmena[kami] ?? kami}`,
      "",
      "Tištěný, nebo v PDF? (doplňte, co se hodí)",
    ].join("\n");
    objednat.href = `mailto:ahoj@jirosaku.cz?subject=${encodeURIComponent(`Dárkový poukaz ${castka()} Kč`)}&body=${encodeURIComponent(telo)}`;
  };

  form.addEventListener("input", prekresli);
  form.addEventListener("change", (e) => {
    prekresli();
    if ((e.target as HTMLInputElement).name === "kami") zvuk.cink();
  });
  karta.addEventListener("click", () => {
    karta.classList.toggle("otoceny");
    zvuk.papir();
  });
  form.querySelector(".poukaz-tisk")?.addEventListener("click", () => {
    karta.classList.remove("otoceny");
    window.print();
  });
  prekresli();
}
