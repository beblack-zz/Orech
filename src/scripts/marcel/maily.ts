/**
 * Návrhy mailů na /marcel (components/marcel/Maily.astro): rámeček je
 * vysoký přesně jako mail — po načtení, po stažení písem a při každé
 * změně šířky, kdy se mail přeskládá.
 */
export function maily() {
  document.querySelectorAll<HTMLIFrameElement>(".mc-mail-ramec").forEach((ramec) => {
    const dorovnej = () => {
      const telo = ramec.contentDocument?.body;
      if (telo && telo.childElementCount) ramec.style.height = `${telo.scrollHeight}px`;
    };
    ramec.addEventListener("load", () => {
      dorovnej();
      ramec.contentDocument?.fonts?.ready.then(dorovnej);
    });
    dorovnej();
    new ResizeObserver(dorovnej).observe(ramec);
  });
}
