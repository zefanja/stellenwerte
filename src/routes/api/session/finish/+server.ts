import { error, json } from '@sveltejs/kit';
import { and, count, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attempt, trainingSession } from '$lib/server/db/schema';
import { eigeneSession } from '$lib/server/training';

/**
 * Schließt die Session. Gezählt werden Aufgaben (erste Versuche) und beim ersten Versuch
 * richtig gelöste. Die FSRS-Bewertung folgt in Meilenstein 5.
 */
export async function POST({ locals, request }) {
	const body = await request.json().catch(() => null);
	const session = await eigeneSession(locals.student!.id, String(body?.session_id ?? ''));
	if (!session) error(404, 'Session nicht gefunden');

	const erste = and(eq(attempt.sessionId, session.id), eq(attempt.hintUsed, false));
	const [{ aufgaben }] = await db.select({ aufgaben: count() }).from(attempt).where(erste);
	const [{ richtig }] = await db
		.select({ richtig: count() })
		.from(attempt)
		.where(and(erste, eq(attempt.correct, true)));

	await db
		.update(trainingSession)
		.set({
			finishedAt: session.finishedAt ?? new Date(),
			itemCount: aufgaben,
			correctCount: richtig
		})
		.where(eq(trainingSession.id, session.id));
	return json({ ok: true });
}
