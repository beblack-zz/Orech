/**
 * Vstup pro /parta-2. Nejdřív se zaregistrují všechny scény (každá si
 * řekne, co chce měřit a co dělat při scrollu), pak se to jednou spustí.
 */
import { spust } from "./stav";
import { initNebe } from "./nebe";
import { initCesta } from "./cesta";
import { initKami } from "./kami";
import { initSber } from "./sber";
import { initOmikuji } from "./omikuji";
import * as sceny from "./sceny";
import { hlavicka } from "./hlavicka";

hlavicka();
initKami();
initSber();
initNebe();
initCesta();
sceny.hneteni();
sceny.voda();
sceny.kruh();
sceny.rovina();
sceny.jmenoNaCedulku();
sceny.police();
sceny.pec();
sceny.kintsugi();
initOmikuji();
spust();
