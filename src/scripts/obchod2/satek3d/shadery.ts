/**
 * Shadery pro kresleni.ts (GLSL ES 3.00). Skládají se z kousků: hlavička
 * s blokem Svet (kamera, lampa a mapy — totéž pro všechny programy), plocha
 * látky (Catmull-Rom z textury bodů), světlo (stín lampy, tma v záhybech,
 * tónování) a materiály: látka, lem, uzel, balíky a pult.
 *
 * Všechno se počítá v lineárním světle a na konci převede do sRGB. Přesnost
 * je ve vertex i fragment shaderu highp — blok Svet sdílejí oba stupně
 * a sdílené uniformy musí mít v obou stejnou přesnost, jinak se program
 * nikde nesestaví.
 */

export interface NastaveniShaderu {
  /** Strana šátku v metrech (typy.ts STRANA) */
  strana: number;
  /** Vzorků při hledání toho, co stíní, a při měkčení stínu */
  stinHledani: number;
  stinMekceni: number;
  /** Vzorků výškové mapy na tmu v záhybech */
  tmaVzorku: number;
}

/** Bloky dat v pořadí std140 — kresleni.ts plní stejné pořadí (samé vec4 a mat4, bez děr) */
const SVET = `
layout(std140) uniform Svet {
  mat4 u_vp;          // kamera
  mat4 u_svetloVP;    // lampa (mapa stínů)
  vec4 u_kamera;      // xyz poloha kamery
  vec4 u_lampa;       // xyz poloha lampy, w síla
  vec4 u_lampaSmer;   // xyz osa kužele, w cos vnějšího okraje
  vec4 u_lampaBarva;  // rgb lineárně, w cos vnitřního okraje
  vec4 u_stin;        // x texel na metr od lampy, y velikost lampy (k), z blízko, w daleko
  vec4 u_stin2;       // x 1 / rozměr mapy stínů
  vec4 u_vyska;       // xy roh výškové mapy, z 1 / strana mapy, w texel v metrech
  vec4 u_vyskaZ;      // x výška stropu mapy, y rozsah výšek
  vec4 u_nebe;        // rgb okolní světlo noci shora
  vec4 u_zem;         // rgb odraz pultu zdola
  vec4 u_ton;         // x expozice, y koleno, z síla tmy na pultu, w nejvíc tmy
  vec4 u_vyvazeni;    // rgb vyvážení bílé
};
`;

const PRESNOST = `
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp sampler2DShadow;
`;

/** Zaoblený kraj šátku v souřadnicích látky — záporné uvnitř */
const KRAJ = `
const float ROH = 0.006 / STRANA;
float sdKraje(vec2 uv) {
  vec2 q = abs(uv - 0.5) - (0.5 - ROH);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - ROH;
}
`;

/* ═══ Vertex shadery ═══ */

/**
 * Plocha látky: bod (s, t) v jednotkách mřížky (0 … N−1) z 4 × 4 sousedních
 * bodů. Za okrajem se body prodlouží přímkou, ať plocha končí rovně. Pod pult
 * plocha nesmí — Catmull-Rom by mezi body ležícími na pultu a strmým kusem
 * podstřelil — proto hladké minimum PODLAHA.
 */
