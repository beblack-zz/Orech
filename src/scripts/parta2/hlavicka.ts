/**
 * Hlavička nového vzhledu: mobilní menu a zvonek, který zapíná zvuk.
 * Sdílí ji /parta-2 i /kurzy-2.
 */
import * as zvuk from "./zvuk";

export function hlavicka() {
  const tlacitko = document.querySelector<HTMLButtonElement>(".hlava-menu-tlacitko");
  const menu = document.getElementById("hlava-menu");
  const nastavMenu = (otevrene: boolean) => {
    if (!menu || !tlacitko) return;
    menu.hidden = !otevrene;
    tlacitko.setAttribute("aria-expanded", String(otevrene));
    tlacitko.setAttribute("aria-label", otevrene ? "Zavřít menu" : "Otevřít menu");
  };
  tlacitko?.addEventListener("click", () => nastavMenu(!!menu?.hidden));
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => nastavMenu(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") nastavMenu(false);
  });

  const zv = document.querySelector<HTMLButtonElement>(".zvuk-tlacitko");
  const popis = zv?.querySelector(".zvuk-popis");
  zv?.addEventListener("click", async () => {
    const zap = await zvuk.prepni();
    zv.setAttribute("aria-pressed", String(zap));
    zv.setAttribute("aria-label", zap ? "Vypnout zvuk" : "Zapnout zvuk");
    if (popis) popis.textContent = zap ? "Ztlumit" : "Zvuk";
  });
}
