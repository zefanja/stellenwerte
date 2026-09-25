import { describe, expect, it } from 'vitest';
import {
	aufgabenAusVersuchen,
	bewerteRunde,
	neueKarte,
	Rating,
	wiederhole,
	type Aufgabe
} from './fsrs';
import { plusTage, tagesbeginn, tagVon } from './zeit';

const runde = (ergebnisse: Aufgabe['ergebnis'][], dauerMs = 8000): Aufgabe[] =>
	ergebnisse.map((ergebnis) => ({ ergebnis, dauerMs }));
const ZIEL = 10_000;

describe('bewerteRunde', () => {
	it.each([
		[['falsch', 'falsch', 'falsch', 'richtig', 'richtig'], 12_000, Rating.Again],
		[['falsch', 'falsch', 'richtig', 'richtig', 'richtig'], 12_000, Rating.Hard],
		[['falsch', 'richtig', 'richtig', 'richtig', 'richtig'], 5_000, Rating.Hard],
		[['mit_hilfe', 'richtig', 'richtig', 'richtig', 'richtig'], 5_000, Rating.Hard],
		[['richtig', 'richtig', 'richtig', 'richtig', 'richtig'], 21_000, Rating.Hard],
		[['richtig', 'richtig', 'richtig', 'richtig', 'richtig'], 12_000, Rating.Good],
		[['richtig', 'richtig', 'richtig', 'richtig', 'richtig'], 9_000, Rating.Easy]
	] as const)('%o bei Median %i ms → %i', (ergebnisse, dauer, erwartet) => {
		expect(bewerteRunde(runde([...ergebnisse], dauer), ZIEL)).toBe(erwartet);
	});

	it('Hilfe zählt als gelöst: zwei mit Hilfe, einer falsch → Hard, nicht Again', () => {
		expect(
			bewerteRunde(runde(['mit_hilfe', 'mit_hilfe', 'falsch', 'richtig', 'falsch']), ZIEL)
		).toBe(Rating.Hard);
	});

	it('verlangt genau fünf Aufgaben', () => {
		expect(() => bewerteRunde(runde(['richtig']), ZIEL)).toThrow();
	});
});

describe('aufgabenAusVersuchen', () => {
	it('fasst erste und zweite Versuche je Seed zusammen und lässt Unvollständiges weg', () => {
		const a = aufgabenAusVersuchen([
			{ seed: 1, correct: true, hintUsed: false, durationMs: 5000 },
			{ seed: 2, correct: false, hintUsed: false, durationMs: 6000 },
			{ seed: 2, correct: true, hintUsed: true, durationMs: 9000 },
			{ seed: 3, correct: false, hintUsed: false, durationMs: 7000 },
			{ seed: 3, correct: false, hintUsed: true, durationMs: 9000 },
			{ seed: 4, correct: false, hintUsed: false, durationMs: 4000 }
		]);
		expect(a).toEqual([
			{ ergebnis: 'richtig', dauerMs: 5000 },
			{ ergebnis: 'mit_hilfe', dauerMs: 6000 },
			{ ergebnis: 'falsch', dauerMs: 7000 }
		]);
	});
});

describe('wiederhole', () => {
	const jetzt = new Date('2026-10-05T14:00:00Z');

	it('Again setzt die Karte auf den Folgetag', () => {
		let k = wiederhole(neueKarte(jetzt), Rating.Good, jetzt);
		k = wiederhole(k, Rating.Good, k.due);
		const spaeter = new Date(k.due.getTime() + 15 * 3600_000);
		const nachAgain = wiederhole(k, Rating.Again, spaeter);
		expect(nachAgain.due).toEqual(tagesbeginn(plusTage(tagVon(spaeter), 1)));
		expect(nachAgain.lapses).toBe(1);
	});

	it('fällig ab Mitternacht des Zieltags, Intervalle wachsen bei Good und bleiben ≤ 120 Tage', () => {
		let k = neueKarte(jetzt);
		let t = jetzt;
		let vorher = 0;
		for (let i = 0; i < 12; i++) {
			k = wiederhole(k, Rating.Good, t);
			const tage = Math.round(
				(k.due.getTime() - tagesbeginn(t.toISOString().slice(0, 10)).getTime()) / 86_400_000
			);
			expect(tage).toBeGreaterThanOrEqual(vorher);
			expect(tage).toBeLessThanOrEqual(121);
			vorher = tage;
			t = new Date(k.due.getTime() + 16 * 3600_000);
		}
		expect(vorher).toBeGreaterThanOrEqual(100);
	});
});