const PLOCHA = `
uniform sampler2D u_body;
uniform int u_n;
const float PODLAHA = 0.0005;
const float PODLAHA_K = 0.0016;

vec4 crVahy(float t) {
  float t2 = t * t, t3 = t2 * t;
  return 0.5 * vec4(-t3 + 2.0 * t2 - t, 3.0 * t3 - 5.0 * t2 + 2.0, -3.0 * t3 + 4.0 * t2 + t, t3 - t2);
}
vec4 crDerivace(float t) {
  float t2 = t * t;
  return 0.5 * vec4(-3.0 * t2 + 4.0 * t - 1.0, 9.0 * t2 - 10.0 * t, -9.0 * t2 + 8.0 * t + 1.0, 3.0 * t2 - 2.0 * t);
}

void plocha(vec2 st, out vec3 P, out vec3 Pu, out vec3 Pv) {
  int m = u_n - 1;
  vec2 c = clamp(floor(st), vec2(0.0), vec2(float(m - 1)));
  vec2 f = st - c;
  ivec2 i0 = ivec2(c);
  vec3 B[16];
  for (int b = 0; b < 4; b++)
    for (int a = 0; a < 4; a++)
      B[b * 4 + a] = texelFetch(u_body, clamp(i0 + ivec2(a - 1, b - 1), ivec2(0), ivec2(m)), 0).xyz;
  /* Za okrajem prodloužit přímkou (nejdřív sloupce, pak řádky — v rohu tak vyjde obojí) */
  if (i0.x == 0) for (int b = 0; b < 4; b++) B[b * 4] = 2.0 * B[b * 4 + 1] - B[b * 4 + 2];
  if (i0.x == m - 1) for (int b = 0; b < 4; b++) B[b * 4 + 3] = 2.0 * B[b * 4 + 2] - B[b * 4 + 1];
  if (i0.y == 0) for (int a = 0; a < 4; a++) B[a] = 2.0 * B[4 + a] - B[8 + a];
  if (i0.y == m - 1) for (int a = 0; a < 4; a++) B[12 + a] = 2.0 * B[8 + a] - B[4 + a];
  vec4 wu = crVahy(f.x), wv = crVahy(f.y), du = crDerivace(f.x), dv = crDerivace(f.y);
  P = vec3(0.0);
  Pu = vec3(0.0);
  Pv = vec3(0.0);
  for (int b = 0; b < 4; b++) {
    vec3 r = wu.x * B[b * 4] + wu.y * B[b * 4 + 1] + wu.z * B[b * 4 + 2] + wu.w * B[b * 4 + 3];
    vec3 rd = du.x * B[b * 4] + du.y * B[b * 4 + 1] + du.z * B[b * 4 + 2] + du.w * B[b * 4 + 3];
    P += wv[b] * r;
    Pu += wv[b] * rd;
    Pv += dv[b] * r;
  }
  /* Hladké max(z, PODLAHA): nad pásmem beze změny, v něm měkký přechod */
  float h = max(PODLAHA_K - abs(P.z - PODLAHA), 0.0) / PODLAHA_K;
  float s = P.z > PODLAHA ? 1.0 - 0.5 * h : 0.5 * h;
  P.z = max(P.z, PODLAHA) + h * h * PODLAHA_K * 0.25;
  Pu.z *= s;
  Pv.z *= s;
}
`;

const MATICE_PRUCHODU = `
#ifdef HLOUBKA
uniform mat4 u_pruchodVP;
#define VP u_pruchodVP
#else
#define VP u_vp
#endif
`;

const LATKA_VS = `
/* Předprůchod hloubky a obraz počítají polohu stejně — hloubky se musí přesně shodovat */
invariant gl_Position;
layout(location = 0) in vec2 a_st;
out vec3 v_p;
out vec3 v_n;
out vec3 v_t;
out vec2 v_uv;
void main() {
  vec3 P, Pu, Pv;
  plocha(a_st, P, Pu, Pv);
  v_p = P;
  /* Pu × Pv míří na stranu líce (na rozprostřeném šátku dolů) */
  v_n = cross(Pu, Pv);
  v_t = Pu;
  v_uv = a_st / float(u_n - 1);
  gl_Position = VP * vec4(P, 1.0);
}
`;

/**
 * Lem: trubka eliptického průřezu po obvodu, spočítaná z téže plochy. Vnější
 * okraj trubky je přesně kraj látky, střed o LEM_SIRKA dovnitř.
 */
const LEM_VS = `
layout(location = 0) in vec2 a_e;
layout(location = 1) in vec2 a_o;
layout(location = 2) in vec2 a_k;
out vec3 v_p;
out vec3 v_n;
out vec2 v_uv;
const float LEM_SIRKA = 0.0024;
const float LEM_TLOUSTKA = 0.00125;
void main() {
  vec3 P, Pu, Pv;
  plocha(a_e * float(u_n - 1), P, Pu, Pv);
  vec3 N = normalize(cross(Pu, Pv));
  vec3 B = Pu * a_o.x + Pv * a_o.y;
  B = normalize(B - N * dot(N, B));
  vec3 p = P + B * (LEM_SIRKA * (a_k.x - 1.0)) + N * (LEM_TLOUSTKA * a_k.y);
  p.z = max(p.z, 0.0002);
  v_p = p;
  v_n = B * (a_k.x / LEM_SIRKA) + N * (a_k.y / LEM_TLOUSTKA);
  v_uv = a_e;
  gl_Position = VP * vec4(p, 1.0);
}
`;

/** Síť balíku nebo uzlu v místních souřadnicích — jen posun, otočení a stejné měřítko ve všech osách */
const SIT_VS = `
layout(location = 0) in vec3 a_p;
layout(location = 1) in vec3 a_n;
layout(location = 2) in vec2 a_uv;
uniform mat4 u_model;
out vec3 v_p;
out vec3 v_n;
out vec2 v_uv;
void main() {
  vec4 w = u_model * vec4(a_p, 1.0);
  v_p = w.xyz;
  v_n = mat3(u_model) * a_n;
  v_uv = a_uv;
  gl_Position = VP * w;
}
`;

