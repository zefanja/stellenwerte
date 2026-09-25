import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { baue, rechenkette, type Params } from './rechenkette';

const kette = (...werte: number[]) => ({ typ: 'kette' as const, werte });

describe('rechenkette', () => {
	it.each<Params>([
		{
			start: [100, 9000],
			schritte: [1, 10, 100],
			laenge: [3, 5],
			mit_uebergang: true,
			operationen: ['+', '−']
		},
		{
			start: [100, 9000],
			schritte: [10, 100],
			laenge: [3, 4],
			mit_uebergang: false,
			operationen: ['+']
		},
		{ start: [20, 900], schritte: [10], laenge: [4, 4], mit_uebergang: true, operationen: ['−'] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(rechenkette, params, (item) => {
			if (item.darstellung.typ !== 'kette' || item.loesung.typ !== 'kette') throw new Error('Typ');
			const { start, ziel, op, schritt, laenge } = item.darstellung;
			expect(params.schritte).toContain(schritt);
			expect(laenge).toBeGreaterThanOrEqual(params.laenge[0]);
			expect(laenge).toBeLessThanOrEqual(params.laenge[1]);
			const alle = [start, ...item.loesung.werte, ziel];
			expect(alle).toHaveLength(laenge + 2);
			for (let i = 1; i < alle.length; i++) {
				expect(alle[i] - alle[i - 1]).toBe(op === '+' ? schritt : -schritt);
				expect(alle[i]).toBeGreaterThanOrEqual(0);
				expect(alle[i]).toBeLessThanOrEqual(9999);
			}
			// Übergang innerhalb der Lücken: eine höhere Stelle springt mit
			const lueckenMitVorgaenger = [start, ...item.loesung.werte];
			const uebergang = lueckenMitVorgaenger.some(
				(v, i) =>
					i > 0 &&
					Math.floor(v / (schritt * 10)) !==
						Math.floor(lueckenMitVorgaenger[i - 1] / (schritt * 10))
			);
			expect(uebergang).toBe(params.mit_uebergang);
		});
	});

	it('370 … 410: Fehler werden am ersten falschen Schritt eingeordnet', () => {
		const item = baue(370, '+', 10, 3, 1, rechenkette.defaults);
		expect(item.loesung).toEqual(kette(380, 390, 400));
		expect(rechenkette.bewerte(item, kette(380, 390, 400)).correct).toBe(true);
		expect(rechenkette.bewerte(item, kette(380, 390, 3100)).error_tag).toBe('stelle_isoliert');
		expect(rechenkette.bewerte(item, kette(380, 390, 300)).error_tag).toBe('uebertrag_vergessen');
		expect(rechenkette.bewerte(item, kette(381, 391, 401)).error_tag).toBe('zaehlfehler_eins');
		expect(rechenkette.bewerte(item, kette(470, 570, 670)).error_tag).toBe('falsche_stelle');
		expect(rechenkette.bewerte(item, kette(380, 390)).error_tag).toBe('sonstiges');
	});
});
