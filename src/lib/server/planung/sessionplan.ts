import type { SkillDef } from '$lib/skills/katalog';
import type { Rng } from '$lib/skills/rng';
import type { BlockArt } from '$lib/training';
import { AUFGABEN_JE_RUNDE } from './fsrs';
import { heuteEnde, tagVon } from './zeit';

export const MAX_AUFGABEN = 12;
export const MIN_AUFGABEN = 8;
export const MAX_WIEDERHOLUNGEN = 2;
/** Einführung: zwei Beispiele zum Zuschauen, drei begleitete Aufgaben, eine Prüfrunde */
export const BEISPIELE = 2;
export const GEFUEHRTE = 3;
/** Ab dieser Stabilität (Tage) gilt ein Skill als Grundlage für neue Skills */
export const STABIL_FUER_FREISCHALTUNG = 3;

export interface Karte {
	skillId: string;
	/** ts-fsrs State: 0 = noch in der Einführung */
	state: number;
	stability: number;
	due: Date;
	introducedAt: Date | null;
}

export interface PlanBlock {
	art: BlockArt;
	skillId: string;
	anzahl: number;
}

export interface PlanEingabe {
	karten: readonly Karte[];
	jetzt: Date;
	bisWoche: number;
	katalog: readonly SkillDef[];
	zufall: Rng;
}

/** Aufgaben, die eine Antwort verlangen (Beispiele sind nur zum Zuschauen) */
export const antwortAufgaben = (bloecke: readonly PlanBlock[]) =>
	bloecke.filter((b) => b.art !== 'beispiel').reduce((n, b) => n + b.anzahl, 0);

function nutzbar(katalog: readonly SkillDef[], bisWoche: number) {
	const erlaubt = new Set(
		katalog.filter((s) => s.generator && s.woche <= bisWoche).map((s) => s.id)
	);
	return (k: Karte) => erlaubt.has(k.skillId);
}

/**
 * Nächster neuer Skill oder null. Neu kommt nur, wenn heute noch kein Skill eingeführt wurde,
 * gerade keiner in der Einführung steckt und alle Voraussetzungen im Zustand Review mit
 * Stabilität über drei Tagen sind. Die Reihenfolge folgt dem Katalog (Förderplan).
 */
export function freischaltbar(e: Omit<PlanEingabe, 'zufall'>): SkillDef | null {
	const heute = tagVon(e.jetzt);
	if (e.karten.some((k) => k.introducedAt && tagVon(k.introducedAt) === heute)) return null;
	if (e.karten.some((k) => k.state === 0)) return null;
	const karte = new Map(e.karten.map((k) => [k.skillId, k]));
	return (
		e.katalog.find(
			(s) =>
				s.generator &&
				s.woche <= e.bisWoche &&
				!karte.has(s.id) &&
				s.voraussetzungen.every((v) => {
					const k = karte.get(v);
					return k?.state === 2 && k.stability > STABIL_FUER_FREISCHALTUNG;
				})
		) ?? null
	);
}

/**
 * Sessionaufbau (8–12 Aufgaben):
 * 1. Aufwärmen aus einem stabilen, nicht fälligen Skill (zwei Aufgaben, eine bei zwei fälligen Karten)
 * 2. fällige Karten nach Fälligkeit, je fünf Aufgaben, höchstens zwei
 * 3. falls Platz bleibt: Einführungsblock (laufende Einführung oder neuer Skill)
 * 4. falls noch unter acht: freies Üben bekannter Skills (ohne FSRS-Bewertung)
 * 5. Abschluss mit einer sicher lösbaren Aufgabe aus dem stabilsten Skill
 * Überzählige fällige Karten bleiben fällig und kommen am Folgetag dran.
 */
export function planeSession(e: PlanEingabe): {
	bloecke: PlanBlock[];
	einzufuehren: string | null;
} {
	const ende = heuteEnde(e.jetzt);
	const aktiv = e.karten.filter(nutzbar(e.katalog, e.bisWoche));
	const gelernt = aktiv.filter((k) => k.state !== 0);
	const faellig = gelernt
		.filter((k) => k.due < ende)
		.sort((a, b) => a.due.getTime() - b.due.getTime())
		.slice(0, MAX_WIEDERHOLUNGEN);
	const stabil = gelernt
		.filter((k) => k.state === 2 && k.due >= ende)
		.sort((a, b) => b.stability - a.stability);

	const bloecke: PlanBlock[] = [];
	if (stabil.length > 0) {
		bloecke.push({
			art: 'aufwaermen',
			skillId: e.zufall.pick(stabil).skillId,
			anzahl: faellig.length === 2 ? 1 : 2
		});
	}
	for (const k of faellig)
		bloecke.push({ art: 'wiederholung', skillId: k.skillId, anzahl: AUFGABEN_JE_RUNDE });

	let einzufuehren: string | null = null;
	const laufend = aktiv.find((k) => k.state === 0);
	const kandidat = laufend?.skillId ?? freischaltbar(e)?.id;
	const abschlussPlatz = stabil.length > 0 ? 1 : 0;
	if (
		kandidat &&
		antwortAufgaben(bloecke) + GEFUEHRTE + AUFGABEN_JE_RUNDE + abschlussPlatz <= MAX_AUFGABEN
	) {
		bloecke.push(
			{ art: 'beispiel', skillId: kandidat, anzahl: BEISPIELE },
			{ art: 'gefuehrt', skillId: kandidat, anzahl: GEFUEHRTE },
			{ art: 'pruefung', skillId: kandidat, anzahl: AUFGABEN_JE_RUNDE }
		);
		if (!laufend) einzufuehren = kandidat;
	}

	const fehlend = MIN_AUFGABEN - abschlussPlatz - antwortAufgaben(bloecke);
	if (fehlend > 0 && gelernt.length > 0) {
		bloecke.push({ art: 'uebung', skillId: e.zufall.pick(gelernt).skillId, anzahl: fehlend });
	}

	if (stabil.length > 0) bloecke.push({ art: 'abschluss', skillId: stabil[0].skillId, anzahl: 1 });
	return { bloecke, einzufuehren };
}

/**
 * Freiwillige Verlängerung um fünf Aufgaben: die nächste fällige Karte, die in dieser Session
 * noch nicht wiederholt wurde, sonst freies Üben eines bekannten Skills.
 */
export function planeVerlaengerung(
	e: PlanEingabe & { schonWiederholt: ReadonlySet<string> }
): PlanBlock[] {
	const ende = heuteEnde(e.jetzt);
	const aktiv = e.karten.filter(nutzbar(e.katalog, e.bisWoche));
	const naechste = aktiv
		.filter((k) => k.state !== 0 && k.due < ende && !e.schonWiederholt.has(k.skillId))
		.sort((a, b) => a.due.getTime() - b.due.getTime())[0];
	if (naechste)
		return [{ art: 'wiederholung', skillId: naechste.skillId, anzahl: AUFGABEN_JE_RUNDE }];
	const gelernt = aktiv.filter((k) => k.state !== 0);
	if (gelernt.length > 0)
		return [{ art: 'uebung', skillId: e.zufall.pick(gelernt).skillId, anzahl: AUFGABEN_JE_RUNDE }];
	const laufend = aktiv.find((k) => k.state === 0);
	return laufend ? [{ art: 'gefuehrt', skillId: laufend.skillId, anzahl: AUFGABEN_JE_RUNDE }] : [];
}
