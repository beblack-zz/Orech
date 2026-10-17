/**
 * Textury látky pro kresleni.ts: vzor šátku jako barvená látka a krep chirimen.
 *
 * Vzor: jedna dlaždice z data/furoshiki.ts (SVG) se vykreslí do malého plátna
 * a grafická karta z ní složí celou látku 0,7 × 0,7 m — natočenou o −45°
 * (na šátku postaveném na cíp leží vzor vodorovně, jako na kresbě bez WebGL)
 * a ve skutečném měřítku. Barvy se tu nemíchají: do textury jde jen kolik je
 * kde kresby (r líc, g rub — rub je víc rozpitý) a hustota barviva (b), barví
 * až shader látky. Proto je jedna textura na obě strany a mipmapy filtrují
 * správně (míchání dvou barev je v masce lineární).
 *
 * Barvené, ne tištěné: hrany kresby se trochu rozpijí a nejsou úplně rovné,
 * barvivo není všude stejně husté (mapy po lázni, proužky podél nití).
 *
 * Krep: mapa normál zvrásnění shibo (oblé hrbolky 3–4 mm, napříč útkem trochu
 * protažené), opakuje se po 6 cm. Ukládá se jen sklon (xy), takže se z dálky
 * mipmapami sám uhladí.
 */
import { dlazdice } from "../../../data/furoshiki";
import type { VzorSatku } from "../../../data/furoshiki";

/** Milimetrů na jednotku dlaždice: vlna seigaiha 7,5 cm, sloupec jagasuri 3,5 cm, ostatní podobně */
const MM_NA_JEDNOTKU: Record<VzorSatku["id"], number> = {
  seigaiha: 1.875,
  yagasuri: 2.19,
  asanoha: 1.15,
  shippo: 1.3,
  kikko: 1.25,
};
/** Jemnost plátna dlaždice v mm na pixel (dvakrát jemnější než výsledná textura) */
const MM_NA_PX = 0.15;
/** Opakování krepu v metrech — kresleni.ts s ním počítá taky (KREP_OPAKOVANI v shaderu) */
export const KREP_M = 0.06;

export interface Dlazdice {
  platno: HTMLCanvasElement;
  /** Rozměr dlaždice v metrech */
  w: number;
  h: number;
}

const hotove = new Map<string, Promise<Dlazdice>>();