const PULT_VS = `
layout(location = 0) in vec2 a_xy;
out vec3 v_p;
void main() {
  v_p = vec3(a_xy, 0.0);
  gl_Position = u_vp * vec4(v_p, 1.0);
}
`;

/* ═══ Fragment shadery ═══ */

const HLOUBKA_FS = `
#ifdef ROHY
in vec2 v_uv;
#endif
#ifdef BARVA
/* Do plátna s barvou se musí něco zapsat, i když je zápis barvy vypnutý (colorMask) */
out vec4 o;
#endif
void main() {
#ifdef ROHY
  if (sdKraje(v_uv) > 0.0) discard;
#endif
#ifdef BARVA
  o = vec4(0.0);
#endif
}
`;

/**
 * Světlo: stín lampy (PCSS — nejdřív se najde, co stíní a jak daleko, podle
 * toho se stín změkčí; u kontaktu ostrý, daleko rozmazaný), tma ze shora
 * snímané výškové mapy a převod do sRGB s jemným ditheringem.
 */
const SVETLO = `
uniform sampler2DShadow u_stinMapa;
uniform sampler2D u_stinHloubka;
uniform sampler2DShadow u_vyskaMapa;
const float PI = 3.14159265;

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }

/** Uložená hloubka mapy stínů → vzdálenost od lampy podél její osy */
float linStin(float d) {
  float n = u_stin.z, f = u_stin.w;
  return n * f / (f - d * (f - n));
}

float stinLampy(vec3 P, vec3 Ng) {
  vec3 Lv = u_lampa.xyz - P;
  float dist = length(Lv);
  vec3 L = Lv / dist;
  float nl = dot(Ng, L);
  vec3 n = nl >= 0.0 ? Ng : -Ng;
  float texel = u_stin.x * dist;
  /* Posun bodu ke světlu, ať se tenká látka nestíní sama sobě: kousek po normále na stranu
     lampy a hlavně po paprsku k lampě — víc na šikmých plochách a na straně odvrácené
     od lampy (tu svítí jen „zabalené“ světlo). Další vrstva je dál než tenhle posun. */
  float sikmo = 1.0 - abs(nl);
  vec3 Q = P + n * (texel * 1.2) + L * (texel * (1.0 + 4.0 * sikmo + (nl < 0.0 ? 3.0 : 0.0)));
  vec4 sc = u_svetloVP * vec4(Q, 1.0);
  vec2 uv = sc.xy / sc.w * 0.5 + 0.5;
  float D = sc.w;
  /* Rovina přijímače: jak se vzdálenost od lampy mění po mapě (proti skvrnám na svazích) */
  vec2 ux = dFdx(uv), uy = dFdy(uv);
  float Dx = dFdx(D), Dy = dFdy(D);
  float det = ux.x * uy.y - ux.y * uy.x;
  vec2 g = abs(det) > 1e-14 ? vec2(uy.y * Dx - ux.y * Dy, ux.x * Dy - uy.x * Dx) / det : vec2(0.0);
  g = clamp(g, vec2(-2.5), vec2(2.5));
  if (uv.x <= 0.0 || uv.y <= 0.0 || uv.x >= 1.0 || uv.y >= 1.0 || D <= u_stin.z) return 1.0;
  float a = ign(gl_FragCoord.xy) * 6.2831853;
  mat2 R = mat2(cos(a), sin(a), -sin(a), cos(a));
  float t1 = u_stin2.x;
  float Dmin = max(u_stin.z, D - 0.5);
  float hledej = clamp(0.5 * u_stin.y * (D - Dmin) / (D * Dmin), 2.0 * t1, 0.03);
  float soucet = 0.0, pocet = 0.0;
  for (int i = 0; i < STIN_NB; i++) {
    vec2 o = R * VOGEL_B[i] * hledej;
    float Db = linStin(textureLod(u_stinHloubka, uv + o, 0.0).r);
    if (Db < D + dot(g, o) - texel * 2.0) {
      soucet += Db;
      pocet += 1.0;
    }
  }
  if (pocet == 0.0) return 1.0;
  float Db = soucet / pocet;
  float polomer = clamp(0.5 * u_stin.y * (D - Db) / (Db * D), 1.2 * t1, 0.03);
  float svetlo = 0.0;
  for (int i = 0; i < STIN_NP; i++) {
    vec2 o = R * VOGEL_P[i] * polomer;
    float Dr = D + dot(g, o) - texel * 0.8;
    float dr = u_stin.w * (Dr - u_stin.z) / (Dr * (u_stin.w - u_stin.z));
    svetlo += textureLod(u_stinMapa, vec3(uv + o, dr), 0.0);
  }
  return svetlo / float(STIN_NP);
}

/** Kolik okolí bodu (x, y) je shora výš než h (0 … 1, měkce mezi texely) */
float kryto(vec2 xy, float h) {
  vec2 uv = (xy - u_vyska.xy) * u_vyska.z;
  float ref = (u_vyskaZ.x - h) / u_vyskaZ.y;
  return 1.0 - textureLod(u_vyskaMapa, vec3(uv, ref), 0.0);
}

/**
 * Tma v záhybech a pod chlopněmi (1 = otevřeno, méně = tma). Rozhoduje, co
 * je v okolí 1–4 cm nad tečnou rovinou bodu: nad ní je záhyb nebo balík,
 * přímo nad bodem chlopeň. Svislé a spodní plochy ztmavnou u pultu.
 */
float tmaZahybu(vec3 P, vec3 N) {
  float texel = u_vyska.w;
  float vahaBoku = smoothstep(0.55, 0.15, N.z);
  float tmaBoku = 0.0, tmaShora = 0.0;
  if (vahaBoku > 0.0) {
    /* Strmé a spodní plochy: okolí venku před plochou, kousek pod bodem */
    vec2 ven = N.xy / max(length(N.xy), 1e-4);
    float bok = kryto(P.xy + ven * 0.01, P.z - 0.004) * 0.45
              + kryto(P.xy + ven * 0.025, P.z - 0.011) * 0.3
              + kryto(P.xy + ven * 0.045, P.z - 0.022) * 0.2;
    float nadBokem = kryto(P.xy, P.z + 0.003 + texel * 3.0);
    tmaBoku = clamp(bok + nadBokem * 0.3, 0.0, 0.6);
    float dolu = smoothstep(0.0, -0.7, N.z);
    tmaBoku = mix(tmaBoku, max(tmaBoku, 0.5 - 4.0 * P.z), dolu);
  }
  if (vahaBoku >= 1.0) return 1.0 - tmaBoku;
  /* Plochy otočené nahoru: tečná rovina a okolí */
  vec2 sklon = -N.xy / max(N.z, 0.25);
  float strmost = min(length(sklon), 4.0);
  float e0 = 0.0012 + texel * (0.7 + 1.1 * strmost);
  /* Kryt vysoko nad bodem (letící balík, zvednutý cíp) stíní okolí míň než chlopeň těsně nad ním */
  float pod = max(kryto(P.xy, P.z + e0) - 0.6 * kryto(P.xy, P.z + 0.15), 0.0);
  float jeskyne = 0.0, zahyb = 0.0, vahy = 0.0;
  for (int k = 0; k < AO_N; k++) {
    float t = (float(k) + 0.5) / float(AO_N);
    float uhel = float(k) * 2.39996323 + 0.5;
    float r = mix(0.009, 0.042, t);
    vec2 o = vec2(cos(uhel), sin(uhel)) * r;
    float hT = P.z + clamp(dot(sklon, o), -2.0 * r, 2.0 * r);
    jeskyne += kryto(P.xy + o, max(hT, P.z) + e0);
    float w = 1.0 - 0.55 * t;
    zahyb += w * kryto(P.xy + o, hT + e0 + 0.2 * r);
    vahy += w;
  }
  jeskyne /= float(AO_N);
  zahyb /= vahy;
  tmaShora = pod * (0.5 + 0.5 * jeskyne) * 0.85 + (1.0 - pod) * zahyb * 0.62;
  return 1.0 - mix(tmaShora, tmaBoku, vahaBoku);
}

/** Tma na pultu (0 … 1): pod předměty a kolem nich, tmavší, čím blíž jsou */
float tmaPultu(vec2 xy) {
  float pod = kryto(xy, 0.0015) * (1.0 - 0.3 * kryto(xy, 0.025) - 0.25 * kryto(xy, 0.08) - 0.25 * kryto(xy, 0.2));
  float okoli = 0.0, vahy = 0.0;
  for (int k = 0; k < AO_N; k++) {
    float t = (float(k) + 0.5) / float(AO_N);
    float uhel = float(k) * 2.39996323 + 0.9;
    float r = mix(0.005, 0.06, t * t);
    float w = 1.0 - 0.5 * t;
    okoli += w * kryto(xy + vec2(cos(uhel), sin(uhel)) * r, 0.0006 + 0.32 * r);
    vahy += w;
  }
  return max(pod, okoli / vahy * 0.9);
}

/** Tma s odrazy (Jimenez a kol.): světlé látky v záhybech tolik nečernají a tma má jejich barvu */
vec3 tmaBarvou(float ao, vec3 albedo) {
  vec3 a = 2.0404 * albedo - 0.3324;
  vec3 b = -4.7951 * albedo + 0.6417;
  vec3 c = 2.7552 * albedo + 0.6903;
  return max(vec3(ao), ((ao * a + b) * ao + c) * ao);
}

void lampa(vec3 P, out vec3 L, out vec3 E) {
  vec3 Lv = u_lampa.xyz - P;
  float d2 = dot(Lv, Lv);
  L = Lv * inversesqrt(d2);
  float kuzel = smoothstep(u_lampaSmer.w, u_lampaBarva.w, dot(-L, u_lampaSmer.xyz));
  E = u_lampaBarva.rgb * (u_lampa.w * kuzel / d2);
}

float dGgx(float a2, float NoH) {
  float d = NoH * NoH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}
float vSmith(float a2, float NoV, float NoL) {
  float gv = NoL * sqrt(NoV * NoV * (1.0 - a2) + a2);
  float gl = NoV * sqrt(NoL * NoL * (1.0 - a2) + a2);
  return 0.5 / (gv + gl + 1e-5);
}
float fSchlick(float f0, float VoH) { return f0 + (1.0 - f0) * pow(1.0 - VoH, 5.0); }
/** Lesk tkaniny (Estevez a Kulla): vlákna svítí, když se na ně kouká a svítí z boku */
float dCharlie(float a, float NoH) {
  float inv = 1.0 / a;
  float sin2 = max(1.0 - NoH * NoH, 0.0078125);
  return (2.0 + inv) * pow(sin2, inv * 0.5) / (2.0 * PI);
}
float vNeubelt(float NoV, float NoL) { return clamp(1.0 / (4.0 * (NoL + NoV - NoL * NoV)), 0.0, 1.0); }

vec3 vystup(vec3 c) {
  c = max(c, 0.0) * u_ton.x * u_vyvazeni.rgb;
  float k = u_ton.y;
  /* Pod kolenem beze změny, nad ním měkce do bílé */
  vec3 t = mix(c, k + (1.0 - k) * (1.0 - exp(-(c - k) / (1.0 - k))), step(k, c));
  t = clamp(t, 0.0, 1.0);
  vec3 s = mix(t * 12.92, 1.055 * pow(t, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, t));
  return s + (ign(gl_FragCoord.xy + 0.5) - 0.5) / 255.0;
}
`;

