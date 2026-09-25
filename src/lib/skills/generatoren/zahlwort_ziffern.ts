import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { Rng } from '../rng';
import type { Generator, Item } from '../typen';
import { zahlwort } from '../zahlwort';
import { ohneNullen, zahlMitStellen, type Bereich } from '../zufall';

export interface Params {
	stellen: Bereich;
	/** true: jede Zahl enthält mindestens eine 0, false: keine */
	mit_nullstellen: boolean;
}

/** Zehner und Einer jeder Dreiergruppe vertauscht, wo das Zahlwort die Einer zuerst nennt (dreiundvierzig, dreizehn) */
function stellendreher(n: number): number {
	const dreh = (g: number) => {
		const h = Math.floor(g / 100);
		const z = Math.floor(g / 10) % 10;
		const e = g % 10;
		const einerZuerst = e > 0 && (z >= 2 || (z === 1 && e >= 3));
		return einerZuerst ? h * 100 + e * 10 + z : g;
	};
	return dreh(Math.floor(n / 1000)) * 1000 + dreh(n % 1000);
}

/** Gesprochene Teile hintereinander geschrieben: zweitausend | dreiundvierzig → 2000|43 */
function verkettet(n: number): number | undefined {
	const teile = [Math.floor(n / 1000) * 1000, Math.floor((n % 1000) / 100) * 100, n % 100].filter(
		(t) => t > 0
	);
	return teile.length >= 2 ? Number(teile.join('')) : undefined;
}

export function baue(n: number, seed: number, params: Params): Item<Params> {
	return {
		skillId: 'zahlwort_ziffern',
		seed,
		params,
		prompt: 'Schreibe die Zahl mit Ziffern.',
		darstellung: { typ: 'zahlwort', wort: zahlwort(n) },
		loesung: zahl(n),
		distraktoren: distraktorenNachWert(n, [
			['stellendreher', stellendreher(n)],
			['nullstelle_fehlt', ohneNullen(n)],
			['verkettet', verkettet(n)]
		]),
		error_tags: ['stellendreher', 'nullstelle_fehlt', 'verkettet', 'zaehlfehler_eins', 'sonstiges']
	};
}

export const zahlwort_ziffern: Generator<Params> = {
	defaults: { stellen: [2, 3], mit_nullstellen: false },

	generate(params, seed) {
		const rng = new Rng(seed);
		const stellen: Bereich = [params.stellen[0], Math.min(params.stellen[1], 6)];
		return baue(
			zahlMitStellen(rng, stellen, params.mit_nullstellen ? 'mindestens_eine' : 'nie'),
			seed,
			params
		);
	},

	bewerte: bewerteNachWert
};
