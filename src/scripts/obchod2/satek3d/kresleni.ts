/**
 * Kreslení šátku furoshiki ve WebGL2: látka, lem, balíky v novinách, uzel,
 * lampa a stíny. Fasáda (latka.ts) sem každý snímek pošle pozice bodů látky
 * z fyziky a stav balíků a uzlu; tady se nic nesimuluje ani nečasuje.
 *
 * Kamera stojí vpředu (−y), 52° nad vodorovnou, perspektiva se svislým FOV
 * 30° — rozprostřený šátek (úhlopříčka 0,99 m) vyplní 88 % šířky plátna
 * a zavázaný uzlík i zvednutý cíp se pořád vejdou.
 *
 * Látka: body N × N jdou každý snímek do textury RGBA32F a vertex shader
 * z nich počítá Catmull-Rom plochu na třikrát hustší síti; normály
 * z derivací plochy, takže záhyby jsou hladké a bez plošek. Líc je strana,
 * kam míří Pu × Pv (na rozprostřeném šátku dolů), rub je nahoře. Po obvodu
 * běží lem — tenká trubka spočítaná z téže plochy.
 *
 * Každý snímek tři průchody: mapa stínů od lampy (měkké stíny, ostré
 * u kontaktu), výšková mapa shora (tma v záhybech, pod chlopněmi, kolem
 * balíků a kontaktní stín na pult) a obraz. Pult je CSS pod průhledným
 * plátnem — kreslí se na něj jen tma (černá s alfou).
 *
 * Po ztrátě kontextu se všechno postaví znovu z toho, co si kreslení pamatuje
 * (vzor, sítě a textury balíků, poslední snímek).
 */
import { STRANA } from "./typy";
import type { DataBaliku, Kresleni, Poloha, Sit, Snimek, StavUzlu, V3 } from "./typy";
import { vzory } from "../../../data/furoshiki";
import type { VzorSatku } from "../../../data/furoshiki";
import { sitUzlu, SIRKA_JADRA } from "./uzel";
import { zdrojeProgramu } from "./shadery";
import type { ZdrojeProgramu, ZdrojProgramu } from "./shadery";
import { dlazdiceVzoru, VyrobaLatky } from "./textura-latky";
import type { Dlazdice } from "./textura-latky";

const ST = Math.PI / 180;

/* ——— Kamera ——— */
const FOV = 30 * ST;
const NADHLED = 52 * ST;
const CIL: V3 = [0, -0.02, 0];
/** Vzdálenost od cíle: levý a pravý cíp rozprostřeného šátku (±0,495 m) padnou na 88 % šířky */
const VZDALENOST = 2.09;
const BLIZKO = 0.9;
const DALEKO = 4.5;

/* ——— Lampa nad pultem: trochu vlevo a vzadu, svítí šikmo na střed šátku ——— */
const LAMPA: V3 = [-0.36, 0.14, 0.88];
const LAMPA_CIL: V3 = [0.03, -0.03, 0];
const LAMPA_BARVA = "#FFE2B8";
const LAMPA_SILA = 1.3;
/** Průměr svítící plochy lampy — podle něj se stín daleko od předmětu rozmazává */
const LAMPA_PRUMER = 0.08;
const KUZEL_VNITRNI = 4 * ST;
const KUZEL_VNEJSI = 42 * ST;
const STIN_FOV = 76 * ST;
const STIN_BLIZKO = 0.3;
const STIN_DALEKO = 2.2;

/* ——— Výšková mapa shora: čtverec ±0,64 m, výšky 0 … 0,5 m ——— */
const VYSKA_STRANA = 1.28;
const VYSKA_STROP = 0.5;

/* ——— Okolí noci a tón ——— */
/** Chladné světlo noci shora a teplý odraz pultu zdola (lineárně) */
const NEBE: V3 = [0.04, 0.05, 0.078];
const ZEM: V3 = [0.12, 0.058, 0.026];
const EXPOZICE = 1.1;
const KOLENO = 0.72;
/** Tma na pultu: síla a nejvíc (alfa černé) */
const TMA_PULTU = 0.7;
const TMA_NEJVIC = 0.55;
/** Kolik světla z osvětleného šátku dopadne zespodu na balíky */
const ODRAZ_LATKY = 0.55;
/** Jak moc se vyrovná teplá barva lampy (0 = vůbec, 1 = úplně) */
const VYVAZENI = 0.22;

/** Pult jako „chytač stínů“: obdélník na z = 0 kolem všeho, co může stínit (nejvýš ±PULT) */
const PULT = 0.9;

/** Zdroj od WebGL, nebo chyba — null vrací jen ztracený kontext */
function jiste<T>(x: T | null, co: string): T {
  if (x === null) throw new Error(`WebGL: ${co}`);
  return x;
}

