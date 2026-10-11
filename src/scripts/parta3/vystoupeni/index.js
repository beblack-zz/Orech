/*
 * Repertoár divadla na /parta-3: choreografie všech kusů, podle postavičky
 * a varianty scény (stejné klíče jako `ucinkujici[].kusy[].id` v data/parta3.ts).
 * Jak se zapisují, je v ../herec.js.
 *
 * Choreografie stojí na tom, jak se scéna chová. Když se scéna změní, dá se
 * vystoupení pustit nanečisto bez prohlížeče (časová osa, zvuky, snímky do PNG):
 *
 *   node scripts/zkouska-vystoupeni.mjs kapka kruh --kolis --png nahled.png
 */
import hlinka from "./hlinka.js";
import bublinka from "./bublinka.js";
import kapka from "./kapka.js";
import vazicka from "./vazicka.js";
import kachlik from "./kachlik.js";
import cedulka from "./cedulka.js";
import samotka from "./samotka.js";
import pecinka from "./pecinka.js";
import stripek from "./stripek.js";

export const vystoupeni = { hlinka, bublinka, kapka, vazicka, kachlik, cedulka, samotka, pecinka, stripek };