/**
 * Látka: barva ze vzoru (líc plně, rub světlejší a méně sytý), lem s prošitím,
 * krep chirimen jako jemná mapa normál a světlo tkaniny — měkká difúze se
 * „zabalením“ za terminátor, lesk vláken na hranách záhybů, slabý GGX
 * a trochu světla skrz tenkou látku. Tentýž shader kreslí lem (LEM) a uzel (UZEL).
 */
const LATKA_FS = `
in vec3 v_p;
in vec3 v_n;
in vec2 v_uv;
#ifdef PLOCHA_LATKY
in vec3 v_t;
#endif
uniform sampler2D u_vzor;
uniform sampler2D u_krep;
uniform vec3 u_cLatka;
uniform vec3 u_cKresba;
uniform vec3 u_cRub;
uniform vec3 u_cLem;
out vec4 o;

const float LEM_PAS = 0.008;
const float KREP_OPAKOVANI = STRANA / 0.06;
/* Sklon krepu je v textuře čtyřikrát zvětšený (textura-latky.ts) */
const float KREP_SILA = 0.25;
const float WRAP = 0.35;
const float LESK = 0.45;
const float LESK_DRSNOST = 0.45;
const float GGX_A2 = 0.09;
const float GGX_VAHA = 0.35;
const float PRUSVIT = 0.3;
const float TMA_PRIMO = 0.45;

vec3 barvaLesku(vec3 b) { return mix(sqrt(b), vec3(0.86, 0.8, 0.7), 0.18) * LESK; }

/** Barva látky v bodě: vzor podle strany, pak lem a prošití */
vec3 barvaLatky(vec2 uv, bool lic) {
  vec4 t = texture(u_vzor, uv);
  float hust = t.b - 0.5;
  vec3 zaklad, kresba;
  float m;
  if (lic) {
    zaklad = u_cLatka * exp(-0.9 * hust);
    kresba = u_cKresba * exp(-0.25 * hust);
    m = t.r;
  } else {
    /* Barvené skrz: rub je jen o kus světlejší než líc — na rozprostřeném šátku leží nahoře celou dobu, tak nesmí vyblednout */
    vec3 rub = mix(u_cLatka, u_cRub, 0.45);
    zaklad = rub * exp(-0.8 * hust);
    kresba = mix(u_cKresba, rub, 0.12) * exp(-0.22 * hust);
    m = t.g;
  }
  vec3 c = mix(zaklad, kresba, m);
  /* Lem: podvinutý okraj v barvě lemu, na obou stranách */
  float d = -sdKraje(uv) * STRANA;
  float aa = fwidth(d) + 1e-6;
  float lem = 1.0 - smoothstep(LEM_PAS - aa, LEM_PAS + aa, d);
  vec3 cLem = u_cLem * exp(-0.8 * hust);
  /* Na rubu je hrana podvinutí vidět jako tenká stinná linka */
  if (!lic) c *= 1.0 - 0.3 * (1.0 - smoothstep(0.0, 0.0005 + aa, abs(d - LEM_PAS - 0.0003)));
  c = mix(c, cLem, lem);
  /* Prošití: steh 3 mm, mezera 1,5 mm, 6 mm od kraje; z dálky splyne v linku */
  float podel = (min(uv.x, 1.0 - uv.x) < min(uv.y, 1.0 - uv.y) ? uv.y : uv.x) * STRANA;
  float fp = fwidth(podel) / 0.0045 + 1e-4;
  float f = fract(podel / 0.0045);
  float steh = smoothstep(0.0, fp + 0.04, f) * (1.0 - smoothstep(0.66, 0.7 + fp, f));
  steh = mix(steh, 0.68, smoothstep(0.25, 0.6, fp));
  float pricne = 1.0 - smoothstep(0.0003, 0.0003 + aa * 1.5, abs(d - 0.0058));
  vec3 nit = mix(cLem, u_cKresba, 0.42);
  return mix(c, nit, pricne * steh * 0.8);
}

vec3 svetloLatky(vec3 base, vec3 N, vec3 N0, vec3 V, vec3 P, float ao1, float vis) {
  vec3 L, E;
  lampa(P, L, E);
  vec3 ao = tmaBarvou(ao1, base);
  float NoL = dot(N, L);
  float NoV = clamp(dot(N, V), 1e-3, 1.0);
  float lit = clamp(NoL, 0.0, 1.0);
  float wrap = clamp((NoL + WRAP) / (1.0 + WRAP), 0.0, 1.0);
  /* Za terminátorem je světlo rozptýlené ve vláknech sytější */
  float jas = dot(base, vec3(0.2126, 0.7152, 0.0722));
  vec3 syta = base * base / max(jas, 1e-4);
  vec3 dif = base * lit + mix(base, syta, 0.55) * (wrap - lit);
  vec3 H = normalize(L + V);
  float NoH = clamp(dot(N, H), 0.0, 1.0);
  float VoH = clamp(dot(V, H), 0.0, 1.0);
  vec3 lesk = barvaLesku(base) * (dCharlie(LESK_DRSNOST, NoH) * vNeubelt(NoV, lit) * lit * PI);
  float spec = dGgx(GGX_A2, NoH) * vSmith(GGX_A2, NoV, lit) * fSchlick(0.035, VoH) * lit * PI * GGX_VAHA;
  vec3 primo = (dif + lesk + spec) * mix(vec3(1.0), ao, TMA_PRIMO);
  /* Světlo skrz tenkou látku, když lampa svítí z druhé strany */
  primo += base * (PRUSVIT * max(-dot(N0, L), 0.0));
  vec3 okoli = base * mix(u_zem.rgb, u_nebe.rgb, clamp(N.z * 0.5 + 0.5, 0.0, 1.0));
  okoli += barvaLesku(base) * u_nebe.rgb * pow(1.0 - NoV, 4.0) * 1.5;
  return primo * E * vis + okoli * ao;
}

void main() {
  vec3 V = normalize(u_kamera.xyz - v_p);
  vec3 N, N0, base;
  bool pryc = false;
#if defined(LEM)
  N0 = normalize(v_n);
  N = N0;
  float hust = texture(u_vzor, v_uv).b - 0.5;
  base = u_cLem * exp(-0.8 * hust);
#else
  vec3 Ng = normalize(v_n);
  vec3 T, Bt;
  bool lic;
#ifdef UZEL
  lic = true;
  N0 = dot(Ng, V) < 0.0 ? -Ng : Ng;
  /* Tečný rámec z derivací polohy a souřadnic látky */
  vec3 dp1 = dFdx(v_p), dp2 = dFdy(v_p);
  vec2 du1 = dFdx(v_uv), du2 = dFdy(v_uv);
  vec3 dp2k = cross(dp2, N0), dp1k = cross(N0, dp1);
  T = dp2k * du1.x + dp1k * du2.x;
  Bt = dp2k * du1.y + dp1k * du2.y;
  float im = inversesqrt(max(max(dot(T, T), dot(Bt, Bt)), 1e-24));
  T *= im;
  Bt *= im;
#else
  lic = gl_FrontFacing;
  N0 = lic ? Ng : -Ng;
  vec3 t0 = v_t - Ng * dot(Ng, v_t);
  T = dot(t0, t0) > 1e-12 ? normalize(t0) : normalize(cross(Ng, vec3(0.0, 1.0, 0.1)));
  Bt = cross(N0, T);
  pryc = sdKraje(v_uv) > 0.0;
#endif
  /* Na obrysu se normála natočí k oku, ať okraj nezčerná */
  float nv = dot(N0, V);
  if (nv < 0.05) N0 = normalize(N0 + V * (0.05 - nv));
  vec4 krep = texture(u_krep, v_uv * KREP_OPAKOVANI);
  vec2 kr = (krep.xy * 2.0 - 1.0) * KREP_SILA;
  N = normalize(N0 + T * kr.x + Bt * kr.y);
  /* Mezi hrbolky krepu je stín — z dálky se zprůměruje */
  base = barvaLatky(v_uv, lic) * mix(0.94, 1.0, smoothstep(0.1, 0.7, krep.z));
#endif
  float vis = stinLampy(v_p, N0);
  float ao = tmaZahybu(v_p, N0);
  vec3 c = svetloLatky(base, N, N0, V, v_p, ao, vis);
  if (pryc) discard;
  o = vec4(vystup(c), 1.0);
}
`;

