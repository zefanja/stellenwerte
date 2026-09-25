import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { Rng } from '../rng';
import { EXPONENT, STELLEN_NAME, nachkommastellen, zifferAn } from '../stellen';
import { zahlText } from '../text';
import type { Generator, Item } from '../typen';
import type { Bereich } from '../zufall';

export type Zielstelle = 'T' | 'H' | 'Z' | 'z' | 'h';

export interface Params {
	/** T, H, Z; in Woche 6 auch z (Zehntel) und h (Hundertstel) */
	zielstelle: Zielstelle;
	zahlenraum: Bereich;
}

/**
 * Gerechnet wird in ganzen Einheiten der kleinsten vorkommenden Stelle, damit 3,4 : 0,1 genau 34 ergibt.
 */
export function baue(n: number, stelle: Zielstelle, seed: number, params: Params): Item<Params> {
	const e = EXPONENT[stelle];
	const k = Math.max(0, -e, nachkommastellen(n));
	const ganz = Math.round(n * 10 ** k);
	const einheit = 10 ** (e + k);
	const buendel = Math.floor(ganz / einheit);
	return {
		skillId: 'buendel_zaehlen',
		seed,
		params,
		prompt: `Wie viele ${STELLEN_NAME[stelle]} stecken in ${zahlText(n)}?`,
		darstellung: { typ: 'buendel', zahl: n, stelle },
		loesung: zahl(buendel),
		distraktoren: distraktorenNachWert(buendel, [
			['ziffer_statt_buendel', zifferAn(n, e)],
			['gerundet', Math.round(ganz / einheit)],
			['falsche_stelle', Math.floor(ganz / (einheit * 10))],
			['falsche_stelle', einheit >= 10 ? Math.floor(ganz / (einheit / 10)) : undefined],
			// Dezimalzahl abgeschrieben statt Bündel gezählt
			['falsche_stelle', Number.isInteger(n) ? undefined : n]
		]),
		error_tags: [
			'ziffer_statt_buendel',
			'gerundet',
			'falsche_stelle',
			'zaehlfehler_eins',
			'sonstiges'
		]
	};
}

export const buendel_zaehlen: Generator<Params> = {
	defaults: { zielstelle: 'Z', zahlenraum: [100, 999] },

	generate(params, seed) {
		const rng = new Rng(seed);
		const e = EXPONENT[params.zielstelle];
		// Dezimal: manchmal eine Stelle mehr hinter dem Komma (3,47 → 34 Zehntel)
		const k = e < 0 ? Math.min(2, -e + (rng.chance(0.5) ? 1 : 0)) : 0;
		// mindestens zehn Bündel, sonst wären Ziffer und Bündelanzahl gleich
		const min = Math.max(Math.ceil(params.zahlenraum[0] * 10 ** k), 10 * 10 ** (e + k));
		const max = Math.floor(params.zahlenraum[1] * 10 ** k);
		if (min > max) throw new RangeError('Zahlenraum zu klein für die Zielstelle');
		return baue(rng.int(min, max) / 10 ** k, params.zielstelle, seed, params);
	},

	bewerte: bewerteNachWert
};
