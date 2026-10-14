/**
 * Přepočet souřadnic kresby na procenta pro HTML nad kresbou (postavičky,
 * štítky). Kresby Dílny mají pevný viewBox a roztahují se na šířku, takže
 * procenta z viewBoxu sedí v každé velikosti.
 */
export function mista(W: number, H: number) {
  const px = (x: number) => ((x / W) * 100).toFixed(3);
  const py = (y: number) => ((y / H) * 100).toFixed(3);
  return {
    px,
    py,
    /** Postavička stojí patou na y; kresby mají pod nohama asi osminu výšky vzduchu */
    kami: (m: { x: number; y: number; w: number }) => `left:${px(m.x - m.w / 2)}%;top:${py(m.y - m.w * 0.88)}%;width:${px(m.w)}%`,
    /** Bod — levý horní roh prvku, který se sám posune o půlku doleva */
    bod: (x: number, y: number) => `left:${px(x)}%;top:${py(y)}%`,
  };
}