/* ——— Pomocné počty ——— */
type M4 = Float32Array;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
function perspektiva(fovy: number, aspekt: number, n: number, f: number): M4 {
  const t = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = t / aspekt;
  m[5] = t;
  m[10] = (f + n) / (n - f);
  m[11] = -1;
  m[14] = (2 * f * n) / (n - f);
  return m;
}
function ortho(l: number, r: number, b: number, t: number, n: number, f: number): M4 {
  const m = new Float32Array(16);
  m[0] = 2 / (r - l);
  m[5] = 2 / (t - b);
  m[10] = -2 / (f - n);
  m[12] = -(r + l) / (r - l);
  m[13] = -(t + b) / (t - b);
  m[14] = -(f + n) / (f - n);
  m[15] = 1;
  return m;
}
function pohled(oko: V3, cil: V3, nahoru: V3): M4 {
  const z = norm(sub(oko, cil));
  const x = norm(cross(nahoru, z));
  const y = cross(z, x);
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, oko), -dot(y, oko), -dot(z, oko), 1]);
}
function nasob(a: M4, b: M4): M4 {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
  return o;
}
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexLin = (h: string): V3 => [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16) / 255)) as V3;

/* ——— Sítě, které kreslení staví samo ——— */

/** Vykreslovací síť látky: (3·(N−1)+1)² bodů v jednotkách mřížky; trojúhelníky proti směru hodin v (u, v) = líc vpředu */
function sitLatky(n: number) {
  const m = 3 * (n - 1) + 1;
  const st = new Float32Array(m * m * 2);
  for (let j = 0; j < m; j++)
    for (let i = 0; i < m; i++) {
      st[(j * m + i) * 2] = i / 3;
      st[(j * m + i) * 2 + 1] = j / 3;
    }
  const idx = new Uint32Array((m - 1) * (m - 1) * 6);
  let t = 0;
  for (let j = 0; j < m - 1; j++)
    for (let i = 0; i < m - 1; i++) {
      const a = j * m + i;
      idx[t++] = a;
      idx[t++] = a + 1;
      idx[t++] = a + m + 1;
      idx[t++] = a;
      idx[t++] = a + m + 1;
      idx[t++] = a + m;
    }
  return { st, idx };
}

/** Lem: body na zaobleném obvodu látky (uv), směr ven (uv) a průřez (cos, sin) */
function sitLemu(n: number) {
  const roh = 0.006 / STRANA;
  const usek = 3 * (n - 1);
  const oblouk = 6;
  const body: number[][] = [];
  const strana = (ax: number, ay: number, bx: number, by: number, ox: number, oy: number) => {
    for (let i = 0; i < usek; i++) {
      const t = i / usek;
      body.push([ax + (bx - ax) * t, ay + (by - ay) * t, ox, oy]);
    }
  };
  const roh4 = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i < oblouk; i++) {
      const a = a0 + (i / oblouk) * (Math.PI / 2);
      body.push([cx + roh * Math.cos(a), cy + roh * Math.sin(a), Math.cos(a), Math.sin(a)]);
    }
  };
  strana(roh, 0, 1 - roh, 0, 0, -1);
  roh4(1 - roh, roh, -Math.PI / 2);
  strana(1, roh, 1, 1 - roh, 1, 0);
  roh4(1 - roh, 1 - roh, 0);
  strana(1 - roh, 1, roh, 1, 0, 1);
  roh4(roh, 1 - roh, Math.PI / 2);
  strana(0, 1 - roh, 0, roh, -1, 0);
  roh4(roh, roh, Math.PI);
  const K = 10;
  const P = body.length;
  const data = new Float32Array(P * K * 6);
  for (let i = 0; i < P; i++)
    for (let k = 0; k < K; k++) {
      const a = (k / K) * Math.PI * 2;
      data.set([body[i][0], body[i][1], body[i][2], body[i][3], Math.cos(a), Math.sin(a)], (i * K + k) * 6);
    }
  const idx = new Uint32Array(P * K * 6);
  let t = 0;
  for (let i = 0; i < P; i++)
    for (let k = 0; k < K; k++) {
      const a = i * K + k;
      const b = ((i + 1) % P) * K + k;
      const c = ((i + 1) % P) * K + ((k + 1) % K);
      const d = i * K + ((k + 1) % K);
      idx.set([a, b, c, a, c, d], t);
      t += 6;
    }
  return { data, idx };
}

/* ——— Zdroje na grafické kartě ——— */

interface Program {
  p: WebGLProgram;
  u: (jmeno: string) => WebGLUniformLocation | null;
}
interface Vao {
  vao: WebGLVertexArrayObject;
  buf: WebGLBuffer[];
  pocet: number;
  typ: number;
}
interface CastGL extends Vao {
  tex: WebGLTexture | null;
  material: number;
  barva: [number, number, number, number];
}
interface BalikGL {
  casti: CastGL[];
  textury: WebGLTexture[];
}
interface Zdroje {
  pr: Record<keyof ZdrojeProgramu, Program>;
  ubo: WebGLBuffer;
  body: WebGLTexture;
  latka: Vao;
  lem: Vao;
  pult: Vao;
  uzel: Vao | null;
  vzor: WebGLTexture;
  krep: WebGLTexture;
  prazdna: WebGLTexture;
  stin: WebGLTexture;
  stinFbo: WebGLFramebuffer;
  vyska: WebGLTexture;
  vyskaFbo: WebGLFramebuffer;
  sPorovnej: WebGLSampler;
  sCti: WebGLSampler;
  vyroba: VyrobaLatky;
  baliky: Map<string, BalikGL>;
  aniso: EXT_texture_filter_anisotropic | null;
}

