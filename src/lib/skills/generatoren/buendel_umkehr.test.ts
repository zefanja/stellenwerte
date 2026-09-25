import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { STELLENWERT } from '../material';
import { baue, buendel_umkehr, type Params } from './buendel_umkehr';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('buendel_umkehr', () => {
	it.each<Params>([
		{ zielstelle: 'Z', zahlenraum: [100, 999] },
		{ zielstelle: 'H', zahlenraum: [1000, 9999] },
		{ zielstelle: 'T', zahlenraum: [10000, 99999] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(buendel_umkehr, params, (item) => {
			if (item.darstellung.typ !== 'buendel_umkehr' || item.loesung.typ !== 'zahl')
				throw new Error('Typ');
			const { anzahl, stelle } = item.darstellung;
			expect(stelle).toBe(params.zielstelle);
			expect(anzahl).toBeGreaterThanOrEqual(10);
			expect(item.loesung.wert).toBe(anzahl * STELLENWERT[stelle]);
			expect(item.loesung.wert).toBeGreaterThanOrEqual(params.zahlenraum[0]);
			expect(item.loesung.wert).toBeLessThanOrEqual(params.zahlenraum[1]);
		});
	});

	it('34 Zehner sind 340', () => {
		const item = baue(34, 'Z', 1, buendel_umkehr.defaults);
		expect(buendel_umkehr.bewerte(item, zahl(340)).correct).toBe(true);
		expect(buendel_umkehr.bewerte(item, zahl(34)).error_tag).toBe('anzahl_abgeschrieben');
		expect(buendel_umkehr.bewerte(item, zahl(3400)).error_tag).toBe('falsche_stelle');
		expect(buendel_umkehr.bewerte(item, zahl(341)).error_tag).toBe('zaehlfehler_eins');
	});
});
