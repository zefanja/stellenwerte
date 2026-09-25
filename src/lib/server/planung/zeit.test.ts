import { describe, expect, it } from 'vitest';
import { heuteEnde, plusTage, tagVon, tagesbeginn, tageZwischen } from './zeit';

describe('Berliner Kalendertage', () => {
	it('ordnet späte Abende dem Berliner Tag zu', () => {
		expect(tagVon(new Date('2026-09-25T22:30:00Z'))).toBe('2026-09-26'); // 00:30 MESZ
		expect(tagVon(new Date('2026-12-01T22:30:00Z'))).toBe('2026-12-01'); // 23:30 MEZ
	});

	it('findet Mitternacht in Sommer- und Winterzeit und an den Umstellungstagen', () => {
		expect(tagesbeginn('2026-09-26').toISOString()).toBe('2026-09-25T22:00:00.000Z');
		expect(tagesbeginn('2026-12-01').toISOString()).toBe('2026-11-30T23:00:00.000Z');
		expect(tagesbeginn('2026-10-25').toISOString()).toBe('2026-10-24T22:00:00.000Z'); // Umstellung um 3 Uhr
		expect(tagesbeginn('2026-10-26').toISOString()).toBe('2026-10-25T23:00:00.000Z');
		expect(tagesbeginn('2027-03-28').toISOString()).toBe('2027-03-27T23:00:00.000Z');
		expect(tagesbeginn('2027-03-29').toISOString()).toBe('2027-03-28T22:00:00.000Z');
	});

	it('rechnet Tage über Monats- und Jahresgrenzen', () => {
		expect(plusTage('2026-12-30', 3)).toBe('2027-01-02');
		// 24.10. 22 Uhr MESZ: der Tag endet um Mitternacht, vor der Zeitumstellung
		expect(heuteEnde(new Date('2026-10-24T20:00:00Z')).toISOString()).toBe(
			'2026-10-24T22:00:00.000Z'
		);
		expect(tageZwischen(new Date('2026-10-24T20:00:00Z'), new Date('2026-10-26T06:00:00Z'))).toBe(
			2
		);
	});
});
