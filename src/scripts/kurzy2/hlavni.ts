/**
 * Vstup pro /kurzy-2. Obloha, hlavička, zvuky a klikací kami jsou
 * společné s Partou 2; zbytek je vlastní stránce s kurzy.
 */
import { spust } from "../parta2/stav";
import { initNebe } from "../parta2/nebe";
import { initKami } from "../parta2/kami";
import { hlavicka } from "../parta2/hlavicka";
import { simulator } from "./simulator";
import { hledac } from "./hledac";
import { terminy } from "./terminy";
import { strom } from "./strom";
import { domu } from "./domu";
import { otazky } from "./otazky";
import { poukaz } from "./poukaz";
import { initNaradi } from "./naradi";

hlavicka();
initKami();
initNebe();
initNaradi();
simulator();
hledac();
terminy();
strom();
domu();
otazky();
poukaz();
spust();
