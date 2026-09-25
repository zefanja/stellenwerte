import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { Rng } from '../rng';
import type { Generator, Item } from '../typen';
import { umgedreht } from '../zufall';

export interface Params {
	/** größte Gesamtanzahl, höchstens 100 */
	max_anzahl: number;
	/** true: Einer bleiben übrig (34), false: glatte Zehner (30) */
	mit_rest: boolean;
	/** höchstens so viele lose Würfel auf dem Bildschirm, mindestens 19 */
	max_lose_einer: number;
}

/** Ungeordnete Menge aus fertigen Zehnerstangen und mindestens zehn losen Würfeln */
export function baue(
	menge: { zehner: number; einer: number },
	seed: number,
	params: Params
): Item<Params> {
	const n = menge.zehner * 10 + menge.einer;
	return {
		skillId: 'buendeln_100',
		seed,
		params,
		prompt: 'Bündle zu Zehnern. Wie viele sind es?',
		darstellung: {
			typ: 'material',
			material: { Z: menge.zehner, E: menge.einer },
			anordnung: 'ungeordnet'
		},
		loesung: zahl(n),
		distraktoren: distraktorenNachWert(n, [
			['kein_umbuendeln', menge.zehner > 0 ? Number(`${menge.zehner}${menge.einer}`) : undefined],
			['stellendreher', n < 100 && n % 10 !== 0 ? umgedreht(n) : undefined],
			['zaehlfehler_eins', n - 1],
			['zaehlfehler_eins', n + 1]
		]),
		error_tags: ['kein_umbuendeln', 'stellendreher', 'zaehlfehler_eins', 'sonstiges']
	};
}

export const buendeln_100: Generator<Params> = {
	defaults: { max_anzahl: 100, mit_rest: true, max_lose_einer: 30 },

	generate(params, seed) {
		const rng = new Rng(seed);
		const max = Math.min(100, params.max_anzahl);
		const loseMax = Math.max(19, params.max_lose_einer);
		let n: number;
		if (params.mit_rest) {
			do n = rng.int(11, max);
			while (n % 10 === 0);
		} else {
			n = 10 * rng.int(1, Math.floor(max / 10));
		}
		// so viele Zehner schon gebündelt, dass mindestens 10 und höchstens loseMax Würfel lose liegen
		const zehner = rng.int(Math.max(0, Math.ceil((n - loseMax) / 10)), Math.floor(n / 10) - 1);
		return baue({ zehner, einer: n - 10 * zehner }, seed, params);
	},

	bewerte: bewerteNachWert
};
