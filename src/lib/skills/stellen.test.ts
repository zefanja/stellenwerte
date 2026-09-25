import { describe, expect, it } from 'vitest';
import { isoliert, nachkommastellen, ohneUebertrag, zifferAn } from './stellen';

describe('Stellen-Hilfen', () => {
	it('Ziffern auch hinter dem Komma', () => {
		expect(zifferAn(340, 1)).toBe(4);
		expect(zifferAn(3.47, -1)).toBe(4);
		expect(zifferAn(3.47, -2)).toBe(7);
		expect(zifferAn(2.7, -2)).toBe(0);
		expect(nachkommastellen(2.13)).toBe(2);
	});

	it('Stelle isoliert, wie in der Fehlertabelle', () => {
		expect(isoliert(399, 1, '+')).toBe(3910);
		expect(isoliert(4090, 10, '+')).toBe(40100);
		expect(isoliert(1000, 1, '−')).toBe(1009);
		expect(isoliert(1000, 10, '−')).toBe(1090);
		expect(isoliert(95, 10, '+')).toBe(105);
	});

	it('Übertrag vergessen', () => {
		expect(ohneUebertrag(399, 1)).toBe(390);
		expect(ohneUebertrag(4090, 10)).toBe(4000);
	});
});
