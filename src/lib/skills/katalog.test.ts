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

	it('Wochen 1 bis 3 haben einen Generator, der mit den Standardparametern läuft', () => {
		for (const s of KATALOG.filter((s) => s.woche <= 3)) {
			expect(s.generator, s.id).not.toBeNull();
			expect(s.generator!.generate(s.params_default, 42).skillId).toBe(s.id);
		}
	});
});
