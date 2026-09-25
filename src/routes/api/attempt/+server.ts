import { error, json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attempt } from '$lib/server/db/schema';
import { auftragGueltig, eigeneSession } from '$lib/server/training';
import { STELLEN } from '$lib/skills/material';
import { SKILLS } from '$lib/skills/katalog';
import type { Antwort, Material } from '$lib/skills/typen';
import type { VersuchMeldung } from '$lib/training';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Nur bekannte Felder übernehmen; alles andere an der Antwort wird verworfen. */
function bereinigeAntwort(a: unknown): Antwort | null {
	if (!a || typeof a !== 'object') return null;
	const o = a as Record<string, unknown>;
	if (o.typ === 'zahl' && typeof o.wert === 'number' && Number.isFinite(o.wert))
		return { typ: 'zahl', wert: o.wert };
	if (o.typ === 'material' && o.material && typeof o.material === 'object') {
		const roh = o.material as Record<string, unknown>;
		const material: Material = {};
		for (const s of STELLEN) {
			const n = roh[s];
			if (n === undefined) continue;
			if (typeof n !== 'number' || !Number.isInteger(n) || n < 0 || n > 10_000) return null;
			material[s] = n;
		}
		return { typ: 'material', material };
	}
	return null;
}

/**
 * Protokolliert eine Antwort. Der Server generiert das Item aus dem signierten Auftrag selbst
 * und bewertet neu; die Bewertung des Clients wird nicht übernommen. Idempotent über attempt_uuid.
 */
export async function POST({ locals, request }) {
	const s = locals.student!;
	const body = (await request.json().catch(() => null)) as VersuchMeldung | null;
	if (!body || typeof body.attempt_uuid !== 'string' || !UUID.test(body.attempt_uuid))
		error(400, 'attempt_uuid fehlt');
	if (typeof body.session_id !== 'string' || !body.auftrag) error(400, 'Auftrag fehlt');

	const session = await eigeneSession(s.id, body.session_id);
	if (!session) error(404, 'Session nicht gefunden');
	if (!auftragGueltig(session.id, body.auftrag)) error(400, 'Auftrag ungültig');

	const skill = SKILLS.get(body.auftrag.skill_id);
	if (!skill?.generator) error(400, 'Skill unbekannt');
	const antwort = bereinigeAntwort(body.answer);
	if (!antwort) error(400, 'Antwort ungültig');

	const item = skill.generator.generate(body.auftrag.params, body.auftrag.seed);
	const bewertung = skill.generator.bewerte(item, antwort);
	const dauer = Math.max(0, Math.min(3_600_000, Math.round(Number(body.duration_ms) || 0)));

	await db
		.insert(attempt)
		.values({
			attemptUuid: body.attempt_uuid,
			studentId: s.id,
			skillId: skill.id,
			sessionId: session.id,
			seed: body.auftrag.seed,
			paramsJson: body.auftrag.params,
			answerJson: antwort,
			correct: bewertung.correct,
			errorTag: bewertung.error_tag,
			durationMs: dauer,
			hintUsed: body.hint_used === true
		})
		.onConflictDoNothing({ target: attempt.attemptUuid });

	return json(bewertung);
}
