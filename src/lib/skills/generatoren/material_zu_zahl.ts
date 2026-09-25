import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { normiert, ziffer } from '../material';
import { Rng } from '../rng';
import type { Generator, Item } from '../typen';
import { ohneNullen, quersumme, zahlMitStellen, type Bereich } from '../zufall';

export interface Params {
	stellen: Bereich;
	nullstellen_erlaubt: boolean;
}

export function baue(n: number, seed: number, params: Params): Item<Params> {
	return {
		skillId: 'material_zu_zahl',
		seed,
		params,
		prompt: 'Welche Zahl ist das?',
		darstellung: { typ: 'material', material: normiert(n), anordnung: 'geordnet' },
		loesung: zahl(n),
		distraktoren: distraktorenNachWert(n, [
			['nullstelle_fehlt', ohneNullen(n)],
			['stellenwert_ignoriert', n >= 10 ? quersumme(n) : undefined],
			['zaehlfehler_eins', ziffer(n, 'E') > 0 ? n - 1 : n + 1],
			['zaehlfehler_stelle', n >= 10 && ziffer(n, 'Z') < 9 ? n + 10 : undefined]
		]),
		error_tags: [
			'nullstelle_fehlt',
			'stellenwert_ignoriert',
			'zaehlfehler_eins',
			'zaehlfehler_stelle',
			'sonstiges'
		]
	};
}

export const material_zu_zahl: Generator<Params> = {
	defaults: { stellen: [2, 3], nullstellen_erlaubt: true },

	generate(params, seed) {
		const rng = new Rng(seed);
		const stellen: Bereich = [params.stellen[0], Math.min(params.stellen[1], 4)];
		// Mit erlaubten Nullstellen kommt in jeder zweiten Aufgabe sicher eine vor.
		const nullen = !params.nullstellen_erlaubt
			? 'nie'
			: stellen[1] >= 2 && rng.chance(0.5)
				? 'mindestens_eine'
				: 'egal';
		return baue(zahlMitStellen(rng, stellen, nullen), seed, params);
	},

	bewerte: bewerteNachWert
};
