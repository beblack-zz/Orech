/**
 * Odeslání objednávky z prohlížeče (šátek v Obchodě 2, dárková jízdenka
 * v Rezervaci) na /api/objednavka. Když server neodpoví, stránka ukáže
 * zálohu: adresu dílny s tlačítkem Zkopírovat a odkaz na e-mail se stejnou
 * objednávkou (`zaloha`).
 */

export type Odpoved = { ok: true; naoko: boolean } | { ok: false; chyba: string };

export const platnyEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export async function posliObjednavku(data: Record<string, unknown>): Promise<Odpoved> {
  const stop = new AbortController();
  const casovac = window.setTimeout(() => stop.abort(), 15000);
  try {
    const r = await fetch("/api/objednavka", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: stop.signal,
    });
    const j = (await r.json().catch(() => null)) as Odpoved | null;
    return j && typeof j.ok === "boolean" ? j : { ok: false, chyba: "spojeni" };
  } catch {
    return { ok: false, chyba: "spojeni" };
  } finally {
    window.clearTimeout(casovac);
  }
}

/** Co říct, když to neprošlo */
export const proc = (chyba: string) =>
  chyba === "moc"
    ? "Odešlo toho odsud moc najednou. Zkus to za pár minut, nebo nám napiš:"
    : chyba === "spatne"
      ? "Něco v objednávce nesedí — zkontroluj jméno a e-mail. Nebo nám rovnou napiš:"
      : "Objednávku se teď nepodařilo poslat. Napiš nám a domluvíme se:";

/** Záloha do zprávy: věta, adresa s tlačítkem Zkopírovat a odkaz na připravený e-mail */
export function zaloha(cil: HTMLElement, veta: string, email: string, mailto: string) {
  const adresa = document.createElement("b");
  adresa.textContent = email;
  const kopie = document.createElement("button");
  kopie.type = "button";
  kopie.className = "odkaz-tlacitko";
  kopie.textContent = "zkopírovat";
  kopie.addEventListener("click", () => {
    navigator.clipboard?.writeText(email).then(
      () => (kopie.textContent = "zkopírováno"),
      () => (kopie.textContent = "nejde zkopírovat"),
    );
  });
  const odkaz = document.createElement("a");
  odkaz.href = mailto;
  odkaz.textContent = "otevřít e-mail s objednávkou";
  cil.replaceChildren(`${veta} `, adresa, " (", kopie, "), nebo ", odkaz, ".");
}
