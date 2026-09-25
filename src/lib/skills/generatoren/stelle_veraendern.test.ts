import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { baue, stelle_veraendern, type Params } from './stelle_veraendern';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('stelle_veraendern', () => {
	it.each<Params>([
		{
			schritte: [1, 10, 100, 1000],
			mit_uebergang: true,
			zahlenraum: [100, 9999],
			operationen: ['+', '−']
		},
		{
			schritte: [1, 10, 100],
			mit_uebergang: false,
			zahlenraum: [100, 9999],
			operationen: ['+', '−']
		},
		{ schritte: [10], mit_uebergang: true, zahlenraum: [100, 999], operationen: ['+'] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(stelle_veraendern, params, (item) => {
			if (item.darstellung.typ !== 'rechnung' || item.loesung.typ !== 'zahl')
				throw new Error('Typ');
			const { zahl: n, op, schritt } = item.darstellung;
			expect(params.schritte).toContain(schritt);
			expect(params.operationen).toContain(op);
			expect(n).toBeGreaterThanOrEqual(params.zahlenraum[0]);
			expect(n).toBeLessThanOrEqual(params.zahlenraum[1]);
			const ergebnis = op === '+' ? n + schritt : n - schritt;
			expect(item.loesung.wert).toBe(ergebnis);
			expect(ergebnis).toBeGreaterThanOrEqual(0);
			expect(ergebnis).toBeLessThanOrEqual(9999);
			// Übergang: eine höhere Stelle ändert sich mit
			const uebergang = Math.floor(n / (schritt * 10)) !== Math.floor(ergebnis / (schritt * 10));
			expect(uebergang).toBe(params.mit_uebergang);
		});
	});

	it('399 + 1: 3910 ist Stelle isoliert, 390 Übertrag vergessen', () => {
		const item = baue(399, '+', 1, 1, stelle_veraendern.defaults);
		expect(stelle_veraendern.bewerte(item, zahl(400)).correct).toBe(true);
		expect(stelle_veraendern.bewerte(item, zahl(3910)).error_tag).toBe('stelle_isoliert');
		expect(stelle_veraendern.bewerte(item, zahl(390)).error_tag).toBe('uebertrag_vergessen');
		expect(stelle_veraendern.bewerte(item, zahl(409)).error_tag).toBe('falsche_stelle');
		expect(stelle_veraendern.bewerte(item, zahl(401)).error_tag).toBe('zaehlfehler_eins');
	});

	it('1 000 − 1 → 1009 ist Stelle isoliert; 4 090 + 10 = 4 100', () => {
		expect(
			stelle_veraendern.bewerte(baue(1000, '−', 1, 1, stelle_veraendern.defaults), zahl(1009))
				.error_tag
		).toBe('stelle_isoliert');
		expect(
			stelle_veraendern.bewerte(baue(4090, '+', 10, 1, stelle_veraendern.defaults), zahl(4100))
				.correct
		).toBe(true);
	});
});
