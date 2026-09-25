import type { Rng } from './rng';

export type Bereich = [min: number, max: number];

/**
 * Zahl mit einer Stellenanzahl aus `stellen`. `nullen`: 'nie' = keine Ziffer 0,
 * 'mindestens_eine' = mindestens eine 0 (nicht vorn), 'egal' = gleichverteilt.
 */
export function zahlMitStellen(
	rng: Rng,
	stellen: Bereich,
	nullen: 'nie' | 'mindestens_eine' | 'egal',
	maxWert = Infinity
): number {
	for (let versuch = 0; versuch < 1000; versuch++) {
		const laenge = rng.int(stellen[0], stellen[1]);
		if (nullen === 'mindestens_eine' && laenge < 2) continue;
		const ziffern = [rng.int(1, 9)];
		for (let i = 1; i < laenge; i++) ziffern.push(nullen === 'nie' ? rng.int(1, 9) : rng.int(0, 9));
		if (nullen === 'mindestens_eine' && !ziffern.includes(0)) ziffern[rng.int(1, laenge - 1)] = 0;
		const n = Number(ziffern.join(''));
		if (n <= maxWert) return n;
	}
	throw new RangeError(`keine Zahl mit ${stellen.join('–')} Stellen ≤ ${maxWert} gefunden`);
}

export const ohneNullen = (n: number) => Number(String(n).replaceAll('0', '') || '0');
export const umgedreht = (n: number) => Number([...String(n)].reverse().join(''));
export const quersumme = (n: number) => [...String(n)].reduce((s, z) => s + Number(z), 0);
