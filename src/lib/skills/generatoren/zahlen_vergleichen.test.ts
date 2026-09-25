import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { baue, zahlen_vergleichen, type Params } from './zahlen_vergleichen';

const wahl = (groessere: 0 | 1, stelle: string) => ({
	typ: 'vergleich' as const,
	groessere,
	stelle: stelle as never
});

describe('zahlen_vergleichen', () => {
	it.each<Params>([
		{ stellen: [3, 4], gleiche_ziffern: false, nachkommastellen: [0, 0] },
		{ stellen: [3, 4], gleiche_ziffern: true, nachkommastellen: [0, 0] },
		{ stellen: [1, 1], gleiche_ziffern: false, nachkommastellen: [1, 2] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(zahlen_vergleichen, params, (item) => {
			if (item.darstellung.typ !== 'vergleich' || item.loesung.typ !== 'vergleich')
				throw new Error('Typ');
			const [a, b] = item.darstellung.zahlen;
			expect(a).not.toBe(b);
			expect(item.loesung.groessere).toBe(a > b ? 0 : 1);
			expect(item.darstellung.stellen.length).toBeGreaterThanOrEqual(2);
			expect(item.darstellung.stellen.length).toBeLessThanOrEqual(4);
			expect(item.darstellung.stellen).toContain(item.loesung.stelle);
			if (params.gleiche_ziffern) expect([...String(a)].sort()).toEqual([...String(b)].sort());
		});
	});

	it('2,7 oder 2,13: wer 2,13 wählt, vergleicht Ziffern statt Stellenwerte', () => {
		const item = baue(2.7, 2.13, 1, zahlen_vergleichen.defaults);
		expect(item.loesung).toEqual(wahl(0, 'z'));
		expect(zahlen_vergleichen.bewerte(item, wahl(0, 'z')).correct).toBe(true);
		expect(zahlen_vergleichen.bewerte(item, wahl(1, 'z')).error_tag).toBe('ziffernvergleich');
		expect(zahlen_vergleichen.bewerte(item, wahl(0, 'h')).error_tag).toBe(
			'stelle_falsch_begruendet'
		);
	});

	it('899 oder 1 002: die Tausenderstelle entscheidet', () => {
		const item = baue(899, 1002, 1, zahlen_vergleichen.defaults);
		expect(item.loesung).toEqual(wahl(1, 'T'));
		expect(zahlen_vergleichen.bewerte(item, wahl(0, 'H')).error_tag).toBe('ziffernvergleich');
	});
});
