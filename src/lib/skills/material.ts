import type { Material, Stelle } from './typen';

export const STELLEN: readonly Stelle[] = ['T', 'H', 'Z', 'E'];
export const STELLENWERT: Record<Stelle, number> = { T: 1000, H: 100, Z: 10, E: 1 };
export const STELLENNAME: Record<Stelle, { einzahl: string; mehrzahl: string }> = {
	T: { einzahl: 'Tausender', mehrzahl: 'Tausender' },
	H: { einzahl: 'Hunderter', mehrzahl: 'Hunderter' },
	Z: { einzahl: 'Zehner', mehrzahl: 'Zehner' },
	E: { einzahl: 'Einer', mehrzahl: 'Einer' }
};

export function wert(m: Material): number {
	return STELLEN.reduce((sum, s) => sum + (m[s] ?? 0) * STELLENWERT[s], 0);
}

/** Normierte Darstellung: jede Spalte 0–9, Spalten unterhalb der höchsten sind gesetzt (auch mit 0). */
export function normiert(n: number): Material {
	if (!Number.isInteger(n) || n < 0 || n > 9999) throw new RangeError(`nicht darstellbar: ${n}`);
	const m: Material = {};
	let begonnen = false;
	for (const s of STELLEN) {
		const ziffer = Math.floor(n / STELLENWERT[s]) % 10;
		if (ziffer > 0 || begonnen || s === 'E') {
			m[s] = ziffer;
			begonnen = true;
		}
	}
	return m;
}

/** Zwei Materialzustände sind gleich, wenn jede Spalte gleich viele Teile hat (fehlend = 0). */
export function gleichesMaterial(a: Material, b: Material): boolean {
	return STELLEN.every((s) => (a[s] ?? 0) === (b[s] ?? 0));
}

export function istGueltigesMaterial(m: Material): boolean {
	return STELLEN.every((s) => m[s] === undefined || (Number.isInteger(m[s]) && m[s]! >= 0));
}

/** Ziffer an einer Stelle */
export function ziffer(n: number, s: Stelle): number {
	return Math.floor(n / STELLENWERT[s]) % 10;
}

export function anzahlStellen(n: number): number {
	return String(n).length;
}