/**
 * Balík: noviny jsou papír (difúzní, trochu prosvítají, skoro bez lesku),
 * provázek vláknitý, visačka matný karton. Zvýrazněný balík se jemně prosvětlí.
 */
const BALIK_FS = `
in vec3 v_p;
in vec3 v_n;
in vec2 v_uv;
uniform sampler2D u_tex;
uniform vec4 u_barva;
uniform int u_material;
uniform float u_zvyrazni;
/** Odraz osvětlené látky zespodu (balíky stojí na šátku) */
uniform vec3 u_odraz;
out vec4 o;
void main() {
  vec3 V = normalize(u_kamera.xyz - v_p);
  vec3 Ng = normalize(v_n);
  vec3 N = dot(Ng, V) < 0.0 ? -Ng : Ng;
  /* Visačka o kus ostřeji, ať je číslo čitelné i zmenšené (balik.ts) */
  vec4 tx = texture(u_tex, v_uv, u_material == 2 ? -0.5 : 0.0);
  vec3 base = u_barva.a > 0.5 ? tx.rgb : u_barva.rgb;
  float vis = stinLampy(v_p, N);
  vec3 ao = tmaBarvou(tmaZahybu(v_p, N), base);
  vec3 L, E;
  lampa(v_p, L, E);
  float NoL = dot(N, L);
  float NoV = clamp(dot(N, V), 1e-3, 1.0);
  float lit = clamp(NoL, 0.0, 1.0);
  vec3 H = normalize(L + V);
  float NoH = clamp(dot(N, H), 0.0, 1.0);
  float VoH = clamp(dot(V, H), 0.0, 1.0);
  vec3 primo;
  if (u_material == 1) {
    /* Provázek: zakroucená vlákna jako jemné šikmé proužky, měkký lesk */
    float faze = v_uv.x * 420.0 + v_uv.y * 3.0;
    float fw = fwidth(faze);
    float prouzky = mix(0.5 + 0.5 * sin(faze * 6.2831853), 0.5, clamp(fw * 1.5, 0.0, 1.0));
    base *= 0.78 + 0.3 * prouzky;
    float wrap = clamp((NoL + 0.45) / 1.45, 0.0, 1.0);
    primo = base * wrap + mix(sqrt(base), vec3(1.0), 0.2) * (dCharlie(0.6, NoH) * vNeubelt(NoV, lit) * lit * PI * 0.35);
  } else {
    /* Papír a karton: difúze s trochou zabalení, skoro matné */
    float w = u_material == 0 ? 0.25 : 0.12;
    float wrap = clamp((NoL + w) / (1.0 + w), 0.0, 1.0);
    float a2 = u_material == 0 ? 0.42 : 0.3;
    float spec = dGgx(a2, NoH) * vSmith(a2, NoV, lit) * fSchlick(0.03, VoH) * lit * PI * (u_material == 0 ? 0.45 : 0.3);
    primo = base * wrap + spec;
    /* Tenký papír prosvítá, když lampa svítí zezadu */
    if (u_material == 0) primo += base * (0.3 * max(-NoL, 0.0));
  }
  primo *= mix(vec3(1.0), ao, 0.4);
  vec3 okoli = base * mix(u_odraz, u_nebe.rgb, clamp(N.z * 0.5 + 0.5, 0.0, 1.0)) * ao;
  vec3 c = primo * E * vis + okoli;
  c *= 1.0 + 0.2 * u_zvyrazni;
  c += base * (u_zvyrazni * 0.25 * pow(1.0 - NoV, 2.0)) * u_lampaBarva.rgb;
  if (u_barva.a > 0.5 && tx.a < 0.5) discard;
  o = vec4(vystup(c), 1.0);
}
`;

