import { error, json } from '@sveltejs/kit';
import { eigeneSession, schliesseAb } from '$lib/server/training';

/** Schließt die Session und rechnet die FSRS-Updates der vollständigen Runden. */
export async function POST({ locals, request }) {
	const body = await request.json().catch(() => null);
	const session = await eigeneSession(locals.student!.id, String(body?.session_id ?? ''));
	if (!session) error(404, 'Session nicht gefunden');
	await schliesseAb(session.id);
	return json({ ok: true });
}
