/*
 * Herec — přehrávač choreografií pro divadlo na /parta.
 *
 * Scény z Marcela (scripts/<postava>-<téma>) jsou hračky: reagují na myš
 * a na kliknutí, a to nejlepší v nich člověk najde, až když ví kam sáhnout.
 * Vystoupení je proto zápis toho, co by na scéně udělal někdo, kdo ji zná
 * nazpaměť: kam najede, kam klepne, kdy počká. Scéna o divadle neví —
 * dostává stejné události jako od myši.
 *
 * Choreografie je generátor (scripts/parta3/vystoupeni/<postava>.js):
 *
 *   *hraj(h) {
 *     yield titulek("Sedm bubnů. Každý je laděný jinak.");
 *     yield cekej(1.2);
 *     for (const b of BUBNY) yield klik(b.x, b.y);
 *     yield az(() => h.dyn.duha > 0.5, 12);
 *   }
 *
 * `h` je pohled do scény: h.t (vteřiny od začátku vystoupení), h.dyn (živý
 * stav simulace), h.vstup, h.V a h.mys (kde je právě ukazatel, nebo null).
 * Díky němu se dá mířit i na věci, které si scéna losuje.
 *
 * Modul je čistý — žádný DOM, žádný čas. Posouvá ho ten, kdo ho drží:
 * v prohlížeči režisér (reziser.ts) podle času scény, při zkoušce v Node
 * (scripts/zkouska-vystoupeni.mjs) simulace snímek po snímku. Souřadnice
 * jsou v jednotkách kresby (0–180).
 */

/* ——— Povely ——— */

/** Počkat s vteřin. */
export const cekej = (s) => ({ cekej: s });
/** Dojet ukazatelem na místo; doba 0 = skok. */
export const mys = (x, y, doba = 0.35) => ({ mys: [x, y], doba });
/** Dojet a klepnout (stisk a hned puštění). */
export const klik = (x, y, doba = 0.3) => ({ klik: [x, y], doba });
/** Dojet, stisknout a držet — pustí až `pust()`. Mezitím jde tahat přes `mys`. */
export const drz = (x, y, doba = 0.3) => ({ drz: [x, y], doba });
export const pust = () => ({ pust: true });
/** Ukazatel odejde ze scény. */
export const pryc = () => ({ pryc: true });
/** Počkat, až bude podmínka pravda — nejdéle max vteřin. */
export const az = (podminka, max = 10) => ({ az: podminka, max });
/** Titulek pod jevištěm; prázdný text ho schová. */
export const titulek = (text) => ({ titulek: text });
/** Hlediště: "potlesk", "smich", "uzas" nebo "volani". */
export const ohlas = (typ) => ({ ohlas: typ });

const hladce = (k) => k * k * (3 - 2 * k);
/** Jak dlouho se drží tlačítko při klepnutí */
const STISK = 0.09;
/** Pojistka proti choreografii, která jen sype okamžité povely */
const OKAMZITYCH = 400;

/*
 * vystoupeni   zápis kusu: { delka, *hraj(h) }
 * scena        pohled do scény: { V, stav: () => ({ t, dyn, vstup }) }, čas je od začátku vystoupení
 * ven          kam herec posílá, co dělá: ukaz(x, y), stiskni(x, y), pust(x, y), pryc(), titulek(text), ohlas(typ)
 */
