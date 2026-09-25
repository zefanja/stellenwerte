import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { STELLEN, wert } from '../material';
import { baue, nicht_normiert, type Params } from './nicht_normiert';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('nicht_normiert', () => {
	it.each<Params>([
		{ ueberschuss_stelle: 'Z', stellen: 3, max_ueberschuss: 19 },
		{ ueberschuss_stelle: 'E', stellen: 2, max_ueberschuss: 19 },
		{ ueberschuss_stelle: 'zufall', stellen: 3, max_ueberschuss: 29 },
		{ ueberschuss_stelle: 'H', stellen: 4, max_ueberschuss: 19 }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(nicht_normiert, params, (item) => {
			if (item.darstellung.typ !== 'stellen') throw new Error('Darstellung');
			const m = item.darstellung.material;
			const spalten = STELLEN.filter((s) => m[s] !== undefined);
			expect(spalten.length).toBe(params.stellen);
			const ueber = spalten.filter((s) => m[s]! >= 10);
			expect(ueber.length).toBe(1);
			expect(ueber[0]).not.toBe(spalten[0]); // nie die höchste Spalte, sonst wäre Verketten richtig
			if (params.ueberschuss_stelle !== 'zufall') expect(ueber[0]).toBe(params.ueberschuss_stelle);
			expect(m[ueber[0]]).toBeLessThanOrEqual(params.max_ueberschuss);
			expect(item.loesung).toEqual(zahl(wert(m)));
		});
	});

	it('4 H 13 Z 2 E → 4132 ist nicht umgebündelt', () => {
		const item = baue({ H: 4, Z: 13, E: 2 }, 1, nicht_normiert.defaults);
		expect(nicht_normiert.bewerte(item, zahl(532)).correct).toBe(true);
		expect(nicht_normiert.bewerte(item, zahl(4132)).error_tag).toBe('kein_umbuendeln');
		expect(nicht_normiert.bewerte(item, zahl(432)).error_tag).toBe('uebertrag_vergessen');
		expect(nicht_normiert.bewerte(item, zahl(531)).error_tag).toBe('zaehlfehler_eins');
	});
});
