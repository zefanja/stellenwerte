import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { STELLENNAME, STELLENWERT } from '../material';
import { Rng } from '../rng';
import type { Generator, Item, Stelle } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	zielstelle: Exclude<Stelle, 'E'>;
	/** Bereich der gesuchten Zahl */
	zahlenraum: Bereich;
}

export function baue(
	anzahl: number,
	stelle: Exclude<Stelle, 'E'>,
	seed: number,
	params: Params
): Item<Params> {
	const w = STELLENWERT[stelle];
	const n = anzahl * w;
	return {
		skillId: 'buendel_umkehr',
		seed,
		params,
		prompt: `${anzahl} ${STELLENNAME[stelle].mehrzahl} sind welche Zahl?`,
		darstellung: { typ: 'buendel_umkehr', anzahl, stelle },
		loesung: zahl(n),
		distraktoren: distraktorenNachWert(n, [
			['anzahl_abgeschrieben', anzahl],
			['falsche_stelle', anzahl * w * 10],
			['falsche_stelle', anzahl * (w / 10)]
		]),
		error_tags: ['anzahl_abgeschrieben', 'falsche_stelle', 'zaehlfehler_eins', 'sonstiges']
	};
}

export const buendel_umkehr: Generator<Params> = {
	defaults: { zielstelle: 'Z', zahlenraum: [100, 999] },

	generate(params, seed) {
		const rng = new Rng(seed);
		const w = STELLENWERT[params.zielstelle];
		const min = Math.max(10, Math.ceil(params.zahlenraum[0] / w));
		const max = Math.floor(params.zahlenraum[1] / w);
		if (min > max) throw new RangeError('Zahlenraum zu klein für die Zielstelle');
		return baue(rng.int(min, max), params.zielstelle, seed, params);
	},

	bewerte: bewerteNachWert
};
