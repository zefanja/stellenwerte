import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { STELLEN, wert, ziffer } from '../material';
import type { Material } from '../typen';
import { baue, tauschen_entbuendeln, type Params } from './tauschen_entbuendeln';

const mat = (material: Material) => ({ typ: 'material' as const, material });

describe('tauschen_entbuendeln', () => {
	it.each<Params>([
		{ zahl: [21, 99], abzug: [2, 9] },
		{ zahl: [100, 999], abzug: [2, 99] },
		{ zahl: [100, 999], abzug: [2, 9] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(tauschen_entbuendeln, params, (item) => {
			if (item.darstellung.typ !== 'wegnahme') throw new Error('Darstellung');
			const { zahl, abzug, material } = item.darstellung;
			expect(zahl).toBeGreaterThanOrEqual(params.zahl[0]);
			expect(zahl).toBeLessThanOrEqual(params.zahl[1]);
			expect(abzug).toBeGreaterThanOrEqual(params.abzug[0]);
			expect(abzug).toBeLessThanOrEqual(params.abzug[1]);
			expect(abzug).toBeLessThan(zahl);
			expect(wert(material)).toBe(zahl);
			// ohne Tausch ginge es nicht
			expect(STELLEN.some((s) => ziffer(abzug, s) > (material[s] ?? 0))).toBe(true);
			// Lösung: gleicher Wert, und jede Spalte reicht für die Wegnahme
			if (item.loesung.typ !== 'material') throw new Error('Lösung');
			const l = item.loesung.material;
			expect(wert(l)).toBe(zahl);
			for (const s of STELLEN) expect(l[s] ?? 0).toBeGreaterThanOrEqual(ziffer(abzug, s));
		});
	});

	it('42 − 7: einen Zehner in zehn Einer tauschen', () => {
		const item = baue(42, 7, 1, tauschen_entbuendeln.defaults);
		expect(item.loesung).toEqual(mat({ Z: 3, E: 12 }));
		expect(tauschen_entbuendeln.bewerte(item, mat({ Z: 3, E: 12 })).correct).toBe(true);
		// mehr als nötig tauschen ist nicht falsch, nur umständlich
		expect(tauschen_entbuendeln.bewerte(item, mat({ Z: 2, E: 22 })).correct).toBe(true);
		expect(tauschen_entbuendeln.bewerte(item, mat({ Z: 4, E: 2 })).error_tag).toBe(
			'kein_entbuendeln'
		);
		expect(tauschen_entbuendeln.bewerte(item, mat({ Z: 3, E: 2 })).error_tag).toBe(
			'wert_veraendert'
		);
		expect(tauschen_entbuendeln.bewerte(item, mat({ Z: 3, E: 11 })).error_tag).toBe(
			'wert_veraendert'
		);
	});

	it('403 − 5: über die leere Zehnerstelle hinweg tauschen', () => {
		const item = baue(403, 5, 1, tauschen_entbuendeln.defaults);
		expect(item.loesung).toEqual(mat({ H: 3, Z: 9, E: 13 }));
		expect(tauschen_entbuendeln.bewerte(item, mat({ H: 3, Z: 10, E: 3 })).error_tag).toBe(
			'entbuendeln_unvollstaendig'
		);
		expect(tauschen_entbuendeln.bewerte(item, mat({ H: 4, Z: 0, E: 3 })).error_tag).toBe(
			'kein_entbuendeln'
		);
	});
});