/**
 * Pult: jen tma — stín lampy a kontaktní stín z výškové mapy. Černá s alfou
 * (premultiplied), jinde průhledno, ať je vidět CSS pult pod plátnem.
 */
const PULT_FS = `
in vec3 v_p;
out vec4 o;
void main() {
  float vis = stinLampy(v_p, vec3(0.0, 0.0, 1.0));
  vec3 L, E;
  lampa(v_p, L, E);
  float primo = dot(E, vec3(0.2126, 0.7152, 0.0722)) * max(L.z, 0.0);
  float okoli = dot(u_nebe.rgb, vec3(0.2126, 0.7152, 0.0722)) * 1.2;
  float podil = primo / (primo + okoli + 1e-5);
  float tmaStinu = (1.0 - vis) * podil;
  float tmaAO = tmaPultu(v_p.xy) * (1.0 - 0.5 * podil);
  float a = 1.0 - (1.0 - tmaStinu) * (1.0 - tmaAO);
  a = min(a * u_ton.z, u_ton.w) + (ign(gl_FragCoord.xy) - 0.5) / 255.0;
  o = vec4(0.0, 0.0, 0.0, clamp(a, 0.0, 1.0));
}
`;

/* ═══ Skládání ═══ */

const vogel = (n: number) =>
  Array.from({ length: n }, (_, i) => {
    const r = Math.sqrt((i + 0.5) / n);
    const a = i * 2.39996323;
    return [r * Math.cos(a), r * Math.sin(a)];
  });
