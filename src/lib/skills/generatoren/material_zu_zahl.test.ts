import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { STELLEN, wert } from '../material';
import { baue, material_zu_zahl, type Params } from './material_zu_zahl';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('material_zu_zahl', () => {
	it.each<Params>([
		{ stellen: [2, 3], nullstellen_erlaubt: true },
		{ stellen: [2, 4], nullstellen_erlaubt: false },
		{ stellen: [4, 4], nullstellen_erlaubt: true }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(material_zu_zahl, params, (item) => {
			if (item.darstellung.typ !== 'material') throw new Error('Darstellung');
			const n = wert(item.darstellung.material);
			expect(String(n).length).toBeGreaterThanOrEqual(params.stellen[0]);
			expect(String(n).length).toBeLessThanOrEqual(params.stellen[1]);
			if (!params.nullstellen_erlaubt) expect(String(n)).not.toContain('0');
			for (const s of STELLEN) expect(item.darstellung.material[s] ?? 0).toBeLessThanOrEqual(9);
			expect(item.loesung).toEqual(zahl(n));
		});
	});

	it('3 H 0 Z 5 E: typische Fehler', () => {
		const item = baue(305, 1, material_zu_zahl.defaults);
		expect(material_zu_zahl.bewerte(item, zahl(305)).correct).toBe(true);
		expect(material_zu_zahl.bewerte(item, zahl(35)).error_tag).toBe('nullstelle_fehlt');
		expect(material_zu_zahl.bewerte(item, zahl(8)).error_tag).toBe('stellenwert_ignoriert');
		expect(material_zu_zahl.bewerte(item, zahl(304)).error_tag).toBe('zaehlfehler_eins');
		expect(material_zu_zahl.bewerte(item, zahl(315)).error_tag).toBe('zaehlfehler_stelle');
		expect(material_zu_zahl.bewerte(item, zahl(205)).error_tag).toBe('zaehlfehler_stelle');
	});
});
