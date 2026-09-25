import { describe, expect, it } from 'vitest';
import { KATALOG, SKILLS } from '$lib/skills/katalog';
import { Rating } from './fsrs';
import { simuliere, STABIL_FUER_FREISCHALTUNG, type Schueler } from './simulation';

/** Abnahme Meilenstein 5: simulierter Schüler über 30 Tage */
const SCHUELER: Record<string, Schueler> = {
	sicher: { pErster: 0.97, pZweiter: 0.9, tempo: 0.8 },
	mittel: { pErster: 0.8, pZweiter: 0.7, tempo: 1.1 },
	schwach: { pErster: 0.5, pZweiter: 0.5, tempo: 1.6 },
	mitPausen: { pErster: 0.9, pZweiter: 0.8, tempo: 1, pausen: [5, 6, 12, 13, 19, 20, 26, 27] }
};

describe.each(Object.entries(SCHUELER))('30 Tage, Schüler „%s“', (_, schueler) => {
	for (const seed of [1, 2, 3]) {
		const { ereignisse, verlauf } = simuliere(schueler, 30, KATALOG, seed);

		it(`Seed ${seed}: nie mehr als ein neuer Skill pro Tag, Sessions mit 8 bis 12 Aufgaben`, () => {
			const neueJeTag = new Map<number, number>();
			for (const e of ereignisse.filter((e) => e.art === 'einfuehrung'))
				neueJeTag.set(e.tag, (neueJeTag.get(e.tag) ?? 0) + 1);
			expect(Math.max(0, ...neueJeTag.values())).toBeLessThanOrEqual(1);
			for (const t of verlauf) {
				expect(t.aufgaben).toBeGreaterThanOrEqual(8);
				expect(t.aufgaben).toBeLessThanOrEqual(12);
			}
		});

		it(`Seed ${seed}: neue Skills erst, wenn die Voraussetzungen stabil sind`, () => {
			for (const e of ereignisse.filter((e) => e.art === 'einfuehrung')) {
				for (const v of e.voraussetzungen!) {
					expect(v.state, `${e.skillId} ← ${v.skillId}`).toBe(2);
					expect(v.stability).toBeGreaterThan(STABIL_FUER_FREISCHALTUNG);
				}
			}
		});

		it(`Seed ${seed}: Again setzt auf den Folgetag, Intervalle ≤ 120 Tage, Good und Easy wachsen`, () => {
			const bewertet = ereignisse.filter((e) => e.intervall !== undefined);
			for (const e of bewertet) {
				if (e.bewertung === Rating.Again) expect(e.intervall).toBe(1);
				expect(e.intervall).toBeGreaterThanOrEqual(1);
				expect(e.intervall).toBeLessThanOrEqual(120);
			}
			// aufeinanderfolgende erfolgreiche Wiederholungen desselben Skills: Intervall wächst
			const letzte = new Map<string, number>();
			for (const e of bewertet) {
				const vorher = letzte.get(e.skillId);
				if (vorher !== undefined && (e.bewertung === Rating.Good || e.bewertung === Rating.Easy)) {
					expect(e.intervall!, `${e.skillId} Tag ${e.tag}`).toBeGreaterThanOrEqual(vorher);
				}
				letzte.set(e.skillId, e.bewertung === Rating.Again ? 0 : e.intervall!);
			}
		});
	}
});

describe('Plausibilität über 30 Tage', () => {
	const gelernt = (s: Schueler) =>
		[1, 2, 3].map(
			(seed) =>
				[...simuliere(s, 30, KATALOG, seed).karten.values()].filter((k) => k.state === 2).length
		);

	it('ein sicherer Schüler lernt alle Skills der Wochen 1 bis 3 in 30 Tagen', () => {
		const verfuegbar = KATALOG.filter((s) => s.generator).length;
		for (const n of gelernt(SCHUELER.sicher)) expect(n).toBe(verfuegbar);
	});

	it('ein schwacher Schüler kommt langsamer voran als ein sicherer, bleibt aber nicht stehen', () => {
		for (const seed of [1, 2, 3]) {
			const sicher = simuliere(SCHUELER.sicher, 30, KATALOG, seed).ereignisse;
			const schwach = simuliere(SCHUELER.schwach, 30, KATALOG, seed).ereignisse;
			const fuenfterSkill = (es: typeof sicher) =>
				es.filter((e) => e.art === 'einfuehrung')[4]?.tag ?? Infinity;
			const again = (es: typeof sicher) => es.filter((e) => e.bewertung === Rating.Again).length;
			expect(fuenfterSkill(schwach)).toBeGreaterThan(fuenfterSkill(sicher));
			expect(again(schwach)).toBeGreaterThan(again(sicher));
			expect(schwach.filter((e) => e.art === 'einfuehrung').length).toBeGreaterThanOrEqual(3);
		}
	});

	it('Intervalle eines sicheren Schülers liegen im Bereich von Tagen bis Wochen', () => {
		const { ereignisse } = simuliere(SCHUELER.sicher, 30, KATALOG, 1);
		const ersterSkill = ereignisse
			.filter((e) => e.skillId === 'buendeln_100' && e.intervall)
			.map((e) => e.intervall!);
		expect(ersterSkill[0]).toBeLessThanOrEqual(8);
		expect(Math.max(...ersterSkill)).toBeGreaterThanOrEqual(14);
		expect(SKILLS.size).toBe(12);
	});
});