/** Dlaždice vzoru jako plátno (pro každý vzor jen jednou) */
export function dlazdiceVzoru(v: VzorSatku): Promise<Dlazdice> {
  const klic = `${v.id}|${v.barva.latka}|${v.barva.kresba}`;
  let d = hotove.get(klic);
  if (!d) {
    d = new Promise<Dlazdice>((hotovo, chyba) => {
      const mm = MM_NA_JEDNOTKU[v.id] ?? 1.5;
      const pxNaJednotku = mm / MM_NA_PX;
      /* Plátno na celé pixely; obrázek se do něj natáhne přesně, ať dlaždice navazuje */
      const w = Math.min(1024, Math.max(8, Math.round(v.w * pxNaJednotku)));
      const h = Math.min(1024, Math.max(8, Math.round(v.h * pxNaJednotku)));
      const obr = new Image();
      obr.onload = () => {
        const platno = document.createElement("canvas");
        platno.width = w;
        platno.height = h;
        const g = platno.getContext("2d");
        if (!g) return chyba(new Error("2d"));
        g.drawImage(obr, 0, 0, w, h);
        hotovo({ platno, w: (v.w * mm) / 1000, h: (v.h * mm) / 1000 });
      };
      obr.onerror = () => chyba(new Error(`dlaždice ${v.id}`));
      obr.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(dlazdice(v, pxNaJednotku))}`;
    });
    d.catch(() => hotove.delete(klic));
    hotove.set(klic, d);
  }
  return d;
}

/* ═══ Výroba na grafické kartě ═══ */

const VS = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const SUM = `
float hash(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float sum(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * sum(p);
    p = p * 2.03 + vec2(17.1, 9.7);
    a *= 0.5;
  }
  return s / 0.97;
}
`;

const VZOR_FS = `#version 300 es
precision highp float;
uniform sampler2D u_dlazdice;
uniform vec2 u_dlazdiceM;
uniform vec3 u_latka;
uniform vec3 u_kresba;
uniform float u_strana;
uniform float u_rozmer;
out vec4 o;
${SUM}
/** Kolik je v bodě q (metry látky, osy jako plátno) kresby: barva dlaždice promítnutá mezi podklad a kresbu */
float maska(vec2 q) {
  vec2 c = q - 0.5 * u_strana;
  vec2 p = vec2(c.x - c.y, c.x + c.y) * 0.70710678;
  vec3 t = texture(u_dlazdice, p / u_dlazdiceM).rgb;
  vec3 d = u_kresba - u_latka;
  float dd = dot(d, d);
  return dd < 1e-6 ? 0.0 : clamp(dot(t - u_latka, d) / dd, 0.0, 1.0);
}
/** Rozpití: kruhové rozmazání s poloměrem r */
float rozpite(vec2 q, float r) {
  float s = maska(q) * 1.5, w = 1.5;
  for (int i = 0; i < 12; i++) {
    float t = (float(i) + 0.5) / 12.0;
    float a = float(i) * 2.39996323;
    vec2 o = vec2(cos(a), sin(a)) * (r * sqrt(t));
    float wi = 1.0 - 0.6 * t;
    s += maska(q + o) * wi;
    w += wi;
  }
  return s / w;
}
void main() {
  vec2 q = gl_FragCoord.xy / u_rozmer * u_strana;
  /* Kresba z šablony neleží úplně rovně: hrany se o desetiny milimetru vlní */
  vec2 vlneni = vec2(sum(q * 95.0), sum(q * 95.0 + 31.7)) - 0.5;
  vec2 qv = q + vlneni * 0.0007;
  float r = 0.00045 * (0.55 + 0.9 * sum(q * 60.0 + 5.3));
  float lic = rozpite(qv, r);
  /* Kde byla rezerva tenčí, prosákla trochu barvy i do kresby */
  lic *= 0.9 + 0.1 * smoothstep(0.25, 0.75, fbm(q * 40.0 + 3.1));
  float rub = rozpite(qv, r * 3.2) * 0.86;
  /* Hustota barviva: mapy po lázni, menší skvrny a proužky podél osnovy a útku */
  float h = 0.5;
  h += 0.42 * (fbm(q * 4.0) - 0.5);
  h += 0.3 * (fbm(q * 16.0 + 11.0) - 0.5);
  h += 0.16 * (fbm(q * 55.0 + 2.0) - 0.5);
  h += 0.11 * (sum(vec2(q.x * 380.0, 0.37)) - 0.5) + 0.08 * (sum(vec2(q.x * 90.0, 7.1)) - 0.5);
  h += 0.08 * (sum(vec2(4.2, q.y * 310.0)) - 0.5);
  o = vec4(lic, rub, clamp(h, 0.0, 1.0), 1.0);
}`;

const KREP_FS = `#version 300 es
precision highp float;
uniform float u_rozmer;
uniform vec2 u_bunky;
out vec4 o;
vec2 hash2(vec2 p) {
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.xx + q.yz) * q.zy);
}
/** Vzdálenost k nejbližšímu středu buňky (Worley), periodicky na dlaždici */
float bunky(vec2 x, vec2 perioda) {
  vec2 i = floor(x), f = fract(x);
  float F1 = 9.0;
  for (int b = -1; b <= 1; b++)
    for (int a = -1; a <= 1; a++) {
      vec2 g = vec2(float(a), float(b));
      vec2 h = hash2(mod(i + g, perioda) + perioda * 7.0);
      vec2 r = g + 0.12 + 0.76 * h - f;
      F1 = min(F1, dot(r, r));
    }
  return sqrt(F1);
}
float vyska(vec2 uv) {
  float h = 0.68 * (1.0 - smoothstep(0.05, 0.78, bunky(uv * u_bunky, u_bunky)));
  h += 0.32 * (1.0 - smoothstep(0.0, 0.8, bunky(uv * u_bunky * 2.0 + 0.37, u_bunky * 2.0)));
  return h;
}
void main() {
  vec2 uv = gl_FragCoord.xy / u_rozmer;
  float e = 1.0 / u_rozmer;
  vec2 g = vec2(vyska(uv + vec2(e, 0.0)) - vyska(uv - vec2(e, 0.0)), vyska(uv + vec2(0.0, e)) - vyska(uv - vec2(0.0, e))) / (2.0 * e);
  /* Hrbolky vysoké asi 0,45 mm na dlaždici ${KREP_M} m: sklon = dh/duv · výška / dlaždice;
     uložený čtyřikrát zvětšený, ať se 8 bitů využije (shader látky dělí čtyřmi) */
  vec2 sklon = g * (0.00045 / ${KREP_M.toFixed(3)});
  o = vec4(clamp(-sklon * 2.0 + 0.5, 0.0, 1.0), vyska(uv), 1.0);
}`;

/** Zdroj od WebGL, nebo chyba — null vrací jen ztracený kontext */
function jiste<T>(x: T | null, co: string): T {
  if (x === null) throw new Error(`WebGL: ${co}`);
  return x;
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string): WebGLProgram {
  const p = jiste(gl.createProgram(), "program");
  for (const [typ, zdroj] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const s = jiste(gl.createShader(typ), "shader");
    gl.shaderSource(s, zdroj);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
    gl.attachShader(p, s);
    gl.deleteShader(s);
  }
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error(gl.getProgramInfoLog(p) ?? "program");
  return p;
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];

/** Textury látky na grafické kartě; po ztrátě kontextu se udělá znovu */
export class VyrobaLatky {
  private gl: WebGL2RenderingContext;
  private pVzor: WebGLProgram;
  private pKrep: WebGLProgram;
  private fbo: WebGLFramebuffer;
  private vao: WebGLVertexArrayObject;
  private aniso: EXT_texture_filter_anisotropic | null;

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
    this.pVzor = program(gl, VS, VZOR_FS);
    this.pKrep = program(gl, VS, KREP_FS);
    this.fbo = jiste(gl.createFramebuffer(), "framebuffer");
    this.vao = jiste(gl.createVertexArray(), "vao");
    this.aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  }

  /** Nakreslí celý čtverec cílové textury jedním trojúhelníkem a dodělá mipmapy (cíl na jednotce 7, ať nepřebije zdroj na 0) */
  private kresliDo(cil: WebGLTexture, rozmer: number, p: WebGLProgram, opakovat: boolean) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE7);
    gl.bindTexture(gl.TEXTURE_2D, cil);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, rozmer, rozmer, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, cil, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.viewport(0, 0, rozmer, rozmer);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.disable(gl.CULL_FACE);
    gl.useProgram(p);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, null, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_2D, cil);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const obal = opakovat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, obal);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, obal);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    gl.bindTexture(gl.TEXTURE_2D, null);
  }

  /** Vzor látky z dlaždice do textury cil (rozmer × rozmer) */
  vzor(cil: WebGLTexture, d: Dlazdice, v: VzorSatku, strana: number, rozmer: number) {
    const gl = this.gl;
    const tex = jiste(gl.createTexture(), "textura");
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, d.platno);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.BROWSER_DEFAULT_WEBGL);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    const p = this.pVzor;
    gl.useProgram(p);
    const u = (j: string) => gl.getUniformLocation(p, j);
    gl.uniform1i(u("u_dlazdice"), 0);
    gl.uniform2f(u("u_dlazdiceM"), d.w, d.h);
    gl.uniform3f(u("u_latka"), ...hex(v.barva.latka));
    gl.uniform3f(u("u_kresba"), ...hex(v.barva.kresba));
    gl.uniform1f(u("u_strana"), strana);
    gl.uniform1f(u("u_rozmer"), rozmer);
    this.kresliDo(cil, rozmer, p, false);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.deleteTexture(tex);
  }

  /** Krep chirimen do textury cil (opakuje se, rozmer × rozmer na KREP_M) */
  krep(cil: WebGLTexture, rozmer: number) {
    const gl = this.gl;
    const p = this.pKrep;
    gl.useProgram(p);
    gl.uniform1f(gl.getUniformLocation(p, "u_rozmer"), rozmer);
    /* Buňky asi 3,5 × 5 mm: napříč útkem protažené */
    gl.uniform2f(gl.getUniformLocation(p, "u_bunky"), 17, 12);
    this.kresliDo(cil, rozmer, p, true);
  }

  zrus() {
    const gl = this.gl;
    gl.deleteProgram(this.pVzor);
    gl.deleteProgram(this.pKrep);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteVertexArray(this.vao);
  }
}
