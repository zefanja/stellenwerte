import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { STELLEN, wert } from '../material';
import { Rng } from '../rng';
import type { Generator, Item, Material, Stelle } from '../typen';

export interface Params {
	/** Spalte mit mehr als neun Teilen; nie die höchste Spalte */
	ueberschuss_stelle: Stelle | 'zufall';
	/** Anzahl der Spalten, 2 bis 4 */
	stellen: number;
	/** größter Überschuss, 10 bis 99 */
	max_ueberschuss: number;
}

export function baue(material: Material, seed: number, params: Params): Item<Params> {
	const spalten = STELLEN.filter((s) => material[s] !== undefined);
	const ueber = spalten.find((s) => material[s]! >= 10);
	const n = wert(material);
	return {
		skillId: 'nicht_normiert',
		seed,
		params,
		prompt: 'Welche Zahl ist das?',
		darstellung: { typ: 'stellen', material },
		loesung: zahl(n),
		distraktoren: distraktorenNachWert(n, [
			['kein_umbuendeln', Number(spalten.map((s) => material[s]).join(''))],
			[
				'uebertrag_vergessen',
				ueber ? wert({ ...material, [ueber]: material[ueber]! % 10 }) : undefined
			]
		]),
		error_tags: ['kein_umbuendeln', 'uebertrag_vergessen', 'zaehlfehler_eins', 'sonstiges']
	};
}

export const nicht_normiert: Generator<Params> = {
	defaults: { ueberschuss_stelle: 'zufall', stellen: 3, max_ueberschuss: 19 },

	generate(params, seed) {
		const rng = new Rng(seed);
		const anzahl = Math.max(2, Math.min(4, params.stellen));
		const spalten = STELLEN.slice(STELLEN.length - anzahl);
		const moeglich = spalten.slice(1);
		const ueber =
			params.ueberschuss_stelle === 'zufall' ? rng.pick(moeglich) : params.ueberschuss_stelle;
		if (!moeglich.includes(ueber))
			throw new RangeError(`Überschuss in ${ueber} bei ${anzahl} Spalten nicht möglich`);

		const material: Material = {};
		for (const s of spalten) {
			if (s === ueber)
				material[s] = rng.int(10, Math.max(10, Math.min(99, params.max_ueberschuss)));
			else material[s] = s === spalten[0] ? rng.int(1, 9) : rng.int(0, 9);
		}
		return baue(material, seed, params);
	},

	bewerte: bewerteNachWert
};
