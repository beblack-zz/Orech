/**
 * Oznámení dole na stránce komnaty U mistra — zamčené políčko, povýšení,
 * nový sešit. Jeden proužek, nová zpráva přepíše starou.
 */
let cas: number | undefined;

export function oznam(text: string) {
  const o = document.querySelector<HTMLElement>(".mu-oznameni");
  if (!o) return;
  o.textContent = text;
  o.classList.remove("je");
  void o.offsetWidth;
  o.classList.add("je");
  window.clearTimeout(cas);
  cas = window.setTimeout(() => o.classList.remove("je"), 2800 + text.length * 30);
}
