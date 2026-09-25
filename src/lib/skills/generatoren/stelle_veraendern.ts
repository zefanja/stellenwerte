import { bewerteNachWert, distraktorenNachWert, zahl } from '../bewertung';
import { Rng } from '../rng';
import { isoliert, ohneUebertrag } from '../stellen';
import type { Generator, Item, Operation } from '../typen';
import type { Bereich } from '../zufall';

export interface Params {
	/** Zehnerpotenzen, die addiert oder abgezogen werden */
	schritte: number[];
	/** true: an der Stelle des Schritts entsteht ein Übertrag (399 + 1, 1 000 − 1) */
	mit_uebergang: boolean;
	zahlenraum: Bereich;
	operationen: Operation[];
}

const MAX = 9999;
const uebergang = (n: number, r: number, schritt: number) =>
	Math.floor(n / (schritt * 10)) !== Math.floor(r / (schritt * 10));

export function baue(
	n: number,
	op: Operation,
	schritt: number,
	seed: number,
	params: Params
): Item<Params> {
	const r = op === '+' ? n + schritt : n - schritt;
	const plus = (d: number) => (op === '+' ? n + d : n - d);
	return {
		skillId: 'stelle_veraendern',
		seed,
		params,
		prompt: 'Was kommt heraus?',
		darstellung: { typ: 'rechnung', zahl: n, op, schritt },
		loesung: zahl(r),
		distraktoren: distraktorenNachWert(r, [
			['stelle_isoliert', isoliert(n, schritt, op)],
			['uebertrag_vergessen', op === '+' ? ohneUebertrag(n, schritt) : undefined],
			['falsche_stelle', plus(schritt * 10)],
			['falsche_stelle', schritt >= 10 ? plus(schritt / 10) : undefined]
		]),
		error_tags: [
			'stelle_isoliert',
			'uebertrag_vergessen',
			'falsche_stelle',
			'zaehlfehler_eins',
			'sonstiges'
		]
	};
}

export const stelle_veraendern: Generator<Params> = {
	defaults: {
		schritte: [1, 10, 100, 1000],
		mit_uebergang: true,
		zahlenraum: [100, 9999],
		operationen: ['+', '−']
	},

	generate(params, seed) {
		const rng = new Rng(seed);
		for (let versuch = 0; versuch < 2000; versuch++) {
			const schritt = rng.pick(params.schritte);
			const op = rng.pick(params.operationen);
			let n = rng.int(params.zahlenraum[0], Math.min(params.zahlenraum[1], MAX));
			if (params.mit_uebergang) {
				// Ziffer an der Stelle auf 9 (plus) bzw. 0 (minus) setzen, manchmal auch die nächste: 3 990 + 10
				const ziel = op === '+' ? 9 : 0;
				for (const s of rng.chance(0.5) ? [schritt, schritt * 10] : [schritt]) {
					n += (ziel - (Math.floor(n / s) % 10)) * s;
				}
			}
			const r = op === '+' ? n + schritt : n - schritt;
			if (n < params.zahlenraum[0] || n > params.zahlenraum[1] || r < 0 || r > MAX) continue;
			if (uebergang(n, r, schritt) !== params.mit_uebergang) continue;
			return baue(n, op, schritt, seed, params);
		}
		throw new RangeError('keine Aufgabe in diesen Grenzen');
	},

	bewerte: bewerteNachWert
};
