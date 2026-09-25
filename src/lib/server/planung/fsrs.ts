import { Rating, fsrs, generatorParameters, type CardInput, type Grade } from 'ts-fsrs';
import { plusTage, tagesbeginn, tagVon } from './zeit';

/**
 * FSRS terminiert Fertigkeiten, nicht Items: Eine Wiederholung sind fünf frisch generierte
 * Aufgaben desselben Skills, erst ihr Gesamtergebnis wird zu einer Bewertung.
 * Ohne Kurzzeitschritte (Minuten) und ohne Zufallsstreuung, Intervalle in ganzen Tagen.
 */
export const scheduler = fsrs(
	generatorParameters({
		request_retention: 0.9,
		maximum_interval: 120,
		enable_short_term: false,
		enable_fuzz: false
	})
);

export { Rating };
export type { Grade };

export const AUFGABEN_JE_RUNDE = 5;

/** ts-fsrs State: 0 New, 1 Learning, 2 Review, 3 Relearning */
export interface KartenStand {
	stability: number;
	difficulty: number;
	due: Date;
	lastReview: Date | null;
	reps: number;
	lapses: number;
	state: number;
}

export type AufgabenErgebnis = 'richtig' | 'mit_hilfe' | 'falsch';

export interface Aufgabe {
	ergebnis: AufgabenErgebnis;
	/** Dauer des ersten Versuchs */
	dauerMs: number;
}

function median(xs: number[]): number {
	const s = [...xs].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/**
 * Bewertung einer Runde aus fünf Aufgaben (Tabelle der Spezifikation):
 * ≤ 2 richtig → Again; 3–4 richtig, oder 5 mit Hilfe oder Median > 2 × Zielzeit → Hard;
 * 5 ohne Hilfe mit Median unter der Zielzeit → Easy; sonst Good.
 * „Mit Hilfe“ heißt: im zweiten Versuch mit Material gelöst.
 */
export function bewerteRunde(aufgaben: Aufgabe[], zielzeitMs: number): Grade {
	if (aufgaben.length !== AUFGABEN_JE_RUNDE)
		throw new RangeError(`Runde braucht ${AUFGABEN_JE_RUNDE} Aufgaben`);
	const geloest = aufgaben.filter((a) => a.ergebnis !== 'falsch').length;
	if (geloest <= 2) return Rating.Again;
	if (geloest < 5) return Rating.Hard;
	const mitHilfe = aufgaben.some((a) => a.ergebnis === 'mit_hilfe');
	const m = median(aufgaben.map((a) => a.dauerMs));
	if (mitHilfe || m > 2 * zielzeitMs) return Rating.Hard;
	if (m < zielzeitMs) return Rating.Easy;
	return Rating.Good;
}

export interface Versuch {
	seed: number;
	correct: boolean;
	hintUsed: boolean;
	durationMs: number;
}

/**
 * Fasst die Versuche einer Runde zu Aufgaben zusammen (eine Aufgabe = ein Seed). Aufgaben, bei
 * denen der erste Versuch falsch war und der zweite fehlt, sind unvollständig und fallen weg.
 */
export function aufgabenAusVersuchen(versuche: Versuch[]): Aufgabe[] {
	const jeSeed = new Map<number, Versuch[]>();
	for (const v of versuche) jeSeed.set(v.seed, [...(jeSeed.get(v.seed) ?? []), v]);
	const aufgaben: Aufgabe[] = [];
	for (const vs of jeSeed.values()) {
		const erster = vs.find((v) => !v.hintUsed);
		const zweiter = vs.find((v) => v.hintUsed);
		if (!erster) continue;
		if (erster.correct) aufgaben.push({ ergebnis: 'richtig', dauerMs: erster.durationMs });
		else if (zweiter)
			aufgaben.push({
				ergebnis: zweiter.correct ? 'mit_hilfe' : 'falsch',
				dauerMs: erster.durationMs
			});
	}
	return aufgaben;
}

/** Neue, noch nie bewertete Karte */
export function neueKarte(jetzt: Date): KartenStand {
	return {
		stability: 0,
		difficulty: 0,
		due: jetzt,
		lastReview: null,
		reps: 0,
		lapses: 0,
		state: 0
	};
}

/**
 * Wendet eine Bewertung an. Fällig wird die Karte tagesgenau ab Mitternacht des Zieltags;
 * nach Again immer am Folgetag.
 */
export function wiederhole(k: KartenStand, bewertung: Grade, jetzt: Date): KartenStand {
	const karte: CardInput = {
		due: k.due,
		stability: k.stability,
		difficulty: k.difficulty,
		elapsed_days: 0,
		scheduled_days: 0,
		learning_steps: 0,
		reps: k.reps,
		lapses: k.lapses,
		state: k.state,
		last_review: k.lastReview
	};
	const { card } = scheduler.next(karte, jetzt, bewertung);
	const tage = bewertung === Rating.Again ? 1 : Math.max(1, card.scheduled_days);
	return {
		stability: card.stability,
		difficulty: card.difficulty,
		due: tagesbeginn(plusTage(tagVon(jetzt), tage)),
		lastReview: jetzt,
		reps: card.reps,
		lapses: card.lapses,
		state: card.state
	};
}
