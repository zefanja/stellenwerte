import { SKILLS, type SkillDef } from '$lib/skills/katalog';
import { Rng } from '$lib/skills/rng';
import {
	AUFGABEN_JE_RUNDE,
	bewerteRunde,
	neueKarte,
	Rating,
	wiederhole,
	type Aufgabe,
	type KartenStand
} from './fsrs';
import {
	antwortAufgaben,
	planeSession,
	STABIL_FUER_FREISCHALTUNG,
	type Karte
} from './sessionplan';
import { plusTage, tagesbeginn, tagVon } from './zeit';

/**
 * Simulierter Schüler für die Abnahme von Meilenstein 5: übt täglich eine Session und löst
 * jede Aufgabe mit fester Wahrscheinlichkeit, beim zweiten Versuch (mit Material) mit einer höheren.
 */
export interface Schueler {
	/** Wahrscheinlichkeit, eine Aufgabe im ersten Versuch zu lösen */
	pErster: number;
	/** … im zweiten Versuch mit Material */
	pZweiter: number;
	/** Antwortzeit relativ zur Zielzeit des Skills */
	tempo: number;
	/** an welchen Tagen (0-basiert) nicht geübt wird */
	pausen?: number[];
}

export interface Ereignis {
	tag: number;
	skillId: string;
	art: 'einfuehrung' | 'pruefung' | 'wiederholung';
	bewertung?: number;
	/** Tage bis zur nächsten Fälligkeit */
	intervall?: number;
	stabilitaet?: number;
	/** bei Einführung: Stand der Voraussetzungen zu diesem Zeitpunkt */
	voraussetzungen?: { skillId: string; state: number; stability: number }[];
}

export interface SimTag {
	tag: number;
	aufgaben: number;
	neu: string | null;
}

type Stand = KartenStand & { introducedAt: Date };

export function simuliere(
	schueler: Schueler,
	tage: number,
	katalog: readonly SkillDef[],
	seed = 1
) {
	const rng = new Rng(seed);
	const karten = new Map<string, Stand>();
	const ereignisse: Ereignis[] = [];
	const verlauf: SimTag[] = [];
	const start = '2026-10-05';

	const runde = (skill: SkillDef): Aufgabe[] =>
		Array.from({ length: AUFGABEN_JE_RUNDE }, () => {
			const dauerMs = skill.zielzeit_ms * schueler.tempo * (0.8 + 0.4 * rng.next());
			if (rng.chance(schueler.pErster)) return { ergebnis: 'richtig', dauerMs };
			return { ergebnis: rng.chance(schueler.pZweiter) ? 'mit_hilfe' : 'falsch', dauerMs };
		});

	for (let t = 0; t < tage; t++) {
		if (schueler.pausen?.includes(t)) continue;
		const jetzt = new Date(tagesbeginn(plusTage(start, t)).getTime() + 15 * 3600_000); // nachmittags
		const plan = planeSession({
			karten: [...karten].map(([skillId, k]): Karte => ({ skillId, ...k })),
			jetzt,
			bisWoche: 6,
			katalog,
			zufall: rng
		});
		if (plan.einzufuehren) {
			const s = SKILLS.get(plan.einzufuehren)!;
			ereignisse.push({
				tag: t,
				skillId: s.id,
				art: 'einfuehrung',
				voraussetzungen: s.voraussetzungen.map((v) => ({
					skillId: v,
					state: karten.get(v)!.state,
					stability: karten.get(v)!.stability
				}))
			});
			karten.set(s.id, {
				...neueKarte(jetzt),
				due: tagesbeginn(tagVon(jetzt)),
				introducedAt: jetzt
			});
		}
		for (const b of plan.bloecke) {
			if (b.art !== 'wiederholung' && b.art !== 'pruefung') continue;
			const skill = SKILLS.get(b.skillId)!;
			const k = karten.get(b.skillId)!;
			const bewertung = bewerteRunde(runde(skill), skill.zielzeit_ms);
			// Prüfrunde der Einführung: erst ab Hard entsteht eine FSRS-Karte
			if (b.art === 'pruefung' && bewertung === Rating.Again) {
				ereignisse.push({ tag: t, skillId: b.skillId, art: 'pruefung', bewertung });
				continue;
			}
			const neu = wiederhole(k, bewertung, jetzt);
			karten.set(b.skillId, { ...neu, introducedAt: k.introducedAt });
			ereignisse.push({
				tag: t,
				skillId: b.skillId,
				art: b.art,
				bewertung,
				intervall: Math.round(
					(neu.due.getTime() - tagesbeginn(tagVon(jetzt)).getTime()) / 86_400_000
				),
				stabilitaet: neu.stability
			});
		}
		verlauf.push({ tag: t, aufgaben: antwortAufgaben(plan.bloecke), neu: plan.einzufuehren });
	}
	return { karten, ereignisse, verlauf };
}

export { STABIL_FUER_FREISCHALTUNG };
