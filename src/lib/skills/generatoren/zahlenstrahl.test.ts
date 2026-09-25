import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { baue, zahlenstrahl, type Params } from './zahlenstrahl';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('zahlenstrahl', () => {
	it.each<Params>([
		{
			intervalle: [
				[0, 100],
				[0, 1000],
				[300, 400]
			],
			toleranz_prozent: 5,
			modus: 'zufall',
			nachkommastellen: 0
		},
		{
			intervalle: [
				[0, 1],
				[2, 3]
			],
			toleranz_prozent: 5,
			modus: 'verorten',
			nachkommastellen: 2
		},
		{ intervalle: [[0, 10000]], toleranz_prozent: 4, modus: 'ablesen', nachkommastellen: 0 }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(zahlenstrahl, params, (item) => {
			if (item.darstellung.typ !== 'strahl' || item.loesung.typ !== 'zahl') throw new Error('Typ');
			const { von, bis, zahl: n, raster, modus } = item.darstellung;
			expect(params.intervalle).toContainEqual([von, bis]);
			if (params.modus !== 'zufall') expect(modus).toBe(params.modus);
			// nicht zu nah an den Enden, sonst ist es kein Schätzen
			expect(n).toBeGreaterThan(von + 0.04 * (bis - von));
			expect(n).toBeLessThan(bis - 0.04 * (bis - von));
			expect(item.loesung.wert).toBe(n);
			// liegt auf dem Raster des Reglers
			expect(Math.abs(n / raster - Math.round(n / raster))).toBeLessThan(1e-9);
		});
	});

	it('0 bis 1000, Zahl 750: Toleranz, ungefähr und Stellenverwechslung', () => {
		const item = baue(0, 1000, 750, 'verorten', 1, zahlenstrahl.defaults);
		expect(zahlenstrahl.bewerte(item, zahl(770)).correct).toBe(true);
		expect(zahlenstrahl.bewerte(item, zahl(830)).error_tag).toBe('ungenau');
		expect(zahlenstrahl.bewerte(item, zahl(75)).error_tag).toBe('falsche_stelle');
		expect(zahlenstrahl.bewerte(item, zahl(300)).error_tag).toBe('sonstiges');
	});

	it('Dezimalzahlen: 0,7 bei 0,07 gesucht ist eine Stellenverwechslung', () => {
		const item = baue(0, 1, 0.07, 'verorten', 1, { ...zahlenstrahl.defaults, nachkommastellen: 2 });
		expect(zahlenstrahl.bewerte(item, zahl(0.08)).correct).toBe(true);
		expect(zahlenstrahl.bewerte(item, zahl(0.7)).error_tag).toBe('falsche_stelle');
	});
});
