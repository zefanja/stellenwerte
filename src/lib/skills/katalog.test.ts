import { describe, expect, it } from 'vitest';
import { KATALOG, SKILLS } from './katalog';

describe('Skill-Katalog', () => {
	it('enthält zwölf Skills mit eindeutigen IDs', () => {
		expect(KATALOG).toHaveLength(12);
		expect(SKILLS.size).toBe(12);
	});

	it('Voraussetzungen existieren, liegen nicht später und sind zyklenfrei', () => {
		for (const s of KATALOG) {
			for (const v of s.voraussetzungen) {
				const vor = SKILLS.get(v);
				expect(vor, `${s.id} → ${v}`).toBeDefined();
				expect(vor!.woche).toBeLessThanOrEqual(s.woche);
				expect(KATALOG.indexOf(vor!)).toBeLessThan(KATALOG.indexOf(s));
			}
		}
	});

	it('alle zwölf Skills haben einen Generator, der mit Standard- und Woche-6-Parametern läuft', () => {
		for (const s of KATALOG) {
			expect(s.generator, s.id).not.toBeNull();
			for (const params of [s.params_default, ...(s.params_woche6 ?? [])]) {
				for (let seed = 1; seed <= 50; seed++) {
					const item = s.generator!.generate(params, seed);
					expect(item.skillId).toBe(s.id);
					expect(s.generator!.bewerte(item, item.loesung).correct).toBe(true);
				}
			}
		}
	});

	it('Woche 6 erweitert genau Bündel zählen, Zahlenstrahl und Vergleichen um Dezimalzahlen', () => {
		expect(KATALOG.filter((s) => s.params_woche6).map((s) => s.id)).toEqual([
			'buendel_zaehlen',
			'zahlenstrahl',
			'zahlen_vergleichen'
		]);
	});
});
