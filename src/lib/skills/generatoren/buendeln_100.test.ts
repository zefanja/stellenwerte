import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { wert } from '../material';
import { baue, buendeln_100, type Params } from './buendeln_100';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('buendeln_100', () => {
	it.each<Params>([
		{ max_anzahl: 100, mit_rest: true, max_lose_einer: 30 },
		{ max_anzahl: 100, mit_rest: false, max_lose_einer: 30 },
		{ max_anzahl: 40, mit_rest: true, max_lose_einer: 19 }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(buendeln_100, params, (item) => {
			if (item.darstellung.typ !== 'material') throw new Error('Darstellung');
			const m = item.darstellung.material;
			const n = wert(m);
			expect(n).toBeLessThanOrEqual(params.max_anzahl);
			expect(n).toBeGreaterThanOrEqual(10);
			expect(n % 10 !== 0).toBe(params.mit_rest);
			// es muss wirklich gebündelt werden, aber nicht zu viele lose Würfel
			expect(m.E).toBeGreaterThanOrEqual(10);
			expect(m.E).toBeLessThanOrEqual(params.max_lose_einer);
			expect(item.loesung).toEqual(zahl(n));
		});
	});

	it('erkennt nicht umgebündelten Überschuss: 2 Z 14 E → 214', () => {
		const item = baue({ zehner: 2, einer: 14 }, 1, buendeln_100.defaults);
		expect(buendeln_100.bewerte(item, zahl(34)).correct).toBe(true);
		expect(buendeln_100.bewerte(item, zahl(214)).error_tag).toBe('kein_umbuendeln');
		expect(buendeln_100.bewerte(item, zahl(43)).error_tag).toBe('stellendreher');
		expect(buendeln_100.bewerte(item, zahl(33)).error_tag).toBe('zaehlfehler_eins');
		expect(buendeln_100.bewerte(item, zahl(17)).error_tag).toBe('sonstiges');
	});
});
