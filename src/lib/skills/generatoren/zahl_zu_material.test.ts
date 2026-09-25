import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import type { Material } from '../typen';
import { baue, zahl_zu_material, type Params } from './zahl_zu_material';

const mat = (material: Material) => ({ typ: 'material' as const, material });

describe('zahl_zu_material', () => {
	it.each<Params>([
		{ stellen: [2, 3], max_wert: 999 },
		{ stellen: [3, 4], max_wert: 2500 },
		{ stellen: [2, 2], max_wert: 60 }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(zahl_zu_material, params, (item) => {
			if (item.darstellung.typ !== 'zahl') throw new Error('Darstellung');
			const n = item.darstellung.zahl;
			expect(n).toBeLessThanOrEqual(params.max_wert);
			expect(String(n).length).toBeGreaterThanOrEqual(params.stellen[0]);
			expect(String(n).length).toBeLessThanOrEqual(params.stellen[1]);
		});
	});

	it('305 legen: gleicher Wert zählt, typische Fehler erkannt', () => {
		const item = baue(305, 1, zahl_zu_material.defaults);
		expect(zahl_zu_material.bewerte(item, mat({ H: 3, E: 5 })).correct).toBe(true);
		// nicht normiert gelegt, aber richtiger Wert
		expect(zahl_zu_material.bewerte(item, mat({ H: 2, Z: 10, E: 5 })).correct).toBe(true);
		expect(zahl_zu_material.bewerte(item, mat({ Z: 3, E: 5 })).error_tag).toBe('nullstelle_fehlt');
		expect(zahl_zu_material.bewerte(item, mat({ E: 8 })).error_tag).toBe('stellenwert_ignoriert');
		expect(zahl_zu_material.bewerte(item, mat({ H: 5, E: 3 })).error_tag).toBe('stellendreher');
		expect(zahl_zu_material.bewerte(item, mat({ H: 3, Z: 1, E: 5 })).error_tag).toBe(
			'zaehlfehler_stelle'
		);
		expect(zahl_zu_material.bewerte(item, { typ: 'zahl', wert: 305 }).error_tag).toBe('sonstiges');
	});
});
