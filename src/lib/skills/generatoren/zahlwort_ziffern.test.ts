import { describe, expect, it } from 'vitest';
import { pruefeGenerator } from '../testhilfe';
import { zahlwort } from '../zahlwort';
import { baue, zahlwort_ziffern, type Params } from './zahlwort_ziffern';

const zahl = (wert: number) => ({ typ: 'zahl' as const, wert });

describe('zahlwort_ziffern', () => {
	it.each<Params>([
		{ stellen: [2, 2], mit_nullstellen: false },
		{ stellen: [3, 4], mit_nullstellen: true },
		{ stellen: [4, 6], mit_nullstellen: false },
		{ stellen: [5, 6], mit_nullstellen: true }
	])('200 Items lösbar und in den Grenzen: %o', (params) => {
		pruefeGenerator(zahlwort_ziffern, params, (item) => {
			if (item.darstellung.typ !== 'zahlwort' || item.loesung.typ !== 'zahl')
				throw new Error('Typ');
			const n = item.loesung.wert;
			expect(item.darstellung.wort).toBe(zahlwort(n));
			expect(String(n).length).toBeGreaterThanOrEqual(params.stellen[0]);
			expect(String(n).length).toBeLessThanOrEqual(params.stellen[1]);
			expect(String(n).includes('0')).toBe(params.mit_nullstellen);
		});
	});

	it('dreiundvierzig → 34 ist ein Stellendreher', () => {
		const item = baue(43, 1, zahlwort_ziffern.defaults);
		expect(zahlwort_ziffern.bewerte(item, zahl(43)).correct).toBe(true);
		expect(zahlwort_ziffern.bewerte(item, zahl(34)).error_tag).toBe('stellendreher');
	});

	it('siebzehn → 71 ist ein Stellendreher', () => {
		const item = baue(17, 1, zahlwort_ziffern.defaults);
		expect(zahlwort_ziffern.bewerte(item, zahl(71)).error_tag).toBe('stellendreher');
	});

	it('dreihundertfünf: Nullstelle und Verkettung', () => {
		const item = baue(305, 1, zahlwort_ziffern.defaults);
		expect(zahlwort_ziffern.bewerte(item, zahl(35)).error_tag).toBe('nullstelle_fehlt');
		expect(zahlwort_ziffern.bewerte(item, zahl(3005)).error_tag).toBe('verkettet');
	});

	it('zweitausenddreiundvierzig: Dreher, Nullstelle und Verkettung', () => {
		const item = baue(2043, 1, zahlwort_ziffern.defaults);
		expect(zahlwort_ziffern.bewerte(item, zahl(2034)).error_tag).toBe('stellendreher');
		expect(zahlwort_ziffern.bewerte(item, zahl(243)).error_tag).toBe('nullstelle_fehlt');
		expect(zahlwort_ziffern.bewerte(item, zahl(200043)).error_tag).toBe('verkettet');
	});
});