const pole = (jmeno: string, body: number[][]) =>
  `const vec2 ${jmeno}[${body.length}] = vec2[${body.length}](${body.map(([x, y]) => `vec2(${x.toFixed(5)}, ${y.toFixed(5)})`).join(", ")});\n`;

export interface ZdrojProgramu {
  vs: string;
  fs: string;
}

export interface ZdrojeProgramu {
  latka: ZdrojProgramu;
  /** Jen hloubka látky z pohledu kamery (předprůchod: drahý shader látky pak běží jen pro viditelnou vrstvu) */
  latkaZ: ZdrojProgramu;
  lem: ZdrojProgramu;
  uzel: ZdrojProgramu;
  balik: ZdrojProgramu;
  pult: ZdrojProgramu;
  /** Jen hloubka — mapa stínů a výšková mapa */
  latkaH: ZdrojProgramu;
  lemH: ZdrojProgramu;
  sitH: ZdrojProgramu;
}

export function zdrojeProgramu(n: NastaveniShaderu): ZdrojeProgramu {
  const hlavicka = (def: string[]) =>
    `#version 300 es\n${def.map((d) => `#define ${d}\n`).join("")}#define STRANA ${n.strana.toFixed(4)}\n` +
    `#define STIN_NB ${n.stinHledani}\n#define STIN_NP ${n.stinMekceni}\n#define AO_N ${n.tmaVzorku}\n` +
    PRESNOST + SVET + KRAJ;
  const svetlo = pole("VOGEL_B", vogel(n.stinHledani)) + pole("VOGEL_P", vogel(n.stinMekceni)) + SVETLO;
  const vs = (def: string[], ...kusy: string[]) => hlavicka(def) + MATICE_PRUCHODU + kusy.join("");
  const fs = (def: string[], ...kusy: string[]) => hlavicka(def) + kusy.join("");
  return {
    latka: { vs: vs([], PLOCHA, LATKA_VS), fs: fs(["PLOCHA_LATKY"], svetlo, LATKA_FS) },
    latkaZ: { vs: vs([], PLOCHA, LATKA_VS), fs: fs(["ROHY", "BARVA"], HLOUBKA_FS) },
    lem: { vs: vs([], PLOCHA, LEM_VS), fs: fs(["LEM"], svetlo, LATKA_FS) },
    uzel: { vs: vs([], SIT_VS), fs: fs(["UZEL"], svetlo, LATKA_FS) },
    balik: { vs: vs([], SIT_VS), fs: fs([], svetlo, BALIK_FS) },
    pult: { vs: vs([], PULT_VS), fs: fs([], svetlo, PULT_FS) },
    latkaH: { vs: vs(["HLOUBKA"], PLOCHA, LATKA_VS), fs: fs(["ROHY"], HLOUBKA_FS) },
    lemH: { vs: vs(["HLOUBKA"], PLOCHA, LEM_VS), fs: fs([], HLOUBKA_FS) },
    sitH: { vs: vs(["HLOUBKA"], SIT_VS), fs: fs([], HLOUBKA_FS) },
  };
}