/** Jednotky textur: stejné pro všechny programy */
const JEDNOTKA = { u_vzor: 0, u_krep: 1, u_body: 2, u_stinMapa: 3, u_stinHloubka: 4, u_vyskaMapa: 5, u_tex: 6 } as const;

export function vytvorKresleni(platno: HTMLCanvasElement, volby: { n: number; uspora: boolean }): Kresleni | null {
  const kontext = platno.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: true,
    depth: true,
    stencil: false,
    preserveDrawingBuffer: false,
  });
  if (!kontext) return null;
  const gl: WebGL2RenderingContext = kontext;
  const N = volby.n;
  const uspora = volby.uspora;
  const MAPA_STINU = uspora ? 1024 : 2048;
  const MAPA_VYSKY = uspora ? 256 : 512;
  const VZOR_PX = uspora ? 1024 : 2048;
  const KREP_PX = uspora ? 256 : 512;
  const zdrojeShaderu = zdrojeProgramu({
    strana: STRANA,
    stinHledani: uspora ? 8 : 12,
    stinMekceni: uspora ? 10 : 16,
    tmaVzorku: uspora ? 6 : 8,
  });

  /* ——— Co si kreslení pamatuje i přes ztrátu kontextu ——— */
  let z: Zdroje | null = null;
  let zniceno = false;
  let posledni: Snimek | null = null;
  let vzor: { v: VzorSatku; d: Dlazdice } | null = null;
  let poradiVzoru = 0;
  const balikyData = new Map<string, DataBaliku>();
  const body4 = new Float32Array(N * N * 4);
  /* Mapa stínů a výšková mapa platí, dokud se látka, balíky ani uzel nepohnou (najetí myší, změna velikosti) */
  let mapyPlati = false;
  const minuleBody = new Float32Array(N * N * 3);
  let minuleTelesa = new Float32Array(0);

  /* ——— Kamera a lampa ——— */
  let cssW = 0;
  let cssH = 0;
  let tY = Math.tan(FOV / 2);
  let tX = tY;
  const kamera: V3 = [CIL[0], CIL[1] - VZDALENOST * Math.cos(NADHLED), CIL[2] + VZDALENOST * Math.sin(NADHLED)];
  const vpred = norm(sub(CIL, kamera));
  const vpravo = norm(cross(vpred, [0, 0, 1]));
  const vzhuru = cross(vpravo, vpred);
  const pohledKamery = pohled(kamera, CIL, [0, 0, 1]);
  let vp: M4 = nasob(perspektiva(FOV, 1, BLIZKO, DALEKO), pohledKamery);
  const svetloVP = nasob(perspektiva(STIN_FOV, 1, STIN_BLIZKO, STIN_DALEKO), pohled(LAMPA, LAMPA_CIL, [0, 1, 0]));
  const h2 = VYSKA_STRANA / 2;
  const vyskaVP = nasob(ortho(-h2, h2, -h2, h2, 0, VYSKA_STROP), pohled([0, 0, VYSKA_STROP], [0, 0, 0], [0, 1, 0]));

  /* Blok Svet (std140, samé vec4 a mat4 — pořadí jako v shadery.ts) */
  const svet = new Float32Array(80);
  const naplnSvet = () => {
    const smer = norm(sub(LAMPA_CIL, LAMPA));
    const barva = hexLin(LAMPA_BARVA);
    /* Vyvážení bílé: část teplé barvy lampy se vyrovná, jas zůstane */
    const vyv = barva.map((c) => c ** -VYVAZENI) as V3;
    const jas = 0.2126 * vyv[0] + 0.7152 * vyv[1] + 0.0722 * vyv[2];
    const sirka = 2 * Math.tan(STIN_FOV / 2);
    svet.set(vp, 0);
    svet.set(svetloVP, 16);
    svet.set([kamera[0], kamera[1], kamera[2], 1], 32);
    svet.set([LAMPA[0], LAMPA[1], LAMPA[2], LAMPA_SILA], 36);
    svet.set([smer[0], smer[1], smer[2], Math.cos(KUZEL_VNEJSI)], 40);
    svet.set([barva[0], barva[1], barva[2], Math.cos(KUZEL_VNITRNI)], 44);
    svet.set([sirka / MAPA_STINU, LAMPA_PRUMER / sirka, STIN_BLIZKO, STIN_DALEKO], 48);
    svet.set([1 / MAPA_STINU, 0, 0, 0], 52);
    svet.set([-h2, -h2, 1 / VYSKA_STRANA, VYSKA_STRANA / MAPA_VYSKY], 56);
    svet.set([VYSKA_STROP, VYSKA_STROP, 0, 0], 60);
    svet.set([NEBE[0], NEBE[1], NEBE[2], 0], 64);
    svet.set([ZEM[0], ZEM[1], ZEM[2], 0], 68);
    svet.set([EXPOZICE, KOLENO, TMA_PULTU, TMA_NEJVIC], 72);
    svet.set([vyv[0] / jas, vyv[1] / jas, vyv[2] / jas, 0], 76);
  };

  /* Obdélník pultu: obal látky, balíků a uzlu, rozšířený o to, kam může padnout stín a kontaktní tma */
  const rohyPultu = new Float32Array([-PULT, -PULT, PULT, -PULT, PULT, PULT, -PULT, PULT]);
  const obalPultu = (p: Float32Array, pocet: number, s: Snimek) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, zmax = 0;
    for (let k = 0; k < pocet; k++) {
      const x = p[k * 3], y = p[k * 3 + 1], zz = p[k * 3 + 2];
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      if (zz > zmax) zmax = zz;
    }
    for (const b of s.baliky) {
      const d = balikyData.get(b.id);
      if (!d || b.viditelnost < 0.02) continue;
      const r = d.tvar.polomer * b.poloha.meritko;
      x0 = Math.min(x0, b.poloha.x - r);
      x1 = Math.max(x1, b.poloha.x + r);
      y0 = Math.min(y0, b.poloha.y - r);
      y1 = Math.max(y1, b.poloha.y + r);
      zmax = Math.max(zmax, b.poloha.z + d.tvar.vyska * b.poloha.meritko);
    }
    if (s.uzel && s.uzel.mira >= 0.01) zmax = Math.max(zmax, s.uzel.stred[2] + s.uzel.velikost);
    const okraj = 0.07 + zmax * 1.3;
    const o = (v: number) => Math.max(-PULT, Math.min(PULT, v));
    const ax = o(x0 - okraj), bx = o(x1 + okraj), ay = o(y0 - okraj), by = o(y1 + okraj);
    rohyPultu.set([ax, ay, bx, ay, bx, by, ax, by]);
  };

  /* ——— Stavba zdrojů (na začátku a po obnovení kontextu) ——— */
  const sestav = (zdroj: ZdrojProgramu): Program => {
    const p = jiste(gl.createProgram(), "program");
    const shadery: WebGLShader[] = [];
    for (const [typ, text] of [
      [gl.VERTEX_SHADER, zdroj.vs],
      [gl.FRAGMENT_SHADER, zdroj.fs],
    ] as const) {
      const s = jiste(gl.createShader(typ), "shader");
      gl.shaderSource(s, text);
      gl.compileShader(s);
      gl.attachShader(p, s);
      shadery.push(s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const zprava = shadery.map((s) => gl.getShaderInfoLog(s)).join("\n") + (gl.getProgramInfoLog(p) ?? "");
      throw new Error(zprava || "program");
    }
    shadery.forEach((s) => gl.deleteShader(s));
    const mista = new Map<string, WebGLUniformLocation | null>();
    const u = (jmeno: string) => {
      if (!mista.has(jmeno)) mista.set(jmeno, gl.getUniformLocation(p, jmeno));
      return mista.get(jmeno) ?? null;
    };
    gl.useProgram(p);
    for (const [jmeno, jednotka] of Object.entries(JEDNOTKA)) {
      const m = u(jmeno);
      if (m) gl.uniform1i(m, jednotka);
    }
    const n = u("u_n");
    if (n) gl.uniform1i(n, N);
    const blok = gl.getUniformBlockIndex(p, "Svet");
    if (blok !== gl.INVALID_INDEX) gl.uniformBlockBinding(p, blok, 0);
    return { p, u };
  };

  const vao = (atributy: { data: Float32Array; velikosti: number[] }[], idx: Uint16Array | Uint32Array): Vao => {
    const v = jiste(gl.createVertexArray(), "vao");
    gl.bindVertexArray(v);
    const buf: WebGLBuffer[] = [];
    let mistoAtributu = 0;
    for (const a of atributy) {
      const b = jiste(gl.createBuffer(), "buffer");
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, a.data, gl.STATIC_DRAW);
      const krok = a.velikosti.reduce((s, x) => s + x, 0) * 4;
      let posun = 0;
      for (const vel of a.velikosti) {
        gl.enableVertexAttribArray(mistoAtributu);
        gl.vertexAttribPointer(mistoAtributu, vel, gl.FLOAT, false, krok, posun);
        posun += vel * 4;
        mistoAtributu++;
      }
      buf.push(b);
    }
    const bi = jiste(gl.createBuffer(), "buffer");
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    buf.push(bi);
    gl.bindVertexArray(null);
    return { vao: v, buf, pocet: idx.length, typ: idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
  };
  const vaoSite = (s: Sit) =>
    vao(
      [
        { data: s.pozice, velikosti: [3] },
        { data: s.normaly, velikosti: [3] },
        { data: s.uv, velikosti: [2] },
      ],
      s.indexy,
    );
  const smazVao = (v: Vao) => {
    gl.deleteVertexArray(v.vao);
    v.buf.forEach((b) => gl.deleteBuffer(b));
  };

  const textura = () => {
    const t = jiste(gl.createTexture(), "textura");
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  /** Hloubková mapa s vlastním framebufferem (mapa stínů, výšková mapa) */
  const hloubkovaMapa = (rozmer: number) => {
    const t = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, rozmer, rozmer, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
    const f = jiste(gl.createFramebuffer(), "framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, t, 0);
    gl.drawBuffers([gl.NONE]);
    gl.readBuffer(gl.NONE);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("framebuffer");
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f };
  };

  const nahrajTexturuBaliku = (zdroj: TexImageSource, aniso: EXT_texture_filter_anisotropic | null) => {
    const t = jiste(gl.createTexture(), "textura");
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    /* Noviny a visačka jsou v sRGB — čtou se rovnou lineárně */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, zdroj);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  };

  const vyrobBalik = (zz: Zdroje, data: DataBaliku): BalikGL => {
    const podleZdroje = new Map<TexImageSource, WebGLTexture>();
    const casti = data.casti.map((c): CastGL => {
      let tex: WebGLTexture | null = null;
      if (c.textura) {
        tex = podleZdroje.get(c.textura) ?? null;
        if (!tex) {
          tex = nahrajTexturuBaliku(c.textura, zz.aniso);
          podleZdroje.set(c.textura, tex);
        }
      }
      const b = c.barva ?? [0.8, 0.78, 0.72];
      return {
        ...vaoSite(c.sit),
        tex,
        material: c.material === "provazek" ? 1 : c.material === "visacka" ? 2 : 0,
        barva: [lin(b[0]), lin(b[1]), lin(b[2]), tex ? 1 : 0],
      };
    });
    gl.bindTexture(gl.TEXTURE_2D, null);
    return { casti, textury: [...podleZdroje.values()] };
  };
  const smazBalik = (b: BalikGL) => {
    b.casti.forEach(smazVao);
    b.textury.forEach((t) => gl.deleteTexture(t));
  };

  /** Barvy vzoru do programů látky, lemu a uzlu; balíky dostanou odraz látky zespodu */
  const barvyVzoru = (zz: Zdroje, v: VzorSatku) => {
    for (const pr of [zz.pr.latka, zz.pr.lem, zz.pr.uzel]) {
      gl.useProgram(pr.p);
      gl.uniform3fv(pr.u("u_cLatka"), hexLin(v.barva.latka));
      gl.uniform3fv(pr.u("u_cKresba"), hexLin(v.barva.kresba));
      gl.uniform3fv(pr.u("u_cRub"), hexLin(v.barva.rub));
      gl.uniform3fv(pr.u("u_cLem"), hexLin(v.barva.lem));
    }
    /* Rub nahoře (s kouskem kresby) pod lampou, napůl smíchaný s odrazem pultu */
    const rub = hexLin(v.barva.rub);
    const kresba = hexLin(v.barva.kresba);
    const lampa = hexLin(LAMPA_BARVA);
    const odraz = rub.map((c, i) => (c * 0.75 + kresba[i] * 0.25) * lampa[i] * LAMPA_SILA * ODRAZ_LATKY * 0.6 + ZEM[i] * 0.4);
    gl.useProgram(zz.pr.balik.p);
    gl.uniform3fv(zz.pr.balik.u("u_odraz"), odraz);
  };
  const vyrobVzor = (zz: Zdroje) => {
    if (!vzor) return;
    zz.vyroba.vzor(zz.vzor, vzor.d, vzor.v, STRANA, VZOR_PX);
    barvyVzoru(zz, vzor.v);
  };

  /** Šířka látky, pro kterou má síť uzlu spočítané uv (vzor na uzlu je pak stejně velký jako na šátku) */
  let uzelSirka = SIRKA_JADRA;
  const postav = (): Zdroje => {
    const programy = {} as Record<keyof ZdrojeProgramu, Program>;
    for (const [jmeno, zdroj] of Object.entries(zdrojeShaderu) as [keyof ZdrojeProgramu, ZdrojProgramu][]) programy[jmeno] = sestav(zdroj);
    const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
    const ubo = jiste(gl.createBuffer(), "buffer");
    gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
    gl.bufferData(gl.UNIFORM_BUFFER, svet.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);

    /* Body látky: RGBA32F, čte se texelFetch ve vertex shaderu */
    const body = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, N, N, 0, gl.RGBA, gl.FLOAT, null);

    const sl = sitLatky(N);
    const latka = vao([{ data: sl.st, velikosti: [2] }], sl.idx);
    const sm = sitLemu(N);
    const lem = vao([{ data: sm.data, velikosti: [2, 2, 2] }], sm.idx);
    const pult = vao([{ data: rohyPultu, velikosti: [2] }], new Uint16Array([0, 1, 2, 0, 2, 3]));
    let uzel: Vao | null = null;
    try {
      uzel = vaoSite(sitUzlu(uzelSirka));
    } catch (e) {
      console.warn("[šátek] síť uzlu chybí", e);
    }

    /* Vzor do příchodu dlaždice: podklad bez kresby */
    const vzorTex = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 128, 255]));
    const krep = jiste(gl.createTexture(), "textura");
    const prazdna = textura();
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([230, 226, 214, 255]));

    const stin = hloubkovaMapa(MAPA_STINU);
    const vyska = hloubkovaMapa(MAPA_VYSKY);
    /* Mapy se čtou dvojím způsobem: s porovnáním (měkké PCF z karty) a syrová hloubka */
    const sPorovnej = jiste(gl.createSampler(), "sampler");
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
    gl.samplerParameteri(sPorovnej, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
    const sCti = jiste(gl.createSampler(), "sampler");
    gl.samplerParameteri(sCti, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.samplerParameteri(sCti, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.samplerParameteri(sCti, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.samplerParameteri(sCti, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    const vyroba = new VyrobaLatky(gl);
    vyroba.krep(krep, KREP_PX);

    const zz: Zdroje = {
      pr: programy,
      ubo,
      body,
      latka,
      lem,
      pult,
      uzel,
      vzor: vzorTex,
      krep,
      prazdna,
      stin: stin.t,
      stinFbo: stin.f,
      vyska: vyska.t,
      vyskaFbo: vyska.f,
      sPorovnej,
      sCti,
      vyroba,
      baliky: new Map(),
      aniso,
    };
    barvyVzoru(zz, vzory[0]);
    if (vzor) vyrobVzor(zz);
    for (const [id, d] of balikyData) zz.baliky.set(id, vyrobBalik(zz, d));
    gl.bindTexture(gl.TEXTURE_2D, null);
    return zz;
  };

  const zbourej = (zz: Zdroje) => {
    Object.values(zz.pr).forEach((p) => gl.deleteProgram(p.p));
    gl.deleteBuffer(zz.ubo);
    [zz.body, zz.vzor, zz.krep, zz.prazdna, zz.stin, zz.vyska].forEach((t) => gl.deleteTexture(t));
    gl.deleteFramebuffer(zz.stinFbo);
    gl.deleteFramebuffer(zz.vyskaFbo);
    gl.deleteSampler(zz.sPorovnej);
    gl.deleteSampler(zz.sCti);
    [zz.latka, zz.lem, zz.pult].forEach(smazVao);
    if (zz.uzel) smazVao(zz.uzel);
    zz.baliky.forEach(smazBalik);
    zz.vyroba.zrus();
  };

  /* ——— Modely balíků a uzlu ——— */
  const modelBaliku = (p: Poloha, k: number): M4 => {
    const s = p.meritko * k;
    const c = Math.cos(p.otoceni) * s;
    const si = Math.sin(p.otoceni) * s;
    return new Float32Array([c, si, 0, 0, -si, c, 0, 0, 0, 0, s, 0, p.x, p.y, p.z, 1]);
  };
  const modelUzlu = (u: StavUzlu): M4 => {
    const s = u.velikost * Math.min(1, u.mira);
    const X = norm(u.osaX);
    const Z = norm(sub(u.osaZ, X.map((x) => x * dot(X, u.osaZ)) as V3));
    const Y = cross(Z, X);
    return new Float32Array([X[0] * s, X[1] * s, X[2] * s, 0, Y[0] * s, Y[1] * s, Y[2] * s, 0, Z[0] * s, Z[1] * s, Z[2] * s, 0, u.stred[0], u.stred[1], u.stred[2], 1]);
  };

  /* ——— Snímek ——— */
  const kresli = (s: Snimek) => {
    posledni = s;
    const zz = z;
    if (!zz || zniceno || gl.isContextLost() || cssW < 1) return;

    /* Body látky do textury */
    const p = s.latka;
    const pocet = Math.min(N * N, Math.floor(p.length / 3));
    for (let k = 0; k < pocet; k++) {
      body4[k * 4] = p[k * 3];
      body4[k * 4 + 1] = p[k * 3 + 1];
      body4[k * 4 + 2] = p[k * 3 + 2];
    }
    gl.activeTexture(gl.TEXTURE0 + JEDNOTKA.u_body);
    gl.bindTexture(gl.TEXTURE_2D, zz.body);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, N, N, gl.RGBA, gl.FLOAT, body4);

    /* Co se kreslí: viditelné balíky (mizí zmenšením) a uzel, je-li uvázaný */
    const baliky: { b: BalikGL; model: M4; zvyrazni: number }[] = [];
    for (const st of s.baliky) {
      const b = zz.baliky.get(st.id);
      if (!b || st.viditelnost < 0.02) continue;
      const k = 1 - (1 - Math.min(1, st.viditelnost)) ** 3;
      baliky.push({ b, model: modelBaliku(st.poloha, k), zvyrazni: s.zvyrazneny === st.id ? 1 : 0 });
    }
    /* Choreografie uvázala jinak velký uzel: síť s uv pro jeho šířku se postaví znovu (jednou za uvázání) */
    if (s.uzel && s.uzel.mira >= 0.01 && Math.abs(s.uzel.velikost - uzelSirka) > 0.004) {
      try {
        const nova = vaoSite(sitUzlu(s.uzel.velikost));
        if (zz.uzel) smazVao(zz.uzel);
        zz.uzel = nova;
        uzelSirka = s.uzel.velikost;
      } catch (e) {
        console.warn("[šátek] síť uzlu se nepodařilo postavit", e);
      }
    }
    const uzel = s.uzel && s.uzel.mira >= 0.01 && zz.uzel ? modelUzlu(s.uzel) : null;
    const telesa = new Float32Array((baliky.length + (uzel ? 1 : 0)) * 16);
    baliky.forEach((b, i) => telesa.set(b.model, i * 16));
    if (uzel) telesa.set(uzel, baliky.length * 16);
    let stejne = mapyPlati && telesa.length === minuleTelesa.length && pocet * 3 <= minuleBody.length;
    for (let k = 0; stejne && k < pocet * 3; k++) stejne = p[k] === minuleBody[k];
    for (let k = 0; stejne && k < telesa.length; k++) stejne = telesa[k] === minuleTelesa[k];

    naplnSvet();
    gl.bindBuffer(gl.UNIFORM_BUFFER, zz.ubo);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, svet);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, zz.ubo);

    /* Mapy se v průchodech hloubky nesmí číst — odvázat, ať nevznikne smyčka */
    for (const j of [JEDNOTKA.u_stinMapa, JEDNOTKA.u_stinHloubka, JEDNOTKA.u_vyskaMapa]) {
      gl.activeTexture(gl.TEXTURE0 + j);
      gl.bindTexture(gl.TEXTURE_2D, null);
    }
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);
    gl.depthMask(true);

    const hloubka = (vpPruchodu: M4) => {
      const pl = zz.pr.latkaH;
      gl.useProgram(pl.p);
      gl.uniformMatrix4fv(pl.u("u_pruchodVP"), false, vpPruchodu);
      gl.bindVertexArray(zz.latka.vao);
      gl.drawElements(gl.TRIANGLES, zz.latka.pocet, zz.latka.typ, 0);
      const pe = zz.pr.lemH;
      gl.useProgram(pe.p);
      gl.uniformMatrix4fv(pe.u("u_pruchodVP"), false, vpPruchodu);
      gl.bindVertexArray(zz.lem.vao);
      gl.drawElements(gl.TRIANGLES, zz.lem.pocet, zz.lem.typ, 0);
      const ps = zz.pr.sitH;
      gl.useProgram(ps.p);
      gl.uniformMatrix4fv(ps.u("u_pruchodVP"), false, vpPruchodu);
      if (uzel && zz.uzel) {
        gl.uniformMatrix4fv(ps.u("u_model"), false, uzel);
        gl.bindVertexArray(zz.uzel.vao);
        gl.drawElements(gl.TRIANGLES, zz.uzel.pocet, zz.uzel.typ, 0);
      }
      for (const b of baliky) {
        gl.uniformMatrix4fv(ps.u("u_model"), false, b.model);
        for (const c of b.b.casti) {
          gl.bindVertexArray(c.vao);
          gl.drawElements(gl.TRIANGLES, c.pocet, c.typ, 0);
        }
      }
    };

    if (!stejne) {
      /* 1. Mapa stínů od lampy */
      gl.bindFramebuffer(gl.FRAMEBUFFER, zz.stinFbo);
      gl.viewport(0, 0, MAPA_STINU, MAPA_STINU);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(1.2, 2.0);
      hloubka(svetloVP);
      gl.disable(gl.POLYGON_OFFSET_FILL);

      /* 2. Výšková mapa shora */
      gl.bindFramebuffer(gl.FRAMEBUFFER, zz.vyskaFbo);
      gl.viewport(0, 0, MAPA_VYSKY, MAPA_VYSKY);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      hloubka(vyskaVP);
      minuleBody.set(p.subarray(0, pocet * 3));
      minuleTelesa = telesa;
      mapyPlati = true;
    }

    /* 3. Obraz */
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, platno.width, platno.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const vaz = (j: number, t: WebGLTexture | null, vzorkovac: WebGLSampler | null = null) => {
      gl.activeTexture(gl.TEXTURE0 + j);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.bindSampler(j, vzorkovac);
    };
    vaz(JEDNOTKA.u_vzor, zz.vzor);
    vaz(JEDNOTKA.u_krep, zz.krep);
    vaz(JEDNOTKA.u_stinMapa, zz.stin, zz.sPorovnej);
    vaz(JEDNOTKA.u_stinHloubka, zz.stin, zz.sCti);
    vaz(JEDNOTKA.u_vyskaMapa, zz.vyska, zz.sPorovnej);

    /* Nejdřív jen hloubka látky; pak balíky, uzel a lem; drahá látka nakonec jen tam, kde je vidět */
    gl.colorMask(false, false, false, false);
    gl.useProgram(zz.pr.latkaZ.p);
    gl.bindVertexArray(zz.latka.vao);
    gl.drawElements(gl.TRIANGLES, zz.latka.pocet, zz.latka.typ, 0);
    gl.colorMask(true, true, true, true);
    gl.useProgram(zz.pr.lem.p);
    gl.bindVertexArray(zz.lem.vao);
    gl.drawElements(gl.TRIANGLES, zz.lem.pocet, zz.lem.typ, 0);
    if (uzel && zz.uzel) {
      const pu = zz.pr.uzel;
      gl.useProgram(pu.p);
      gl.uniformMatrix4fv(pu.u("u_model"), false, uzel);
      gl.bindVertexArray(zz.uzel.vao);
      gl.drawElements(gl.TRIANGLES, zz.uzel.pocet, zz.uzel.typ, 0);
    }
    if (baliky.length) {
      const pb = zz.pr.balik;
      gl.useProgram(pb.p);
      for (const b of baliky) {
        gl.uniformMatrix4fv(pb.u("u_model"), false, b.model);
        gl.uniform1f(pb.u("u_zvyrazni"), b.zvyrazni);
        for (const c of b.b.casti) {
          vaz(JEDNOTKA.u_tex, c.tex ?? zz.prazdna);
          gl.uniform1i(pb.u("u_material"), c.material);
          gl.uniform4fv(pb.u("u_barva"), c.barva);
          gl.bindVertexArray(c.vao);
          gl.drawElements(gl.TRIANGLES, c.pocet, c.typ, 0);
        }
      }
    }

    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.useProgram(zz.pr.latka.p);
    gl.bindVertexArray(zz.latka.vao);
    gl.drawElements(gl.TRIANGLES, zz.latka.pocet, zz.latka.typ, 0);
    gl.depthFunc(gl.LESS);

    /* Pult naposled: jen tma, a jen kde před ním nic není */
    if (pocet > 0) {
      obalPultu(p, pocet, s);
      gl.bindBuffer(gl.ARRAY_BUFFER, zz.pult.buf[0]);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, rohyPultu);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(zz.pr.pult.p);
    gl.bindVertexArray(zz.pult.vao);
    gl.drawElements(gl.TRIANGLES, zz.pult.pocet, zz.pult.typ, 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  };

  /* ——— Ztráta kontextu: přečkat a postavit znovu ——— */
  const ztraceno = (e: Event) => {
    e.preventDefault();
    z = null;
  };
  const obnoveno = () => {
    if (zniceno) return;
    try {
      z = postav();
      mapyPlati = false;
      if (posledni) kresli(posledni);
    } catch (e) {
      console.warn("[šátek] po obnovení WebGL se kreslení nepostavilo", e);
      z = null;
    }
  };

  const zmer = () => {
    const r = platno.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return;
    cssW = r.width;
    cssH = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (platno.width !== w || platno.height !== h) {
      platno.width = w;
      platno.height = h;
    }
    /* Svislé FOV platí pro čtverec; na úzkém plátně se drží vodorovné, ať šátek nepřeteče */
    const aspekt = cssW / cssH;
    tY = Math.tan(FOV / 2) / Math.min(1, aspekt);
    tX = tY * aspekt;
    vp = nasob(perspektiva(2 * Math.atan(tY), aspekt, BLIZKO, DALEKO), pohledKamery);
    if (posledni) kresli(posledni);
  };

  try {
    z = postav();
  } catch (e) {
    console.warn("[šátek] WebGL2 kreslení se nepostavilo", e);
    try {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    } catch {
      /* nic */
    }
    return null;
  }
  platno.addEventListener("webglcontextlost", ztraceno);
  platno.addEventListener("webglcontextrestored", obnoveno);
  zmer();

  return {
    zmer,
    async nastavVzor(v) {
      const poradi = ++poradiVzoru;
      const d = await dlazdiceVzoru(v);
      if (poradi !== poradiVzoru || zniceno) return;
      vzor = { v, d };
      if (z && !gl.isContextLost()) {
        vyrobVzor(z);
        if (posledni) kresli(posledni);
      }
    },
    nastavBalik(data) {
      balikyData.set(data.id, data);
      mapyPlati = false;
      if (!z || gl.isContextLost()) return;
      const stary = z.baliky.get(data.id);
      if (stary) smazBalik(stary);
      z.baliky.set(data.id, vyrobBalik(z, data));
    },
    odeberBalik(id) {
      balikyData.delete(id);
      mapyPlati = false;
      const b = z?.baliky.get(id);
      if (b && z) {
        if (!gl.isContextLost()) smazBalik(b);
        z.baliky.delete(id);
      }
    },
    kresli,
    promitni(x, y, zz) {
      const m = vp;
      const X = m[0] * x + m[4] * y + m[8] * zz + m[12];
      const Y = m[1] * x + m[5] * y + m[9] * zz + m[13];
      const W = m[3] * x + m[7] * y + m[11] * zz + m[15];
      return [(X / W + 1) * 0.5 * cssW, (1 - Y / W) * 0.5 * cssH, (W - BLIZKO) / (DALEKO - BLIZKO)];
    },
    paprsek(sx, sy) {
      const nx = (sx / (cssW || 1)) * 2 - 1;
      const ny = 1 - (sy / (cssH || 1)) * 2;
      const d = norm([
        vpred[0] + vpravo[0] * nx * tX + vzhuru[0] * ny * tY,
        vpred[1] + vpravo[1] * nx * tX + vzhuru[1] * ny * tY,
        vpred[2] + vpravo[2] * nx * tX + vzhuru[2] * ny * tY,
      ]);
      return { o: [kamera[0], kamera[1], kamera[2]], d };
    },
    zrus() {
      if (zniceno) return;
      zniceno = true;
      platno.removeEventListener("webglcontextlost", ztraceno);
      platno.removeEventListener("webglcontextrestored", obnoveno);
      if (z && !gl.isContextLost()) zbourej(z);
      z = null;
      balikyData.clear();
      posledni = null;
    },
  };
}
