import type { Operation, StellenName } from './typen';

/**
 * Stellenwerte als Zehnerpotenzen: E = 0, Z = 1, … z = −1, h = −2. Rechnen findet immer in ganzen
 * Einheiten der kleinsten Stelle statt; Dezimalzahlen entstehen erst ganz am Ende durch eine Division.
 */
export const EXPONENT: Record<StellenName, number> = {
	ZT: 4,
	T: 3,
	H: 2,
	Z: 1,
	E: 0,
	z: -1,
	h: -2,
	t: -3
};
export const STELLEN_NAME: Record<StellenName, string> = {
	ZT: 'Zehntausender',
	T: 'Tausender',
	H: 'Hunderter',
	Z: 'Zehner',
	E: 'Einer',
	z: 'Zehntel',
	h: 'Hundertstel',
	t: 'Tausendstel'
};
const NACH_EXPONENT = Object.fromEntries(
	Object.entries(EXPONENT).map(([k, v]) => [v, k])
) as Record<number, StellenName>;

export const stelleMitExponent = (e: number): StellenName | undefined => NACH_EXPONENT[e];

/** Nachkommastellen einer Zahl (für Zahlen, die aus ganzen Zahlen durch 10^k entstanden sind) */
export function nachkommastellen(n: number): number {
	const s = String(n);
	return s.includes('.') ? s.split('.')[1].length : 0;
}

/** Ziffer an der Stelle mit Exponent e */
export function zifferAn(n: number, e: number): number {
	const k = Math.max(0, -e, nachkommastellen(n));
	const ganz = Math.round(n * 10 ** k);
	return Math.floor(ganz / 10 ** (e + k)) % 10;
}

/**
 * „Stelle isoliert“: nur die Ziffer an der Stelle des Schritts ändert sich, als stünde sie allein.
 * 399 + 1 → 3 9 10 → 3910; 1000 − 1 → 100 9 → 1009. Ganze Zahlen, Schritt eine Zehnerpotenz.
 */
export function isoliert(n: number, schritt: number, op: Operation): number {
	const d = Math.floor(n / schritt) % 10;
	const links = Math.floor(n / (schritt * 10));
	const rechts = String(n % schritt).padStart(String(schritt).length - 1, '0');
	const neu = op === '+' ? d + 1 : (d + 9) % 10;
	return Number(`${links || ''}${neu}${schritt > 1 ? rechts : ''}`);
}

/** Übertrag vergessen: 9 + 1 wird zu 0, aber die nächste Stelle wächst nicht (399 + 1 → 390) */
export function ohneUebertrag(n: number, schritt: number): number {
	const d = Math.floor(n / schritt) % 10;
	return n + (((d + 1) % 10) - d) * schritt;
}
