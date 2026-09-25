import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attempt, card, student, studentGroup, trainingSession } from '$lib/server/db/schema';
import { signatur, signaturGueltig } from '$lib/server/auth/crypto';
import {
	aufgabenAusVersuchen,
	AUFGABEN_JE_RUNDE,
	bewerteRunde,
	Rating,
	wiederhole
} from '$lib/server/planung/fsrs';
import type { Karte, PlanBlock } from '$lib/server/planung/sessionplan';
import { tagesbeginn, tagVon } from '$lib/server/planung/zeit';
import { SKILLS } from '$lib/skills/katalog';
import { neuerSeed } from '$lib/skills/rng';
import type { Auftrag } from '$lib/training';

const tokenDaten = (sessionId: string, a: Omit<Auftrag, 'token'>) =>
	`auftrag:${sessionId}:${a.block}:${a.skill_id}:${a.seed}:${JSON.stringify(a.params)}`;

export function signiere(sessionId: string, a: Omit<Auftrag, 'token'>): Auftrag {
	return { ...a, token: signatur(tokenDaten(sessionId, a)) };
}

export function auftragGueltig(sessionId: string, a: Auftrag): boolean {
	return typeof a.token === 'string' && signaturGueltig(tokenDaten(sessionId, a), a.token);
}

/**
 * Plan in einzelne, signierte Aufträge mit frischen Seeds auflösen. Ab Woche 6 kommt etwa jede
 * zweite Aufgabe eines erweiterten Skills mit Dezimal-Parametern.
 */
export function auftraegeAus(
	sessionId: string,
	bloecke: readonly PlanBlock[],
	bisWoche: number
): Auftrag[] {
	return bloecke.flatMap((b) =>
		Array.from({ length: b.anzahl }, () => {
			const skill = SKILLS.get(b.skillId)!;
			const dezimal = bisWoche >= 6 && skill.params_woche6 && Math.random() < 0.5;
			const params = dezimal
				? skill.params_woche6![Math.floor(Math.random() * skill.params_woche6!.length)]
				: skill.params_default;
			return signiere(sessionId, { skill_id: b.skillId, block: b.art, params, seed: neuerSeed() });
		})
	);
}

export async function freigegebeneWoche(studentId: string): Promise<number> {
	const [row] = await db
		.select({ track: studentGroup.activeTrack })
		.from(student)
		.innerJoin(studentGroup, eq(studentGroup.id, student.groupId))
		.where(eq(student.id, studentId));
	return row?.track ?? 1;
}

export async function eigeneSession(studentId: string, sessionId: string) {
	if (!/^[0-9a-f-]{36}$/i.test(sessionId)) return null;
	const [row] = await db
		.select()
		.from(trainingSession)
		.where(and(eq(trainingSession.id, sessionId), eq(trainingSession.studentId, studentId)));
	return row ?? null;
}

export async function ladeKarten(studentId: string): Promise<Karte[]> {
	const rows = await db.select().from(card).where(eq(card.studentId, studentId));
	return rows.map((k) => ({
		skillId: k.skillId,
		state: k.state,
		stability: k.stability,
		due: k.due,
		introducedAt: k.introducedAt
	}));
}

/** Legt die Karte für einen neuen Skill im Einführungsmodus an (state 0, heute fällig). */
export async function beginneEinfuehrung(studentId: string, skillId: string, jetzt: Date) {
	await db
		.insert(card)
		.values({ studentId, skillId, state: 0, introducedAt: jetzt, due: tagesbeginn(tagVon(jetzt)) })
		.onConflictDoNothing();
}

/** Skills, die in dieser Session schon als Wiederholung dran waren */
export async function schonWiederholt(sessionId: string): Promise<Set<string>> {
	const rows = await db
		.selectDistinct({ skillId: attempt.skillId })
		.from(attempt)
		.where(and(eq(attempt.sessionId, sessionId), eq(attempt.block, 'wiederholung')));
	return new Set(rows.map((r) => r.skillId));
}

/**
 * Schließt eine Session ab und rechnet FSRS. Jede vollständige Runde aus fünf Aufgaben
 * (Wiederholung oder Prüfrunde) wird bewertet; unvollständige Runden bleiben ohne Wirkung,
 * die Karte bleibt dann fällig. Idempotent: eine abgeschlossene Session wird nicht erneut bewertet.
 */
export async function schliesseAb(sessionId: string) {
	await db.transaction(async (tx) => {
		const [s] = await tx
			.select()
			.from(trainingSession)
			.where(eq(trainingSession.id, sessionId))
			.for('update');
		if (!s || s.finishedAt) return;

		const versuche = await tx
			.select({
				skillId: attempt.skillId,
				block: attempt.block,
				seed: attempt.seed,
				correct: attempt.correct,
				hintUsed: attempt.hintUsed,
				durationMs: attempt.durationMs,
				createdAt: attempt.createdAt
			})
			.from(attempt)
			.where(eq(attempt.sessionId, sessionId))
			.orderBy(asc(attempt.createdAt));

		const runden = new Map<string, typeof versuche>();
		for (const v of versuche) {
			if (v.block !== 'wiederholung' && v.block !== 'pruefung') continue;
			const schluessel = `${v.block}:${v.skillId}`;
			runden.set(schluessel, [...(runden.get(schluessel) ?? []), v]);
		}

		for (const [schluessel, vs] of runden) {
			const aufgaben = aufgabenAusVersuchen(vs);
			const skill = SKILLS.get(vs[0].skillId);
			if (!skill || aufgaben.length !== AUFGABEN_JE_RUNDE) continue;
			const bewertung = bewerteRunde(aufgaben, skill.zielzeit_ms);
			const [k] = await tx
				.select()
				.from(card)
				.where(and(eq(card.studentId, s.studentId), eq(card.skillId, skill.id)))
				.for('update');
			if (!k) continue;
			const pruefung = schluessel.startsWith('pruefung:');
			if (pruefung ? k.state !== 0 : k.state === 0) continue;
			const againInFolge = bewertung === Rating.Again ? k.againInFolge + 1 : 0;
			// Prüfrunde: erst ab Hard wird aus der Einführung eine FSRS-Karte
			if (pruefung && bewertung === Rating.Again) {
				await tx.update(card).set({ againInFolge }).where(eq(card.id, k.id));
				continue;
			}
			const neu = wiederhole(k, bewertung, vs.at(-1)!.createdAt);
			await tx
				.update(card)
				.set({ ...neu, againInFolge })
				.where(eq(card.id, k.id));
		}

		const erste = versuche.filter((v) => !v.hintUsed);
		await tx
			.update(trainingSession)
			.set({
				finishedAt: new Date(),
				itemCount: erste.length,
				correctCount: erste.filter((v) => v.correct).length
			})
			.where(eq(trainingSession.id, sessionId));
	});
}

/** Liegengebliebene Sessions (App geschlossen, Netz weg) vor der nächsten Planung abschließen */
export async function schliesseOffeneAb(studentId: string, ausser?: string) {
	const offen = await db
		.select({ id: trainingSession.id })
		.from(trainingSession)
		.where(and(eq(trainingSession.studentId, studentId), isNull(trainingSession.finishedAt)));
	for (const { id } of offen) if (id !== ausser) await schliesseAb(id);
}
