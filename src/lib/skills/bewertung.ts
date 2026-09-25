import type { ErrorTag } from './fehler';
import { STELLEN, istGueltigesMaterial, wert } from './material';
import type { Antwort, Bewertung, Distraktor, Item } from './typen';

export const RICHTIG: Bewertung = { correct: true, error_tag: null };
export const falsch = (error_tag: ErrorTag): Bewertung => ({ correct: false, error_tag });

export function antwortWert(a: Antwort): number {
	switch (a.typ) {
		case 'zahl':
			return a.wert;
		case 'material':
			return wert(a.material);
		case 'kette':
			return a.werte.at(-1) ?? NaN;
		case 'vergleich':
			return a.groessere;
	}
}

/** Gleichheit für Dezimalzahlen: Werte entstehen aus ganzen Zahlen, Abweichungen nur durch Rundung */
export const gleich = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** Vergleichsschlüssel: gleiche Antworten, auch bei fehlenden Nullspalten, ergeben denselben Schlüssel. */
export function antwortSchluessel(a: Antwort): string {
	switch (a.typ) {
		case 'zahl':
			return `z:${a.wert}`;
		case 'material':
			return `m:${STELLEN.map((s) => a.material[s] ?? 0).join(',')}`;
		case 'kette':
			return `k:${a.werte.join(',')}`;
		case 'vergleich':
			return `v:${a.groessere}:${a.stelle}`;
	}
}

export const zahl = (wert: number): Antwort => ({ typ: 'zahl', wert });

/**
 * Baut die Distraktorliste aus Kandidaten in Prioritätsreihenfolge: Bei gleichem Wert gewinnt der
 * erste Fehlertyp. Kandidaten gleich der Lösung, negativ oder undefiniert entfallen.
 */
export function distraktorenNachWert(
	loesung: number,
	kandidaten: [ErrorTag, number | undefined][],
	alsAntwort: (w: number) => Antwort = zahl
): Distraktor[] {
	const gesehen = new Set<number>([loesung]);
	const result: Distraktor[] = [];
	for (const [error_tag, w] of kandidaten) {
		if (w === undefined || !Number.isFinite(w) || w < 0 || gesehen.has(w)) continue;
		gesehen.add(w);
		result.push({ antwort: alsAntwort(w), error_tag });
	}
	return result;
}

/**
 * Standardbewertung für Aufgaben, deren Antwort eine Zahl (oder ein Material mit Zahlwert) ist:
 * richtig bei gleichem Wert, sonst Fehlertyp des passenden Distraktors, sonst allgemeine Muster.
 */
export function bewerteNachWert(item: Item, antwort: Antwort): Bewertung {
	if (antwort.typ !== item.loesung.typ) return falsch('sonstiges');
	if (antwort.typ === 'zahl' && !Number.isFinite(antwort.wert)) return falsch('sonstiges');
	if (antwort.typ === 'material' && !istGueltigesMaterial(antwort.material))
		return falsch('sonstiges');

	const w = antwortWert(antwort);
	const l = antwortWert(item.loesung);
	if (gleich(w, l)) return RICHTIG;

	const d = item.distraktoren.find((d) => gleich(antwortWert(d.antwort), w));
	if (d) return falsch(d.error_tag);
	if (Number.isInteger(l) && gleich(Math.abs(w - l), 1)) return falsch('zaehlfehler_eins');
	if (item.error_tags.includes('zaehlfehler_stelle') && [10, 100, 1000].includes(Math.abs(w - l))) {
		return falsch('zaehlfehler_stelle');
	}
	return falsch('sonstiges');
}
