import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { student, studentGroup, trainingSession } from '$lib/server/db/schema';
import { signatur, signaturGueltig } from '$lib/server/auth/crypto';
import { KATALOG } from '$lib/skills/katalog';
import { neuerSeed } from '$lib/skills/rng';
import type { Auftrag } from '$lib/training';

const tokenDaten = (sessionId: string, a: Omit<Auftrag, 'token'>) =>
	`auftrag:${sessionId}:${a.skill_id}:${a.seed}:${JSON.stringify(a.params)}`;

export function signiere(sessionId: string, a: Omit<Auftrag, 'token'>): Auftrag {
	return { ...a, token: signatur(tokenDaten(sessionId, a)) };
}

export function auftragGueltig(sessionId: string, a: Auftrag): boolean {
	return typeof a.token === 'string' && signaturGueltig(tokenDaten(sessionId, a), a.token);
}

/**
 * Vorläufige Auswahl ohne Scheduling (Meilenstein 4): alle freigegebenen Skills mit Generator,
 * gemischt und reihum. Wird in Meilenstein 5 durch den FSRS-Sessionaufbau ersetzt.
 */
export function waehleAuftraege(sessionId: string, anzahl: number, bisWoche: number): Auftrag[] {
	const skills = KATALOG.filter((s) => s.generator && s.woche <= bisWoche);
	const gemischt = [...skills].sort(() => Math.random() - 0.5);
	return Array.from({ length: anzahl }, (_, i) => {
		const s = gemischt[i % gemischt.length];
		return signiere(sessionId, { skill_id: s.id, params: s.params_default, seed: neuerSeed() });
	});
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
