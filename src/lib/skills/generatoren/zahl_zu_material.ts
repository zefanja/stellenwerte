import { bewerteNachWert, distraktorenNachWert } from '../bewertung';
import { normiert } from '../material';
import { Rng } from '../rng';
import type { Antwort, Generator, Item } from '../typen';
import { ohneNullen, quersumme, umgedreht, zahlMitStellen, type Bereich } from '../zufall';

export interface Params {
	stellen: Bereich;
	max_wert: number;
}

const gelegt = (w: number): Antwort => ({ typ: 'material', material: normiert(w) });

export function baue(n: number, seed: number, params: Params): Item<Params> {
	return {
		skillId: 'zahl_zu_material',
		seed,
		params,
		prompt: 'Lege die Zahl mit Material.',
		darstellung: { typ: 'zahl', zahl: n },
		loesung: gelegt(n),
		distraktoren: distraktorenNachWert(
			n,
			[
				['nullstelle_fehlt', ohneNullen(n)],
				// alle Ziffern als lose Einer gelegt
				['stellenwert_ignoriert', n >= 10 ? quersumme(n) : undefined],
				['stellendreher', umgedreht(n)],
				['zaehlfehler_stelle', n >= 10 && n + 10 <= 9999 ? n + 10 : undefined],
				['zaehlfehler_eins', n + 1 <= 9999 ? n + 1 : n - 1]
			],
			(w) =>
				w === quersumme(n) && w !== ohneNullen(n)
					? { typ: 'material', material: { E: w } }
					: gelegt(w)
		),
		error_tags: [
			'nullstelle_fehlt',
			'stellenwert_ignoriert',
			'stellendreher',
			'zaehlfehler_stelle',
			'zaehlfehler_eins',
			'sonstiges'
		]
	};
}

export const zahl_zu_material: Generator<Params> = {
	defaults: { stellen: [2, 3], max_wert: 999 },

	generate(params, seed) {
		const rng = new Rng(seed);
		const stellen: Bereich = [params.stellen[0], Math.min(params.stellen[1], 4)];
		return baue(zahlMitStellen(rng, stellen, 'egal', params.max_wert), seed, params);
	},

	bewerte: bewerteNachWert
};