export function novyHerec(vystoupeni, scena, ven) {
  let kurzor = null;
  let ted = 0;
  /** Rozdělaný povel: { do } čeká, { z, na, od, doba, pak } jede, { az, do } hlídá podmínku */
  let delam = null;
  let hotovo = false;
  let drzi = false;
  const vyprsela = [];

  const h = {
    V: scena.V,
    get t() { return ted; },
    get dyn() { return scena.stav().dyn; },
    get vstup() { return scena.stav().vstup; },
    get mys() { return kurzor; },
  };
  const gen = vystoupeni.hraj(h);

  const ukaz = (x, y) => {
    kurzor = { x, y };
    ven.ukaz(x, y);
  };
  const jed = ([x, y], doba, pak) => {
    const z = kurzor || { x, y };
    if (!kurzor) ukaz(x, y);
    const daleko = Math.hypot(x - z.x, y - z.y) > 0.5;
    delam = { z, na: { x, y }, od: ted, doba: daleko ? Math.max(0, doba) : 0, pak };
  };

  /** Vezme další povel. Vrátí true, když povel zabere čas (nebo je konec). */
  const dalsi = () => {
    const { value: p, done } = gen.next();
    if (done || !p) {
      hotovo = true;
      /* po poslední větě ukazatel ze scény odejde, i kdyby na to choreografie zapomněla */
      if (drzi && kurzor) ven.pust(kurzor.x, kurzor.y);
      drzi = false;
      if (kurzor) ven.pryc();
      kurzor = null;
      return true;
    }
    if (p.cekej != null) delam = { do: ted + Math.max(0, p.cekej) };
    else if (p.mys) jed(p.mys, p.doba ?? 0.35, null);
    else if (p.klik) jed(p.klik, p.doba ?? 0.3, "klik");
    else if (p.drz) jed(p.drz, p.doba ?? 0.3, "drz");
    else if (p.az) delam = { az: p.az, do: ted + (p.max ?? 10) };
    else {
      if (p.pust) {
        if (drzi && kurzor) ven.pust(kurzor.x, kurzor.y);
        drzi = false;
      } else if (p.pryc) {
        if (drzi && kurzor) ven.pust(kurzor.x, kurzor.y);
        drzi = false;
        kurzor = null;
        ven.pryc();
      } else if (p.titulek != null) ven.titulek(p.titulek);
      else if (p.ohlas) ven.ohlas(p.ohlas);
      return false;
    }
    return true;
  };

  /** Dotáhne rozdělaný povel k času `ted`. Vrátí true, když je dokončený. */
  const pokracuj = () => {
    const d = delam;
    if (d.az) {
      let ano = false;
      try {
        ano = !!d.az(h);
      } catch {
        ano = false;
      }
      if (ano) return true;
      if (ted >= d.do) {
        vyprsela.push(ted);
        return true;
      }
      return false;
    }
    if (d.na) {
      const k = d.doba > 0 ? Math.min(1, (ted - d.od) / d.doba) : 1;
      const e = hladce(k);
      if (d.doba > 0 || !d.dojel) ukaz(d.z.x + (d.na.x - d.z.x) * e, d.z.y + (d.na.y - d.z.y) * e);
      d.dojel = true;
      if (k < 1) return false;
      if (d.pak === "klik") {
        ven.stiskni(d.na.x, d.na.y);
        drzi = true;
        delam = { do: ted + STISK, pustit: true };
        return false;
      }
      if (d.pak === "drz") {
        ven.stiskni(d.na.x, d.na.y);
        drzi = true;
      }
      return true;
    }
    if (ted < d.do) return false;
    if (d.pustit) {
      if (kurzor) ven.pust(kurzor.x, kurzor.y);
      drzi = false;
    }
    return true;
  };

  return {
    /** Posune vystoupení na čas t (vteřiny od jeho začátku). Vrátí false, když dohrálo. */
    krok(t) {
      if (hotovo) return false;
      ted = t;
      for (let i = 0; i < OKAMZITYCH; i++) {
        if (delam) {
          if (!pokracuj()) return true;
          delam = null;
        }
        if (dalsi() && hotovo) break;
        if (hotovo) break;
      }
      return !hotovo;
    },
    /** Konec před koncem: pustí tlačítko a odvede ukazatel. */
    zastav() {
      if (hotovo) return;
      hotovo = true;
      if (drzi && kurzor) ven.pust(kurzor.x, kurzor.y);
      drzi = false;
      if (kurzor) ven.pryc();
      kurzor = null;
      gen.return?.();
    },
    get hotovo() { return hotovo; },
    get kurzor() { return kurzor; },
    /** Časy, kdy `az` nedočkalo své podmínky — při zkoušce znamení, že choreografie míjí */
    vyprsela,
  };
}
