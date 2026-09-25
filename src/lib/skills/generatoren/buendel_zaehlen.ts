import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { STELLENNAME, STELLENWERT, ziffer } from '../material';
import { Rng } from '../rng';
import type { Generator, Item, Stelle } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	zielstelle: Exclude<Stelle, 'E'>;
	zahlenraum: Bereich;
}

export function baue(
	n: number,
	stelle: Exclude<Stelle, 'E'>,
	seed: number,
	params: Params
): Item<Params> {
	const w = STELLENWERT[stelle];
	const buendel = Math.floor(n / w);
	return {
		skillId: 'buendel_zaehlen',
		seed,
		params,
		prompt: `Wie viele ${STELLENNAME[stelle].mehrzahl} stecken in ${n}?`,
		darstellung: { typ: 'buendel', zahl: n, stelle },
		loesung: zahl(buendel),
		distraktoren: distraktorenNachWert(buendel, [
			['ziffer_statt_buendel', ziffer(n, stelle)],
			['gerundet', Math.round(n / w)],
			['falsche_stelle', Math.floor(n / (w * 10))],
			['falsche_stelle', Math.floor(n / (w / 10))]
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
		// mindestens zehn Bündel, sonst wären Ziffer und Bündelanzahl gleich
		const min = Math.max(params.zahlenraum[0], 10 * STELLENWERT[params.zielstelle]);
		if (min > params.zahlenraum[1]) throw new RangeError('Zahlenraum zu klein für die Zielstelle');
		return baue(rng.int(min, params.zahlenraum[1]), params.zielstelle, seed, params);
	},

	bewerte: bewerteNachWert
};
