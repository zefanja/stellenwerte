import { describe, expect, it } from 'vitest';
import { csv, median, zellStatus } from './regeln';

describe('zellStatus', () => {
	it.each([
		[undefined, 'grau'],
		[{ state: 0, stability: 0, againInFolge: 0 }, 'gelb'],
		[{ state: 2, stability: 9, againInFolge: 0 }, 'gelb'],
		[{ state: 2, stability: 21, againInFolge: 0 }, 'gelb'],
		[{ state: 2, stability: 21.5, againInFolge: 0 }, 'gruen'],
		[{ state: 2, stability: 30, againInFolge: 1 }, 'gruen'],
		[{ state: 2, stability: 30, againInFolge: 2 }, 'rot'],
		[{ state: 0, stability: 0, againInFolge: 3 }, 'rot']
	] as const)('%o → %s', (k, erwartet) => {
		expect(zellStatus(k)).toBe(erwartet);
	});
});

describe('median', () => {
	it('rechnet auch mit Kindern ohne Session', () => {
		expect(median([0, 0, 3, 5])).toBe(1.5);
		expect(median([2, 0, 7])).toBe(2);
		expect(median([])).toBe(0);
	});
});

describe('csv', () => {
	it('schreibt Excel-taugliches CSV und entschärft Formeln', () => {
		const text = csv(
			['Schüler', 'Quote'],
			[
				['L. M.', 87.5],
				['=HYPERLINK("x")', null],
				['A; B', 3]
			]
		);
		expect(text).toBe('﻿Schüler;Quote\r\nL. M.;87,5\r\n"\'=HYPERLINK(""x"")";\r\n"A; B";3\r\n');
	});
});
