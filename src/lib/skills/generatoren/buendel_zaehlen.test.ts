import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { STELLENWERT } from '../material';
import { baue, buendel_zaehlen, type Params } from './buendel_zaehlen';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('buendel_zaehlen', () => {
	it.each<Params>([
		{ zielstelle: 'Z', zahlenraum: [100, 999] },
		{ zielstelle: 'H', zahlenraum: [1000, 9999] },
		{ zielstelle: 'Z', zahlenraum: [1000, 9999] },
		{ zielstelle: 'T', zahlenraum: [10000, 99999] }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(buendel_zaehlen, params, (item) => {
			if (item.darstellung.typ !== 'buendel') throw new Error('Darstellung');
			const { zahl: n, stelle } = item.darstellung;
			expect(stelle).toBe(params.zielstelle);
			expect(n).toBeGreaterThanOrEqual(params.zahlenraum[0]);
			expect(n).toBeLessThanOrEqual(params.zahlenraum[1]);
			const antwort = Math.floor(n / STELLENWERT[stelle]);
			expect(antwort).toBeGreaterThanOrEqual(10); // sonst wären Ziffer und Bündelzahl gleich
			expect(item.loesung).toEqual(zahl(antwort));
		});
	});

	it('Wie viele Zehner stecken in 340? 4 ist die Ziffer, nicht die Bündel', () => {
		const item = baue(340, 'Z', 1, buendel_zaehlen.defaults);
		expect(buendel_zaehlen.bewerte(item, zahl(34)).correct).toBe(true);
		expect(buendel_zaehlen.bewerte(item, zahl(4)).error_tag).toBe('ziffer_statt_buendel');
		expect(buendel_zaehlen.bewerte(item, zahl(3)).error_tag).toBe('falsche_stelle');
		expect(buendel_zaehlen.bewerte(item, zahl(35)).error_tag).toBe('zaehlfehler_eins');
	});

	it('Wie viele Zehner stecken in 347? 35 ist gerundet', () => {
		const item = baue(347, 'Z', 1, buendel_zaehlen.defaults);
		expect(buendel_zaehlen.bewerte(item, zahl(35)).error_tag).toBe('gerundet');
	});
});
